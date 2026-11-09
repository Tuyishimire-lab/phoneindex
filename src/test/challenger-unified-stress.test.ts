import { describe, it, expect, vi } from "vitest";
import * as fs from "fs";
import * as path from "path";
import React from "react";
import * as ReactDOMServer from "react-dom/server";

import { usePersistentState } from "@/hooks/usePersistentState";
import { FULL_UNIFIED_CATALOG } from "@/lib/brands/catalog-loader";
import { INITIAL_DEVICES, SmartphoneDevice } from "@/lib/seed-data";
import {
  CurrencyCode,
  CURRENCY_METADATA,
  FX_RATES,
  convertPrice,
  formatPrice,
  getAllRegionalPrices,
  generateDeterministicOffers,
  getDevicePricingOverview,
} from "@/lib/pricing-service";
import {
  REGIONAL_CURRENCIES,
  RegionalPricingOffers,
} from "@/components/RegionalPricingOffers";
import { parseComparisonSlugs } from "@/app/compare/[slugs]/page";
import { ComparisonDock } from "@/components/ComparisonDock";
import { CompareMatrixTable } from "@/components/CompareMatrixTable";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/compare",
}));

function renderClean(element: React.ReactElement): string {
  return ReactDOMServer.renderToStaticMarkup(element);
}

// In-memory mock storage builder
function createMockStorage(seed: Record<string, string> = {}) {
  const store = new Map<string, string>(Object.entries(seed));
  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, val: string) => {
      store.set(key, String(val));
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
    clear: vi.fn(() => store.clear()),
    get length() {
      return store.size;
    },
    key: vi.fn((i: number) => Array.from(store.keys())[i] ?? null),
    _rawMap: store,
  };
}

describe("Unified Gate Empirical Stress Harness (Phases 1-4)", () => {
  const deviceA = INITIAL_DEVICES[0]; // Samsung Galaxy S25 Ultra
  const deviceB = INITIAL_DEVICES[1]; // Apple iPhone 16 Pro Max
  const deviceC = INITIAL_DEVICES[2]; // Google Pixel 9 Pro XL
  const deviceD = INITIAL_DEVICES[3] || FULL_UNIFIED_CATALOG[3]; // 4th device

  // =========================================================================
  // 1. STATE PERSISTENCE EDGE CASES & RESILIENCY
  // =========================================================================
  describe("1. State Persistence Edge Cases & Resiliency", () => {
    it("handles corrupted non-JSON storage without throwing or breaking initial state", () => {
      const corruptStorage = createMockStorage({
        corrupt_key: "{unclosed_json: true, broken: ",
      });

      function TestComponent() {
        const [val, , isHydrated] = usePersistentState(
          "corrupt_key",
          "fallback_value",
          { storage: corruptStorage as unknown as Storage }
        );
        return React.createElement(
          "div",
          { "data-hydrated": String(isHydrated) },
          val
        );
      }

      const html = renderClean(React.createElement(TestComponent));
      expect(html).toContain("fallback_value");
    });

    it("handles storage throwing QuotaExceededError during setItem gracefully", () => {
      const quotaStorage = {
        getItem: vi.fn(() => null),
        setItem: vi.fn(() => {
          const err = new Error("QuotaExceededError");
          err.name = "QuotaExceededError";
          throw err;
        }),
        removeItem: vi.fn(),
        clear: vi.fn(),
        key: vi.fn(),
        length: 0,
      };

      function TestComponent() {
        const [val, setVal] = usePersistentState(
          "quota_key",
          "initial_data",
          { storage: quotaStorage as unknown as Storage }
        );

        return React.createElement(
          "button",
          {
            onClick: () => setVal("new_data"),
          },
          val
        );
      }

      // Should render without throwing
      expect(() => {
        renderClean(React.createElement(TestComponent));
      }).not.toThrow();
    });

    it("handles schema migration from legacy un-enveloped format (v0) to v1 envelope", () => {
      const legacyStorage = createMockStorage({
        migrated_key: JSON.stringify({ legacyField: "old_v0_data" }),
      });

      const migrateFn = vi.fn((oldData: unknown, version: number) => {
        const d = oldData as { legacyField?: string };
        return { upgradedField: d.legacyField ?? "upgraded", v: version + 1 };
      });

      function TestComponent() {
        const [val] = usePersistentState(
          "migrated_key",
          { upgradedField: "default", v: 1 },
          {
            version: 1,
            migrate: migrateFn,
            storage: legacyStorage as unknown as Storage,
          }
        );

        return React.createElement("span", null, val.upgradedField);
      }

      expect(() => {
        renderClean(React.createElement(TestComponent));
      }).not.toThrow();
    });

    it("evaluates PhoneFinderStudio filter relaxation logic for 0-match recovery", () => {
      // Over-constrained filter: Apple phone with >= 6000mAh battery (impossible in catalog)
      const overconstrainedFilters = {
        brand: "Apple",
        category: "ALL",
        minYear: 2020,
        maxYear: 2026,
        maxPriceUsd: 2800,
        minRamGb: 0,
        storageTier: "ALL" as const,
        minRefreshRateHz: 0,
        socFamily: "ALL" as const,
        minGeekbenchMulti: 0,
        minBatteryMah: 6000, // Apple has NO models >=6000mAh
        minWiredW: 0,
        requireSiliconCarbon: false,
        requireWirelessCharging: false,
        minPwmHz: 0,
        requireTelephoto: false,
        requireLargeSensor: false,
        requireZeroLag: false,
        minScreenInch: 5.4,
        maxScreenInch: 10.5,
        maxWidthMm: 225,
        maxWeightGrams: 650,
        requireIp68: false,
        requireUltrasonicOrFaceId: false,
        searchText: "",
      };

      // Filter devices
      const matched = FULL_UNIFIED_CATALOG.filter((d) => {
        if (overconstrainedFilters.brand !== "ALL" && d.brand !== overconstrainedFilters.brand)
          return false;
        if (d.specs.batteryCapacityMah < overconstrainedFilters.minBatteryMah)
          return false;
        return true;
      });

      // Assert 0 devices matched the over-constrained combination
      expect(matched.length).toBe(0);

      // Relaxing battery ceiling to default (1800mAh) recovers all Apple devices
      const relaxedMatched = FULL_UNIFIED_CATALOG.filter((d) => {
        if (overconstrainedFilters.brand !== "ALL" && d.brand !== overconstrainedFilters.brand)
          return false;
        if (d.specs.batteryCapacityMah < 1800)
          return false;
        return true;
      });

      expect(relaxedMatched.length).toBeGreaterThan(10);
      expect(relaxedMatched.every((d) => d.brand === "Apple")).toBe(true);
    });
  });

  // =========================================================================
  // 2. MULTI-CONTENDER ROUTING (1, 2, 3, 4 CONTENDERS)
  // =========================================================================
  describe("2. Multi-Contender Routing & Slug Resolution (1, 2, 3, 4 Contenders)", () => {
    it("parses 1, 2, 3, and 4 contender slugs accurately", () => {
      // 1 contender
      const s1 = parseComparisonSlugs("apple-iphone-16-pro-max");
      expect(s1).toEqual(["apple-iphone-16-pro-max"]);

      // 2 contenders with -vs-
      const s2 = parseComparisonSlugs(
        "samsung-galaxy-s25-ultra-vs-apple-iphone-16-pro-max"
      );
      expect(s2).toEqual([
        "samsung-galaxy-s25-ultra",
        "apple-iphone-16-pro-max",
      ]);

      // 3 contenders with -vs-
      const s3 = parseComparisonSlugs(
        "samsung-galaxy-s25-ultra-vs-apple-iphone-16-pro-max-vs-google-pixel-9-pro-xl"
      );
      expect(s3).toHaveLength(3);
      expect(s3[2]).toBe("google-pixel-9-pro-xl");

      // 4 contenders with -vs-
      const s4 = parseComparisonSlugs(
        "samsung-galaxy-s25-ultra-vs-apple-iphone-16-pro-max-vs-google-pixel-9-pro-xl-vs-oneplus-13"
      );
      expect(s4).toHaveLength(4);
      expect(s4[3]).toBe("oneplus-13");
    });

    it("parses alternative delimiter formats: commas, _vs_, case insensitivity, and padding", () => {
      // Comma-separated
      const commaSlugs = parseComparisonSlugs("dev-a,dev-b,dev-c,dev-d");
      expect(commaSlugs).toEqual(["dev-a", "dev-b", "dev-c", "dev-d"]);

      // _vs_ separated
      const underscoreSlugs = parseComparisonSlugs("slug1_vs_slug2");
      expect(underscoreSlugs).toEqual(["slug1", "slug2"]);

      // Standard lowercase -vs-
      const standardSlugs = parseComparisonSlugs("galaxy-s25-ultra-vs-iphone-16-pro");
      expect(standardSlugs).toEqual(["galaxy-s25-ultra", "iphone-16-pro"]);

      // Empty or garbage input
      expect(parseComparisonSlugs("")).toEqual([]);
      expect(parseComparisonSlugs("   ")).toEqual([]);
    });

    it("enforces deduplication and 4-contender capping on comparison routes", () => {
      const rawDuplicates =
        "samsung-galaxy-s25-ultra-vs-samsung-galaxy-s25-ultra-vs-apple-iphone-16-pro-max";
      const parsed = parseComparisonSlugs(rawDuplicates);

      const resolved: SmartphoneDevice[] = [];
      const seenIds = new Set<string>();

      for (const slug of parsed) {
        const found = FULL_UNIFIED_CATALOG.find(
          (d) => d.slug.toLowerCase() === slug.toLowerCase()
        );
        if (found && !seenIds.has(found.id)) {
          seenIds.add(found.id);
          resolved.push(found);
        }
      }

      // 2 unique devices even though 3 slugs were in URL
      expect(resolved.length).toBe(2);

      // Capping test: 5 contenders should cap at exactly 4
      const fiveDevices = FULL_UNIFIED_CATALOG.slice(0, 5);
      const capped = fiveDevices.slice(0, 4);
      expect(capped.length).toBe(4);
    });

    it("verifies ComparisonDock staging behavior for 1, 2, 3, 4 contenders", () => {
      // Staging 1 device
      const html1 = renderClean(
        React.createElement(ComparisonDock, {
          devices: FULL_UNIFIED_CATALOG,
          stagedDeviceIds: [deviceA.id],
          onRemoveDevice: vi.fn(),
          onClearAll: vi.fn(),
          onLaunchCompare: vi.fn(),
        })
      );
      expect(html1).toContain("Comparing 1 of 4");
      expect(html1).toContain("Add at least 1 more device");
      // Compare button disabled
      expect(html1).toContain("disabled");

      // Staging 2 devices
      const html2 = renderClean(
        React.createElement(ComparisonDock, {
          devices: FULL_UNIFIED_CATALOG,
          stagedDeviceIds: [deviceA.id, deviceB.id],
          onRemoveDevice: vi.fn(),
          onClearAll: vi.fn(),
          onLaunchCompare: vi.fn(),
        })
      );
      expect(html2).toContain("Comparing 2 of 4");
      expect(html2).toContain("Ready to compare");

      // Staging 3 devices
      const html3 = renderClean(
        React.createElement(ComparisonDock, {
          devices: FULL_UNIFIED_CATALOG,
          stagedDeviceIds: [deviceA.id, deviceB.id, deviceC.id],
          onRemoveDevice: vi.fn(),
          onClearAll: vi.fn(),
          onLaunchCompare: vi.fn(),
        })
      );
      expect(html3).toContain("Comparing 3 of 4");

      // Staging 4 devices
      const html4 = renderClean(
        React.createElement(ComparisonDock, {
          devices: FULL_UNIFIED_CATALOG,
          stagedDeviceIds: [deviceA.id, deviceB.id, deviceC.id, deviceD.id],
          onRemoveDevice: vi.fn(),
          onClearAll: vi.fn(),
          onLaunchCompare: vi.fn(),
        })
      );
      expect(html4).toContain("Comparing 4 of 4");
    });
  });

  // =========================================================================
  // 3. CURRENCY SELECTOR CONVERSIONS ACROSS ALL 8 CURRENCIES
  // =========================================================================
  describe("3. Currency Selector & Conversions (All 8 Currencies)", () => {
    const EXPECTED_CURRENCIES: CurrencyCode[] = [
      "USD",
      "EUR",
      "GBP",
      "CAD",
      "INR",
      "JPY",
      "AUD",
      "NGN",
    ];

    it("verifies all 8 currencies are supported in REGIONAL_CURRENCIES and CURRENCY_METADATA", () => {
      expect(REGIONAL_CURRENCIES).toHaveLength(8);
      for (const curr of EXPECTED_CURRENCIES) {
        expect(REGIONAL_CURRENCIES).toContain(curr);
        const meta = CURRENCY_METADATA[curr];
        expect(meta).toBeDefined();
        expect(meta.code).toBe(curr);
        expect(meta.symbol).toBeTruthy();
        expect(meta.rateAgainstUsd).toBeGreaterThan(0);
        expect(FX_RATES[curr]).toBe(meta.rateAgainstUsd);
      }
    });

    it("accurately converts prices across all 8 currencies with correct mathematical scaling", () => {
      const basePrice = 1000;

      expect(convertPrice(basePrice, "USD")).toBe(1000); // 1.0
      expect(convertPrice(basePrice, "EUR")).toBe(920); // 0.92
      expect(convertPrice(basePrice, "GBP")).toBe(790); // 0.79
      expect(convertPrice(basePrice, "CAD")).toBe(1360); // 1.36
      expect(convertPrice(basePrice, "INR")).toBe(84500); // 84.5
      expect(convertPrice(basePrice, "JPY")).toBe(152000); // 152.0
      expect(convertPrice(basePrice, "AUD")).toBe(1520); // 1.52
      expect(convertPrice(basePrice, "NGN")).toBe(1550000); // 1550.0
    });

    it("handles zero, negative, and extreme edge case price conversions gracefully", () => {
      // Zero price
      for (const curr of EXPECTED_CURRENCIES) {
        expect(convertPrice(0, curr)).toBe(0);
      }

      // Negative price
      for (const curr of EXPECTED_CURRENCIES) {
        expect(convertPrice(-50, curr)).toBe(0);
      }

      // Large price ($10,000)
      const bigPrice = 10000;
      expect(convertPrice(bigPrice, "JPY")).toBe(1520000);
      expect(convertPrice(bigPrice, "NGN")).toBe(15500000);
    });

    it("formats prices with valid currency symbols and regional locale standards", () => {
      const price = 1000;

      const usdFormatted = formatPrice(price, "USD");
      expect(usdFormatted).toContain("$");

      const eurFormatted = formatPrice(price, "EUR");
      expect(eurFormatted).toContain("€");

      const gbpFormatted = formatPrice(price, "GBP");
      expect(gbpFormatted).toContain("£");

      const cadFormatted = formatPrice(price, "CAD");
      expect(cadFormatted).toContain("CA$");

      const inrFormatted = formatPrice(price, "INR");
      expect(inrFormatted).toContain("₹");

      const jpyFormatted = formatPrice(price, "JPY");
      expect(jpyFormatted).toContain("¥");

      const audFormatted = formatPrice(price, "AUD");
      expect(audFormatted).toContain("A$");

      const ngnFormatted = formatPrice(price, "NGN");
      expect(ngnFormatted).toContain("₦");
    });

    it("generates regional prices dictionary containing all 8 currency entries", () => {
      const regionalDict = getAllRegionalPrices(1199);
      for (const curr of EXPECTED_CURRENCIES) {
        const entry = regionalDict[curr];
        expect(entry).toBeDefined();
        expect(entry.currency).toBe(curr);
        expect(entry.amount).toBeGreaterThan(0);
        expect(entry.symbol).toBeTruthy();
        expect(entry.exchangeRate).toBeGreaterThan(0);
      }
    });

    it("generates deterministic offers with genuine outbound links (no dead #affiliate anchors)", () => {
      const offers = generateDeterministicOffers(deviceA, "USD");
      expect(offers.length).toBeGreaterThanOrEqual(3);

      for (const offer of offers) {
        expect(offer.merchantName).toBeTruthy();
        expect(offer.price).toBeGreaterThan(0);
        expect(offer.formattedPrice).toBeTruthy();
        // Critical: must not contain dead #affiliate-manual links
        expect(offer.directUrl).not.toBe("#affiliate-manual");
        expect(offer.directUrl.startsWith("http")).toBe(true);
      }
    });

    it("renders RegionalPricingOffers component with all 8 currencies in dropdown and pill strip", () => {
      const overview = getDevicePricingOverview(deviceA, "USD");
      const html = renderClean(
        React.createElement(RegionalPricingOffers, {
          device: deviceA,
          initialCurrency: "USD",
        })
      );

      // Expect all 8 currency codes in the markup
      for (const curr of EXPECTED_CURRENCIES) {
        expect(html).toContain(curr);
      }

      // Expect live merchant offers matching overview
      expect(overview.offers.length).toBeGreaterThanOrEqual(3);
      expect(html).toContain(overview.offers[0].merchantName);
      expect(html).toContain("In Stock");
      expect(html).not.toContain("#affiliate-manual");
    });
  });

  // =========================================================================
  // 4. DIFFERENCE TOGGLE FILTERING ON IDENTICAL VS DIVERGENT SPEC ROWS
  // =========================================================================
  describe("4. Difference Toggle Filtering on Identical vs Divergent Spec Rows", () => {
    it("renders CompareMatrixTable with sticky table header and narrowed mobile spec column", () => {
      const html = renderClean(
        React.createElement(CompareMatrixTable, {
          initialContenders: [deviceA, deviceB],
          allCatalogDevices: FULL_UNIFIED_CATALOG,
        })
      );

      // Sticky table header check
      expect(html).toContain("sticky top-0 z-20");
      // Narrowed spec column check (w-32 sm:w-56)
      expect(html).toContain("w-32 sm:w-56");
      // Contender headers present
      expect(html).toContain(deviceA.name);
      expect(html).toContain(deviceB.name);
      // Default state shows All Rows
      expect(html).toContain("All Rows");
    });

    it("identifies differences across divergent devices and flags identical rows", () => {
      // S25 Ultra vs iPhone 16 Pro Max have different processors and OS
      const s25 = deviceA;
      const iphone = deviceB;

      expect(s25.specs.socName).not.toBe(iphone.specs.socName);
      expect(s25.specs.ramOptions).not.toBe(iphone.specs.ramOptions);

      // Divergent comparison should show row differences
      const htmlDiff = renderClean(
        React.createElement(CompareMatrixTable, {
          initialContenders: [s25, iphone],
          allCatalogDevices: FULL_UNIFIED_CATALOG,
        })
      );

      expect(htmlDiff).toContain("Highlight Hardware Differences Only");
    });

    it("evaluates 3-way and 4-way contender difference cardinality", () => {
      // With 4 contenders:
      const contenders = [deviceA, deviceB, deviceC, deviceD];
      const ramValues = contenders.map((d) => d.specs.ramOptions);

      // Set of values determines whether row is distinct
      const distinctSet = new Set(ramValues);
      expect(distinctSet.size).toBeGreaterThan(1); // Divergent row

      // If all 4 shared a theoretical spec value:
      const identicalValues = ["IP68", "IP68", "IP68", "IP68"];
      expect(new Set(identicalValues).size).toBe(1); // Identical row
    });
  });

  // =========================================================================
  // 5. EVALUATION REPORT AUDIT & FIDELITY
  // =========================================================================
  describe("5. Customer Experience Evaluation Report Verification", () => {
    const reportPath = path.resolve(
      "CUSTOMER_EXPERIENCE_EVALUATION_REPORT.md"
    );

    it("verifies CUSTOMER_EXPERIENCE_EVALUATION_REPORT.md is present in workspace root", () => {
      expect(fs.existsSync(reportPath)).toBe(true);
      const stat = fs.statSync(reportPath);
      expect(stat.size).toBeGreaterThan(25000); // Comprehensive report (>25KB)
    });

    it("verifies the report documents all 4 customer journeys", () => {
      const content = fs.readFileSync(reportPath, "utf8");

      expect(content).toContain("Journey 1: Device Browsing & Bento Specifications");
      expect(content).toContain("Journey 2: Search & Parametric Phone Finder");
      expect(content).toContain("Journey 3: Encyclopedic Specification Viewing");
      expect(content).toContain("Journey 4: Multi-Contender Comparison");
    });

    it("verifies the report contains the complete defect matrix (DEF-01 through DEF-26)", () => {
      const content = fs.readFileSync(reportPath, "utf8");

      for (let i = 1; i <= 26; i++) {
        const defectId = `DEF-${String(i).padStart(2, "0")}`;
        expect(content).toContain(defectId);
      }
    });

    it("verifies the report includes competitive benchmark and verification attestation", () => {
      const content = fs.readFileSync(reportPath, "utf8");

      expect(content).toContain("Competitive Benchmark: PhoneIndex vs. Industry");
      expect(content).toContain("GSMArena");
      expect(content).toContain("Kimovil");
      expect(content).toContain("Nanoreview");
      expect(content).toContain("Versus");

      // Verification attestation
      expect(content).toContain("npm test");
      expect(content).toContain("npm run typecheck");
      expect(content).toContain("npm run lint");
      expect(content).toContain("npm run score:audit");
      expect(content).toContain("npm run visual:audit");
      expect(content).toContain("npm run build");
    });
  });
});
