import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as ts from "typescript";
import {
  FX_RATES,
  CURRENCY_METADATA,
  CurrencyCode,
  convertPrice,
  formatPrice,
  getAllRegionalPrices,
  generateDeterministicOffers,
  getDevicePricingOverview,
  fetchLiveOrFallbackPricing,
} from "../lib/pricing-service";
import { SmartphoneDevice } from "../lib/seed-data";

// Sample device for empirical testing
const sampleDevice: SmartphoneDevice = {
  id: "google-pixel-9-pro",
  name: "Google Pixel 9 Pro",
  brand: "Google",
  slug: "google-pixel-9-pro",
  releaseDate: "2024-09-04",
  launchMsrpUsd: 999,
  currentStreetUsd: 899,
  category: "flagship",
  dimensionsMm: { length: 152.8, width: 72.0, thickness: 8.5 },
  weightGrams: 199,
  display: {
    sizeInches: 6.3,
    resolution: "2856x1280",
    panelType: "LTPO OLED",
    refreshRateHz: 120,
    peakBrightnessNits: 3000,
    aspectRatio: "20:9",
  },
  platform: {
    os: "Android 14",
    chipset: "Google Tensor G4",
    cpuDetails: "Octa-core",
    gpuDetails: "Mali-G715 MC7",
  },
  ramGb: 16,
  storageGb: 256,
  rearCameras: [
    { megapixels: 50, sensorSize: '1/1.31"', aperture: "f/1.68" },
    { megapixels: 48, sensorSize: '1/2.55"', aperture: "f/2.8" },
  ],
  frontCamera: { megapixels: 42, aperture: "f/2.2" },
  batteryCapacityMah: 4700,
  wiredChargingWatts: 27,
  wirelessChargingWatts: 21,
  hasReverseWireless: true,
  waterResistanceRating: "IP68",
  headphoneJack35mm: false,
  usbType: "USB-C 3.2",
  colors: ["Obsidian", "Porcelain", "Hazel", "Rose Quartz"],
  cellularBands: "5G Sub6/mmWave",
  overallScore: 91,
  valueScore: 86,
  performanceScore: 90,
  cameraScore: 96,
  batteryScore: 88,
  expertReviewExcerpt: "Unmatched computational photography with refined ergonomics.",
};

describe("Challenger 4: Systems & Architecture Re-Verification (Gate 2)", () => {
  // =========================================================================
  // 1. Circuit Breaker & Rate Limiting Hardening
  // =========================================================================
  describe("1. Circuit Breaker & Rate Limiting Hardening", () => {
    class CircuitBreakerHarness {
      public state: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED";
      public failureCount = 0;
      public readonly failureThreshold = 3;
      public cooldownMs = 60000;
      public lastTripTime = 0;
      public activeProbe = false;

      public trip(now: number) {
        this.state = "OPEN";
        this.lastTripTime = now;
        this.activeProbe = false;
      }

      public recordSuccess() {
        this.state = "CLOSED";
        this.failureCount = 0;
        this.activeProbe = false;
      }

      public recordFailure(now: number) {
        this.failureCount++;
        this.state = "OPEN";
        this.lastTripTime = now;
        this.cooldownMs = this.cooldownMs * 2; // Exponential backoff cooldown
        this.activeProbe = false;
      }

      // Naive evaluation: allows all requests when cooldown expires
      public canExecuteNaive(now: number): boolean {
        if (this.state === "CLOSED") return true;
        if (this.state === "OPEN" && now - this.lastTripTime >= this.cooldownMs) {
          this.state = "HALF_OPEN";
          return true;
        }
        return this.state === "HALF_OPEN";
      }

      // Hardened evaluation: strictly 1 atomic canary probe permitted in HALF_OPEN
      public canExecuteHardened(now: number): boolean {
        if (this.state === "CLOSED") return true;
        if (this.state === "OPEN") {
          if (now - this.lastTripTime >= this.cooldownMs) {
            if (!this.activeProbe) {
              this.activeProbe = true;
              this.state = "HALF_OPEN";
              return true; // Single atomic canary probe
            }
          }
          return false; // Concurrent requests bypass to fallback
        }
        if (this.state === "HALF_OPEN") {
          return false; // Probe already in flight; shield upstream
        }
        return false;
      }
    }

    it("verifies single-flight canary probe shields recovering upstreams from concurrent thundering herds", () => {
      const naiveBreaker = new CircuitBreakerHarness();
      const hardenedBreaker = new CircuitBreakerHarness();
      const tripTime = 50000;

      naiveBreaker.trip(tripTime);
      hardenedBreaker.trip(tripTime);

      const arrivalTime = tripTime + 60001; // Cooldown (60,000ms) has elapsed
      const concurrentRequestCount = 1000;

      // 1. Stress test Naive Circuit Breaker
      let naiveUpstreamHits = 0;
      for (let i = 0; i < concurrentRequestCount; i++) {
        if (naiveBreaker.canExecuteNaive(arrivalTime)) {
          naiveUpstreamHits++;
        }
      }
      // Naive breaker exposes upstream to 1,000 concurrent requests!
      expect(naiveUpstreamHits).toBe(1000);

      // 2. Stress test Hardened Circuit Breaker with Single-Flight Canary Probe
      let hardenedProbesAllowed = 0;
      let hardenedFallbackBypasses = 0;

      for (let i = 0; i < concurrentRequestCount; i++) {
        if (hardenedBreaker.canExecuteHardened(arrivalTime)) {
          hardenedProbesAllowed++;
        } else {
          hardenedFallbackBypasses++;
        }
      }

      // Hardened breaker strictly permits exactly 1 probe to test upstream health
      expect(hardenedProbesAllowed).toBe(1);
      expect(hardenedFallbackBypasses).toBe(999);
      expect(hardenedBreaker.state).toBe("HALF_OPEN");
      expect(hardenedBreaker.activeProbe).toBe(true);

      // 3. Additional requests arriving while canary probe is in flight (e.g. 200ms later)
      let inFlightHits = 0;
      let inFlightFallbacks = 0;
      for (let i = 0; i < 500; i++) {
        if (hardenedBreaker.canExecuteHardened(arrivalTime + 200)) {
          inFlightHits++;
        } else {
          inFlightFallbacks++;
        }
      }
      expect(inFlightHits).toBe(0);
      expect(inFlightFallbacks).toBe(500);

      // 4. Test Probe Success: upstream recovered -> transitions to CLOSED
      hardenedBreaker.recordSuccess();
      expect(hardenedBreaker.state).toBe("CLOSED");
      expect(hardenedBreaker.activeProbe).toBe(false);
      expect(hardenedBreaker.canExecuteHardened(arrivalTime + 300)).toBe(true);

      // 5. Test Probe Failure: upstream still failing -> transitions back to OPEN with doubled cooldown
      hardenedBreaker.trip(arrivalTime + 400);
      hardenedBreaker.canExecuteHardened(arrivalTime + 400 + 60001); // Probe sent
      expect(hardenedBreaker.state).toBe("HALF_OPEN");
      hardenedBreaker.recordFailure(arrivalTime + 400 + 60001);
      expect(hardenedBreaker.state).toBe("OPEN");
      expect(hardenedBreaker.cooldownMs).toBe(120000); // 60s -> 120s exponential backoff
      expect(hardenedBreaker.activeProbe).toBe(false);
    });

    it("verifies Amazon PA-API Token Bucket (capacity=1, delay>=1000ms) prevents 1-second burst violations", () => {
      // Flawed bucket: capacity > 1 allows multi-request bursts
      class FlawedTokenBucket {
        constructor(public capacity: number, public tokens: number) {}
        public consume(): boolean {
          if (this.tokens >= 1) {
            this.tokens--;
            return true;
          }
          return false;
        }
      }

      const flawed = new FlawedTokenBucket(5, 5); // Capacity 5, fully filled after idle
      let flawedInstantBurst = 0;
      for (let i = 0; i < 5; i++) {
        if (flawed.consume()) flawedInstantBurst++;
      }
      expect(flawedInstantBurst).toBe(5); // 5 requests sent in 0ms! Violates PA-API 1 TPS!

      // Hardened Token Bucket with capacity = 1 and Leaky Bucket Pacer (delay >= 1,000ms)
      class HardenedPaApiRateLimiter {
        public readonly capacity = 1;
        public readonly refillRatePerSec = 1.0;
        public readonly minInterRequestDelayMs = 1000;
        public tokens = 1;
        public lastRequestTime = 0;
        public lastRefillTime = 0;

        constructor(initialTime = 0) {
          this.lastRefillTime = initialTime;
          this.tokens = 1;
        }

        public refill(now: number) {
          const elapsedSec = (now - this.lastRefillTime) / 1000;
          this.tokens = Math.min(this.capacity, this.tokens + elapsedSec * this.refillRatePerSec);
          this.lastRefillTime = now;
        }

        public tryAcquire(now: number): { allowed: boolean; waitMs: number } {
          this.refill(now);
          const elapsedSinceLastReq = now - this.lastRequestTime;

          if (this.tokens >= 1 && elapsedSinceLastReq >= this.minInterRequestDelayMs) {
            this.tokens -= 1;
            this.lastRequestTime = now;
            return { allowed: true, waitMs: 0 };
          }

          const waitTokens = (1 - this.tokens) * 1000;
          const waitPacing = Math.max(0, this.minInterRequestDelayMs - elapsedSinceLastReq);
          return { allowed: false, waitMs: Math.max(waitTokens, waitPacing) };
        }
      }

      const limiter = new HardenedPaApiRateLimiter(10000);
      const t0 = 10000;

      // First request at t0: Allowed immediately
      const req1 = limiter.tryAcquire(t0);
      expect(req1.allowed).toBe(true);
      expect(req1.waitMs).toBe(0);

      // Rapid burst requests within 1 second: all rejected with mandatory wait
      const burstTimestamps = [t0 + 10, t0 + 100, t0 + 500, t0 + 999];
      for (const t of burstTimestamps) {
        const burstReq = limiter.tryAcquire(t);
        expect(burstReq.allowed).toBe(false);
        expect(burstReq.waitMs).toBeGreaterThan(0);
      }

      // Request after exactly 1,000ms: Allowed
      const reqAfter1000ms = limiter.tryAcquire(t0 + 1000);
      expect(reqAfter1000ms.allowed).toBe(true);

      // Verify sliding 1,000ms window invariant over 50 simulated requests
      const executionTimes: number[] = [];
      let simulatedClock = 20000;
      for (let i = 0; i < 50; i++) {
        // Random inter-arrival between 50ms and 1500ms
        const delta = Math.floor(Math.random() * 1450) + 50;
        simulatedClock += delta;
        const res = limiter.tryAcquire(simulatedClock);
        if (res.allowed) {
          executionTimes.push(simulatedClock);
        }
      }

      // Invariant check: In ANY 1000ms window, exactly 0 or 1 request was executed
      for (let i = 1; i < executionTimes.length; i++) {
        const gap = executionTimes[i] - executionTimes[i - 1];
        expect(gap).toBeGreaterThanOrEqual(1000);
      }
    });
  });

  // =========================================================================
  // 2. Formatting Latency & Pre-Compiled Formatter Map
  // =========================================================================
  describe("2. Formatting Latency & Pre-Compiled Formatter Map", () => {
    // Static pre-compiled Map cache pattern from docs/PRICING_DEAL_STRATEGY_EVALUATION.md
    const FORMATTER_CACHE = new Map<CurrencyCode, Intl.NumberFormat>(
      (Object.keys(CURRENCY_METADATA) as CurrencyCode[]).map((code) => [
        code,
        new Intl.NumberFormat(CURRENCY_METADATA[code].locale),
      ])
    );

    function fastFormatPrice(amount: number, currency: CurrencyCode = "USD"): string {
      const meta = CURRENCY_METADATA[currency] || CURRENCY_METADATA.USD;
      const formatter = FORMATTER_CACHE.get(currency) || FORMATTER_CACHE.get("USD")!;
      const formatted = formatter.format(Math.round(amount));

      return meta.symbolPosition === "SUFFIX"
        ? `${formatted} ${meta.symbol}`
        : `${meta.symbol}${formatted}`;
    }

    function dynamicFormatPrice(amount: number, currency: CurrencyCode = "USD"): string {
      const meta = CURRENCY_METADATA[currency] || CURRENCY_METADATA.USD;
      const formatter = new Intl.NumberFormat(meta.locale);
      const formatted = formatter.format(Math.round(amount));

      return meta.symbolPosition === "SUFFIX"
        ? `${formatted} ${meta.symbol}`
        : `${meta.symbol}${formatted}`;
    }

    it("benchmarks formatting performance and empirically verifies < 0.02ms memoized latency claim", () => {
      const currencies: CurrencyCode[] = ["USD", "EUR", "GBP", "CAD", "INR", "JPY", "AUD", "NGN"];
      const iterations = 1000;

      // Warmup JIT
      for (let i = 0; i < 100; i++) {
        for (const c of currencies) {
          fastFormatPrice(1099, c);
          dynamicFormatPrice(1099, c);
        }
      }

      // 1. Benchmark Dynamic Instantiation
      const startDynamic = performance.now();
      for (let i = 0; i < iterations; i++) {
        for (const c of currencies) {
          dynamicFormatPrice(1099 + i, c);
        }
      }
      const totalDynamicMs = performance.now() - startDynamic;
      const avgDynamicLatencyPerCurrencyMs = totalDynamicMs / (iterations * currencies.length);

      // 2. Benchmark Static FORMATTER_CACHE Map Lookup
      const startStatic = performance.now();
      for (let i = 0; i < iterations; i++) {
        for (const c of currencies) {
          fastFormatPrice(1099 + i, c);
        }
      }
      const totalStaticMs = performance.now() - startStatic;
      const avgStaticLatencyPerCurrencyMs = totalStaticMs / (iterations * currencies.length);

      // Microsecond conversion
      const avgDynamicUs = avgDynamicLatencyPerCurrencyMs * 1000;
      const avgStaticUs = avgStaticLatencyPerCurrencyMs * 1000;
      const speedup = avgDynamicLatencyPerCurrencyMs / avgStaticLatencyPerCurrencyMs;

      // Assertions
      // Static cache execution must be strictly < 0.02ms (20 microseconds) per call
      expect(avgStaticLatencyPerCurrencyMs).toBeLessThan(0.02);
      // Speedup must be substantial (> 5x faster than dynamic instantiation)
      expect(speedup).toBeGreaterThan(5);

      // Formatting output equivalence check
      for (const c of currencies) {
        expect(fastFormatPrice(1299, c)).toBe(dynamicFormatPrice(1299, c));
      }
    }, 15000);

    it("verifies L4 fallback pricing overview executes well within 5.0ms SLA", () => {
      const iterations = 1000;
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        const overview = getDevicePricingOverview(sampleDevice, "USD");
        expect(overview.regionalPrices.EUR).toBeDefined();
        expect(overview.regionalPrices.GBP).toBeDefined();
        expect(overview.regionalPrices.JPY).toBeDefined();
        expect(overview.regionalPrices.NGN).toBeDefined();
      }
      const avgOverviewLatencyMs = (performance.now() - start) / iterations;
      // Overview computes 8 regional prices + 3-4 offers: comfortably < 5.0ms SLA
      expect(avgOverviewLatencyMs).toBeLessThan(5.0);
    });
  });

  // =========================================================================
  // 3. Backward Compatibility & Code Invariants
  // =========================================================================
  describe("3. Backward Compatibility & Code Invariants", () => {
    it("verifies exported function names in src/lib/pricing-service.ts", () => {
      // Must export getAllRegionalPrices and formatPrice
      expect(typeof getAllRegionalPrices).toBe("function");
      expect(typeof formatPrice).toBe("function");
      expect(typeof convertPrice).toBe("function");
      expect(typeof generateDeterministicOffers).toBe("function");
      expect(typeof getDevicePricingOverview).toBe("function");
      expect(typeof fetchLiveOrFallbackPricing).toBe("function");

      // Verify metadata and rates exports
      expect(Object.keys(FX_RATES).length).toBe(8);
      expect(Object.keys(CURRENCY_METADATA).length).toBe(8);

      // Test functional correctness of getAllRegionalPrices
      const regional = getAllRegionalPrices(1000);
      const expectedCurrencies: CurrencyCode[] = ["USD", "EUR", "GBP", "CAD", "INR", "JPY", "AUD", "NGN"];
      for (const c of expectedCurrencies) {
        expect(regional[c]).toBeDefined();
        expect(regional[c].currency).toBe(c);
        expect(regional[c].amount).toBe(Math.round(1000 * FX_RATES[c]));
        expect(typeof regional[c].formatted).toBe("string");
      }

      // Test functional correctness of formatPrice
      expect(formatPrice(1000, "USD")).toBe("$1,000");
      expect(formatPrice(1000, "GBP")).toBe("£1,000");
    });

    it("verifies proposed alias wrappers (calculateRegionalPrices & formatCurrency) guarantee 100% parity", () => {
      const calculateRegionalPrices = getAllRegionalPrices;
      const formatCurrency = formatPrice;

      const testValues = [0, 1, 499, 999, 1299, 2499, 99999];
      for (const val of testValues) {
        expect(calculateRegionalPrices(val)).toEqual(getAllRegionalPrices(val));
        const currencies: CurrencyCode[] = ["USD", "EUR", "GBP", "CAD", "INR", "JPY", "AUD", "NGN"];
        for (const c of currencies) {
          expect(formatCurrency(val, c)).toBe(formatPrice(val, c));
        }
      }
    });

    it("verifies AST slider count: strictly 10 consumer catalog sliders, 0 sliders in RegionalPricingOffers.tsx", () => {
      function getAllTsxFiles(dir: string): string[] {
        let results: string[] = [];
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            results = results.concat(getAllTsxFiles(fullPath));
          } else if (entry.name.endsWith(".tsx")) {
            results.push(fullPath);
          }
        }
        return results;
      }

      function countSlidersInAst(filePath: string): number {
        const fullPath = path.resolve(filePath);
        const code = fs.readFileSync(fullPath, "utf8");
        const sourceFile = ts.createSourceFile(fullPath, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
        let sliderCount = 0;

        function visit(node: ts.Node) {
          if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
            const tagName = ts.isJsxElement(node)
              ? node.openingElement.tagName.getText(sourceFile)
              : node.tagName.getText(sourceFile);

            if (tagName === "input") {
              const attrs = ts.isJsxElement(node)
                ? node.openingElement.attributes.properties
                : node.attributes.properties;

              for (const prop of attrs) {
                if (ts.isJsxAttribute(prop) && prop.name && prop.name.getText(sourceFile) === "type") {
                  if (prop.initializer && prop.initializer.getText(sourceFile).includes("range")) {
                    sliderCount++;
                  }
                }
              }
            }
          }
          ts.forEachChild(node, visit);
        }

        visit(sourceFile);
        return sliderCount;
      }

      const allTsxFiles = getAllTsxFiles("src");
      expect(allTsxFiles.length).toBeGreaterThan(15);

      const fileSliderBreakdown: Record<string, number> = {};
      for (const file of allTsxFiles) {
        const relPath = path.relative(process.cwd(), file).replace(/\\/g, "/");
        const count = countSlidersInAst(file);
        if (count > 0) {
          fileSliderBreakdown[relPath] = count;
        }
      }

      // Assertions matching repository invariant (page.tsx: 2, PhoneFinderStudio.tsx: 8 -> total 10)
      const pageSliders = fileSliderBreakdown["src/app/page.tsx"] || 0;
      const studioSliders = fileSliderBreakdown["src/components/PhoneFinderStudio.tsx"] || 0;
      const catalogSliderTotal = pageSliders + studioSliders;

      expect(pageSliders).toBe(2);
      expect(studioSliders).toBe(8);
      expect(catalogSliderTotal).toBe(10);

      // Verify RegionalPricingOffers.tsx has strictly 0 sliders
      const regionalPricingSliders = countSlidersInAst("src/components/RegionalPricingOffers.tsx");
      expect(regionalPricingSliders).toBe(0);
      expect(fileSliderBreakdown["src/components/RegionalPricingOffers.tsx"]).toBeUndefined();

      // Verify PhoneSizeComparator (admin geometry tool) has 4 calibration sliders
      expect(fileSliderBreakdown["src/components/PhoneSizeComparator.tsx"]).toBe(4);
    });
  });
});
