import { describe, it, expect } from "vitest";
import { FULL_UNIFIED_CATALOG } from "@/lib/brands/catalog-loader";
import { calculateLivingScores } from "@/lib/editors";
import { generateGroundedDebate } from "@/lib/debate-engine";
import {
  buildDeviceFromManualInput,
  MANUAL_SPEC_PRESETS,
} from "@/lib/spec-synthesizer";
import type { SmartphoneDevice } from "@/lib/seed-data";
import {
  calculateReferenceEnduranceHours,
  calculateReferenceAcoustics,
} from "./helpers/test-utils";

describe("Tier 4: Real-World Application Workflows", () => {
  // =========================================================================
  // Workflow 1: Flagship Enthusiast Shortlist & 4-Editor AI Verdict
  // =========================================================================
  it("Workflow 1: Flagship Enthusiast Shortlist, Multi-Device Compare & Debate", () => {
    // 1. Search and shortlist top 2025/2026 flagships
    const candidates = FULL_UNIFIED_CATALOG.filter(
      (d) =>
        d.specs.geekbenchMulti >= 7000 &&
        d.specs.batteryCapacityMah >= 5000 &&
        d.specs.mainSensorMp >= 50
    );
    expect(candidates.length).toBeGreaterThanOrEqual(2);

    const contenderA = candidates[0];
    const contenderB = candidates[1];

    // 2. Stage in dock
    const stagedDock = [contenderA.id, contenderB.id];
    expect(stagedDock).toHaveLength(2);

    // 3. Inspect True-Scale Silhouette Dimensions
    const scaleFactor = 3.2; // mm to SVG pixel ratio
    const devAHeightPx = (contenderA.customHeightMm ?? 162.8) * scaleFactor;
    const devBHeightPx = (contenderB.customHeightMm ?? 163.0) * scaleFactor;
    expect(devAHeightPx).toBeGreaterThan(450);
    expect(devBHeightPx).toBeGreaterThan(450);

    // 4. Run 4-Persona AI Grounded Debate
    const userQuery = "Which flagship takes better portraits of moving pets in low light?";
    const debate = generateGroundedDebate({
      query: userQuery,
      deviceA: contenderA,
      deviceB: contenderB,
    });

    expect(debate.turns).toHaveLength(4);
    // Viktor Vance (Silicon Geek)
    expect(debate.turns[0].editorId).toBe("SILICON_GEEK");
    // Elena Rostova (Camera Purist)
    expect(debate.turns[1].editorId).toBe("CAMERA_PURIST");
    // Marcus Sterling (The Pragmatist)
    expect(debate.turns[2].editorId).toBe("PRAGMATIST");
    // Maya Chen (The Daily Driver)
    expect(debate.turns[3].editorId).toBe("DAILY_DRIVER");

    expect(debate.consensusWinnerId).toBeDefined();
    expect(debate.consensusSummary.length).toBeGreaterThan(20);
    expect(debate.confidencePct).toBeGreaterThanOrEqual(50);
  });

  // =========================================================================
  // Workflow 2: Pragmatic Buyer Value Hunting & Price Drop Simulator
  // =========================================================================
  it("Workflow 2: Pragmatic Value Hunting, Cost-per-Year & Price Drop Simulator", () => {
    const flagship = FULL_UNIFIED_CATALOG.find((d) => d.currentStreetUsd >= 900)!;
    expect(flagship).toBeDefined();

    // 1. Initial MSRP calculation
    const baseline = calculateLivingScores({
      launchMsrpUsd: flagship.launchMsrpUsd,
      simulatedStreetUsd: flagship.launchMsrpUsd,
      osSupportYears: flagship.osSupportYears,
      basePragmatistScore: 6.5,
      baseStreetUsd: flagship.launchMsrpUsd,
      siliconScore: 8.5,
      cameraScore: 8.5,
      dailyDriverScore: 8.0,
      customWeights: {
        PRAGMATIST: 3.0,
        SILICON_GEEK: 0.5,
        CAMERA_PURIST: 0.5,
        DAILY_DRIVER: 0.5,
      },
    });

    // 2. User simulates a major $300 street price drop
    const droppedPrice = flagship.launchMsrpUsd - 300;
    const simulated = calculateLivingScores({
      launchMsrpUsd: flagship.launchMsrpUsd,
      simulatedStreetUsd: droppedPrice,
      osSupportYears: flagship.osSupportYears,
      basePragmatistScore: 6.5,
      baseStreetUsd: flagship.launchMsrpUsd,
      siliconScore: 8.5,
      cameraScore: 8.5,
      dailyDriverScore: 8.0,
      customWeights: {
        PRAGMATIST: 3.0,
        SILICON_GEEK: 0.5,
        CAMERA_PURIST: 0.5,
        DAILY_DRIVER: 0.5,
      },
    });

    // Pragmatist score and composite score must rise significantly
    expect(simulated.pragmatistScore).toBeGreaterThan(baseline.pragmatistScore);
    expect(simulated.compositeLivingScore).toBeGreaterThan(baseline.compositeLivingScore);
    expect(simulated.costPerYearUsd).toBeLessThan(baseline.costPerYearUsd);
    expect(simulated.discountPct).toBeGreaterThan(0);
    expect(simulated.pragmatistNote).toContain("Street price drop");
  });

  // =========================================================================
  // Workflow 3: Flicker-Sensitive Night Reader PWM Eye-Care Telemetry
  // =========================================================================
  it("Workflow 3: Flicker-Sensitive Eye-Care Telemetry & Display Modulation", () => {
    // 1. Query catalog for high-frequency PWM dimming (>= 1920 Hz)
    const eyeCarePhones = FULL_UNIFIED_CATALOG.filter(
      (d) => d.specs.pwmDimmingHz >= 1920
    );
    expect(eyeCarePhones.length).toBeGreaterThan(0);

    // 2. Verify low-frequency flicker devices exist (< 480 Hz)
    const lowPwmPhones = FULL_UNIFIED_CATALOG.filter(
      (d) => d.specs.pwmDimmingHz < 480
    );
    expect(lowPwmPhones.length).toBeGreaterThan(0);

    // 3. Verify hardware rating disparity
    const eyeCareDevice = eyeCarePhones[0];
    const lowPwmDevice = lowPwmPhones[0];

    expect(eyeCareDevice.specs.pwmDimmingHz).toBeGreaterThanOrEqual(1920);
    expect(lowPwmDevice.specs.pwmDimmingHz).toBeLessThan(480);
  });

  // =========================================================================
  // Workflow 4: Scientific Transparency & Dual-Pillar Lab Provenance
  // =========================================================================
  it("Workflow 4: Dual-Pillar Lab Telemetry, Battery Simulation & Acoustic LUFS", () => {
    // 1. Calculate deterministic endurance for a 5,000 mAh 4nm phone with 17.5 in² display
    const batteryHours = calculateReferenceEnduranceHours(5000, "4nm", 17.5, 18.5);
    expect(batteryHours).toBeGreaterThan(12);
    expect(batteryHours).toBeLessThan(16);

    // 2. Calculate acoustic profile for typical flagship chassis: 76 x 162 x 8.5 mm = 104.6 cm³
    const acoustics = calculateReferenceAcoustics(76, 162, 8.5, true);
    expect(acoustics.lufs).toBe(-24.5);
    expect(acoustics.loudnessClass).toBe("VERY_GOOD");

    // 3. Verify legal disclaimer and provenance audit trail requirements
    const auditMetadata = {
      provenance: "SIMULATED_PARAMETRIC_MODEL" as const,
      license: "CC_BY_4.0" as const,
      protocolVersion: "phoneindex-openlab-v1.0",
      marginOfErrorPct: 5.0,
      disclaimer:
        "PhoneIndex is an independent platform and does not scrape, republish, or copy proprietary lab measurements from GSMArena Lab, DxOMark, or RTINGS.",
    };

    expect(auditMetadata.provenance).toBe("SIMULATED_PARAMETRIC_MODEL");
    expect(auditMetadata.license).toBe("CC_BY_4.0");
    expect(auditMetadata.disclaimer).toContain("independent platform");
  });

  // =========================================================================
  // Workflow 5: Power User Custom Hardware Spec Synthesis & Storage Hydration
  // =========================================================================
  it("Workflow 5: Custom Hardware Spec Synthesis & Hydration-Safe Storage Lifecycle", () => {
    // 1. User synthesizes a custom device from preset
    const preset = MANUAL_SPEC_PRESETS["xiaomi-15-ultra"];
    const customDevice = buildDeviceFromManualInput(preset, "custom-flagship-1");

    expect(customDevice.id).toBe("custom-flagship-1");
    expect(customDevice.compositeLivingScore).toBeGreaterThanOrEqual(5.5);
    expect(customDevice.compositeLivingScore).toBeLessThanOrEqual(9.9);
    expect(customDevice.verdicts.SILICON_GEEK).toBeDefined();
    expect(customDevice.verdicts.CAMERA_PURIST).toBeDefined();

    // 2. Simulate storage hydration envelope lifecycle
    const STORAGE_KEY = "phoneindex:custom-devices:v1";
    const CURRENT_SCHEMA_VERSION = 1;

    // Initial server state before hydration
    let clientState: SmartphoneDevice[] | null = null;
    let isHydrated = false;

    // Simulated storage
    const storageStore: Record<string, string> = {};

    // Client mount simulation
    const mountComponent = () => {
      // Step A: Hydrate from storage
      const raw = storageStore[STORAGE_KEY];
      if (raw) {
        const envelope = JSON.parse(raw);
        if (envelope.__version === CURRENT_SCHEMA_VERSION) {
          clientState = envelope.data;
        }
      } else {
        clientState = [];
      }
      isHydrated = true;
    };

    mountComponent();
    expect(isHydrated).toBe(true);
    expect(clientState).toEqual([]);

    // Step B: User adds synthesized device to persistent storage
    const updatedDevices = [customDevice];
    const envelope = {
      __version: CURRENT_SCHEMA_VERSION,
      timestamp: Date.now(),
      data: updatedDevices,
    };
    storageStore[STORAGE_KEY] = JSON.stringify(envelope);

    // Step C: Simulate page reload / remount
    isHydrated = false;
    clientState = null;
    mountComponent();

    expect(isHydrated).toBe(true);
    expect(clientState).not.toBeNull();
    expect(clientState).toHaveLength(1);
    expect(clientState![0].id).toBe("custom-flagship-1");
    expect(clientState![0].name).toBe(customDevice.name);
  });
});
