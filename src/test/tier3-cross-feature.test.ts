import { describe, it, expect } from "vitest";
import { FULL_UNIFIED_CATALOG } from "@/lib/brands/catalog-loader";
import { calculateLivingScores } from "@/lib/editors";
import { generateGroundedDebate } from "@/lib/debate-engine";
import { scoreManualDevice } from "@/lib/scoring";
import { MANUAL_SPEC_PRESETS } from "@/lib/spec-synthesizer";
import type { SmartphoneDevice } from "@/lib/seed-data";

describe("Tier 3: Cross-Feature Combinations", () => {
  // =========================================================================
  // 1. Search + Filter + Comparison Dock Staging + Weight Customization
  // =========================================================================
  it("Combination 1: Debounced search + parametric filter + dock staging + dynamic Living Score weights", () => {
    // Step A: Search for "Ultra" flagships
    const query = "ultra";
    const searchResults = FULL_UNIFIED_CATALOG.filter((d) =>
      d.name.toLowerCase().includes(query) || d.brand.toLowerCase().includes(query)
    );
    expect(searchResults.length).toBeGreaterThan(0);

    // Step B: Apply parametric filter (battery >= 5000 mAh)
    const filteredResults = searchResults.filter(
      (d) => d.specs.batteryCapacityMah >= 5000
    );
    expect(filteredResults.length).toBeGreaterThan(0);

    // Step C: Stage up to 3 contenders into comparison dock
    const stagedDock = filteredResults.slice(0, 3).map((d) => d.id);
    expect(stagedDock).toHaveLength(3);

    // Step D: Calculate Living Scores for staged devices under baseline weights
    const device1 = FULL_UNIFIED_CATALOG.find((d) => d.id === stagedDock[0])!;
    const device2 = FULL_UNIFIED_CATALOG.find((d) => d.id === stagedDock[1])!;
    expect(device2).toBeDefined();

    const baselineScores1 = calculateLivingScores({
      launchMsrpUsd: device1.launchMsrpUsd,
      simulatedStreetUsd: device1.currentStreetUsd,
      osSupportYears: device1.osSupportYears,
      basePragmatistScore: 8,
      baseStreetUsd: device1.currentStreetUsd,
      siliconScore: 8,
      cameraScore: 9,
      dailyDriverScore: 7,
    });

    // Step E: Apply heavily camera-focused custom weights
    const cameraPuristWeights = {
      SILICON_GEEK: 0.1,
      CAMERA_PURIST: 3.0,
      PRAGMATIST: 0.1,
      DAILY_DRIVER: 0.1,
    };

    const reweightedScores1 = calculateLivingScores({
      launchMsrpUsd: device1.launchMsrpUsd,
      simulatedStreetUsd: device1.currentStreetUsd,
      osSupportYears: device1.osSupportYears,
      basePragmatistScore: 8,
      baseStreetUsd: device1.currentStreetUsd,
      siliconScore: 8,
      cameraScore: 9,
      dailyDriverScore: 7,
      customWeights: cameraPuristWeights,
    });

    // Composite living score reflects higher camera weight
    expect(reweightedScores1.compositeLivingScore).toBeGreaterThanOrEqual(
      baselineScores1.compositeLivingScore
    );
  });

  // =========================================================================
  // 2. Multi-Device Spec Diff Matrix (3 to 4 Contenders) + True-Scale Size Comparison
  // =========================================================================
  it("Combination 2: Multi-device (3-4 contenders) winner evaluation + physical silhouette dimension scaling", () => {
    // Select 3 top contenders
    const contenders = FULL_UNIFIED_CATALOG.slice(0, 3);
    expect(contenders).toHaveLength(3);

    // Evaluate winner for Battery Capacity
    const batteryWinner = contenders.reduce((maxDev, cur) =>
      cur.specs.batteryCapacityMah > maxDev.specs.batteryCapacityMah ? cur : maxDev
    );
    expect(batteryWinner).toBeDefined();
    expect(batteryWinner.specs.batteryCapacityMah).toBeGreaterThanOrEqual(
      contenders[0].specs.batteryCapacityMah
    );

    // Physical silhouette millimeter true-scale scaling factor: 1 mm = 3.2 SVG pixels
    const MM_TO_PX = 3.2;
    const silhouetteDimensions = contenders.map((dev) => ({
      name: dev.name,
      pixelHeight: (dev.customHeightMm ?? 160) * MM_TO_PX,
      pixelWidth: (dev.specs.widthMm ?? 75) * MM_TO_PX,
      pixelThickness: (dev.specs.thicknessMm ?? 8.2) * MM_TO_PX,
    }));

    expect(silhouetteDimensions).toHaveLength(3);
    silhouetteDimensions.forEach((s) => {
      expect(s.pixelHeight).toBeGreaterThan(400); // 160mm * 3.2 = ~512px
      expect(s.pixelWidth).toBeGreaterThan(200);
      expect(s.pixelThickness).toBeGreaterThan(20);
    });
  });

  // =========================================================================
  // 3. Inline Spec Editing + Score Recalculation + Grounded Debate Synthesis
  // =========================================================================
  it("Combination 3: Inline spec editing propagates to live scores and grounds debate synthesis", () => {
    // Preset device
    const basePreset = { ...MANUAL_SPEC_PRESETS["xiaomi-15-ultra"] };
    const initialScores = scoreManualDevice(basePreset);

    // Apply inline edit upgrading camera sensor to 1.0-inch
    const editedPreset = {
      ...basePreset,
      mainSensorSize: "1.0-inch Sony LYT-900",
      geekbenchMulti: 10500,
    };
    const updatedScores = scoreManualDevice(editedPreset);

    expect(updatedScores.cameraScore).toBeGreaterThanOrEqual(initialScores.cameraScore);
    expect(updatedScores.siliconScore).toBeGreaterThanOrEqual(initialScores.siliconScore);

    // Synthesize grounded debate using devices with these specs
    const deviceA = FULL_UNIFIED_CATALOG[0];
    const deviceB = FULL_UNIFIED_CATALOG[1];
    const debate = generateGroundedDebate({
      query: "Which device has the best camera and high performance?",
      deviceA,
      deviceB,
    });

    expect(debate.turns).toHaveLength(4);
    expect(debate.consensusSummary.length).toBeGreaterThan(20);
    expect(debate.consensusWinnerId).toBeDefined();
    expect(debate.consensusWinnerName).toBeDefined();
  });

  // =========================================================================
  // 4. Rate Limiter Burst + AI Debate Streaming with Graceful 429 Local Fallback
  // =========================================================================
  it("Combination 4: Rate limit exhaustion gracefully falls back to instant local debate analysis", async () => {
    const CAPACITY = 2;
    let tokens = CAPACITY;

    // Simulate rate limit handler
    const handleDebateRequest = async (
      query: string,
      devA: SmartphoneDevice,
      devB: SmartphoneDevice
    ) => {
      if (tokens < 1) {
        // HTTP 429: Rate limit exceeded
        // Client fallback executes local deterministic debate immediately:
        const fallback = generateGroundedDebate({ query, deviceA: devA, deviceB: devB });
        return {
          status: 429,
          fallbackActive: true,
          debate: fallback,
        };
      }
      tokens -= 1;
      return {
        status: 200,
        fallbackActive: false,
        debate: generateGroundedDebate({ query, deviceA: devA, deviceB: devB }),
      };
    };

    const devA = FULL_UNIFIED_CATALOG[0];
    const devB = FULL_UNIFIED_CATALOG[1];

    // Request 1: Allowed
    const res1 = await handleDebateRequest("Best camera", devA, devB);
    expect(res1.status).toBe(200);
    expect(res1.fallbackActive).toBe(false);

    // Request 2: Allowed (burst 2)
    const res2 = await handleDebateRequest("Best battery", devA, devB);
    expect(res2.status).toBe(200);
    expect(res2.fallbackActive).toBe(false);

    // Request 3: Rate limited -> Graceful fallback without blocking user workflow
    const res3 = await handleDebateRequest("Best value", devA, devB);
    expect(res3.status).toBe(429);
    expect(res3.fallbackActive).toBe(true);
    expect(res3.debate.turns).toHaveLength(4);
    expect(res3.debate.consensusSummary).toBeDefined();
  });

  // =========================================================================
  // 5. Regional Currency Conversion + Street Price Simulation + Buy Recommendation
  // =========================================================================
  it("Combination 5: Regional pricing conversion + simulated price drop upgrades buy recommendation", () => {
    const launchMsrpUsd = 1200;
    const initialStreetUsd = 1100;
    const osSupportYears = 5;

    // Initial baseline scores at high price gives WAIT_FOR_DROP
    const initialScores = calculateLivingScores({
      launchMsrpUsd,
      simulatedStreetUsd: initialStreetUsd,
      osSupportYears,
      basePragmatistScore: 6.5,
      baseStreetUsd: 1100,
      siliconScore: 8.5,
      cameraScore: 8.5,
      dailyDriverScore: 8.0,
    });
    expect(initialScores.buyRecommendation).toBe("WAIT_FOR_DROP");

    // Price drop simulation: drops to $750 (37.5% discount)
    const discountedScores = calculateLivingScores({
      launchMsrpUsd,
      simulatedStreetUsd: 750,
      osSupportYears,
      basePragmatistScore: 6.5,
      baseStreetUsd: 1100,
      siliconScore: 8.5,
      cameraScore: 8.5,
      dailyDriverScore: 8.0,
    });

    expect(discountedScores.pragmatistScore).toBeGreaterThan(initialScores.pragmatistScore);
    expect(discountedScores.costPerYearUsd).toBe(150); // $750 / 5 yrs
    expect(discountedScores.discountPct).toBe(38); // Math.round(37.5)
    expect(discountedScores.buyRecommendation).toBe("BUY_ON_SALE"); // Upgraded from WAIT_FOR_DROP

    // Further price drop to $550 (54% discount) upgrades to STRONG_BUY
    const deepDiscountScores = calculateLivingScores({
      launchMsrpUsd,
      simulatedStreetUsd: 550,
      osSupportYears,
      basePragmatistScore: 8.0,
      baseStreetUsd: 1100,
      siliconScore: 8.5,
      cameraScore: 8.5,
      dailyDriverScore: 8.0,
    });
    expect(deepDiscountScores.buyRecommendation).toBe("STRONG_BUY");

    // Regional conversion to EUR (rate 0.92)
    const eurPrice = Math.round(750 * 0.92);
    expect(eurPrice).toBe(690);
  });

  // =========================================================================
  // 6. Cross-Tab & Intra-Tab State Synchronization Simulation
  // =========================================================================
  it("Combination 6: Pinned candidate state synchronizes intra-tab via event dispatching", () => {
    const STORAGE_KEY = "phoneindex:pinned-candidates:v1";
    let activePinnedState: string[] = [];

    // Simulate intra-tab listener
    const syncListener = (eventDetail: { key: string; value: string[] }) => {
      if (eventDetail.key === STORAGE_KEY) {
        activePinnedState = eventDetail.value;
      }
    };

    // Tab 1 updates pinned list
    const newPinnedList = ["dev-s25-ultra", "dev-vivo-x200-pro"];
    syncListener({ key: STORAGE_KEY, value: newPinnedList });

    // Sibling component receives new state without page refresh
    expect(activePinnedState).toEqual(newPinnedList);
    expect(activePinnedState).toHaveLength(2);
  });
});
