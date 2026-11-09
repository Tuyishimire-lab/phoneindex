import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { FULL_UNIFIED_CATALOG } from "@/lib/brands/catalog-loader";
import { parseComparisonSlugs } from "@/app/compare/[slugs]/page";
import {
  usePersistentState,
  STORAGE_SYNC_EVENT,
  STORAGE_SYNC_EVENT_LEGACY,
  StorageEnvelope,
} from "@/hooks/usePersistentState";
import {
  checkRateLimit,
  resetRateLimiter,
  getClientIp,
} from "@/lib/rate-limiter";
import {
  createDebateStream,
  sanitizeDebatePrompt,
} from "@/lib/debate-service";
import { POST } from "@/app/api/debate/route";
import {
  calculateReferenceEnduranceHours,
  calculateReferenceAcoustics,
  MANDATORY_LEGAL_DISCLAIMERS,
} from "@/lib/lab-measurements";
import {
  convertPrice,
  formatPrice,
  generateDeterministicOffers,
  FX_RATES,
} from "@/lib/pricing-service";

// ============================================================================
// Helper: Lightweight React 19 Hook Runner for Node environment
// ============================================================================
interface HookRunnerResult<T> {
  current: [T, (val: T | ((prev: T) => T)) => void, boolean] & {
    value: T;
    setValue: (val: T | ((prev: T) => T)) => void;
    isHydrated: boolean;
    reset: () => void;
  };
}

function runPersistentHook<T>(
  key: string,
  initial: T | (() => T),
  options: Parameters<typeof usePersistentState<T>>[2] = {}
) {
  let hookIndex = 0;
  const states: unknown[] = [];
  const effectCleanups: Array<() => void> = [];
  const pendingEffects: Array<() => void | (() => void)> = [];
  const refs: Array<{ current: unknown }> = [];

  const result: HookRunnerResult<T> = {
    current: null as unknown as HookRunnerResult<T>["current"],
  };

  const dispatcher = {
    useState(initialVal: unknown) {
      const idx = hookIndex++;
      if (states[idx] === undefined) {
        states[idx] =
          typeof initialVal === "function"
            ? (initialVal as () => unknown)()
            : initialVal;
      }
      const setState = (action: unknown) => {
        states[idx] =
          typeof action === "function"
            ? (action as (p: unknown) => unknown)(states[idx])
            : action;
        rerender();
      };
      return [states[idx], setState];
    },
    useRef(initialVal: unknown) {
      const idx = hookIndex++;
      if (refs[idx] === undefined) {
        refs[idx] = { current: initialVal };
      }
      return refs[idx];
    },
    useCallback(fn: unknown) {
      return fn;
    },
    useEffect(effect: () => void | (() => void)) {
      pendingEffects.push(effect);
    },
  };

  function rerender() {
    hookIndex = 0;
    const clientInternals = (
      React as unknown as {
        __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE: {
          H: unknown;
        };
      }
    ).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;

    const previousDispatcher = clientInternals.H;
    clientInternals.H = dispatcher;
    try {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      result.current = usePersistentState<T>(key, initial, options) as unknown as HookRunnerResult<T>["current"];
    } finally {
      clientInternals.H = previousDispatcher;
    }
  }

  // Initial mount render
  rerender();

  // Run pending effects
  while (pendingEffects.length > 0) {
    const eff = pendingEffects.shift()!;
    const cleanup = eff();
    if (typeof cleanup === "function") {
      effectCleanups.push(cleanup);
    }
  }

  return {
    result,
    rerender,
    unmount() {
      for (const cleanup of effectCleanups) {
        cleanup();
      }
    },
  };
}

function flushMicrotasks(): Promise<void> {
  return new Promise<void>((resolve) => {
    queueMicrotask(() => resolve());
  });
}

describe("Adversarial Release Readiness Stress Suite — Challenger 1", () => {
  // =========================================================================
  // Target 1: Slug Collision Elimination & Catalog Scale (Feature #19)
  // =========================================================================
  describe("Target 1: Slug Collision Elimination & Catalog Scale", () => {
    it("asserts FULL_UNIFIED_CATALOG has exactly 939 devices and 939 unique slugs", () => {
      expect(FULL_UNIFIED_CATALOG.length).toBe(939);
      const uniqueSlugs = new Set(FULL_UNIFIED_CATALOG.map((d) => d.slug));
      expect(uniqueSlugs.size).toBe(939);
    });

    it("asserts all 939 device slugs strictly conform to URL-safe canonical format", () => {
      const slugRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;
      const invalidSlugs: string[] = [];

      for (const device of FULL_UNIFIED_CATALOG) {
        if (!slugRegex.test(device.slug)) {
          invalidSlugs.push(`${device.id}: "${device.slug}"`);
        }
      }

      expect(invalidSlugs).toEqual([]);
    });

    it("verifies collision elimination between base and plus/pro models", () => {
      const s24 = FULL_UNIFIED_CATALOG.find(
        (d) => d.brand.toLowerCase() === "samsung" && d.name.toLowerCase() === "galaxy s24"
      );
      const s24Plus = FULL_UNIFIED_CATALOG.find(
        (d) =>
          d.brand.toLowerCase() === "samsung" &&
          (d.name.toLowerCase() === "galaxy s24+" || d.name.toLowerCase() === "galaxy s24 plus")
      );

      expect(s24).toBeDefined();
      expect(s24Plus).toBeDefined();
      expect(s24!.slug).not.toBe(s24Plus!.slug);
      expect(s24Plus!.slug).toContain("plus");

      // Verify Tecno Spark 20 variants
      const tecno20Pro = FULL_UNIFIED_CATALOG.find(
        (d) => d.slug === "tecno-spark-20-pro"
      );
      const tecno20Plus = FULL_UNIFIED_CATALOG.find(
        (d) => d.slug.includes("tecno-spark-20") && d.slug.includes("plus")
      );
      expect(tecno20Pro).toBeDefined();
      expect(tecno20Plus).toBeDefined();
      expect(tecno20Pro!.slug).not.toBe(tecno20Plus!.slug);
    });

    it("verifies all devices have unique IDs and valid Living Scores", () => {
      const uniqueIds = new Set(FULL_UNIFIED_CATALOG.map((d) => d.id));
      expect(uniqueIds.size).toBe(939);

      for (const d of FULL_UNIFIED_CATALOG) {
        expect(d.compositeLivingScore).toBeGreaterThanOrEqual(1.0);
        expect(d.compositeLivingScore).toBeLessThanOrEqual(10.0);
        expect(d.currentStreetUsd).toBeGreaterThan(0);
      }
    });
  });

  // =========================================================================
  // Target 2: /compare/[slugs] Parsing Logic with 2, 3, 4 Contenders & Edge Cases
  // =========================================================================
  describe("Target 2: /compare/[slugs] Parsing Logic", () => {
    it("correctly parses 2 contenders separated by -vs-", () => {
      const parsed = parseComparisonSlugs(
        "samsung-galaxy-s25-ultra-vs-apple-iphone-16-pro-max"
      );
      expect(parsed).toEqual([
        "samsung-galaxy-s25-ultra",
        "apple-iphone-16-pro-max",
      ]);
    });

    it("correctly parses 3 contenders separated by comma", () => {
      const parsed = parseComparisonSlugs(
        "samsung-galaxy-s25-ultra,apple-iphone-16-pro-max,google-pixel-9-pro-xl"
      );
      expect(parsed).toEqual([
        "samsung-galaxy-s25-ultra",
        "apple-iphone-16-pro-max",
        "google-pixel-9-pro-xl",
      ]);
    });

    it("correctly parses 4 contenders separated by -vs-", () => {
      const parsed = parseComparisonSlugs(
        "device-a-vs-device-b-vs-device-c-vs-device-d"
      );
      expect(parsed).toEqual([
        "device-a",
        "device-b",
        "device-c",
        "device-d",
      ]);
    });

    it("handles alternate delimiters (_vs_, vs with spaces)", () => {
      const underscoreParsed = parseComparisonSlugs("device-a_vs_device-b");
      expect(underscoreParsed).toEqual(["device-a", "device-b"]);

      const wordVsParsed = parseComparisonSlugs("device-a vs device-b");
      expect(wordVsParsed).toEqual(["device-a", "device-b"]);

      const multiWordVs = parseComparisonSlugs("phone-1 vs phone-2 vs phone-3");
      expect(multiWordVs).toEqual(["phone-1", "phone-2", "phone-3"]);
    });

    it("handles URL-encoded strings gracefully", () => {
      const encodedComma = parseComparisonSlugs("slug1%2Cslug2%2Cslug3");
      expect(encodedComma).toEqual(["slug1", "slug2", "slug3"]);

      const encodedVs = parseComparisonSlugs("slug1%20vs%20slug2");
      expect(encodedVs).toEqual(["slug1", "slug2"]);
    });

    it("resiliently recovers from malformed delimiters, empty segments, and boundary dashes", () => {
      expect(parseComparisonSlugs("")).toEqual([]);
      expect(parseComparisonSlugs("   ")).toEqual([]);
      expect(parseComparisonSlugs(",,,,")).toEqual([]);
      expect(parseComparisonSlugs("-vs--vs-")).toEqual([]);
      expect(parseComparisonSlugs("-vs-slug1-vs-")).toEqual(["slug1"]);
      expect(parseComparisonSlugs("slug1 , , slug2 , ")).toEqual([
        "slug1",
        "slug2",
      ]);
      expect(parseComparisonSlugs("---slug1---vs---slug2---")).toEqual([
        "slug1",
        "slug2",
      ]);
    });

    it("normalizes uppercase and mixed-case contenders to lowercase", () => {
      const mixed = parseComparisonSlugs(
        "SAMSUNG-GALAXY-S25-ULTRA-VS-APPLE-IPHONE-16-PRO-MAX"
      );
      expect(mixed).toEqual([
        "samsung-galaxy-s25-ultra",
        "apple-iphone-16-pro-max",
      ]);
    });
  });

  // =========================================================================
  // Target 3: usePersistentState Storage Resiliency, Quota & Sync
  // =========================================================================
  describe("Target 3: usePersistentState Resiliency & Edge Cases", () => {
    let mockStorageMap: Map<string, string>;
    let mockStorage: Storage;
    let originalWindow: typeof global.window;
    let listeners: Map<string, Set<(e: Event) => void>>;

    beforeEach(() => {
      mockStorageMap = new Map();
      mockStorage = {
        getItem: vi.fn((k: string) => mockStorageMap.get(k) ?? null),
        setItem: vi.fn((k: string, v: string) => {
          mockStorageMap.set(k, String(v));
        }),
        removeItem: vi.fn((k: string) => {
          mockStorageMap.delete(k);
        }),
        clear: vi.fn(() => {
          mockStorageMap.clear();
        }),
        key: vi.fn((idx: number) => Array.from(mockStorageMap.keys())[idx] ?? null),
        get length() {
          return mockStorageMap.size;
        },
      };

      listeners = new Map();
      originalWindow = global.window;
      const mockWin = {
        localStorage: mockStorage,
        addEventListener: vi.fn((event: string, handler: (e: Event) => void) => {
          if (!listeners.has(event)) listeners.set(event, new Set());
          listeners.get(event)!.add(handler);
        }),
        removeEventListener: vi.fn((event: string, handler: (e: Event) => void) => {
          listeners.get(event)?.delete(handler);
        }),
        dispatchEvent: vi.fn((event: Event) => {
          const handlers = listeners.get(event.type);
          if (handlers) {
            for (const h of handlers) h(event);
          }
          return true;
        }),
      };
      global.window = mockWin as unknown as Window & typeof globalThis;
    });

    afterEach(() => {
      global.window = originalWindow;
    });

    it("recovers gracefully from corrupted JSON in storage without throwing", async () => {
      mockStorageMap.set("test-corrupt-key", "CORRUPTED_NON_JSON_{{<}}");

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const { result, unmount } = runPersistentHook(
        "test-corrupt-key",
        "default_value",
        { storage: mockStorage }
      );

      // Await microtask queue processing
      await flushMicrotasks();

      // Hook retained initial value and finished hydration
      expect(result.current.value).toBe("default_value");
      expect(result.current.isHydrated).toBe(true);

      warnSpy.mockRestore();
      unmount();
    });

    it("handles storage QuotaExceededError by falling back to in-memory store without crashing", () => {
      const quotaStorage: Storage = {
        ...mockStorage,
        setItem: vi.fn(() => {
          const err = new DOMException(
            "The quota has been exceeded.",
            "QuotaExceededError"
          );
          throw err;
        }),
      };

      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const { result, unmount } = runPersistentHook(
        "quota-test-key",
        ["initial-item"],
        { storage: quotaStorage }
      );

      // Attempting to write must catch QuotaExceededError and not throw
      expect(() => {
        result.current.setValue(["item-1", "item-2"]);
      }).not.toThrow();

      // State is successfully updated in-memory
      expect(result.current.value).toEqual(["item-1", "item-2"]);

      errSpy.mockRestore();
      unmount();
    });

    it("handles schema migration from legacy un-enveloped format to versioned envelope", async () => {
      // Legacy un-enveloped payload
      mockStorageMap.set(
        "migration-key",
        JSON.stringify(["dev-s25-ultra", "dev-iphone-16-pm"])
      );

      const migrateFn = vi.fn(
        (oldData: unknown, version: number): { items: string[]; migratedFrom: number } => {
          return {
            items: oldData as string[],
            migratedFrom: version,
          };
        }
      );

      const { result, unmount } = runPersistentHook(
        "migration-key",
        { items: [] as string[], migratedFrom: -1 },
        {
          version: 2,
          migrate: migrateFn,
          storage: mockStorage,
        }
      );

      await flushMicrotasks();

      expect(migrateFn).toHaveBeenCalledWith(
        ["dev-s25-ultra", "dev-iphone-16-pm"],
        0
      );
      expect(result.current.value).toEqual({
        items: ["dev-s25-ultra", "dev-iphone-16-pm"],
        migratedFrom: 0,
      });

      unmount();
    });

    it("synchronizes state intra-tab when STORAGE_SYNC_EVENT is dispatched", async () => {
      const { result, unmount } = runPersistentHook("sync-key", "initial-val", {
        storage: mockStorage,
      });

      await flushMicrotasks();
      expect(result.current.value).toBe("initial-val");

      // Dispatch CustomEvent simulating intra-tab state update from another component
      const customEvent = new CustomEvent(STORAGE_SYNC_EVENT, {
        detail: { key: "sync-key", value: "updated-from-other-component" },
      });
      global.window.dispatchEvent(customEvent);

      expect(result.current.value).toBe("updated-from-other-component");

      // Test legacy event name synchronization
      const legacyEvent = new CustomEvent(STORAGE_SYNC_EVENT_LEGACY, {
        detail: { key: "sync-key", value: "updated-via-legacy-event" },
      });
      global.window.dispatchEvent(legacyEvent);

      expect(result.current.value).toBe("updated-via-legacy-event");

      unmount();
    });

    it("ensures setPersistentState evaluates against fresh stateRef.current during rapid consecutive functional updates", () => {
      const { result, unmount } = runPersistentHook<number>("counter-key", 0, {
        storage: mockStorage,
      });

      // Two rapid functional updates in the same synchronous cycle
      result.current.setValue((prev) => prev + 1);
      result.current.setValue((prev) => prev + 1);

      // In usePersistentState, stateRef.current is updated synchronously immediately,
      // so consecutive functional calls in the same synchronous batch evaluate against fresh state (resulting in 2)
      expect(result.current.value).toBe(2);

      const rawStored = mockStorageMap.get("counter-key");
      expect(rawStored).toBeDefined();
      const envelope = JSON.parse(rawStored!) as StorageEnvelope<number>;
      expect(envelope.data).toBe(2);

      // Verify extended rapid sequential writes loop (50 writes)
      for (let i = 2; i < 50; i++) {
        result.current.setValue((prev) => prev + 1);
      }
      expect(result.current.value).toBe(50);
      const updatedEnvelope = JSON.parse(mockStorageMap.get("counter-key")!) as StorageEnvelope<number>;
      expect(updatedEnvelope.data).toBe(50);

      unmount();
    });

    it("rejects invalid stored payloads when runtime validator returns false", async () => {
      mockStorageMap.set(
        "validated-key",
        JSON.stringify({
          version: 1,
          __version: 1,
          timestamp: Date.now(),
          data: "invalid_string_instead_of_number",
        })
      );

      const isNumberValidator = (val: unknown): val is number => typeof val === "number";
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const { result, unmount } = runPersistentHook<number>("validated-key", 42, {
        validator: isNumberValidator,
        storage: mockStorage,
      });

      await flushMicrotasks();

      // Because validator failed, state safely falls back to initial value (42)
      expect(result.current.value).toBe(42);

      warnSpy.mockRestore();
      unmount();
    });

    it("resets state back to initial value when reset() is invoked", () => {
      const { result, unmount } = runPersistentHook<string>(
        "resettable-key",
        "initial_state",
        { storage: mockStorage }
      );

      result.current.setValue("modified_state");
      expect(result.current.value).toBe("modified_state");

      result.current.reset();
      expect(result.current.value).toBe("initial_state");

      unmount();
    });
  });

  // =========================================================================
  // Target 4: Token-Bucket Rate Limiter Burst & Throttle
  // =========================================================================
  describe("Target 4: Token-Bucket Rate Limiter Hammering", () => {
    beforeEach(() => {
      resetRateLimiter();
    });

    afterEach(() => {
      resetRateLimiter();
    });

    it("allows 2 burst requests and throttles the 3rd rapid request with 429 semantics", () => {
      const now = 1_000_000;
      const ip = "198.51.100.42";

      // Request 1: Allowed, 1 token remaining
      const req1 = checkRateLimit(ip, now);
      expect(req1.allowed).toBe(true);
      expect(req1.remaining).toBe(1);

      // Request 2: Allowed, 0 tokens remaining
      const req2 = checkRateLimit(ip, now);
      expect(req2.allowed).toBe(true);
      expect(req2.remaining).toBe(0);

      // Request 3: THROTTLED (burst capacity 2 exhausted)
      const req3 = checkRateLimit(ip, now);
      expect(req3.allowed).toBe(false);
      expect(req3.remaining).toBe(0);
      expect(req3.resetSeconds).toBe(12); // Refill interval is 12,000ms
    });

    it("replenishes exactly 1 token after 12 seconds and caps at max capacity", () => {
      const now = 1_000_000;
      const ip = "198.51.100.55";

      // Consume both burst tokens
      expect(checkRateLimit(ip, now).allowed).toBe(true);
      expect(checkRateLimit(ip, now).allowed).toBe(true);
      expect(checkRateLimit(ip, now).allowed).toBe(false);

      // Advance by 11.99 seconds (not yet refilled)
      expect(checkRateLimit(ip, now + 11_990).allowed).toBe(false);

      // Advance to 12.0 seconds: 1 token refilled
      const reqAfter12s = checkRateLimit(ip, now + 12_000);
      expect(reqAfter12s.allowed).toBe(true);
      expect(reqAfter12s.remaining).toBe(0);

      // Immediate subsequent attempt throttled again
      expect(checkRateLimit(ip, now + 12_000).allowed).toBe(false);

      // Advance to 40 seconds (3.3 intervals elapsed): capacity capped at 2
      const reqAt40s = checkRateLimit(ip, now + 40_000);
      expect(reqAt40s.allowed).toBe(true);
      expect(reqAt40s.remaining).toBe(1); // Consumed 1 of 2
    });

    it("isolates rate limits between distinct IP addresses", () => {
      const now = 1_000_000;
      const ipA = "10.0.0.1";
      const ipB = "10.0.0.2";

      // Deplete IP A
      checkRateLimit(ipA, now);
      checkRateLimit(ipA, now);
      expect(checkRateLimit(ipA, now).allowed).toBe(false);

      // IP B remains unaffected and gets full burst allowance
      expect(checkRateLimit(ipB, now).allowed).toBe(true);
      expect(checkRateLimit(ipB, now).allowed).toBe(true);
      expect(checkRateLimit(ipB, now).allowed).toBe(false);
    });

    it("correctly extracts IP addresses from x-forwarded-for and x-real-ip", () => {
      const headersXff = new Headers({
        "x-forwarded-for": "203.0.113.195, 70.41.3.18, 150.172.238.178",
      });
      expect(getClientIp(headersXff)).toBe("203.0.113.195");

      const headersRealIp = new Headers({
        "x-real-ip": "198.51.100.99",
      });
      expect(getClientIp(headersRealIp)).toBe("198.51.100.99");

      const emptyHeaders = new Headers();
      expect(getClientIp(emptyHeaders)).toBe("127.0.0.1");
    });

    it("burst hammering with 10 concurrent requests allows exactly 2 and rejects 8 with 429", () => {
      const ip = "192.168.1.100";
      const now = 2_000_000;
      const results: boolean[] = [];

      for (let i = 0; i < 10; i++) {
        results.push(checkRateLimit(ip, now).allowed);
      }

      const allowedCount = results.filter((r) => r === true).length;
      const rejectedCount = results.filter((r) => r === false).length;

      expect(allowedCount).toBe(2);
      expect(rejectedCount).toBe(8);
    });
  });

  // =========================================================================
  // Target 5: SSE Streaming Debate Endpoint Resilience & Fallback
  // =========================================================================
  describe("Target 5: SSE Streaming Debate Endpoint", () => {
    const devA = FULL_UNIFIED_CATALOG[0];
    const devB = FULL_UNIFIED_CATALOG[1];

    it("creates an SSE stream that completes with [DONE] when API keys are absent", async () => {
      // Ensure no external API keys
      const originalOpenRouter = process.env.OPENROUTER_API_KEY;
      const originalGemini = process.env.GEMINI_API_KEY;
      delete process.env.OPENROUTER_API_KEY;
      delete process.env.GEMINI_API_KEY;

      try {
        const stream = createDebateStream({
          deviceA: devA,
          deviceB: devB,
          prompt: "Which phone offers better long-term durability?",
        });

        const reader = stream.getReader();
        const decoder = new TextDecoder();
        let receivedText = "";
        let streamDone = false;

        while (!streamDone) {
          const { value, done } = await reader.read();
          if (done) {
            streamDone = true;
          } else if (value) {
            receivedText += decoder.decode(value, { stream: true });
          }
        }

        expect(receivedText).toContain("data: [DONE]\n\n");
        expect(receivedText).toContain("Editorial Panel Scenario Crossfire");
        expect(receivedText).toContain("Panel Consensus");
        expect(receivedText).toContain("completed");
      } finally {
        if (originalOpenRouter) process.env.OPENROUTER_API_KEY = originalOpenRouter;
        if (originalGemini) process.env.GEMINI_API_KEY = originalGemini;
      }
    });

    it("POST /api/debate throttles rapid requests with HTTP 429 and Retry-After header", async () => {
      resetRateLimiter();

      const makeRequest = (ip: string) => {
        return new Request("https://phoneindex.com/api/debate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-forwarded-for": ip,
            Accept: "application/json",
          },
          body: JSON.stringify({
            deviceA: devA,
            deviceB: devB,
            prompt: "Battery test comparison",
          }),
        });
      };

      const testIp = "203.0.113.88";

      // Req 1 -> 200
      const res1 = await POST(makeRequest(testIp));
      expect(res1.status).toBe(200);

      // Req 2 -> 200
      const res2 = await POST(makeRequest(testIp));
      expect(res2.status).toBe(200);

      // Req 3 -> 429 RATE_LIMIT_EXCEEDED
      const res3 = await POST(makeRequest(testIp));
      expect(res3.status).toBe(429);
      expect(res3.headers.get("Retry-After")).toBe("12");
      expect(res3.headers.get("X-RateLimit-Limit")).toBe("2");
      expect(res3.headers.get("X-RateLimit-Remaining")).toBe("0");

      const body3 = await res3.json();
      expect(body3.ok).toBe(false);
      expect(body3.code).toBe("RATE_LIMIT_EXCEEDED");
      expect(body3.retryAfter).toBe(12);

      resetRateLimiter();
    });

    it("sanitizes prompt injection attempts and neutralizes delimiters", () => {
      const injection =
        '<script>alert("hacked")</script> ${process.env.SECRET} {{eval("malicious")}} -- em-dash';
      const sanitized = sanitizeDebatePrompt(injection);

      expect(sanitized).not.toContain("<script>");
      expect(sanitized).toContain("&lt;script&gt;");
      expect(sanitized).not.toContain("${");
      expect(sanitized).not.toContain("{{");
      expect(sanitized).not.toContain("--");

      // Capped at 500 characters
      const superLongPrompt = "a".repeat(750);
      expect(sanitizeDebatePrompt(superLongPrompt).length).toBe(500);
    });

    it("POST /api/debate returns 400 for malformed JSON or invalid body structures", async () => {
      resetRateLimiter();

      // Malformed JSON (string that cannot be parsed as JSON)
      const reqBadJson = new Request("https://phoneindex.com/api/debate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "NOT_VALID_JSON{{{",
      });
      const resBadJson = await POST(reqBadJson);
      expect(resBadJson.status).toBe(400);
      const dataBadJson = await resBadJson.json();
      expect(dataBadJson.code).toBe("INVALID_JSON");

      // Array body (should be object)
      const reqArray = new Request("https://phoneindex.com/api/debate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([1, 2, 3]),
      });
      const resArray = await POST(reqArray);
      expect(resArray.status).toBe(400);
      const dataArray = await resArray.json();
      expect(dataArray.code).toBe("INVALID_REQUEST");

      resetRateLimiter();
    });

    it("POST /api/debate supports legacy schema and returns 404 for unknown devices", async () => {
      resetRateLimiter();

      // Unknown device IDs
      const reqUnknown = new Request("https://phoneindex.com/api/debate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          query: "Compare non-existent devices",
          deviceAId: "dev-totally-fake-a",
          deviceBId: "dev-totally-fake-b",
        }),
      });

      const resUnknown = await POST(reqUnknown);
      expect(resUnknown.status).toBe(404);
      const dataUnknown = await resUnknown.json();
      expect(dataUnknown.code).toBe("DEVICE_NOT_FOUND");

      resetRateLimiter();
    });
  });

  // =========================================================================
  // Target 6: Lab Provenance & Regional Pricing Simulation Models
  // =========================================================================
  describe("Target 6: Lab Provenance & Pricing Service Models", () => {
    it("verifies reference battery endurance formula across fabrication nodes", () => {
      const capacity = 5000;
      const displayArea = 18.0;
      const panelCoeff = 20.0;

      const endurance3nm = calculateReferenceEnduranceHours(
        capacity,
        "3nm",
        displayArea,
        panelCoeff
      );
      const endurance4nm = calculateReferenceEnduranceHours(
        capacity,
        "4nm",
        displayArea,
        panelCoeff
      );
      const endurance12nm = calculateReferenceEnduranceHours(
        capacity,
        "12nm+",
        displayArea,
        panelCoeff
      );

      // 3nm is more power-efficient -> longer battery life
      expect(endurance3nm).toBeGreaterThan(endurance4nm);
      expect(endurance4nm).toBeGreaterThan(endurance12nm);

      // Edge case: zero or negative capacity
      expect(calculateReferenceEnduranceHours(0, "4nm", displayArea, panelCoeff)).toBe(0);
      expect(calculateReferenceEnduranceHours(-500, "4nm", displayArea, panelCoeff)).toBe(0);
    });

    it("verifies acoustic loudness simulation classifies cavity architecture correctly", () => {
      // Large stereo phone (>75 cm3): e.g. 78 x 163 x 8.5 mm = 108.07 cm3
      const largeStereo = calculateReferenceAcoustics(78, 163, 8.5, true);
      expect(largeStereo.lufs).toBe(-24.5);
      expect(largeStereo.loudnessClass).toBe("VERY_GOOD");

      // Compact stereo phone (<=75 cm3): e.g. 68 x 140 x 7.5 mm = 71.4 cm3
      const compactStereo = calculateReferenceAcoustics(68, 140, 7.5, true);
      expect(compactStereo.lufs).toBe(-26.2);
      expect(compactStereo.loudnessClass).toBe("GOOD");

      // Mono speaker phone (any volume)
      const monoPhone = calculateReferenceAcoustics(78, 163, 8.5, false);
      expect(monoPhone.lufs).toBe(-29.0);
      expect(monoPhone.loudnessClass).toBe("POOR");
    });

    it("verifies mandatory legal independence disclosures", () => {
      expect(MANDATORY_LEGAL_DISCLAIMERS.INDEPENDENCE).toContain(
        "All measurements conducted independently under standardized PhoneIndex lab protocols."
      );
      expect(MANDATORY_LEGAL_DISCLAIMERS.ATTRIBUTION_INTEGRITY).toContain(
        "does not scrape, republish, or copy proprietary lab measurements from GSMArena Lab, DxOMark, or RTINGS"
      );
    });

    it("verifies authoritative FX exchange rates and regional currency formatting", () => {
      expect(FX_RATES.EUR).toBe(0.92);
      expect(FX_RATES.GBP).toBe(0.79);
      expect(FX_RATES.CAD).toBe(1.36);
      expect(FX_RATES.INR).toBe(84.5);
      expect(FX_RATES.JPY).toBe(152.0);
      expect(FX_RATES.AUD).toBe(1.52);
      expect(FX_RATES.NGN).toBe(1550.0);

      const baseUsd = 1000;
      expect(convertPrice(baseUsd, "EUR")).toBe(920);
      expect(convertPrice(baseUsd, "GBP")).toBe(790);
      expect(convertPrice(baseUsd, "INR")).toBe(84500);
      expect(convertPrice(baseUsd, "NGN")).toBe(1550000);

      // Verify formatting symbols
      expect(formatPrice(1000, "USD")).toContain("$");
      expect(formatPrice(920, "EUR")).toContain("€");
      expect(formatPrice(790, "GBP")).toContain("£");
      expect(formatPrice(84500, "INR")).toContain("₹");
    });

    it("verifies retailer offers synthesis provides genuine multi-merchant offers", () => {
      const device = FULL_UNIFIED_CATALOG[0];
      const offers = generateDeterministicOffers(device, "USD");

      expect(offers.length).toBeGreaterThanOrEqual(3);
      for (const offer of offers) {
        expect(offer.merchantName.length).toBeGreaterThan(0);
        expect(offer.price).toBeGreaterThan(0);
        expect(offer.currency).toBe("USD");
        expect(offer.directUrl).toContain("https://");
      }
    });
  });
});
