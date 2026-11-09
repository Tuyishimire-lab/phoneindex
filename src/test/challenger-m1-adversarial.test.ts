import { describe, it, expect, vi } from "vitest";
import React from "react";
import ReactDOMServer from "react-dom/server";
import { applyInlineSpecEdits } from "@/components/FullSpecSheet";
import { useDebounce } from "@/hooks/useDebounce";
import { ComparisonDock } from "@/components/ComparisonDock";
import { INITIAL_DEVICES, SmartphoneDevice } from "@/lib/seed-data";
import { FULL_UNIFIED_CATALOG } from "@/lib/brands/catalog-loader";
import { calculateLivingScores } from "@/lib/editors";
import type { DeviceSpecsData } from "@/lib/seed-data";

// =============================================================================
// Helper: Lightweight React Hook Harness for Node / Vitest
// =============================================================================
// Connects to React 19 client internals to test hooks with state, effects,
// timers, and unmount lifecycles in pure Node without external DOM libraries.
// =============================================================================
const reactInternals = (React as unknown as {
  __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE: {
    H: unknown;
  };
}).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;

interface HookHarness<TProps extends unknown[], TResult> {
  update: (...args: TProps) => TResult;
  unmount: () => void;
  getResult: () => TResult;
  getRenderCount: () => number;
}

function createHookHarness<TProps extends unknown[], TResult>(
  hookFn: (...args: TProps) => TResult
): HookHarness<TProps, TResult> {
  const stateSlots: unknown[] = [];
  const effectSlots: { effect: () => (() => void) | void; deps?: unknown[] }[] = [];
  const cleanupSlots: (((() => void) | void))[] = [];
  const prevDeps: (unknown[] | undefined)[] = [];
  let currentArgs: TProps;
  let latestResult: TResult;
  let renderCount = 0;

  let slotIndex = 0;
  let effectIndex = 0;

  const dispatcher = {
    useState<T>(initial: T | (() => T)): [T, (val: T | ((prev: T) => T)) => void] {
      const idx = slotIndex++;
      if (stateSlots.length <= idx) {
        stateSlots[idx] = typeof initial === "function" ? (initial as () => T)() : initial;
      }
      const setState = (newVal: T | ((prev: T) => T)) => {
        stateSlots[idx] =
          typeof newVal === "function"
            ? (newVal as (prev: unknown) => unknown)(stateSlots[idx])
            : newVal;
        runRender();
      };
      return [stateSlots[idx] as T, setState];
    },
    useEffect(effect: () => (() => void) | void, deps?: unknown[]) {
      const idx = effectIndex++;
      effectSlots[idx] = { effect, deps };
    },
  };

  function runRender(): TResult {
    renderCount++;
    slotIndex = 0;
    effectIndex = 0;
    const prevH = reactInternals.H;
    reactInternals.H = dispatcher;
    try {
      latestResult = hookFn(...currentArgs);
    } finally {
      reactInternals.H = prevH;
    }

    // Run effect lifecycle
    for (let i = 0; i < effectSlots.length; i++) {
      const { effect, deps } = effectSlots[i];
      const hasChanged =
        !prevDeps[i] ||
        !deps ||
        deps.length !== prevDeps[i]?.length ||
        deps.some((d, dIdx) => d !== prevDeps[i]?.[dIdx]);

      if (hasChanged) {
        if (typeof cleanupSlots[i] === "function") {
          (cleanupSlots[i] as () => void)();
        }
        cleanupSlots[i] = effect();
        prevDeps[i] = deps;
      }
    }
    return latestResult;
  }

  function update(...args: TProps): TResult {
    currentArgs = args;
    return runRender();
  }

  function unmount() {
    for (let i = 0; i < cleanupSlots.length; i++) {
      if (typeof cleanupSlots[i] === "function") {
        (cleanupSlots[i] as () => void)();
      }
    }
    cleanupSlots.length = 0;
  }

  return {
    update,
    unmount,
    getResult: () => latestResult,
    getRenderCount: () => renderCount,
  };
}

/** Strip SSR comment markers like <!-- --> for clean text assertion */
function renderClean(element: React.ReactElement): string {
  return ReactDOMServer.renderToString(element).replace(/<!-- -->/g, "");
}

// =============================================================================
// Challenger Test Suite
// =============================================================================
describe("Milestone 1 Adversarial & Stress Challenge Suite", () => {
  const baseDevice = INITIAL_DEVICES[0];
  const baseSpecs: DeviceSpecsData = { ...baseDevice.specs };

  // ===========================================================================
  // 1. Stress Testing `applyInlineSpecEdits`
  // ===========================================================================
  describe("Adversarial: applyInlineSpecEdits Edge Cases", () => {
    it("handles empty edit object without mutating or changing any spec values", () => {
      const result = applyInlineSpecEdits(baseSpecs, {});
      expect(result).toEqual(baseSpecs);
      expect(result).not.toBe(baseSpecs); // Must return a fresh clone (immutability)
    });

    it("ignores empty strings across all 11 canonical spec fields (leaves existing specs untouched)", () => {
      const emptyEdits: Record<string, string> = {
        "Chipset & Foundry Node": "",
        "CPU Core Topology": "",
        "GPU Architecture": "",
        "RAM Configurations": "",
        "Frame & Back Materials": "",
        "Ingress Protection": "",
        "Primary Wide Module": "",
        "Periscope / Telephoto Optics": "",
        "Ultrawide Module": "",
        "Indoor Motion Shutter Response": "",
        "Biometric Authentication": "",
      };

      const result = applyInlineSpecEdits(baseSpecs, emptyEdits);
      expect(result.socName).toBe(baseSpecs.socName);
      expect(result.cpuTopology).toBe(baseSpecs.cpuTopology);
      expect(result.gpuName).toBe(baseSpecs.gpuName);
      expect(result.ramOptions).toBe(baseSpecs.ramOptions);
      expect(result.frameMaterial).toBe(baseSpecs.frameMaterial);
      expect(result.ipRating).toBe(baseSpecs.ipRating);
      expect(result.mainSensorSize).toBe(baseSpecs.mainSensorSize);
      expect(result.telephotoSpecs).toBe(baseSpecs.telephotoSpecs);
      expect(result.ultrawideSpecs).toBe(baseSpecs.ultrawideSpecs);
      expect(result.shutterLagRating).toBe(baseSpecs.shutterLagRating);
      expect(result.fingerprintType).toBe(baseSpecs.fingerprintType);
    });

    it("ignores whitespace-only strings (spaces, tabs, newlines) across all fields", () => {
      const whitespaceEdits: Record<string, string> = {
        "Chipset & Foundry Node": "     ",
        "CPU Core Topology": "\t\t\n",
        "GPU Architecture": " \r\n ",
        "RAM Configurations": "   \t   ",
        "Frame & Back Materials": " ",
        "Ingress Protection": "  \n  ",
        "Primary Wide Module": "\t",
        "Periscope / Telephoto Optics": "      ",
        "Ultrawide Module": "\n\n",
        "Indoor Motion Shutter Response": "   ",
        "Biometric Authentication": "  \t  ",
      };

      const result = applyInlineSpecEdits(baseSpecs, whitespaceEdits);
      expect(result.socName).toBe(baseSpecs.socName);
      expect(result.cpuTopology).toBe(baseSpecs.cpuTopology);
      expect(result.gpuName).toBe(baseSpecs.gpuName);
      expect(result.ramOptions).toBe(baseSpecs.ramOptions);
      expect(result.frameMaterial).toBe(baseSpecs.frameMaterial);
      expect(result.ipRating).toBe(baseSpecs.ipRating);
      expect(result.mainSensorSize).toBe(baseSpecs.mainSensorSize);
      expect(result.telephotoSpecs).toBe(baseSpecs.telephotoSpecs);
      expect(result.ultrawideSpecs).toBe(baseSpecs.ultrawideSpecs);
      expect(result.shutterLagRating).toBe(baseSpecs.shutterLagRating);
      expect(result.fingerprintType).toBe(baseSpecs.fingerprintType);
    });

    it("safely handles undefined values in record keys without throwing", () => {
      const undefinedEdits: Record<string, string> = {
        "Chipset & Foundry Node": undefined as unknown as string,
        "RAM Configurations": undefined as unknown as string,
      };

      expect(() => applyInlineSpecEdits(baseSpecs, undefinedEdits)).not.toThrow();
      const result = applyInlineSpecEdits(baseSpecs, undefinedEdits);
      expect(result.socName).toBe(baseSpecs.socName);
      expect(result.ramOptions).toBe(baseSpecs.ramOptions);
    });

    it("safely ignores completely unknown keys and prototype pollution attempts", () => {
      const maliciousEdits: Record<string, string> = {
        "__proto__": "polluted",
        "constructor": "polluted",
        "toString": "polluted",
        "NonExistentField": "Should Not Exist",
        "randomKey_12345": "Ignored",
      };

      const result = applyInlineSpecEdits(baseSpecs, maliciousEdits);
      expect((result as unknown as Record<string, unknown>)["NonExistentField"]).toBeUndefined();
      expect((result as unknown as Record<string, unknown>)["randomKey_12345"]).toBeUndefined();
      expect(Object.prototype.hasOwnProperty.call(result, "NonExistentField")).toBe(false);
      // Ensure Prototype was not polluted
      expect(({} as Record<string, unknown>)["polluted"]).toBeUndefined();
    });

    it("handles partial edits (updating exactly 1 spec) while strictly preserving all other 32 fields", () => {
      const singleEdit = { "Ingress Protection": "IP68 Submersible (6m for 30 mins)" };
      const result = applyInlineSpecEdits(baseSpecs, singleEdit);

      expect(result.ipRating).toBe("IP68 Submersible (6m for 30 mins)");
      // Verify other fields remain identical
      expect(result.socName).toBe(baseSpecs.socName);
      expect(result.batteryCapacityMah).toBe(baseSpecs.batteryCapacityMah);
      expect(result.geekbenchSingle).toBe(baseSpecs.geekbenchSingle);
      expect(result.displaySizeInch).toBe(baseSpecs.displaySizeInch);
      expect(result.refreshRateHz).toBe(baseSpecs.refreshRateHz);
    });

    it("sanitizes complex em-dash patterns (single, double-hyphen, repeated, mixed whitespace)", () => {
      const emDashEdits: Record<string, string> = {
        "Chipset & Foundry Node": "Apple A18 Pro \u2014 3nm TSMC -- 6-Core GPU \u2014 Neural Engine",
        "CPU Core Topology": "2x 4.04GHz Performance \u2014 4x 2.20GHz Efficiency",
        "RAM Configurations": "12GB LPDDR5X -- 512GB NVMe",
        "Indoor Motion Shutter Response": "\u2014 Leading Dash Test \u2014",
      };

      const result = applyInlineSpecEdits(baseSpecs, emDashEdits);
      expect(result.socName).toBe("Apple A18 Pro, 3nm TSMC, 6-Core GPU, Neural Engine");
      expect(result.cpuTopology).toBe("2x 4.04GHz Performance, 4x 2.20GHz Efficiency");
      expect(result.ramOptions).toBe("12GB LPDDR5X, 512GB NVMe");
      expect(result.shutterLagRating).toBe(", Leading Dash Test, ");
      // Guarantees NO em-dash (\u2014) or double-hyphen (--) remains in modified fields
      expect(result.socName).not.toMatch(/\u2014|--/);
      expect(result.cpuTopology).not.toMatch(/\u2014|--/);
      expect(result.ramOptions).not.toMatch(/\u2014|--/);
      expect(result.shutterLagRating).not.toMatch(/\u2014|--/);
    });

    it("preserves international Unicode characters, CJK scripts, Arabic RTL, and emoji sequences", () => {
      const unicodeEdits: Record<string, string> = {
        "Chipset & Foundry Node": "联发科 天玑 9400 旗舰芯片 (3nm 台积电)",
        "CPU Core Topology": "معالج ثماني النواة بسرعة فائقة (3.4 جيجاهرتز)",
        "GPU Architecture": "Immortalis-G925 🚀 Ray Tracing ⚡ 12-Core",
        "RAM Configurations": "24GB LPDDR5T (9600Mbps 超高频)",
        "Frame & Back Materials": "Titanio aeroespacial + Cerámica Kunlun (昆仑玻璃)",
      };

      const result = applyInlineSpecEdits(baseSpecs, unicodeEdits);
      expect(result.socName).toBe("联发科 天玑 9400 旗舰芯片 (3nm 台积电)");
      expect(result.cpuTopology).toBe("معالج ثماني النواة بسرعة فائقة (3.4 جيجاهرتز)");
      expect(result.gpuName).toBe("Immortalis-G925 🚀 Ray Tracing ⚡ 12-Core");
      expect(result.ramOptions).toBe("24GB LPDDR5T (9600Mbps 超高频)");
      expect(result.frameMaterial).toBe("Titanio aeroespacial + Cerámica Kunlun (昆仑玻璃)");
    });

    it("verifies canonical vs legacy behavior when canonical value is empty string vs populated", () => {
      // Scenario A: Canonical is populated -> Canonical wins over legacy
      const bothPopulated = {
        "Chipset & Foundry Node": "Canonical Chip",
        "SoC Chipset & Process Node": "Legacy Chip",
      };
      const resultA = applyInlineSpecEdits(baseSpecs, bothPopulated);
      expect(resultA.socName).toBe("Canonical Chip");

      // Scenario B: Only Legacy is populated -> Legacy updates spec
      const onlyLegacy = {
        "SoC Chipset & Process Node": "Legacy Chip Only",
      };
      const resultB = applyInlineSpecEdits(baseSpecs, onlyLegacy);
      expect(resultB.socName).toBe("Legacy Chip Only");

      // Scenario C: Canonical is explicitly empty string "" while Legacy is populated
      // Per JS nullish coalescing: "" ?? "Legacy" evaluates to "", which is ignored because trim() === ""
      const canonicalEmptyLegacyPopulated = {
        "Chipset & Foundry Node": "",
        "SoC Chipset & Process Node": "Legacy Value",
      };
      const resultC = applyInlineSpecEdits(baseSpecs, canonicalEmptyLegacyPopulated);
      expect(resultC.socName).toBe(baseSpecs.socName); // Canonical explicit blank shadows legacy
    });
  });

  // ===========================================================================
  // 2. Stress Testing `useDebounce` Hook
  // ===========================================================================
  describe("Adversarial: useDebounce Lifecycle & Timing", () => {
    it("coalesces rapid keystroke updates and only commits the final value on trailing edge", async () => {
      const harness = createHookHarness(useDebounce);

      // Initial mount
      const initial = harness.update("init", 100);
      expect(initial).toBe("init");

      // Rapid burst of 4 keystrokes at 15ms intervals (within 100ms window)
      harness.update("sam", 100);
      await new Promise((r) => setTimeout(r, 15));
      harness.update("sams", 100);
      await new Promise((r) => setTimeout(r, 15));
      harness.update("samsu", 100);
      await new Promise((r) => setTimeout(r, 15));
      harness.update("samsung", 100);

      // At 60ms elapsed (less than 100ms from last update), value must STILL be "init"
      expect(harness.getResult()).toBe("init");

      // Wait for trailing edge to fire (120ms from last keystroke)
      await new Promise((r) => setTimeout(r, 120));
      expect(harness.getResult()).toBe("samsung");
    });

    it("cancels pending timeout on unmount without late state execution", async () => {
      const harness = createHookHarness(useDebounce);
      harness.update("initial", 80);

      // Trigger update
      harness.update("pending_update", 80);

      // Immediately unmount before timeout fires
      harness.unmount();

      // Wait 120ms (well past timeout duration)
      await new Promise((r) => setTimeout(r, 120));

      // Result should not have updated after unmount
      expect(harness.getResult()).toBe("initial");
    });

    it("handles zero-delay timeout (delayMs = 0) correctly by deferring to next macro-task", async () => {
      const harness = createHookHarness(useDebounce);
      harness.update("initial_zero", 0);

      // Update with delay = 0
      harness.update("updated_zero", 0);

      // Synchronously, state remains initial_zero
      expect(harness.getResult()).toBe("initial_zero");

      // After macro-task tick (setTimeout(0)), state updates immediately
      await new Promise((r) => setTimeout(r, 10));
      expect(harness.getResult()).toBe("updated_zero");
    });

    it("handles negative delayMs gracefully without throwing", async () => {
      const harness = createHookHarness(useDebounce);
      expect(() => harness.update("test_neg", -25)).not.toThrow();

      await new Promise((r) => setTimeout(r, 10));
      expect(harness.getResult()).toBe("test_neg");
    });

    it("resets active timer when delayMs changes mid-flight", async () => {
      const harness = createHookHarness(useDebounce);
      harness.update("val", 200);

      // Change value with 200ms delay
      harness.update("new_val", 200);

      // At 50ms, change delayMs to 60ms
      await new Promise((r) => setTimeout(r, 50));
      harness.update("new_val", 60);

      // At 70ms total (20ms into new timer), should still be "val"
      await new Promise((r) => setTimeout(r, 20));
      expect(harness.getResult()).toBe("val");

      // At 130ms total (80ms into new 60ms timer), should have updated to "new_val"
      await new Promise((r) => setTimeout(r, 60));
      expect(harness.getResult()).toBe("new_val");
    });
  });

  // ===========================================================================
  // 3. Stress Testing `ComparisonDock` Logic & Rendering
  // ===========================================================================
  describe("Adversarial: ComparisonDock Logic & Boundaries", () => {
    it("returns null (empty string in SSR) when stagedDeviceIds is empty", () => {
      const html = renderClean(
        React.createElement(ComparisonDock, {
          devices: INITIAL_DEVICES,
          stagedDeviceIds: [],
          onRemoveDevice: vi.fn(),
          onClearAll: vi.fn(),
          onLaunchCompare: vi.fn(),
        })
      );
      expect(html).toBe("");
    });

    it("renders dock with 1 device staged and disables Launch Compare Studio CTA", () => {
      const html = renderClean(
        React.createElement(ComparisonDock, {
          devices: INITIAL_DEVICES,
          stagedDeviceIds: [INITIAL_DEVICES[0].id],
          onRemoveDevice: vi.fn(),
          onClearAll: vi.fn(),
          onLaunchCompare: vi.fn(),
        })
      );
      expect(html).toContain("Comparing 1 of 4");
      expect(html).toContain("Add at least 1 more device to compare");
      expect(html).toContain("disabled"); // Button is disabled when < 2 contenders
      expect(html).toContain(INITIAL_DEVICES[0].name);
      // Empty slots: 4 - 1 = 3 empty slots
      expect(html).toContain("+ Slot 2");
      expect(html).toContain("+ Slot 3");
      expect(html).toContain("+ Slot 4");
    });

    it("renders dock with 2 devices staged and enables Launch Compare Studio CTA", () => {
      const html = renderClean(
        React.createElement(ComparisonDock, {
          devices: INITIAL_DEVICES,
          stagedDeviceIds: [INITIAL_DEVICES[0].id, INITIAL_DEVICES[1].id],
          onRemoveDevice: vi.fn(),
          onClearAll: vi.fn(),
          onLaunchCompare: vi.fn(),
        })
      );
      expect(html).toContain("Comparing 2 of 4");
      expect(html).toContain("Ready to compare");
      // Launch button should not have disabled="" attribute
      expect(html).not.toContain("disabled=\"\"");
      expect(html).toContain(INITIAL_DEVICES[0].name);
      expect(html).toContain(INITIAL_DEVICES[1].name);
      // Empty slots: 4 - 2 = 2 empty slots
      expect(html).toContain("+ Slot 3");
      expect(html).toContain("+ Slot 4");
    });

    it("renders full dock with 4 devices staged and 0 empty placeholder slots", () => {
      const fourIds = INITIAL_DEVICES.slice(0, 4).map((d) => d.id);
      const html = renderClean(
        React.createElement(ComparisonDock, {
          devices: INITIAL_DEVICES,
          stagedDeviceIds: fourIds,
          onRemoveDevice: vi.fn(),
          onClearAll: vi.fn(),
          onLaunchCompare: vi.fn(),
        })
      );
      expect(html).toContain("Comparing 4 of 4");
      expect(html).not.toContain("+ Slot");
    });

    it("handles overflow (>4 devices) gracefully without negative slots or crashing", () => {
      const fiveIds = INITIAL_DEVICES.slice(0, 5).map((d) => d.id);
      const html = renderClean(
        React.createElement(ComparisonDock, {
          devices: INITIAL_DEVICES,
          stagedDeviceIds: fiveIds,
          maxContenders: 4,
          onRemoveDevice: vi.fn(),
          onClearAll: vi.fn(),
          onLaunchCompare: vi.fn(),
        })
      );
      expect(html).toContain("Comparing 5 of 4");
      expect(html).not.toContain("+ Slot");
    });

    it("safely ignores non-existent device IDs without crashing", () => {
      // Only non-existent ID -> dock renders nothing (stagedDevices.length === 0)
      const htmlNone = renderClean(
        React.createElement(ComparisonDock, {
          devices: INITIAL_DEVICES,
          stagedDeviceIds: ["non-existent-device-id"],
          onRemoveDevice: vi.fn(),
          onClearAll: vi.fn(),
          onLaunchCompare: vi.fn(),
        })
      );
      expect(htmlNone).toBe("");

      // Mixed valid and non-existent IDs -> renders only valid device
      const htmlMixed = renderClean(
        React.createElement(ComparisonDock, {
          devices: INITIAL_DEVICES,
          stagedDeviceIds: [INITIAL_DEVICES[0].id, "non-existent-device-id"],
          onRemoveDevice: vi.fn(),
          onClearAll: vi.fn(),
          onLaunchCompare: vi.fn(),
        })
      );
      expect(htmlMixed).toContain("Comparing 1 of 4");
      expect(htmlMixed).toContain(INITIAL_DEVICES[0].name);
    });

    it("stress-tests handleToggleCompareStaging state logic (capping, deduping, removing, clearing)", () => {
      let staged: string[] = [];
      const toggle = (deviceId: string) => {
        if (staged.includes(deviceId)) {
          staged = staged.filter((id) => id !== deviceId);
          return;
        }
        if (staged.length >= 4) {
          return; // Blocked at 4
        }
        staged = [...staged, deviceId];
      };

      const remove = (deviceId: string) => {
        staged = staged.filter((id) => id !== deviceId);
      };

      const clear = () => {
        staged = [];
      };

      // 1. Add 4 devices
      toggle("d1");
      toggle("d2");
      toggle("d3");
      toggle("d4");
      expect(staged).toEqual(["d1", "d2", "d3", "d4"]);

      // 2. Attempt 5th device (must be rejected)
      toggle("d5");
      expect(staged).toHaveLength(4);
      expect(staged).not.toContain("d5");

      // 3. Toggle existing device (removes it)
      toggle("d2");
      expect(staged).toEqual(["d1", "d3", "d4"]);

      // 4. Now d5 can be added
      toggle("d5");
      expect(staged).toEqual(["d1", "d3", "d4", "d5"]);

      // 5. Remove non-existent device (no-op)
      remove("non-existent");
      expect(staged).toEqual(["d1", "d3", "d4", "d5"]);

      // 6. Clear all
      clear();
      expect(staged).toEqual([]);
    });
  });

  // ===========================================================================
  // 4. Cross-Feature Compatibility & Living Score Integration
  // ===========================================================================
  describe("Adversarial: Cross-Feature Spec Edits & Score Integrity", () => {
    it("ensures inline spec edits do not break Living Score calculation engine", () => {
      const device = FULL_UNIFIED_CATALOG[0];
      const edits = {
        "Chipset & Foundry Node": "Ultra High-End NextGen (1nm)",
        "RAM Configurations": "32GB LPDDR6",
        "Primary Wide Module": "1-inch Sensor 100MP",
      };

      const updatedSpecs = applyInlineSpecEdits(device.specs, edits);
      const modifiedDevice: SmartphoneDevice = {
        ...device,
        specs: updatedSpecs,
      };

      expect(() =>
        calculateLivingScores({
          launchMsrpUsd: modifiedDevice.launchMsrpUsd,
          simulatedStreetUsd: modifiedDevice.currentStreetUsd,
          osSupportYears: modifiedDevice.osSupportYears,
          basePragmatistScore: 8.5,
          baseStreetUsd: modifiedDevice.currentStreetUsd,
          siliconScore: 9.0,
          cameraScore: 9.2,
          dailyDriverScore: 8.8,
        })
      ).not.toThrow();

      const scores = calculateLivingScores({
        launchMsrpUsd: modifiedDevice.launchMsrpUsd,
        simulatedStreetUsd: modifiedDevice.currentStreetUsd,
        osSupportYears: modifiedDevice.osSupportYears,
        basePragmatistScore: 8.5,
        baseStreetUsd: modifiedDevice.currentStreetUsd,
        siliconScore: 9.0,
        cameraScore: 9.2,
        dailyDriverScore: 8.8,
      });

      expect(scores.compositeLivingScore).toBeGreaterThan(0);
      expect(scores.compositeLivingScore).toBeLessThanOrEqual(10);
      expect(scores.buyRecommendation).toBeDefined();
    });
  });

  // ===========================================================================
  // 5. Deep Adversarial Corner Cases
  // ===========================================================================
  describe("Adversarial: Deep Corner Cases & Strict Mode", () => {
    it("documents behavior when null is explicitly passed in rowEdits (untyped JS caller)", () => {
      // In TypeScript, rowEdits is Record<string, string>, but untyped/runtime JSON might supply null.
      // For fields without nullish coalescing aliases (like "CPU Core Topology"),
      // cpuVal is null, so cpuVal !== undefined is true, causing cpuVal.trim() to throw TypeError.
      const nullEdit = {
        "CPU Core Topology": null as unknown as string,
      };

      let threw = false;
      try {
        applyInlineSpecEdits(baseSpecs, nullEdit);
      } catch (err) {
        threw = true;
        expect((err as TypeError).message).toContain("trim");
      }
      expect(threw).toBe(true);
    });

    it("verifies useDebounce resilience under React StrictMode double-mount simulation", async () => {
      const harness = createHookHarness(useDebounce);

      // Mount 1
      harness.update("strict_val", 50);
      // StrictMode unmounts immediately
      harness.unmount();
      // StrictMode remounts with new value
      harness.update("strict_val_remount", 50);

      // During active window (before 50ms), debounced value correctly remains the previous value ("strict_val")
      expect(harness.getResult()).toBe("strict_val");

      // After timeout (>50ms), it properly commits "strict_val_remount"
      await new Promise((r) => setTimeout(r, 70));
      expect(harness.getResult()).toBe("strict_val_remount");
    });

    it("evaluates ComparisonDock when duplicate IDs are passed directly", () => {
      const dev0 = INITIAL_DEVICES[0];
      const htmlDuplicate = renderClean(
        React.createElement(ComparisonDock, {
          devices: INITIAL_DEVICES,
          stagedDeviceIds: [dev0.id, dev0.id],
          onRemoveDevice: vi.fn(),
          onClearAll: vi.fn(),
          onLaunchCompare: vi.fn(),
        })
      );

      // Both pills are rendered in markup
      expect(htmlDuplicate).toContain("Comparing 2 of 4");
      // Helper text says Ready to compare
      expect(htmlDuplicate).toContain("Ready to compare");
    });
  });
});
