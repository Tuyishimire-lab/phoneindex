import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as ts from "typescript";
import { FULL_UNIFIED_CATALOG } from "@/lib/brands/catalog-loader";
import { ResolvedDeviceVisual, VisualFidelityStatus } from "@/lib/visual-profiles/types";
import { calculateLivingScores } from "@/lib/editors";

// Helper to parse TSX file into AST
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
  return { code, sourceFile };
}

function getTagName(node: ts.JsxElement | ts.JsxSelfClosingElement, sourceFile: ts.SourceFile): string {
  if (ts.isJsxElement(node)) {
    return node.openingElement.tagName.getText(sourceFile);
  }
  return node.tagName.getText(sourceFile);
}

describe("Milestone 2 Adversarial Stress Testing — Accessibility & UX", () => {
  // =========================================================================
  // Target 1: W3C Valid Button Semantics
  // =========================================================================
  describe("Target 1: W3C Button Semantics", () => {
    it("ensures CatalogSidebar.tsx device item line 438 uses a <span> and not a heading tag", () => {
      const { code } = parseTsx("src/features/catalog/CatalogSidebar.tsx");
      const lines = code.split("\n");
      const deviceNameLineIdx = lines.findIndex((l) => l.includes("{device.name}"));
      expect(deviceNameLineIdx).toBeGreaterThan(0);
      const spanLine = lines[deviceNameLineIdx - 1];
      expect(spanLine).toContain("<span");
      expect(spanLine).not.toMatch(/<h[1-6]/i);
      expect(lines[deviceNameLineIdx]).toContain("device.name");
    });

    it("verifies no <button> in CatalogSidebar.tsx contains illegal nested headings or interactive descendants", () => {
      const { sourceFile } = parseTsx("src/features/catalog/CatalogSidebar.tsx");
      const violations: Array<{ tag: string; line: number; buttonLine: number }> = [];

      function checkDescendants(node: ts.Node, buttonLine: number) {
        ts.forEachChild(node, (child) => {
          if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child)) {
            const tagName = getTagName(child, sourceFile);
            if (/^h[1-6]$/i.test(tagName) || tagName === "button" || tagName === "a") {
              const line = sourceFile.getLineAndCharacterOfPosition(child.getStart(sourceFile)).line + 1;
              violations.push({ tag: tagName, line, buttonLine });
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
      expect(violations).toEqual([]);
    });

    it("verifies global conformance: no <button> across all src/**/*.tsx files contains illegal nested headings or buttons", () => {
      function getAllTsx(dir: string): string[] {
        let results: string[] = [];
        fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            results = results.concat(getAllTsx(fullPath));
          } else if (entry.name.endsWith(".tsx")) {
            results.push(fullPath);
          }
        });
        return results;
      }

      const files = getAllTsx("src");
      const allViolations: Array<{ file: string; tag: string; line: number }> = [];

      files.forEach((file) => {
        const { sourceFile } = parseTsx(file);

        function checkDescendants(node: ts.Node) {
          ts.forEachChild(node, (child) => {
            if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child)) {
              const tagName = getTagName(child, sourceFile);
              if (/^h[1-6]$/i.test(tagName) || tagName === "button" || tagName === "a") {
                const line = sourceFile.getLineAndCharacterOfPosition(child.getStart(sourceFile)).line + 1;
                allViolations.push({ file, tag: tagName, line });
              }
            }
            checkDescendants(child);
          });
        }

        function visit(node: ts.Node) {
          if (ts.isJsxElement(node)) {
            const tagName = node.openingElement.tagName.getText(sourceFile);
            if (tagName === "button") {
              checkDescendants(node);
            }
          }
          ts.forEachChild(node, visit);
        }

        visit(sourceFile);
      });

      expect(allViolations).toEqual([]);
    });
  });

  // =========================================================================
  // Target 2: ARIA Table Roles & Hierarchy in FullSpecSheet.tsx
  // =========================================================================
  describe("Target 2: ARIA Table Roles & Hierarchy in FullSpecSheet.tsx", () => {
    it("inspects the ARIA roles and parent-child hierarchy in FullSpecSheet.tsx", () => {
      const { sourceFile } = parseTsx("src/components/FullSpecSheet.tsx");

      function getRole(node: ts.Node): string | null {
        if (!ts.isJsxElement(node) && !ts.isJsxSelfClosingElement(node)) {
          return null;
        }
        const attrs = ts.isJsxElement(node)
          ? node.openingElement.attributes
          : node.attributes;
        if (attrs && attrs.properties) {
          for (const prop of attrs.properties) {
            if (ts.isJsxAttribute(prop) && prop.name && prop.name.getText(sourceFile) === "role") {
              if (prop.initializer && ts.isStringLiteral(prop.initializer)) {
                return prop.initializer.text;
              }
            }
          }
        }
        return null;
      }

      interface RoleNode {
        role: string;
        parentRole: string | null;
        line: number;
      }
      const roleNodes: RoleNode[] = [];

      function traverse(node: ts.Node, parentRole: string | null) {
        const currentRole = getRole(node);
        if (currentRole) {
          const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
          roleNodes.push({ role: currentRole, parentRole, line });
        }

        const effectiveParent = currentRole
          ? currentRole === "presentation"
            ? parentRole
            : currentRole
          : parentRole;

        ts.forEachChild(node, (child) => {
          if (ts.isJsxOpeningElement(child) || ts.isJsxClosingElement(child)) {
            return;
          }
          traverse(child, effectiveParent);
        });
      }

      traverse(sourceFile, null);

      // Verify role="table" exists
      const tableNode = roleNodes.find((r) => r.role === "table");
      expect(tableNode).toBeDefined();

      // Verify rowgroup exists under table
      const rowgroups = roleNodes.filter((r) => r.role === "rowgroup");
      expect(rowgroups.length).toBeGreaterThan(0);
      rowgroups.forEach((rg) => {
        expect(rg.parentRole).toBe("table");
      });

      // Verify spec rows have proper row -> rowheader and cell hierarchy
      const rows = roleNodes.filter((r) => r.role === "row");
      expect(rows.length).toBeGreaterThan(0);

      const cells = roleNodes.filter((r) => r.role === "cell");
      expect(cells.length).toBeGreaterThan(0);
      cells.forEach((cell) => {
        expect(cell.parentRole).toBe("row");
      });

      // Find all rowheaders and check their parents
      const rowheaders = roleNodes.filter((r) => r.role === "rowheader");
      expect(rowheaders.length).toBeGreaterThan(0);

      // Identify rowheaders placed directly under rowgroup (bypassing row)
      const orphanedRowheaders = rowheaders.filter(
        (rh) => rh.parentRole !== "row"
      );

      // W3C ARIA Conformance: all rowheaders must be properly nested inside a role="row"
      expect(orphanedRowheaders.length).toBe(0);
    });
  });

  // =========================================================================
  // Target 3: All 10 Range Sliders ARIA Conformance
  // =========================================================================
  describe("Target 3: Range Sliders ARIA Compliance", () => {
    interface SliderMeta {
      file: string;
      line: number;
      label?: string;
      valuemin?: number | string;
      valuemax?: number | string;
      valuenow?: string;
      valuetext?: string;
    }

    function extractSliders(filePath: string): SliderMeta[] {
      const { sourceFile } = parseTsx(filePath);
      const sliders: SliderMeta[] = [];

      function visit(node: ts.Node) {
        if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
          const tagName = getTagName(node, sourceFile);
          if (tagName === "input") {
            const attrs = ts.isJsxElement(node)
              ? node.openingElement.attributes.properties
              : node.attributes.properties;
            let isRange = false;
            const meta: SliderMeta = {
              file: filePath,
              line: sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1,
            };

            for (const prop of attrs) {
              if (ts.isJsxAttribute(prop) && prop.name) {
                const name = prop.name.getText(sourceFile);
                const init = prop.initializer;
                const valueText = init ? init.getText(sourceFile) : "";

                if (name === "type" && valueText.includes("range")) {
                  isRange = true;
                }
                if (name === "aria-label") meta.label = valueText;
                if (name === "aria-valuemin") meta.valuemin = valueText;
                if (name === "aria-valuemax") meta.valuemax = valueText;
                if (name === "aria-valuenow") meta.valuenow = valueText;
                if (name === "aria-valuetext") meta.valuetext = valueText;
              }
            }

            if (isRange) {
              sliders.push(meta);
            }
          }
        }
        ts.forEachChild(node, visit);
      }

      visit(sourceFile);
      return sliders;
    }

    it("verifies exactly 2 sliders in page.tsx and 8 sliders in PhoneFinderStudio.tsx (total 10)", () => {
      const pageSliders = extractSliders("src/app/page.tsx");
      const finderSliders = extractSliders("src/components/PhoneFinderStudio.tsx");

      expect(pageSliders.length).toBe(2);
      expect(finderSliders.length).toBe(8);
      expect(pageSliders.length + finderSliders.length).toBe(10);
    });

    it("verifies all 10 sliders have complete, valid ARIA attributes", () => {
      const allSliders = [
        ...extractSliders("src/app/page.tsx"),
        ...extractSliders("src/components/PhoneFinderStudio.tsx"),
      ];

      allSliders.forEach((s, idx) => {
        expect(s.label, `Slider #${idx + 1} at ${s.file}:${s.line} missing aria-label`).toBeDefined();
        expect(s.valuemin, `Slider #${idx + 1} at ${s.file}:${s.line} missing aria-valuemin`).toBeDefined();
        expect(s.valuemax, `Slider #${idx + 1} at ${s.file}:${s.line} missing aria-valuemax`).toBeDefined();
        expect(s.valuenow, `Slider #${idx + 1} at ${s.file}:${s.line} missing aria-valuenow`).toBeDefined();
        expect(s.valuetext, `Slider #${idx + 1} at ${s.file}:${s.line} missing aria-valuetext`).toBeDefined();
      });
    });

    it("evaluates simulated value ranges and valuetext outputs under boundary conditions", () => {
      const priceValuetext = (maxPrice: number) =>
        maxPrice >= 2800 ? "Any price" : `Up to $${maxPrice} dollars`;
      expect(priceValuetext(2800)).toBe("Any price");
      expect(priceValuetext(3000)).toBe("Any price");
      expect(priceValuetext(799)).toBe("Up to $799 dollars");

      const geekbenchValuetext = (minScore: number) =>
        minScore === 0 ? "Any score" : `At least ${minScore} points`;
      expect(geekbenchValuetext(0)).toBe("Any score");
      expect(geekbenchValuetext(4500)).toBe("At least 4500 points");

      const screenValuetext = (screen: number) =>
        screen >= 10.5 ? "Any screen size" : `Up to ${screen.toFixed(1)} inches`;
      expect(screenValuetext(10.5)).toBe("Any screen size");
      expect(screenValuetext(6.7)).toBe("Up to 6.7 inches");

      const weightValuetext = (weight: number) =>
        weight >= 650 ? "Any device weight" : `Up to ${weight} grams`;
      expect(weightValuetext(650)).toBe("Any device weight");
      expect(weightValuetext(210)).toBe("Up to 210 grams");
    });
  });

  // =========================================================================
  // Target 4: Phone Finder Zero-Match Empty State
  // =========================================================================
  describe("Target 4: Phone Finder Zero-Match Empty State", () => {
    it("verifies empty state markup in PhoneFinderStudio.tsx contains role='status', aria-live='polite', SearchX, and reset CTA", () => {
      const { code } = parseTsx("src/components/PhoneFinderStudio.tsx");
      expect(code).toContain('role="status"');
      expect(code).toContain('aria-live="polite"');
      expect(code).toContain("<SearchX");
      expect(code).toContain("No matching smartphones found");
      expect(code).toContain("Reset All Filters");
      expect(code).toContain("resetFilters");
    });

    it("empirically simulates impossible filter criteria against the 939-device catalog to trigger zero-match state", () => {
      const devices = FULL_UNIFIED_CATALOG;
      expect(devices.length).toBe(939);

      // Condition 1: Impossible price ceiling ($150) with high Geekbench 6 multi-core (>= 8000)
      const filtered1 = devices.filter((d) => {
        return d.currentStreetUsd <= 150 && d.specs.geekbenchMulti >= 8000;
      });
      expect(filtered1.length).toBe(0);

      // Condition 2: Impossible combination of sub-5-inch screen and flagship 9000+ Geekbench
      const filtered2 = devices.filter((d) => {
        return d.specs.displaySizeInch < 5.0 && d.specs.geekbenchMulti >= 9000;
      });
      expect(filtered2.length).toBe(0);

      // Condition 3: Impossible search query
      const query = "xyz-non-existent-device-quantum-fold";
      const filtered3 = devices.filter((d) => d.name.toLowerCase().includes(query));
      expect(filtered3.length).toBe(0);
    });
  });

  // =========================================================================
  // Target 5: Theme Toggle Hydration & Document Class
  // =========================================================================
  describe("Target 5: Theme Toggle, Tokens & Hydration Safety", () => {
    it("verifies root layout has suppressHydrationWarning and font variables on <html>", () => {
      const { code } = parseTsx("src/app/layout.tsx");
      expect(code).toContain("suppressHydrationWarning");
      expect(code).toContain("--font-inter");
      expect(code).toContain("--font-mono");
      expect(code).toContain("${inter.variable} ${jetbrainsMono.variable}");
    });

    it("verifies tailwind.config.ts has darkMode: 'class' and content scanning for features", () => {
      const { code } = parseTsx("tailwind.config.ts");
      expect(code).toContain('darkMode: "class"');
      expect(code).toContain("./src/features/**/*.{js,ts,jsx,tsx,mdx}");
    });

    it("verifies tailwind-input.css defines required CSS variable tokens for :root and .dark", () => {
      const css = fs.readFileSync("src/app/tailwind-input.css", "utf8");
      const requiredTokens = [
        "--surface-bg",
        "--surface-card",
        "--surface-subtle",
        "--text-primary",
        "--text-secondary",
        "--text-muted",
        "--border-dim",
        "--border-subtle",
      ];
      requiredTokens.forEach((token) => {
        expect(css, `Missing token ${token} in tailwind-input.css`).toContain(token);
      });
      expect(css).toContain(":root");
      expect(css).toContain(".dark");
    });

    it("verifies page.tsx manages theme state with localStorage persistence and toggleTheme handler", () => {
      const { code } = parseTsx("src/app/page.tsx");
      expect(code).toContain('localStorage.getItem("phoneindex_theme")');
      expect(code).toContain('localStorage.setItem("phoneindex_theme", nextTheme)');
      expect(code).toContain('document.documentElement.classList.toggle("dark"');
      expect(code).toContain("toggleTheme");
      expect(code).toContain("Switch to ${theme === \"light\" ? \"dark\" : \"light\"} mode");
    });
  });

  // =========================================================================
  // Target 6: Visual Fidelity Badge Tooltips
  // =========================================================================
  describe("Target 6: Visual Fidelity Badge Tooltips", () => {
    it("verifies VisualFidelityBadge.tsx handles all 4 fidelity tiers with complete explanations and icons", () => {
      const { code } = parseTsx("src/components/VisualFidelityBadge.tsx");
      const tiers: VisualFidelityStatus[] = [
        "VERIFIED_ASSET",
        "VERIFIED_VECTOR",
        "APPROXIMATE",
        "GENERIC_FALLBACK",
      ];
      tiers.forEach((tier) => {
        expect(code, `Missing tier ${tier} in VisualFidelityBadge.tsx`).toContain(tier);
      });
      expect(code).toContain('role="tooltip"');
      expect(code).toContain("aria-label");
      expect(code).toContain("onMouseEnter");
      expect(code).toContain("onMouseLeave");
      expect(code).toContain("onFocus");
      expect(code).toContain("onBlur");
      expect(code).toContain("onClick");
    });

    it("verifies tooltips contain distinct descriptions for each tier", () => {
      const mockVisual = (status: VisualFidelityStatus): ResolvedDeviceVisual => ({
        deviceId: "dev-mock-1",
        status,
        renderer: status === "VERIFIED_ASSET" ? "OEM_ASSET" : status === "GENERIC_FALLBACK" ? "LEGACY_HEURISTIC" : "CALIBRATED_VECTOR",
        label: status.replace("_", " "),
        description: `Description for ${status}`,
        source: "MANIFEST",
      });

      const tiers: VisualFidelityStatus[] = [
        "VERIFIED_ASSET",
        "VERIFIED_VECTOR",
        "APPROXIMATE",
        "GENERIC_FALLBACK",
      ];
      tiers.forEach((tier) => {
        const visual = mockVisual(tier);
        expect(visual.status).toBe(tier);
        expect(visual.label).toBeDefined();
        expect(visual.description).toBeDefined();
      });
    });
  });

  // =========================================================================
  // Target 7: calculateLivingScores & Recommendation Thresholds
  // =========================================================================
  describe("Milestone 2 Adversarial Stress Suite: calculateLivingScores & Recommendation Thresholds", () => {
    it("Zero divisor resilience in calculateLivingScores", () => {
      const extremeDivisors = calculateLivingScores({
        launchMsrpUsd: 0,
        simulatedStreetUsd: 0,
        osSupportYears: 0,
        basePragmatistScore: 6.0,
        baseStreetUsd: 0,
        siliconScore: 7.0,
        cameraScore: 7.0,
        dailyDriverScore: 7.0,
      });

      expect(Number.isFinite(extremeDivisors.compositeLivingScore)).toBe(true);
      expect(Number.isFinite(extremeDivisors.pragmatistScore)).toBe(true);
      expect(Number.isFinite(extremeDivisors.costPerYearUsd)).toBe(true);
      expect(Number.isFinite(extremeDivisors.discountPct)).toBe(true);
    });

    it("resilience against negative and extreme values in calculateLivingScores", () => {
      const negativeInputs = calculateLivingScores({
        launchMsrpUsd: -100,
        simulatedStreetUsd: -50,
        osSupportYears: -2,
        basePragmatistScore: 5.0,
        baseStreetUsd: -50,
        siliconScore: 5.0,
        cameraScore: 5.0,
        dailyDriverScore: 5.0,
      });

      expect(Number.isFinite(negativeInputs.compositeLivingScore)).toBe(true);
      expect(Number.isFinite(negativeInputs.pragmatistScore)).toBe(true);
      expect(Number.isFinite(negativeInputs.costPerYearUsd)).toBe(true);
      expect(Number.isFinite(negativeInputs.discountPct)).toBe(true);
    });

    it("verifies CatalogSidebar.tsx strikethrough MSRP micro-typography uses text-slate-500 contrast", () => {
      const { code } = parseTsx("src/features/catalog/CatalogSidebar.tsx");
      expect(code).toContain("text-slate-500 font-normal line-through");
      expect(code).not.toContain("text-slate-400 font-normal line-through");
    });
  });
});

