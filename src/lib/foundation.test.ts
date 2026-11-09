import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/debate/route";
import { FULL_UNIFIED_CATALOG } from "@/lib/brands/catalog-loader";
import {
  MAX_DEBATE_QUERY_LENGTH,
  parseDebateRequest,
} from "@/lib/debate-request";
import { generateGroundedDebate } from "@/lib/debate-engine";
import { calculateLivingScores, stripEmDashes } from "@/lib/editors";
import {
  DETERMINISTIC_INTELLIGENCE,
  SCORING_MODEL_VERSION,
} from "@/lib/intelligence";
import { DeviceSpecsData, INITIAL_DEVICES } from "@/lib/seed-data";
import {
  applyInlineSpecEdits,
  SPEC_ROW_TO_FIELD_MAP,
} from "@/components/FullSpecSheet";
import {
  buildDeviceFromManualInput,
  MANUAL_SPEC_PRESETS,
} from "@/lib/spec-synthesizer";
import {
  auditVisualCoverage,
  resolveDeviceVisualProfile,
} from "@/lib/visual-profiles/resolver";
import {
  calculateChassisDimensions,
  classifyCameraIslandArchetype,
  getArchetypeCameraElements,
  parseAspectRatio,
  generateDeviceVisualProfile,
} from "@/lib/visual-profiles/cad-engine";
import { SCORE_MODEL_VERSION, scoreManualDevice } from "@/lib/scoring";
import {
  createAdminSessionToken,
  validateAdminKey,
  verifyAdminSessionToken,
} from "@/lib/server/admin-session";

describe("Living Score engine", () => {
  it("keeps baseline scores stable at the baseline street price", () => {
    const result = calculateLivingScores({
      launchMsrpUsd: 1200,
      simulatedStreetUsd: 1000,
      osSupportYears: 5,
      basePragmatistScore: 8,
      baseStreetUsd: 1000,
      siliconScore: 8,
      cameraScore: 8,
      dailyDriverScore: 8,
    });

    expect(result).toMatchObject({
      pragmatistScore: 8,
      compositeLivingScore: 8,
      costPerYearUsd: 200,
      discountPct: 17,
      buyRecommendation: "BUY_ON_SALE",
    });
  });

  it("raises value score when the simulated price drops", () => {
    const result = calculateLivingScores({
      launchMsrpUsd: 1200,
      simulatedStreetUsd: 800,
      osSupportYears: 5,
      basePragmatistScore: 8,
      baseStreetUsd: 1000,
      siliconScore: 8,
      cameraScore: 8,
      dailyDriverScore: 8,
    });

    expect(result.pragmatistScore).toBe(9.1);
    expect(result.compositeLivingScore).toBe(8.3);
    expect(result.pragmatistNote).toContain("Street price drop");
  });

  it("normalizes custom priority weights", () => {
    const result = calculateLivingScores({
      launchMsrpUsd: 1000,
      simulatedStreetUsd: 1000,
      osSupportYears: 5,
      basePragmatistScore: 5,
      baseStreetUsd: 1000,
      siliconScore: 6,
      cameraScore: 9,
      dailyDriverScore: 7,
      customWeights: {
        SILICON_GEEK: 0,
        CAMERA_PURIST: 2,
        PRAGMATIST: 0,
        DAILY_DRIVER: 0,
      },
    });

    expect(result.compositeLivingScore).toBe(9);
  });

  it("removes em dashes from generated copy", () => {
    expect(stripEmDashes("Fast \u2014 but warm -- under load")).toBe(
      "Fast, but warm, under load"
    );
  });
});

describe("manual device synthesis", () => {
  it("produces a complete deterministic device from a preset", () => {
    const device = buildDeviceFromManualInput(
      MANUAL_SPEC_PRESETS["xiaomi-15-ultra"],
      "test-device"
    );

    expect(device.id).toBe("test-device");
    expect(device.slug).toBe("xiaomi-xiaomi-15-ultra");
    expect(device.compositeLivingScore).toBeGreaterThanOrEqual(5.5);
    expect(device.compositeLivingScore).toBeLessThanOrEqual(9.9);
    expect(Object.keys(device.verdicts)).toHaveLength(4);
    expect(device.evidence).toHaveLength(1);
  });
});

describe("Living Score v2 rubric", () => {
  it("separates hardware strengths instead of clustering every category near nine", () => {
    const cameraFlagship = scoreManualDevice(
      MANUAL_SPEC_PRESETS["xiaomi-15-ultra"]
    );
    const thinPhone = scoreManualDevice(MANUAL_SPEC_PRESETS["iphone-17-air"]);

    expect(SCORE_MODEL_VERSION).toBe("living-score-v2");
    expect(cameraFlagship.cameraScore).toBeGreaterThan(
      thinPhone.cameraScore + 1.5
    );
    expect(cameraFlagship.siliconScore).toBeGreaterThan(thinPhone.siliconScore);
    expect(thinPhone.dailyDriverScore).toBeGreaterThan(
      cameraFlagship.dailyDriverScore
    );
    expect(
      Object.values(cameraFlagship).filter((value) => typeof value === "number")
    ).not.toContain(9.9);
  });
});

describe("admin session signing", () => {
  it("accepts a valid signed session and rejects expired or modified tokens", () => {
    const previousKey = process.env.PHONEINDEX_ADMIN_KEY;
    const previousSecret = process.env.PHONEINDEX_ADMIN_SECRET;
    process.env.PHONEINDEX_ADMIN_KEY = "test-admin-key";
    process.env.PHONEINDEX_ADMIN_SECRET = "test-secret-with-more-than-32-characters";

    try {
      const now = Date.now();
      const token = createAdminSessionToken(now);
      expect(validateAdminKey("test-admin-key")).toBe(true);
      expect(validateAdminKey("wrong-key")).toBe(false);
      expect(verifyAdminSessionToken(token, now)).toBe(true);
      expect(verifyAdminSessionToken(`${token}x`, now)).toBe(false);
      expect(verifyAdminSessionToken(token, now + 9 * 60 * 60 * 1000)).toBe(
        false
      );
    } finally {
      if (previousKey === undefined) delete process.env.PHONEINDEX_ADMIN_KEY;
      else process.env.PHONEINDEX_ADMIN_KEY = previousKey;
      if (previousSecret === undefined) delete process.env.PHONEINDEX_ADMIN_SECRET;
      else process.env.PHONEINDEX_ADMIN_SECRET = previousSecret;
    }
  });
});

describe("deterministic debate", () => {
  it("reports its actual provider and scoring model", () => {
    const debate = generateGroundedDebate({
      query: "camera \u2014 and battery",
      deviceA: INITIAL_DEVICES[0],
      deviceB: INITIAL_DEVICES[1],
    });

    expect(debate.intelligence).toEqual(DETERMINISTIC_INTELLIGENCE);
    expect(debate.intelligence.scoringModelVersion).toBe(SCORING_MODEL_VERSION);
    expect(debate.intelligence.verificationStatus).toBe("SYNTHETIC");
    expect(debate.scenarioTitle).not.toContain("\u2014");
    expect(debate.turns).toHaveLength(4);
    expect(debate.consensusSummary).not.toContain("Vivo Vivo");
  });
});

describe("debate request validation", () => {
  const validRequest = {
    query: "Best camera for moving children",
    deviceAId: "dev-s25-ultra",
    deviceBId: "dev-vivo-x200-pro",
  };

  it("accepts and trims a valid ID-only request", () => {
    expect(parseDebateRequest({ ...validRequest, query: "  camera  " })).toEqual({
      ok: true,
      value: { ...validRequest, query: "camera" },
    });
  });

  it("rejects legacy client-supplied catalogs", () => {
    const result = parseDebateRequest({ ...validRequest, devices: [] });
    expect(result).toEqual({
      ok: false,
      error: "Unsupported request field: devices.",
    });
  });

  it("rejects oversized prompts and duplicate device IDs", () => {
    expect(
      parseDebateRequest({
        ...validRequest,
        query: "x".repeat(MAX_DEBATE_QUERY_LENGTH + 1),
      }).ok
    ).toBe(false);
    expect(
      parseDebateRequest({
        ...validRequest,
        deviceBId: validRequest.deviceAId,
      })
    ).toEqual({
      ok: false,
      error: "Choose two different devices to compare.",
    });
  });
});

describe("unified catalog", () => {
  it("contains unique IDs and normalized brand/name pairs", () => {
    const ids = new Set<string>();
    const names = new Set<string>();

    for (const device of FULL_UNIFIED_CATALOG) {
      const normalizedName = `${device.brand}::${device.name}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-");
      expect(ids.has(device.id), `duplicate ID: ${device.id}`).toBe(false);
      expect(
        names.has(normalizedName),
        `duplicate device: ${device.brand} ${device.name}`
      ).toBe(false);
      ids.add(device.id);
      names.add(normalizedName);
    }

    expect(FULL_UNIFIED_CATALOG.length).toBeGreaterThan(900);
  });
});

describe("visual profile resolution", () => {
  it("resolves verified vector profile for Samsung Galaxy S25 Ultra", () => {
    const visual = resolveDeviceVisualProfile(INITIAL_DEVICES[0]);

    expect(visual.source).toBe("MANIFEST");
    expect(visual.status).toBe("VERIFIED_VECTOR");
    expect(visual.renderer).toBe("CALIBRATED_VECTOR");
    expect(visual.profile?.deviceId).toBe("dev-s25-ultra");
  });

  it("labels devices without profiles as generic silhouettes", () => {
    const visual = resolveDeviceVisualProfile({
      ...INITIAL_DEVICES[0],
      id: "device-without-visual-profile",
    });

    expect(visual.status).toBe("GENERIC_FALLBACK");
    expect(visual.renderer).toBe("LEGACY_HEURISTIC");
  });

  it("audits the full catalog without invalid pilot profiles", () => {
    const audit = auditVisualCoverage(FULL_UNIFIED_CATALOG);

    expect(audit.totalDevices).toBe(939);
    expect(audit.explicitProfiles).toBe(audit.totalDevices);
    expect(audit.verifiedVectors).toBe(audit.totalDevices);
    expect(audit.genericFallbacks).toBe(0);
    expect(audit.coveragePct).toBe(100);
    expect(audit.verifiedPct).toBe(100);
    expect(audit.invalidProfiles).toEqual([]);
  });
});

describe("3-Layer Parametric Vector CAD Engine", () => {
  it("derives exact trigonometric display geometry and clamps lateral bezels", () => {
    // 19.5:9 aspect ratio resolution
    const r = parseAspectRatio("2400 x 1080");
    expect(r).toBeCloseTo(2.222, 2);

    const s25UltraChassis = calculateChassisDimensions(INITIAL_DEVICES[0]);
    expect(s25UltraChassis.heightMm).toBe(162.5);
    expect(s25UltraChassis.widthMm).toBe(77.6);
    expect(s25UltraChassis.thicknessMm).toBe(8.2);
    expect(s25UltraChassis.bezelMm).toBeGreaterThanOrEqual(1.05);
    expect(s25UltraChassis.bezelMm).toBeLessThanOrEqual(3.4);
    expect(s25UltraChassis.cornerRadiusPx).toBe(18); // modern ergonomic ultra
    expect(s25UltraChassis.islandType).toBe("S_ULTRA_5_RINGS");
    expect(classifyCameraIslandArchetype(INITIAL_DEVICES[0])).toBe("S_ULTRA_5_RINGS");
    expect(getArchetypeCameraElements("S_ULTRA_5_RINGS").length).toBe(6);
  });

  it("handles sharp ultra/gaming frames, foldables, and ergonomic flagships", () => {
    // S24 Ultra sharp note frame
    const s24Ultra = calculateChassisDimensions({
      ...INITIAL_DEVICES[0],
      id: "dev-s24-ultra",
      slug: "samsung-galaxy-s24-ultra",
    });
    expect(s24Ultra.cornerRadiusPx).toBe(5);

    // RedMagic gaming flush
    const redmagic = calculateChassisDimensions({
      ...INITIAL_DEVICES[0],
      id: "dev-redmagic-10-pro",
      slug: "zte-nubia-redmagic-10-pro",
      brand: "RedMagic",
    });
    expect(redmagic.cornerRadiusPx).toBe(14);
    expect(redmagic.islandType).toBe("REDMAGIC_FLUSH_GAMING");
    expect(redmagic.frontCutout).toBe("NONE_FULLSCREEN");

    // Clamshell foldable
    const zflip = calculateChassisDimensions({
      ...INITIAL_DEVICES[0],
      id: "dev-z-flip-6",
      slug: "samsung-galaxy-z-flip-6",
    });
    expect(zflip.islandType).toBe("Z_FLIP_CLAMSHELL");
  });

  it("classifies archetypes via spec-driven fallback for unmapped brands", () => {
    // Periscope sensor -> ZEISS_CIRCLE
    const periscopeDevice = calculateChassisDimensions({
      ...INITIAL_DEVICES[0],
      id: "dev-unmapped-periscope",
      brand: "UnknownBrand",
      slug: "unknown-super-zoom",
      specs: {
        ...INITIAL_DEVICES[0].specs,
        telephotoSpecs: "50MP periscope 5x optical zoom",
      },
    });
    expect(periscopeDevice.islandType).toBe("ZEISS_CIRCLE");

    // 1-inch large main sensor -> ZEISS_CIRCLE
    const largeSensorDevice = calculateChassisDimensions({
      ...INITIAL_DEVICES[0],
      id: "dev-unmapped-1inch",
      brand: "UnknownBrand",
      slug: "unknown-large-sensor",
      specs: {
        ...INITIAL_DEVICES[0].specs,
        mainSensorSize: "1.0\" 50MP Sony LYT-900",
        telephotoSpecs: "None",
      },
    });
    expect(largeSensorDevice.islandType).toBe("ZEISS_CIRCLE");

    // Triple lens with telephoto -> XIAOMI_LEICA_SQUIRCLE
    const telephotoDevice = calculateChassisDimensions({
      ...INITIAL_DEVICES[0],
      id: "dev-unmapped-telephoto",
      brand: "UnknownBrand",
      slug: "unknown-telephoto",
      specs: {
        ...INITIAL_DEVICES[0].specs,
        mainSensorSize: "1/1.56\"",
        ultrawideSpecs: "12MP ultra",
        telephotoSpecs: "10MP 3x telephoto",
      },
    });
    expect(telephotoDevice.islandType).toBe("XIAOMI_LEICA_SQUIRCLE");

    // Dual lens -> S_EDGE_DUAL_PILL
    const dualDevice = calculateChassisDimensions({
      ...INITIAL_DEVICES[0],
      id: "dev-unmapped-dual",
      brand: "UnknownBrand",
      slug: "unknown-dual",
      specs: {
        ...INITIAL_DEVICES[0].specs,
        mainSensorSize: "1/1.56\"",
        ultrawideSpecs: "None",
        telephotoSpecs: "10MP 2x",
      },
    });
    expect(dualDevice.islandType).toBe("S_EDGE_DUAL_PILL");

    // Single lens -> IPHONE_16E_SINGLE_LENS
    const singleDevice = calculateChassisDimensions({
      ...INITIAL_DEVICES[0],
      id: "dev-unmapped-single",
      brand: "UnknownBrand",
      slug: "unknown-single",
      specs: {
        ...INITIAL_DEVICES[0].specs,
        mainSensorSize: "1/2.0\"",
        ultrawideSpecs: "None",
        telephotoSpecs: "None",
      },
    });
    expect(singleDevice.islandType).toBe("IPHONE_16E_SINGLE_LENS");
  });

  it("generates complete and valid DeviceVisualProfile adhering to telemetry invariants", () => {
    const profile = generateDeviceVisualProfile(INITIAL_DEVICES[0]);
    expect(profile.status).toBe("VERIFIED_VECTOR");
    expect(profile.renderer).toBe("CALIBRATED_VECTOR");
    expect(profile.dimensions.heightMm).toBeGreaterThanOrEqual(60);
    expect(profile.dimensions.heightMm).toBeLessThanOrEqual(250);
    expect(profile.cameraElements?.length).toBeGreaterThan(0);
    expect(profile.calibration?.bodyBounds).toBeDefined();
    expect(profile.calibration?.displayBounds).toBeDefined();
    expect(profile.calibration?.cameraBounds).toBeDefined();
    expect(profile.provenance.sourceUrl).toContain(INITIAL_DEVICES[0].id);
  });
});

describe("debate route", () => {
  it("returns deterministic metadata for valid device IDs", async () => {
    const response = await POST(
      new Request("http://localhost/api/debate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: "Best camera and battery balance",
          deviceAId: "dev-s25-ultra",
          deviceBId: "dev-vivo-x200-pro",
        }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.intelligence.mode).toBe("DETERMINISTIC");
  });

  it("rejects malformed JSON and unknown devices", async () => {
    const malformed = await POST(
      new Request("http://localhost/api/debate", {
        method: "POST",
        body: "{",
      })
    );
    expect(malformed.status).toBe(400);

    const unknown = await POST(
      new Request("http://localhost/api/debate", {
        method: "POST",
        body: JSON.stringify({
          query: "Camera",
          deviceAId: "unknown-a",
          deviceBId: "unknown-b",
        }),
      })
    );
    expect(unknown.status).toBe(404);
  });
});

describe("inline spec editing key realignment", () => {
  const baseSpecs = INITIAL_DEVICES[0].specs;

  it("updates device specs with canonical UI row labels from buildEncyclopedicSpecs", () => {
    const canonicalEdits: Record<string, string> = {
      "Chipset & Foundry Node": "Snapdragon 8 Gen 5 Extreme (2nm)",
      "CPU Core Topology": "2x 4.6GHz Oryon v2 + 6x 3.6GHz",
      "GPU Architecture": "Adreno 850 High-Compute",
      "RAM Configurations": "24GB LPDDR6",
      "Frame & Back Materials": "Forged Carbon Fiber + Gorilla Glass Ceramic",
      "Ingress Protection": "IP69K High-Pressure Submersible",
      "Primary Wide Module": "1.0-inch Sony LYT-900 (50MP, f/1.6, OIS)",
      "Periscope / Telephoto Optics": "200MP 1/1.4-inch 5x Continuous Optical Zoom",
      "Ultrawide Module": "50MP 1/2.0-inch 122-degree Ultra-Macro",
      "Indoor Motion Shutter Response": "Zero Shutter Lag (1/250s Instant Freeze)",
      "Biometric Authentication": "3D Ultrasonic Dual-Finger Display Gen 3",
    };

    const updated = applyInlineSpecEdits(baseSpecs, canonicalEdits);

    expect(updated.socName).toBe("Snapdragon 8 Gen 5 Extreme (2nm)");
    expect(updated.cpuTopology).toBe("2x 4.6GHz Oryon v2 + 6x 3.6GHz");
    expect(updated.gpuName).toBe("Adreno 850 High-Compute");
    expect(updated.ramOptions).toBe("24GB LPDDR6");
    expect(updated.frameMaterial).toBe(
      "Forged Carbon Fiber + Gorilla Glass Ceramic"
    );
    expect(updated.ipRating).toBe("IP69K High-Pressure Submersible");
    expect(updated.mainSensorSize).toBe(
      "1.0-inch Sony LYT-900 (50MP, f/1.6, OIS)"
    );
    expect(updated.telephotoSpecs).toBe(
      "200MP 1/1.4-inch 5x Continuous Optical Zoom"
    );
    expect(updated.ultrawideSpecs).toBe(
      "50MP 1/2.0-inch 122-degree Ultra-Macro"
    );
    expect(updated.shutterLagRating).toBe(
      "Zero Shutter Lag (1/250s Instant Freeze)"
    );
    expect(updated.fingerprintType).toBe(
      "3D Ultrasonic Dual-Finger Display Gen 3"
    );

    // Untouched properties must remain intact
    expect(updated.batteryCapacityMah).toBe(baseSpecs.batteryCapacityMah);
    expect(updated.displaySizeInch).toBe(baseSpecs.displaySizeInch);
    expect(updated.geekbenchSingle).toBe(baseSpecs.geekbenchSingle);
  });

  it("preserves backwards compatibility when legacy dictionary keys are supplied", () => {
    const legacyEdits: Record<string, string> = {
      "SoC Chipset & Process Node": "MediaTek Dimensity 9400 (3nm)",
      "Memory & Flash Storage Tier": "16GB LPDDR5X + 512GB UFS 4.0",
      "Primary Wide Camera": "1/1.3-inch Omnivision OV50H (50MP)",
      "Telephoto / Periscope Optics": "50MP Sony IMX858 5x Periscope",
      "Ultrawide Camera": "50MP Samsung JN1 119-degree",
      "Indoor Moving-Subject Shutter Lag": "Noticeable 1/30s blur on moving subjects",
    };

    const updated = applyInlineSpecEdits(baseSpecs, legacyEdits);

    expect(updated.socName).toBe("MediaTek Dimensity 9400 (3nm)");
    expect(updated.ramOptions).toBe("16GB LPDDR5X + 512GB UFS 4.0");
    expect(updated.mainSensorSize).toBe("1/1.3-inch Omnivision OV50H (50MP)");
    expect(updated.telephotoSpecs).toBe("50MP Sony IMX858 5x Periscope");
    expect(updated.ultrawideSpecs).toBe("50MP Samsung JN1 119-degree");
    expect(updated.shutterLagRating).toBe(
      "Noticeable 1/30s blur on moving subjects"
    );
  });

  it("prioritizes canonical UI labels over legacy aliases if both exist in the edit payload", () => {
    const conflictingEdits: Record<string, string> = {
      "Chipset & Foundry Node": "Canonical Snapdragon 8 Elite",
      "SoC Chipset & Process Node": "Legacy Dimensity 9300",
      "RAM Configurations": "Canonical 16GB LPDDR5X",
      "Memory & Flash Storage Tier": "Legacy 12GB LPDDR5",
      "Primary Wide Module": "Canonical 1/1.3-inch ISOCELL HP2",
      "Primary Wide Camera": "Legacy 1/1.5-inch Sensor",
      "Periscope / Telephoto Optics": "Canonical 50MP 5x Periscope",
      "Telephoto / Periscope Optics": "Legacy 10MP 3x Zoom",
      "Ultrawide Module": "Canonical 50MP Dual-Pixel PDAF",
      "Ultrawide Camera": "Legacy 12MP Fixed Focus",
      "Indoor Motion Shutter Response": "Canonical Zero Shutter Lag",
      "Indoor Moving-Subject Shutter Lag": "Legacy High Motion Blur",
    };

    const updated = applyInlineSpecEdits(baseSpecs, conflictingEdits);

    expect(updated.socName).toBe("Canonical Snapdragon 8 Elite");
    expect(updated.ramOptions).toBe("Canonical 16GB LPDDR5X");
    expect(updated.mainSensorSize).toBe("Canonical 1/1.3-inch ISOCELL HP2");
    expect(updated.telephotoSpecs).toBe("Canonical 50MP 5x Periscope");
    expect(updated.ultrawideSpecs).toBe("Canonical 50MP Dual-Pixel PDAF");
    expect(updated.shutterLagRating).toBe("Canonical Zero Shutter Lag");
  });

  it("strips em-dashes from edited inline values", () => {
    const editsWithEmDashes: Record<string, string> = {
      "Chipset & Foundry Node":
        "Snapdragon 8 Elite \u2014 Extreme Performance -- Max Clock",
      "Indoor Motion Shutter Response": "Fast shutter \u2014 minimal motion blur",
    };

    const updated = applyInlineSpecEdits(baseSpecs, editsWithEmDashes);

    expect(updated.socName).toBe(
      "Snapdragon 8 Elite, Extreme Performance, Max Clock"
    );
    expect(updated.shutterLagRating).toBe("Fast shutter, minimal motion blur");
  });

  it("validates that all canonical and legacy keys map to valid DeviceSpecsData keys", () => {
    const validSpecsKeys: (keyof DeviceSpecsData)[] = [
      "socName",
      "socNodeNm",
      "cpuTopology",
      "gpuName",
      "ramOptions",
      "storageType",
      "geekbenchSingle",
      "geekbenchMulti",
      "wildlifeStabilityPct",
      "displaySizeInch",
      "displayPanelType",
      "resolution",
      "refreshRateHz",
      "peakBrightnessNits",
      "pwmDimmingHz",
      "mainSensorSize",
      "mainSensorMp",
      "mainAperture",
      "telephotoSpecs",
      "ultrawideSpecs",
      "videoCapabilities",
      "shutterLagRating",
      "batteryCapacityMah",
      "batteryChemistry",
      "wiredChargingW",
      "wirelessChargingW",
      "fullChargeMins",
      "weightGrams",
      "thicknessMm",
      "widthMm",
      "ipRating",
      "fingerprintType",
      "frameMaterial",
    ];

    for (const [rowLabel, targetField] of Object.entries(
      SPEC_ROW_TO_FIELD_MAP
    )) {
      expect(
        validSpecsKeys.includes(targetField as keyof DeviceSpecsData),
        `Label '${rowLabel}' maps to invalid field '${String(targetField)}'`
      ).toBe(true);
    }
  });
});

