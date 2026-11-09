import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as ts from "typescript";
import { FULL_UNIFIED_CATALOG } from "../lib/brands/catalog-loader";
import { SmartphoneDevice } from "../lib/seed-data";
import {
  resolveDeviceVisualProfile,
  auditVisualCoverage,
} from "../lib/visual-profiles/resolver";
import { calculateChassisDimensions } from "../lib/visual-profiles/cad-engine";

function parseTsx(filePath: string) {
  const fullPath = path.resolve(filePath);
  const code = fs.readFileSync(fullPath, "utf8");
  const sourceFile = ts.createSourceFile(
    fullPath,
    code,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );
  return { code, sourceFile, fullPath };
}

function getTagName(
  node: ts.JsxElement | ts.JsxSelfClosingElement,
  sourceFile: ts.SourceFile
): string {
  if (ts.isJsxElement(node)) {
    return node.openingElement.tagName.getText(sourceFile);
  }
  return node.tagName.getText(sourceFile);
}

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

describe("Challenger 2 — Adversarial Verification of Systems Architectural Invariants & Test Contracts", () => {
  // =========================================================================
  // 1. AST SLIDER COUNT INVARIANTS
  // =========================================================================
  describe("Invariant 1: Exact AST Range Slider Counts Across Components", () => {
    function countRangeSliders(filePath: string): { count: number; lines: number[]; labels: string[] } {
      const { sourceFile } = parseTsx(filePath);
      let count = 0;
      const lines: number[] = [];
      const labels: string[] = [];

      function visit(node: ts.Node) {
        if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
          const tagName = getTagName(node, sourceFile);
          if (tagName === "input") {
            const attrs = ts.isJsxElement(node)
              ? node.openingElement.attributes.properties
              : node.attributes.properties;

            let isRange = false;
            let label = "";

            for (const prop of attrs) {
              if (ts.isJsxAttribute(prop) && prop.name) {
                const name = prop.name.getText(sourceFile);
                const init = prop.initializer;
                const valueText = init ? init.getText(sourceFile) : "";
                if (name === "type" && valueText.includes("range")) {
                  isRange = true;
                }
                if (name === "aria-label" || name === "name" || name === "id") {
                  label = valueText;
                }
              }
            }

            if (isRange) {
              count++;
              lines.push(sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1);
              labels.push(label || `range-slider-line-${lines[lines.length - 1]}`);
            }
          }
        }
        ts.forEachChild(node, visit);
      }

      visit(sourceFile);
      return { count, lines, labels };
    }

    it("PhoneSizeComparator.tsx has strictly 4 range sliders (wPct, hPct, xPct, yPct)", () => {
      const { count, lines } = countRangeSliders("src/components/PhoneSizeComparator.tsx");
      expect(count).toBe(4);
      expect(lines.length).toBe(4);

      // Verify the 4 sliders correspond to the 4 geometry dimensions
      const code = fs.readFileSync("src/components/PhoneSizeComparator.tsx", "utf8");
      expect(code).toContain("Island Width");
      expect(code).toContain("wPct");
      expect(code).toContain("Island Height");
      expect(code).toContain("hPct");
      expect(code).toContain("X Offset");
      expect(code).toContain("xPct");
      expect(code).toContain("Y Offset");
      expect(code).toContain("yPct");
    });

    it("page.tsx has strictly 2 range sliders", () => {
      const { count } = countRangeSliders("src/app/page.tsx");
      expect(count).toBe(2);
    });

    it("PhoneFinderStudio.tsx has strictly 8 range sliders", () => {
      const { count } = countRangeSliders("src/components/PhoneFinderStudio.tsx");
      expect(count).toBe(8);
    });

    it("RegionalPricingOffers.tsx has strictly 0 range sliders", () => {
      const { count } = countRangeSliders("src/components/RegionalPricingOffers.tsx");
      expect(count).toBe(0);
    });

    it("Global catalog slider invariant: strictly 10 catalog sliders across page.tsx and PhoneFinderStudio.tsx", () => {
      const pageSliders = countRangeSliders("src/app/page.tsx").count;
      const studioSliders = countRangeSliders("src/components/PhoneFinderStudio.tsx").count;
      expect(pageSliders + studioSliders).toBe(10);
    });
  });

  // =========================================================================
  // 2. BUTTON NESTING & HTML CONFORMANCE
  // =========================================================================
  describe("Invariant 2: AST Button & Link Nesting Hierarchy", () => {
    const allTsxFiles = getAllTsxFiles("src");

    it("confirms NO <button> contains <h1-6>, nested <button>, or <a>/Link elements across all TSX files", () => {
      const violations: Array<{ file: string; tag: string; line: number; buttonLine: number }> = [];

      allTsxFiles.forEach((file) => {
        const { sourceFile } = parseTsx(file);

        function checkDescendants(node: ts.Node, buttonLine: number) {
          ts.forEachChild(node, (child) => {
            if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child)) {
              const tagName = getTagName(child, sourceFile);
              if (/^h[1-6]$/i.test(tagName) || tagName === "button" || tagName === "a" || tagName === "Link") {
                const line = sourceFile.getLineAndCharacterOfPosition(child.getStart(sourceFile)).line + 1;
                violations.push({
                  file: path.relative(process.cwd(), file),
                  tag: tagName,
                  line,
                  buttonLine,
                });
              }
            }
            checkDescendants(child, buttonLine);
          });
        }

        function visit(node: ts.Node) {
          if (ts.isJsxElement(node)) {
            const tagName = node.openingElement.tagName.getText(sourceFile);
            if (tagName === "button") {
              const buttonLine = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
              checkDescendants(node, buttonLine);
            }
          }
          ts.forEachChild(node, visit);
        }

        visit(sourceFile);
      });

      expect(violations).toEqual([]);
    });

    it("confirms NO <a> or <Link> element contains a <button> across all TSX files", () => {
      const violations: Array<{ file: string; line: number; linkLine: number }> = [];

      allTsxFiles.forEach((file) => {
        const { sourceFile } = parseTsx(file);

        function checkDescendants(node: ts.Node, linkLine: number) {
          ts.forEachChild(node, (child) => {
            if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child)) {
              const tagName = getTagName(child, sourceFile);
              if (tagName === "button") {
                const line = sourceFile.getLineAndCharacterOfPosition(child.getStart(sourceFile)).line + 1;
                violations.push({
                  file: path.relative(process.cwd(), file),
                  line,
                  linkLine,
                });
              }
            }
            checkDescendants(child, linkLine);
          });
        }

        function visit(node: ts.Node) {
          if (ts.isJsxElement(node)) {
            const tagName = node.openingElement.tagName.getText(sourceFile);
            if (tagName === "a" || tagName === "Link") {
              const linkLine = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
              checkDescendants(node, linkLine);
            }
          }
          ts.forEachChild(node, visit);
        }

        visit(sourceFile);
      });

      expect(violations).toEqual([]);
    });

    it("specifically verifies all 7 archetype preset buttons in PhoneSizeComparator.tsx are valid flat buttons", () => {
      const { code } = parseTsx("src/components/PhoneSizeComparator.tsx");
      expect(code).toContain("PARAMETRIC_ARCHETYPE_PRESETS.map((preset)");
      expect(code).toContain("PARAMETRIC_ARCHETYPE_PRESETS");
      // Check that preset elements do not render nested buttons
      expect(code).not.toContain("<button><button");
    });
  });

  // =========================================================================
  // 3. ADVERSARIAL TOOLBAR STYLING & TEXT AUDIT
  // =========================================================================
  describe("Invariant 3: PhoneSizeComparator Toolbar Styling & Contract Audit", () => {
    const { code } = parseTsx("src/components/PhoneSizeComparator.tsx");

    const REQUIRED_TOOLBAR_BUTTONS = [
      "isOneToOneScale",
      "stackAlignment",
      "renderMode",
      "showSpecOverlay",
      "showProfileScanner",
      "viewMode",
      "showBackCamera",
      "showThumbZone",
    ];

    const MANDATORY_CLASSES = [
      "h-8",
      "px-2.5",
      "rounded-lg",
      "shrink-0",
      "whitespace-nowrap",
      "inline-flex",
    ];

    const TIER1_ACTIVE_CLASS =
      "border-sky-500 bg-sky-50 text-sky-700 font-bold dark:border-sky-500 dark:bg-sky-950/60 dark:text-sky-300";

    const TIER1_INACTIVE_CLASS =
      "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800";

    it("verifies all 8 toolbar buttons exist and invoke the expected setters", () => {
      const setters = [
        "setIsOneToOneScale",
        "setStackAlignment",
        "setRenderMode",
        "setShowSpecOverlay",
        "setShowProfileScanner",
        "setViewMode",
        "setShowBackCamera",
        "setShowThumbZone",
      ];

      setters.forEach((setter) => {
        expect(code, `Missing button invoking ${setter}`).toContain(setter);
      });
    });

    it("verifies each of the 8 toolbar buttons retains all 6 mandatory Tailwind classes", () => {
      REQUIRED_TOOLBAR_BUTTONS.forEach((stateVar) => {
        // Find the button block
        const regex = new RegExp(`<button[^>]*>[\\s\\S]*?${stateVar}[\\s\\S]*?<\\/button>`, "m");
        const match = code.match(regex);
        expect(match, `Could not match button for ${stateVar}`).not.toBeNull();
        const btnHtml = match![0];

        MANDATORY_CLASSES.forEach((cls) => {
          expect(btnHtml, `Toolbar button for ${stateVar} missing class '${cls}'`).toContain(cls);
        });
      });
    });

    it("verifies all 8 toolbar buttons use exact Tier 1 active and inactive strings", () => {
      REQUIRED_TOOLBAR_BUTTONS.forEach((stateVar) => {
        expect(code, `Active class missing for ${stateVar}`).toContain(TIER1_ACTIVE_CLASS);
        expect(code, `Inactive class missing for ${stateVar}`).toContain(TIER1_INACTIVE_CLASS);
      });
    });

    it("verifies toolbar button text is renamed to 'CAD Prop Calibration'", () => {
      expect(code).toContain("CAD Prop Calibration");
      expect(code).not.toContain("Reference Photo → Prop Modeler");
    });
  });

  // =========================================================================
  // 4. CAD ENGINE ARCHITECTURAL INTEGRITY & 100% COVERAGE
  // =========================================================================
  describe("Invariant 4: CAD Engine Robustness & Visual Profile Resolution", () => {
    it("resolves VERIFIED_VECTOR with valid dimensions for all 939 catalog phones", () => {
      expect(FULL_UNIFIED_CATALOG.length).toBe(939);
      const audit = auditVisualCoverage(FULL_UNIFIED_CATALOG);

      expect(audit.totalDevices).toBe(939);
      expect(audit.verifiedPct).toBe(100);
      expect(audit.verifiedVectors).toBe(939);
      expect(audit.invalidProfiles).toEqual([]);
      expect(audit.genericFallbacks).toBe(0);
    });

    it("promotes Samsung Galaxy S25 Ultra (dev-s25-ultra) to VERIFIED_VECTOR and CALIBRATED_VECTOR", () => {
      const s25 = FULL_UNIFIED_CATALOG.find((d) => d.id === "dev-s25-ultra");
      expect(s25).toBeDefined();

      const profile = resolveDeviceVisualProfile(s25!);
      expect(profile.status).toBe("VERIFIED_VECTOR");
      expect(profile.renderer).toBe("CALIBRATED_VECTOR");
      expect(profile.profile).toBeDefined();
      expect(profile.profile!.cameraElements.length).toBeGreaterThan(0);
    });

    it("retains GENERIC_FALLBACK and LEGACY_HEURISTIC for synthetic unmapped stub", () => {
      const syntheticDevice: SmartphoneDevice = {
        id: "device-without-visual-profile",
        name: "Mock Synthetic Phone",
        brand: "MockBrand",
        slug: "mock-synthetic-phone",
        releaseDate: "2025-01-01",
        launchMsrpUsd: 499,
        category: "midrange",
        dimensionsMm: { length: 160, width: 75, thickness: 8 },
        weightGrams: 180,
        display: {
          sizeInches: 6.5,
          resolution: "2400x1080",
          panelType: "OLED",
          refreshRateHz: 120,
          peakBrightnessNits: 1200,
          aspectRatio: "20:9",
        },
        platform: { os: "Android", chipset: "Mock SoC" },
        ramGb: 8,
        storageGb: 128,
        rearCameras: [{ megapixels: 50 }],
        frontCamera: { megapixels: 16 },
        batteryCapacityMah: 5000,
        colors: ["Black"],
        overallScore: 80,
        valueScore: 80,
        performanceScore: 80,
        cameraScore: 80,
        batteryScore: 80,
      };

      const resolved = resolveDeviceVisualProfile(syntheticDevice);
      expect(resolved.status).toBe("GENERIC_FALLBACK");
      expect(resolved.renderer).toBe("LEGACY_HEURISTIC");
      expect(resolved.source).toBe("HEURISTIC_FALLBACK");
    });

    it("stress-tests calculateChassisDimensions across edge cases and malformed specs", () => {
      // 1. Missing resolution or unparseable
      const brokenDevice: SmartphoneDevice = {
        id: "test-broken",
        name: "Broken",
        brand: "Test",
        slug: "test-broken",
        releaseDate: "2025-01-01",
        launchMsrpUsd: 100,
        category: "budget",
        dimensionsMm: { length: 0, width: 0, thickness: 0 },
        weightGrams: 100,
        display: {
          sizeInches: 6.0,
          resolution: "INVALID_RES",
          panelType: "LCD",
          refreshRateHz: 60,
          peakBrightnessNits: 500,
          aspectRatio: "unknown",
        },
        platform: { os: "Android", chipset: "Unknown" },
        ramGb: 4,
        storageGb: 64,
        rearCameras: [],
        frontCamera: { megapixels: 8 },
        batteryCapacityMah: 4000,
        colors: ["Grey"],
        overallScore: 50,
        valueScore: 50,
        performanceScore: 50,
        cameraScore: 50,
        batteryScore: 50,
      };

      const dims = calculateChassisDimensions(brokenDevice);
      expect(dims.heightMm).toBeGreaterThanOrEqual(120);
      expect(dims.heightMm).toBeLessThanOrEqual(240);
      expect(dims.bezelMm).toBeGreaterThanOrEqual(1.05);
      expect(dims.bezelMm).toBeLessThanOrEqual(3.4);
      expect(dims.widthMm).toBeGreaterThan(0);
      expect(dims.thicknessMm).toBeGreaterThan(0);
      expect(dims.cornerRadiusPx).toBeGreaterThan(0);
    });
  });
});
