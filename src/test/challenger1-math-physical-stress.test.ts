import { describe, it, expect } from "vitest";
import { FULL_UNIFIED_CATALOG } from "@/lib/brands/catalog-loader";
import { INITIAL_DEVICES, SmartphoneDevice } from "@/lib/seed-data";
import {
  calculateChassisDimensions,
  parseAspectRatio,
  classifyCameraIslandArchetype,
  classifyFrontCutout,
  getArchetypeCameraElements,
  getArchetypeCameraBounds,
  generateDeviceVisualProfile,
  CameraIslandGeometry,
  FrontCutoutGeometry,
} from "@/lib/visual-profiles/cad-engine";
import {
  auditVisualCoverage,
  resolveDeviceVisualProfile,
  validateDeviceVisualProfile,
} from "@/lib/visual-profiles/resolver";

const ALL_ISLAND_TYPES: CameraIslandGeometry[] = [
  "IPHONE_16_VERTICAL_PILL",
  "IPHONE_15_DIAGONAL_DUAL",
  "IPHONE_16E_SINGLE_LENS",
  "IPHONE_17_AIR_BAR",
  "IPHONE_17_PRO_WIDE_PLATEAU",
  "IPHONE_PRO_TRIPLE_SQUIRCLE",
  "S_ULTRA_5_RINGS",
  "S_BASE_3_RINGS",
  "S_PILL_3_RINGS",
  "S_EDGE_DUAL_PILL",
  "Z_FLIP_CLAMSHELL",
  "ZEISS_CIRCLE",
  "ONEPLUS_CIRCLE",
  "PIXEL_PRO_VISOR",
  "PIXEL_9_BASE_DUAL_OVAL",
  "PIXEL_9_PRO_FOLD_SQUIRCLE",
  "PIXEL_CLASSIC_EDGE_VISOR",
  "PIXEL_9A_FLUSH_PILL",
  "TECNO_PHANTOM_V_FOLD2_RECT",
  "TECNO_CAMON_SWAN_PILL",
  "TECNO_POVA_MECHA_LED",
  "TECNO_SPARK_SLIM_VISOR",
  "TECNO_SPARK_50_WIDE_PLATEAU",
  "TECNO_SPARK_50_5G_PILL_VISOR",
  "SONY_VERTICAL_PILL",
  "REDMAGIC_FLUSH_GAMING",
  "NOTHING_GLYPH",
  "NOTHING_GLYPH_MATRIX_3",
  "XIAOMI_LEICA_SQUIRCLE",
  "HUAWEI_PURA_TRIANGLE",
  "INFINIX_SQUIRCLE_HALO",
];

const ALL_CUTOUT_TYPES: FrontCutoutGeometry[] = [
  "DYNAMIC_ISLAND",
  "CLASSIC_NOTCH",
  "PUNCH_HOLE",
  "NONE_FULLSCREEN",
];

describe("Challenger 1 — Empirical Math & Physical Dimension Stress Testing", () => {
  describe("1. Catalog-Wide Bezel Clamping across 939 Devices", () => {
    it("strictly clamps lateral bezels between 1.05mm and 3.4mm for all 939 devices", () => {
      expect(FULL_UNIFIED_CATALOG.length).toBe(939);

      let minBezel = Infinity;
      let maxBezel = -Infinity;

      for (const dev of FULL_UNIFIED_CATALOG) {
        const chassis = calculateChassisDimensions(dev);

        expect(Number.isFinite(chassis.bezelMm)).toBe(true);
        expect(Number.isNaN(chassis.bezelMm)).toBe(false);

        expect(
          chassis.bezelMm,
          `Device ${dev.id} (${dev.brand} ${dev.name}) bezel ${chassis.bezelMm}mm < 1.05mm`
        ).toBeGreaterThanOrEqual(1.05);

        expect(
          chassis.bezelMm,
          `Device ${dev.id} (${dev.brand} ${dev.name}) bezel ${chassis.bezelMm}mm > 3.4mm`
        ).toBeLessThanOrEqual(3.4);

        if (chassis.bezelMm < minBezel) minBezel = chassis.bezelMm;
        if (chassis.bezelMm > maxBezel) maxBezel = chassis.bezelMm;
      }

      // Assert full range usage
      expect(minBezel).toBeGreaterThanOrEqual(1.05);
      expect(maxBezel).toBeLessThanOrEqual(3.4);
    });

    it("clamps extreme synthetic chassis widths and display sizes", () => {
      // Very wide chassis with small display (would have huge raw bezel)
      const wideChassisDevice: SmartphoneDevice = {
        ...INITIAL_DEVICES[0],
        id: "synthetic-wide",
        specs: {
          ...INITIAL_DEVICES[0].specs,
          widthMm: 150, // 150mm wide
          displaySizeInch: 5.0, // small screen
        },
      };
      const wideResult = calculateChassisDimensions(wideChassisDevice);
      expect(wideResult.bezelMm).toBe(3.4); // clamped to upper bound

      // Chassis slightly wider than screen, where raw bezel < 1.05mm (clamped to 1.05)
      // For displaySizeInch: 6.0, 19.5:9 -> activeScreenWidthMm ~ 63.87mm
      // If widthMm = 65mm -> rawBezel = (65 - 63.87) / 2 = 0.565mm -> clamped to 1.05mm
      const tightBezelDevice: SmartphoneDevice = {
        ...INITIAL_DEVICES[0],
        id: "synthetic-tight-bezel",
        specs: {
          ...INITIAL_DEVICES[0].specs,
          widthMm: 65,
          displaySizeInch: 6.0,
        },
      };
      const tightResult = calculateChassisDimensions(tightBezelDevice);
      expect(tightResult.bezelMm).toBe(1.05); // clamped to lower bound

      // Narrower chassis where widthMm <= activeScreenWidthMm
      const narrowChassisDevice: SmartphoneDevice = {
        ...INITIAL_DEVICES[0],
        id: "synthetic-narrow",
        specs: {
          ...INITIAL_DEVICES[0].specs,
          widthMm: 60,
          displaySizeInch: 7.5,
        },
      };
      const narrowResult = calculateChassisDimensions(narrowChassisDevice);
      expect(narrowResult.bezelMm).toBe(1.45); // default fallback in [1.05, 3.4]
      expect(narrowResult.bezelMm).toBeGreaterThanOrEqual(1.05);
      expect(narrowResult.bezelMm).toBeLessThanOrEqual(3.4);

      // Zero or missing width
      const zeroWidthDevice: SmartphoneDevice = {
        ...INITIAL_DEVICES[0],
        id: "synthetic-zero-width",
        specs: {
          ...INITIAL_DEVICES[0].specs,
          widthMm: 0,
        },
      };
      const zeroWidthResult = calculateChassisDimensions(zeroWidthDevice);
      expect(zeroWidthResult.bezelMm).toBe(1.05); // clamped lower bound
      expect(zeroWidthResult.bezelMm).toBeGreaterThanOrEqual(1.05);
      expect(zeroWidthResult.bezelMm).toBeLessThanOrEqual(3.4);
    });
  });

  describe("2. Catalog-Wide Physical Dimension Sanity across 939 Devices", () => {
    it("asserts height in [60, 250], width in [40, 300], and thickness in [3, 35] for all 939 devices", () => {
      let minH = Infinity,
        maxH = -Infinity;
      let minW = Infinity,
        maxW = -Infinity;
      let minT = Infinity,
        maxT = -Infinity;

      for (const dev of FULL_UNIFIED_CATALOG) {
        const chassis = calculateChassisDimensions(dev);

        // Finite numbers
        expect(Number.isFinite(chassis.heightMm)).toBe(true);
        expect(Number.isFinite(chassis.widthMm)).toBe(true);
        expect(Number.isFinite(chassis.thicknessMm)).toBe(true);

        // Bounds
        expect(
          chassis.heightMm,
          `Device ${dev.id} height ${chassis.heightMm}mm out of [60, 250]`
        ).toBeGreaterThanOrEqual(60);
        expect(
          chassis.heightMm,
          `Device ${dev.id} height ${chassis.heightMm}mm out of [60, 250]`
        ).toBeLessThanOrEqual(250);

        expect(
          chassis.widthMm,
          `Device ${dev.id} width ${chassis.widthMm}mm out of [40, 300]`
        ).toBeGreaterThanOrEqual(40);
        expect(
          chassis.widthMm,
          `Device ${dev.id} width ${chassis.widthMm}mm out of [40, 300]`
        ).toBeLessThanOrEqual(300);

        expect(
          chassis.thicknessMm,
          `Device ${dev.id} thickness ${chassis.thicknessMm}mm out of [3, 35]`
        ).toBeGreaterThanOrEqual(3);
        expect(
          chassis.thicknessMm,
          `Device ${dev.id} thickness ${chassis.thicknessMm}mm out of [3, 35]`
        ).toBeLessThanOrEqual(35);

        if (chassis.heightMm < minH) minH = chassis.heightMm;
        if (chassis.heightMm > maxH) maxH = chassis.heightMm;
        if (chassis.widthMm < minW) minW = chassis.widthMm;
        if (chassis.widthMm > maxW) maxW = chassis.widthMm;
        if (chassis.thicknessMm < minT) minT = chassis.thicknessMm;
        if (chassis.thicknessMm > maxT) maxT = chassis.thicknessMm;
      }

      expect(minH).toBeGreaterThanOrEqual(60);
      expect(maxH).toBeLessThanOrEqual(250);
      expect(minW).toBeGreaterThanOrEqual(40);
      expect(maxW).toBeLessThanOrEqual(300);
      expect(minT).toBeGreaterThanOrEqual(3);
      expect(maxT).toBeLessThanOrEqual(35);
    });

    it("honors customHeightMm when in [60, 250] and derives trigonometrically when absent", () => {
      const devWithCustom: SmartphoneDevice = {
        ...INITIAL_DEVICES[0],
        id: "synthetic-custom-height",
        customHeightMm: 165.4,
      };
      expect(calculateChassisDimensions(devWithCustom).heightMm).toBe(165.4);

      // Outside physical bounds -> should ignore invalid customHeight and derive
      const devWithInvalidCustom: SmartphoneDevice = {
        ...INITIAL_DEVICES[0],
        id: "synthetic-invalid-custom-height",
        customHeightMm: 999.0,
      };
      const result = calculateChassisDimensions(devWithInvalidCustom);
      expect(result.heightMm).toBeLessThanOrEqual(240);
      expect(result.heightMm).toBeGreaterThanOrEqual(120);
    });
  });

  describe("3. Industrial Corner Radii Consistency across Device Classes", () => {
    it("sharp ultra/gaming flagships strictly adhere to [4px, 14px]", () => {
      const sharpSlugs = [
        "samsung-galaxy-s24-ultra",
        "samsung-galaxy-s23-ultra",
        "samsung-galaxy-s22-ultra",
        "zte-nubia-z70-ultra",
        "zte-nubia-z60-ultra",
        "sony-xperia-1-vi",
        "asus-rog-phone-9",
      ];

      for (const slug of sharpSlugs) {
        const dev = FULL_UNIFIED_CATALOG.find((d) => d.slug.includes(slug)) || {
          ...INITIAL_DEVICES[0],
          id: `stub-${slug}`,
          slug,
          brand: slug.startsWith("sony")
            ? "Sony"
            : slug.startsWith("asus")
            ? "Asus"
            : slug.startsWith("zte")
            ? "Nubia"
            : "Samsung",
        };

        const chassis = calculateChassisDimensions(dev);
        expect(
          chassis.cornerRadiusPx,
          `Sharp device ${slug} radius ${chassis.cornerRadiusPx}px out of [4, 14]`
        ).toBeGreaterThanOrEqual(4);
        expect(
          chassis.cornerRadiusPx,
          `Sharp device ${slug} radius ${chassis.cornerRadiusPx}px out of [4, 14]`
        ).toBeLessThanOrEqual(14);
      }
    });

    it("foldables strictly adhere to [12px, 16px]", () => {
      const foldableKeywords = [
        "z-fold",
        "z-flip",
        "mix-flip",
        "razr",
        "pixel-9-pro-fold",
        "phantom-v-fold",
      ];

      const foldables = FULL_UNIFIED_CATALOG.filter((d) =>
        foldableKeywords.some((kw) => d.slug.toLowerCase().includes(kw))
      );

      expect(foldables.length).toBeGreaterThan(0);

      for (const dev of foldables) {
        const chassis = calculateChassisDimensions(dev);
        expect(
          chassis.cornerRadiusPx,
          `Foldable ${dev.slug} radius ${chassis.cornerRadiusPx}px out of [12, 16]`
        ).toBeGreaterThanOrEqual(12);
        expect(
          chassis.cornerRadiusPx,
          `Foldable ${dev.slug} radius ${chassis.cornerRadiusPx}px out of [12, 16]`
        ).toBeLessThanOrEqual(16);
      }
    });

    it("modern ergonomic flagships strictly adhere to [18px, 28px]", () => {
      const ergonomicKeywords = [
        "s25-ultra",
        "s26-ultra",
        "16-pro",
        "17-pro",
        "iphone-16",
        "iphone-17",
        "pixel-9",
        "pixel-10",
      ];

      const ergonomicPhones = FULL_UNIFIED_CATALOG.filter(
        (d) =>
          ergonomicKeywords.some((kw) => d.slug.toLowerCase().includes(kw)) &&
          !d.slug.toLowerCase().includes("fold")
      );

      expect(ergonomicPhones.length).toBeGreaterThan(0);

      for (const dev of ergonomicPhones) {
        const chassis = calculateChassisDimensions(dev);
        expect(
          chassis.cornerRadiusPx,
          `Ergonomic phone ${dev.slug} radius ${chassis.cornerRadiusPx}px out of [18, 28]`
        ).toBeGreaterThanOrEqual(18);
        expect(
          chassis.cornerRadiusPx,
          `Ergonomic phone ${dev.slug} radius ${chassis.cornerRadiusPx}px out of [18, 28]`
        ).toBeLessThanOrEqual(28);
      }
    });

    it("asserts every device in the catalog has radius between 4px and 30px", () => {
      for (const dev of FULL_UNIFIED_CATALOG) {
        const chassis = calculateChassisDimensions(dev);
        expect(chassis.cornerRadiusPx).toBeGreaterThanOrEqual(4);
        expect(chassis.cornerRadiusPx).toBeLessThanOrEqual(30);
      }
    });
  });

  describe("4. Resolution Aspect Ratio Regex Adversarial Fuzzing", () => {
    it("never returns NaN, 0, or negative ratio on adversarial strings", () => {
      const adversarialInputs = [
        "",
        "   ",
        "undefined",
        "null",
        "N/A",
        "1080p",
        "4K UHD",
        "FHD+ 120Hz",
        "0 x 0",
        "0 x 1080",
        "1080 x 0",
        "-1080 x 2400",
        "1080 x -2400",
        "1080",
        "1080 by 2400",
        "1080 : 2400",
        "1080 / 2400",
        "1080 * 2400",
        "1080x",
        "x1080",
        "100 x 50000", // ratio 500 out of [1.0, 3.0]
        "50000 x 100",
        "99 x 99", // ratio 1.0 (square), clamped
        "1080 x 1080", // 1.0
        "1080.5 x 2400.2",
        "2400 x 1080 pixels, 20:9 ratio (~395 ppi density)",
        "1080 x 2408 pixels (~400 ppi)",
        "3120 x 1440 pixels, 19.5:9 ratio",
        "1200 x 2652 pixels",
        "1080 × 2400 pixels", // Unicode multiplication sign
        "1080 ✕ 2400 pixels", // Unicode cross
        "1080 X 2400", // Uppercase X
        " 1080   x   2400 ", // Extra whitespace
        "\t1080\tx\t2400\n", // Tab and newline
        "\u00A01080\u00A0x\u00A02400\u00A0", // Non-breaking space
        "<script>alert(1)</script> 1080 x 2400",
      ];

      for (const input of adversarialInputs) {
        const ratio = parseAspectRatio(input);
        expect(Number.isFinite(ratio), `Failed on input: ${input}`).toBe(true);
        expect(Number.isNaN(ratio), `Returned NaN on input: ${input}`).toBe(
          false
        );
        expect(ratio, `Returned 0 or negative on input: ${input}`).toBeGreaterThan(
          0
        );
        expect(
          ratio,
          `Ratio ${ratio} out of physical bounds [1.0, 3.0] on input: ${input}`
        ).toBeGreaterThanOrEqual(1.0);
        expect(
          ratio,
          `Ratio ${ratio} out of physical bounds [1.0, 3.0] on input: ${input}`
        ).toBeLessThanOrEqual(3.0);
      }
    });

    it("correctly computes standard aspect ratios", () => {
      // 16:9 -> 1.7778
      expect(parseAspectRatio("1920 x 1080")).toBeCloseTo(16 / 9, 3);
      // 19.5:9 -> 2.1667
      expect(parseAspectRatio("2340 x 1080")).toBeCloseTo(19.5 / 9, 3);
      // 20:9 -> 2.2222
      expect(parseAspectRatio("2400 x 1080")).toBeCloseTo(20 / 9, 3);
      // 21:9 -> 2.3333
      expect(parseAspectRatio("2520 x 1080")).toBeCloseTo(21 / 9, 3);
      // Order independence: min x max vs max x min
      expect(parseAspectRatio("1080 x 2400")).toBeCloseTo(
        parseAspectRatio("2400 x 1080"),
        4
      );
    });
  });

  describe("5. Complete Catalog Profile Resolution & Coverage Audit", () => {
    it("audits 100% verified vectors, 0 invalid profiles, and 0 fallbacks", () => {
      const audit = auditVisualCoverage(FULL_UNIFIED_CATALOG);

      expect(audit.totalDevices).toBe(939);
      expect(audit.explicitProfiles).toBe(939);
      expect(audit.verifiedVectors).toBe(939);
      expect(audit.verifiedAssets).toBe(0);
      expect(audit.approximate).toBe(0);
      expect(audit.genericFallbacks).toBe(0);
      expect(audit.coveragePct).toBe(100);
      expect(audit.verifiedPct).toBe(100);
      expect(audit.invalidProfiles).toEqual([]);
    });

    it("every generated profile satisfies validateDeviceVisualProfile", () => {
      for (const dev of FULL_UNIFIED_CATALOG) {
        const visual = resolveDeviceVisualProfile(dev);

        expect(visual.status).toBe("VERIFIED_VECTOR");
        expect(visual.renderer).toBe("CALIBRATED_VECTOR");
        expect(visual.profile).toBeDefined();

        if (visual.profile) {
          const errors = validateDeviceVisualProfile(visual.profile);
          expect(
            errors,
            `Profile for ${dev.id} has validation errors: ${errors.join(", ")}`
          ).toEqual([]);

          // Telemetry dimensions validation
          expect(visual.profile.dimensions.heightMm).toBeGreaterThanOrEqual(60);
          expect(visual.profile.dimensions.heightMm).toBeLessThanOrEqual(250);
          expect(visual.profile.dimensions.widthMm).toBeGreaterThanOrEqual(40);
          expect(visual.profile.dimensions.widthMm).toBeLessThanOrEqual(300);
          expect(visual.profile.dimensions.thicknessMm).toBeGreaterThanOrEqual(3);
          expect(visual.profile.dimensions.thicknessMm).toBeLessThanOrEqual(35);
          expect(
            visual.profile.dimensions.cornerRadiusMm
          ).toBeGreaterThanOrEqual(1.0);
          expect(visual.profile.dimensions.cornerRadiusMm).toBeLessThanOrEqual(
            15.0
          );

          // Camera elements
          expect(visual.profile.cameraElements?.length).toBeGreaterThan(0);
        }
      }
    });

    it("verifies unmapped synthetic stub gracefully isolates to generic fallback", () => {
      const stubDevice: SmartphoneDevice = {
        ...INITIAL_DEVICES[0],
        id: "device-without-visual-profile",
        slug: "device-without-visual-profile",
        name: "Unmapped Synthetic Stub",
        brand: "GenericBrand",
      };

      const resolved = resolveDeviceVisualProfile(stubDevice);
      expect(resolved.status).toBe("GENERIC_FALLBACK");
      expect(resolved.renderer).toBe("LEGACY_HEURISTIC");
      expect(resolved.profile).toBeUndefined();
    });

    it("verifies all 29 camera island archetypes have non-empty camera elements and valid bounds", () => {
      for (const islandType of ALL_ISLAND_TYPES) {
        const elements = getArchetypeCameraElements(islandType);
        expect(
          elements.length,
          `Archetype ${islandType} has 0 camera elements`
        ).toBeGreaterThan(0);

        const bounds = getArchetypeCameraBounds(islandType);
        expect(bounds.xPct).toBeGreaterThanOrEqual(0);
        expect(bounds.yPct).toBeGreaterThanOrEqual(0);
        expect(bounds.widthPct).toBeGreaterThan(0);
        expect(bounds.heightPct).toBeGreaterThan(0);
        expect(bounds.xPct + bounds.widthPct).toBeLessThanOrEqual(100);
        expect(bounds.yPct + bounds.heightPct).toBeLessThanOrEqual(100);
      }
    });

    it("verifies front cutout classification across all 4 cutout geometries", () => {
      const s25UltraCutout = classifyFrontCutout(INITIAL_DEVICES[0]);
      expect(s25UltraCutout).toBe("PUNCH_HOLE");
      expect(ALL_CUTOUT_TYPES).toContain(s25UltraCutout);

      const iphone16Pro = classifyFrontCutout({
        ...INITIAL_DEVICES[0],
        brand: "Apple",
        slug: "apple-iphone-16-pro",
        name: "iPhone 16 Pro",
      });
      expect(iphone16Pro).toBe("DYNAMIC_ISLAND");
      expect(ALL_CUTOUT_TYPES).toContain(iphone16Pro);

      const iphone16e = classifyFrontCutout({
        ...INITIAL_DEVICES[0],
        brand: "Apple",
        slug: "apple-iphone-16e",
        name: "iPhone 16e",
      });
      expect(iphone16e).toBe("CLASSIC_NOTCH");
      expect(ALL_CUTOUT_TYPES).toContain(iphone16e);

      const sony = classifyFrontCutout({
        ...INITIAL_DEVICES[0],
        brand: "Sony",
        slug: "sony-xperia-1-vi",
        name: "Xperia 1 VI",
      });
      expect(sony).toBe("NONE_FULLSCREEN");
      expect(ALL_CUTOUT_TYPES).toContain(sony);

      const redmagic = classifyFrontCutout({
        ...INITIAL_DEVICES[0],
        brand: "RedMagic",
        slug: "zte-nubia-redmagic-10-pro",
        name: "RedMagic 10 Pro",
      });
      expect(redmagic).toBe("NONE_FULLSCREEN");
      expect(ALL_CUTOUT_TYPES).toContain(redmagic);
    });

    it("verifies direct generateDeviceVisualProfile and classifyCameraIslandArchetype parity", () => {
      const dev = INITIAL_DEVICES[0];
      const archetype = classifyCameraIslandArchetype(dev);
      expect(archetype).toBe("S_ULTRA_5_RINGS");

      const generated = generateDeviceVisualProfile(dev);
      expect(generated.deviceId).toBe(dev.id);
      expect(generated.status).toBe("VERIFIED_VECTOR");
      expect(generated.renderer).toBe("CALIBRATED_VECTOR");
      expect(generated.cameraElements?.length).toBeGreaterThan(0);
    });
  });
});
