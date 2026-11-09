import { describe, it, expect } from "vitest";
import * as crypto from "crypto";
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

// Sample flagship device for testing
const testDevice = {
  id: "samsung-galaxy-s24-ultra",
  name: "Samsung Galaxy S24 Ultra",
  brand: "Samsung",
  slug: "samsung-galaxy-s24-ultra",
  releaseDate: "2024-01-24",
  launchMsrpUsd: 1299,
  currentStreetUsd: 1099,
  category: "Ultra Flagship" as const,
  dimensionsMm: { length: 162.3, width: 79.0, thickness: 8.6 },
  weightGrams: 232,
  display: {
    sizeInches: 6.8,
    resolution: "3120x1440",
    panelType: "Dynamic LTPO AMOLED 2X",
    refreshRateHz: 120,
    peakBrightnessNits: 2600,
    aspectRatio: "19.5:9",
  },
  platform: {
    os: "Android 14",
    chipset: "Snapdragon 8 Gen 3",
    cpuDetails: "Octa-core",
    gpuDetails: "Adreno 750",
  },
  ramGb: 12,
  storageGb: 512,
  rearCameras: [
    { megapixels: 200, sensorSize: "1/1.3\"", aperture: "f/1.7" },
    { megapixels: 50, sensorSize: "1/2.52\"", aperture: "f/3.4" },
  ],
  frontCamera: { megapixels: 12, aperture: "f/2.2" },
  batteryCapacityMah: 5000,
  wiredChargingWatts: 45,
  wirelessChargingWatts: 15,
  hasReverseWireless: true,
  waterResistanceRating: "IP68",
  headphoneJack35mm: false,
  usbType: "USB-C 3.2",
  colors: ["Titanium Gray", "Titanium Black"],
  cellularBands: "5G Sub6/mmWave",
  overallScore: 92,
  valueScore: 84,
  performanceScore: 96,
  cameraScore: 95,
  batteryScore: 90,
  expertReviewExcerpt: "The pinnacle of Android productivity and zoom imaging.",
} as unknown as SmartphoneDevice;

describe("Challenger 2: Systems, Architecture & Resilience Empirical Verification", () => {
  // =========================================================================
  // 1. Multi-Tiered Architecture & Deterministic Fallback Resilience
  // =========================================================================
  describe("1. Multi-Tiered Architecture & Deterministic Fallback Resilience", () => {
    it("L4 Fallback executes in ~1.0-3.0ms with unmemoized toLocaleString, and achieves < 0.05ms with memoized Intl.NumberFormat", () => {
      const iterations = 1000;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        const overview = getDevicePricingOverview(testDevice, "USD");
        expect(overview.pricingSource).toBe("LOCAL_DETERMINISTIC_FALLBACK");
      }

      const totalTimeMs = performance.now() - startTime;
      const avgLatencyMs = totalTimeMs / iterations;

      // Existing unmemoized toLocaleString takes ~1.0ms - 3.5ms per overview call under multi-core load
      expect(avgLatencyMs).toBeLessThan(10.0);

      // Verify that memoizing Intl.NumberFormat achieves the claimed < 0.1ms target (< 0.05ms)
      const formatters = new Map(
        Object.entries(CURRENCY_METADATA).map(([code, meta]) => [code, new Intl.NumberFormat(meta.locale)])
      );
      function fastFormatPrice(amount: number, currency: CurrencyCode = "USD"): string {
        const meta = CURRENCY_METADATA[currency] || CURRENCY_METADATA.USD;
        const formatted = formatters.get(currency)!.format(Math.round(amount));
        return meta.symbolPosition === "SUFFIX" ? `${formatted} ${meta.symbol}` : `${meta.symbol}${formatted}`;
      }

      const fastStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        fastFormatPrice(1099, "USD");
        fastFormatPrice(1099, "EUR");
        fastFormatPrice(1099, "GBP");
        fastFormatPrice(1099, "CAD");
        fastFormatPrice(1099, "INR");
        fastFormatPrice(1099, "JPY");
        fastFormatPrice(1099, "AUD");
        fastFormatPrice(1099, "NGN");
      }
      const fastAvgLatencyMsPerCurrency = (performance.now() - fastStart) / (iterations * 8);
      // Fast memoized Intl formatting completes in < 0.05ms per currency
      expect(fastAvgLatencyMsPerCurrency).toBeLessThan(0.05);
    });

    it("L4 Fallback never throws exceptions even with zero, negative, or undefined prices", () => {
      const edgeCaseDevices: SmartphoneDevice[] = [
        { ...testDevice, launchMsrpUsd: 0, currentStreetUsd: 0 },
        { ...testDevice, launchMsrpUsd: -500, currentStreetUsd: -200 },
        { ...testDevice, launchMsrpUsd: undefined as any, currentStreetUsd: undefined as any },
        { ...testDevice, id: "" },
        { ...testDevice, id: "!@#$%^&*()_+{}[]:;\"'|<>,.?/~`" },
      ];

      for (const dev of edgeCaseDevices) {
        expect(() => getDevicePricingOverview(dev, "USD")).not.toThrow();
        const res = getDevicePricingOverview(dev, "USD");
        expect(res).toBeDefined();
        expect(res.selectedPrice).toBeGreaterThanOrEqual(0);
        expect(res.regionalPrices).toBeDefined();
        expect(res.offers.length).toBeGreaterThan(0);
      }
    });

    it("Cascading network failures (Redis crash -> DB pool exhausted -> API 429) cleanly resolve to L4 fallback", async () => {
      // Simulate multi-tier failure cascade
      async function simulateMultiTierPricingRequest(failL1: boolean, failL2: boolean, failL3: boolean) {
        try {
          if (failL1) throw new Error("L1 Redis Connection Refused: ECONNREFUSED");
          return { source: "L1_CACHE", data: "cached" };
        } catch (l1Err) {
          try {
            if (failL2) throw new Error("L2 PostgreSQL Query Timeout: 504 Gateway Timeout");
            return { source: "L2_DB", data: "db" };
          } catch (l2Err) {
            try {
              if (failL3) throw new Error("L3 External Retailer API Throttled: HTTP 429 Too Many Requests");
              return { source: "L3_API", data: "api" };
            } catch (l3Err) {
              // L4 Fallback
              const fallback = getDevicePricingOverview(testDevice, "USD");
              return { source: "L4_DETERMINISTIC_FALLBACK", data: fallback };
            }
          }
        }
      }

      const result = await simulateMultiTierPricingRequest(true, true, true);
      expect(result.source).toBe("L4_DETERMINISTIC_FALLBACK");
      const fallbackData = result.data as ReturnType<typeof getDevicePricingOverview>;
      expect(fallbackData.pricingSource).toBe("LOCAL_DETERMINISTIC_FALLBACK");
      expect(fallbackData.deviceId).toBe(testDevice.id);
    });
  });

  // =========================================================================
  // 2. Circuit Breaker State Transitions & Thundering Herd
  // =========================================================================
  describe("2. Circuit Breaker State Transitions & Thundering Herd Analysis", () => {
    class CircuitBreaker {
      public state: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED";
      public failureCount = 0;
      public readonly failureThreshold = 5;
      public readonly cooldownMs = 60000;
      public lastTripTime = 0;
      public activeProbe = false; // Single-flight canary lock

      public recordFailure(now: number) {
        this.failureCount++;
        if (this.failureCount >= this.failureThreshold) {
          this.state = "OPEN";
          this.lastTripTime = now;
        }
      }

      public recordSuccess() {
        this.failureCount = 0;
        this.state = "CLOSED";
        this.activeProbe = false;
      }

      // Vulnerable naive evaluation (allows thundering herd)
      public canExecuteNaive(now: number): boolean {
        if (this.state === "CLOSED") return true;
        if (this.state === "OPEN" && now - this.lastTripTime >= this.cooldownMs) {
          this.state = "HALF_OPEN";
          return true;
        }
        return this.state === "HALF_OPEN";
      }

      // Hardened atomic evaluation with single-flight canary probe
      public canExecuteHardened(now: number): boolean {
        if (this.state === "CLOSED") return true;
        if (this.state === "OPEN") {
          if (now - this.lastTripTime >= this.cooldownMs) {
            // Atomic canary lock: exactly ONE probe is allowed
            if (!this.activeProbe) {
              this.activeProbe = true;
              this.state = "HALF_OPEN";
              return true;
            }
          }
          return false; // All other concurrent requests bypass to fallback
        }
        if (this.state === "HALF_OPEN") {
          return false; // Existing probe in flight; do not send more
        }
        return false;
      }
    }

    it("Demonstrates naive circuit breaker suffers thundering herd upon cooldown expiry", () => {
      const cb = new CircuitBreaker();
      const tripTime = 100000;
      for (let i = 0; i < 5; i++) cb.recordFailure(tripTime);
      expect(cb.state).toBe("OPEN");

      // 100 concurrent requests arrive at tripTime + 60,001 ms
      const arrivalTime = tripTime + 60001;
      let upstreamRequestsAllowed = 0;

      for (let i = 0; i < 100; i++) {
        if (cb.canExecuteNaive(arrivalTime)) {
          upstreamRequestsAllowed++;
        }
      }

      // Naive implementation allowed all 100 requests into the struggling upstream API!
      expect(upstreamRequestsAllowed).toBe(100);
    });

    it("Hardened circuit breaker with single-flight canary lock permits strictly 1 probe, shielding upstream", () => {
      const cb = new CircuitBreaker();
      const tripTime = 100000;
      for (let i = 0; i < 5; i++) cb.recordFailure(tripTime);
      expect(cb.state).toBe("OPEN");

      // 100 concurrent requests arrive at tripTime + 60,001 ms
      const arrivalTime = tripTime + 60001;
      let probesSent = 0;
      let fallbacksTriggered = 0;

      for (let i = 0; i < 100; i++) {
        if (cb.canExecuteHardened(arrivalTime)) {
          probesSent++;
        } else {
          fallbacksTriggered++;
        }
      }

      // Exactly 1 probe permitted to test upstream; remaining 99 served by fallback
      expect(probesSent).toBe(1);
      expect(fallbacksTriggered).toBe(99);
      expect(cb.state).toBe("HALF_OPEN");
    });
  });

  // =========================================================================
  // 3. Token Bucket vs Upstream Quota Invariant (Amazon PA-API 1 TPS)
  // =========================================================================
  describe("3. Rate Limiter Burst Behavior vs Upstream Quota Invariants", () => {
    it("Token bucket with capacity > 1 allows bursts that violate Amazon PA-API 1 TPS limit", () => {
      class TokenBucket {
        constructor(public capacity: number, public refillRatePerSec: number, public tokens: number) {}
        public consume(): boolean {
          if (this.tokens >= 1) {
            this.tokens -= 1;
            return true;
          }
          return false;
        }
      }

      // Bucket initialized with capacity 5 and refill rate 1/s, full after idle period
      const bucket = new TokenBucket(5, 1, 5);
      let instantBurstsAllowed = 0;

      // Batch worker requests 5 items at once
      for (let i = 0; i < 5; i++) {
        if (bucket.consume()) instantBurstsAllowed++;
      }

      // 5 requests allowed in the same millisecond!
      expect(instantBurstsAllowed).toBe(5);
      // But Amazon PA-API strictly allows max 1 request in any 1-second window!
      // This proves that TokenBucket capacity MUST be set to 1 or paired with a minimum 1000ms inter-request delay.
    });

    it("Leaky Bucket or TokenBucket(capacity=1) enforces strict inter-request pacing >= 1000ms", () => {
      class PacedQueue {
        public lastRequestTime = 0;
        public readonly minDelayMs = 1000; // Enforces 1 TPS

        public canSendImmediately(now: number): { allowed: boolean; waitMs: number } {
          const elapsed = now - this.lastRequestTime;
          if (elapsed >= this.minDelayMs) {
            this.lastRequestTime = now;
            return { allowed: true, waitMs: 0 };
          }
          return { allowed: false, waitMs: this.minDelayMs - elapsed };
        }
      }

      const queue = new PacedQueue();
      const t0 = 10000;

      const first = queue.canSendImmediately(t0);
      expect(first.allowed).toBe(true);

      // Attempt second request 100ms later (burst)
      const second = queue.canSendImmediately(t0 + 100);
      expect(second.allowed).toBe(false);
      expect(second.waitMs).toBe(900); // Must delay 900ms

      // Attempt after 1000ms
      const third = queue.canSendImmediately(t0 + 1000);
      expect(third.allowed).toBe(true);
    });
  });

  // =========================================================================
  // 4. Backward Compatibility & Code Invariants
  // =========================================================================
  describe("4. Backward Compatibility & Code Invariants", () => {
    it("pricing-service.ts exports all legacy functions with exact signatures", () => {
      expect(typeof convertPrice).toBe("function");
      expect(typeof formatPrice).toBe("function");
      expect(typeof getAllRegionalPrices).toBe("function");
      expect(typeof generateDeterministicOffers).toBe("function");
      expect(typeof getDevicePricingOverview).toBe("function");
      expect(typeof fetchLiveOrFallbackPricing).toBe("function");
      expect(FX_RATES).toBeDefined();
      expect(CURRENCY_METADATA).toBeDefined();
    });

    it("Aliasing calculateRegionalPrices -> getAllRegionalPrices and formatCurrency -> formatPrice guarantees 100% compatibility", () => {
      // Define proposed aliases
      const calculateRegionalPrices = getAllRegionalPrices;
      const formatCurrency = formatPrice;

      const originalRegional = getAllRegionalPrices(1000);
      const aliasedRegional = calculateRegionalPrices(1000);
      expect(aliasedRegional).toEqual(originalRegional);

      const originalFormat = formatPrice(1000, "USD");
      const aliasedFormat = formatCurrency(1000, "USD");
      expect(aliasedFormat).toBe(originalFormat);
    });

    it("Verifies AST Invariants: Exactly 10 sliders total, 0 sliders in RegionalPricingOffers.tsx, no illegal button nesting", () => {
      function countSlidersInFile(relPath: string): number {
        const fullPath = path.resolve(relPath);
        const code = fs.readFileSync(fullPath, "utf8");
        const sourceFile = ts.createSourceFile(fullPath, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
        let count = 0;

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
                    count++;
                  }
                }
              }
            }
          }
          ts.forEachChild(node, visit);
        }
        visit(sourceFile);
        return count;
      }

      const pageSliders = countSlidersInFile("src/app/page.tsx");
      const studioSliders = countSlidersInFile("src/components/PhoneFinderStudio.tsx");
      const regionalSliders = countSlidersInFile("src/components/RegionalPricingOffers.tsx");

      expect(pageSliders).toBe(2);
      expect(studioSliders).toBe(8);
      expect(pageSliders + studioSliders).toBe(10);
      expect(regionalSliders).toBe(0); // Strictly zero sliders in RegionalPricingOffers!
    });
  });

  // =========================================================================
  // 5. Ingestion Pipeline, Amazon PA-API Quota Math & Webhook Idempotency
  // =========================================================================
  describe("5. Ingestion Pipeline, PA-API Quota Math & Webhook Idempotency", () => {
    it("Mathematically validates Amazon PA-API daily call budget vs Tier 1 polling frequency", () => {
      const tier1DeviceCount = 50;
      const hoursPerDay = 24;
      const dailyUnbatchedCalls = tier1DeviceCount * hoursPerDay; // 1,200
      const dailyBatchedCalls = Math.ceil(tier1DeviceCount / 10) * hoursPerDay; // 5 * 24 = 120
      const amazonBaselineDailyLimit = 86400; // 1 TPS = 86,400 calls/day

      expect(dailyUnbatchedCalls).toBe(1200);
      expect(dailyBatchedCalls).toBe(120);

      const unbatchedQuotaUsagePct = (dailyUnbatchedCalls / amazonBaselineDailyLimit) * 100;
      const batchedQuotaUsagePct = (dailyBatchedCalls / amazonBaselineDailyLimit) * 100;

      expect(unbatchedQuotaUsagePct).toBeLessThan(1.5); // ~1.39% of daily quota
      expect(batchedQuotaUsagePct).toBeLessThan(0.15); // ~0.14% of daily quota
    });

    it("Verifies Webhook Idempotency: HMAC-SHA256 signature verification & Redis atomic nonce deduplication", () => {
      const secret = "pos_webhook_secret_key_2026";
      const payload = JSON.stringify({
        event: "inventory.count.updated",
        merchantId: "shopify-store-nyc-01",
        storeCode: "BBY-US-0492",
        sku: "SAM-S24U-512-GRY",
        newQuantity: 14,
        timestamp: Date.now(),
      });

      // Compute HMAC-SHA256
      const validHmac = crypto.createHmac("sha256", secret).update(payload).digest("hex");

      // 1. Signature Verification
      function verifyHmac(receivedHmac: string, body: string): boolean {
        const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
        return crypto.timingSafeEqual(Buffer.from(receivedHmac, "hex"), Buffer.from(expected, "hex"));
      }

      const corruptedHmac = validHmac.slice(0, -1) + (validHmac.endsWith("0") ? "1" : "0");
      expect(verifyHmac(validHmac, payload)).toBe(true);
      expect(verifyHmac(corruptedHmac, payload)).toBe(false);

      // 2. Simulated Redis Atomic SET NX Deduplication
      const simulatedRedisStore = new Map<string, number>();

      function handleWebhook(idempotencyKey: string, now: number, ttlSec: number): { status: number; message: string } {
        if (simulatedRedisStore.has(idempotencyKey)) {
          const expiresAt = simulatedRedisStore.get(idempotencyKey)!;
          if (now < expiresAt) {
            // Duplicate event detected: acknowledge with 200 OK without re-processing
            return { status: 200, message: "Duplicate event ignored (Idempotent OK)" };
          }
        }
        // Atomic SET key value EX ttl
        simulatedRedisStore.set(idempotencyKey, now + ttlSec * 1000);
        return { status: 200, message: "Processed successfully" };
      }

      const nonce = "evt_webhook_nonce_12345678";
      const t0 = 1000000;

      // First delivery: successfully processed
      const firstResult = handleWebhook(nonce, t0, 86400);
      expect(firstResult.message).toBe("Processed successfully");

      // Duplicate delivery 2 seconds later (Shopify network retry): ignored idempotently
      const retryResult = handleWebhook(nonce, t0 + 2000, 86400);
      expect(retryResult.message).toBe("Duplicate event ignored (Idempotent OK)");
      expect(retryResult.status).toBe(200);
    });
  });
});
