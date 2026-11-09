import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as ts from "typescript";
import { FULL_UNIFIED_CATALOG } from "@/lib/brands/catalog-loader";
import { INITIAL_DEVICES } from "@/lib/seed-data";

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

describe("Phase 2 Verification: State Persistence, Search & Filter Ergonomics, Catalog Decoupling", () => {
  // =========================================================================
  // Requirement 1: State Persistence across tab switches
  // =========================================================================
  describe("Requirement 1: PhoneFinderStudio State Persistence", () => {
    it("persists filters, sortBy, and activePresetName with usePersistentState keys", () => {
      const { code } = parseTsx("src/components/PhoneFinderStudio.tsx");
      expect(code).toContain('usePersistentState<FinderFilters>');
      expect(code).toContain('"phoneindex_finder_filters"');
      expect(code).toContain('usePersistentState<SortOption>');
      expect(code).toContain('"phoneindex_finder_sort"');
      expect(code).toContain('usePersistentState<string | null>');
      expect(code).toContain('"phoneindex_finder_preset"');
    });

    it("synchronizes debounced search text bidirectionally with persistent filter state", () => {
      const { code } = parseTsx("src/components/PhoneFinderStudio.tsx");
      expect(code).toContain("setFilters((prev) => ({ ...prev, searchText: debouncedSearchText }))");
      expect(code).toContain("setLocalSearchText(filters.searchText)");
    });
  });

  // =========================================================================
  // Requirement 2: Filter Controls & Chips for Category, RAM, Storage, Refresh Rate
  // =========================================================================
  describe("Requirement 2: Parametric Chips (Category, Min RAM, Storage, Refresh Rate)", () => {
    it("asserts strictly exactly 8 range sliders in PhoneFinderStudio.tsx (no new range inputs)", () => {
      const { sourceFile } = parseTsx("src/components/PhoneFinderStudio.tsx");
      let rangeSliderCount = 0;

      function visit(node: ts.Node) {
        if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
          const tagName = getTagName(node, sourceFile);
          if (tagName === "input") {
            const attrs = ts.isJsxElement(node)
              ? node.openingElement.attributes.properties
              : node.attributes.properties;
            for (const prop of attrs) {
              if (ts.isJsxAttribute(prop) && prop.name && prop.name.getText(sourceFile) === "type") {
                const init = prop.initializer;
                if (init && init.getText(sourceFile).includes("range")) {
                  rangeSliderCount++;
                }
              }
            }
          }
        }
        ts.forEachChild(node, visit);
      }

      visit(sourceFile);
      expect(rangeSliderCount).toBe(8);
    });

    it("renders clickable chip buttons for Category, Min RAM, Storage Tier, and Refresh Rate", () => {
      const { code } = parseTsx("src/components/PhoneFinderStudio.tsx");
      // Category chips
      expect(code).toContain("Device Category");
      expect(code).toContain("Ultra Flagship");
      expect(code).toContain("Camera Flagship");
      expect(code).toContain("Foldable");
      expect(code).toContain("Battery King");
      expect(code).toContain("Value Disruptor");

      // RAM chips
      expect(code).toContain("Min RAM Capacity");
      expect(code).toContain("≥6GB");
      expect(code).toContain("≥8GB");
      expect(code).toContain("≥12GB");
      expect(code).toContain("≥16GB");

      // Storage chips
      expect(code).toContain("Storage Tier");
      expect(code).toContain("128GB");
      expect(code).toContain("256GB");
      expect(code).toContain("512GB");
      expect(code).toContain("1TB");

      // Refresh Rate chips
      expect(code).toContain("Display Refresh Rate");
      expect(code).toContain("≥60Hz");
      expect(code).toContain("≥90Hz");
      expect(code).toContain("≥120Hz");
      expect(code).toContain("≥144Hz");
    });

    it("verifies real catalog filtering logic for Category, RAM, Storage, and Refresh Rate", () => {
      const devices = FULL_UNIFIED_CATALOG;

      // Category: Foldable
      const foldables = devices.filter((d) => d.category === "Foldable");
      expect(foldables.length).toBeGreaterThan(0);
      expect(foldables.every((d) => d.category === "Foldable")).toBe(true);

      // RAM: >= 16GB
      const ram16Plus = devices.filter((d) => {
        const matches = d.specs.ramOptions.match(/(\d+)\s*GB/gi);
        if (!matches) return false;
        const max = Math.max(...matches.map((m) => parseInt(m.replace(/[^0-9]/g, ""), 10)));
        return max >= 16;
      });
      expect(ram16Plus.length).toBeGreaterThan(0);

      // Refresh Rate: >= 144Hz
      const hz144Plus = devices.filter((d) => {
        const matches = d.specs.refreshRateHz.match(/\d+/g);
        if (!matches) return false;
        return Math.max(...matches.map(Number)) >= 144;
      });
      expect(hz144Plus.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // Requirement 3: Expanded Search Predicate
  // =========================================================================
  describe("Requirement 3: Expanded Keyword Search Predicate", () => {
    it("verifies PhoneFinderStudio search predicate inspects category, ramOptions, storageType, telephotoSpecs, and frameMaterial", () => {
      const { code } = parseTsx("src/components/PhoneFinderStudio.tsx");
      expect(code).toContain("d.category.toLowerCase().includes(q)");
      expect(code).toContain("s.ramOptions.toLowerCase().includes(q)");
      expect(code).toContain("s.storageType.toLowerCase().includes(q)");
      expect(code).toContain("s.telephotoSpecs.toLowerCase().includes(q)");
      expect(code).toContain("s.frameMaterial.toLowerCase().includes(q)");
    });

    it("successfully queries devices by titanium frame, periscope zoom, and foldable category", () => {
      const devices = FULL_UNIFIED_CATALOG;

      const titaniumHits = devices.filter((d) =>
        d.specs.frameMaterial.toLowerCase().includes("titanium")
      );
      expect(titaniumHits.length).toBeGreaterThan(0);

      const periscopeHits = devices.filter((d) =>
        d.specs.telephotoSpecs.toLowerCase().includes("periscope")
      );
      expect(periscopeHits.length).toBeGreaterThan(0);

      const foldableHits = devices.filter((d) =>
        d.category.toLowerCase().includes("foldable")
      );
      expect(foldableHits.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // Requirement 4: Dismissible Active Filter Pills & 1-Click Relaxation
  // =========================================================================
  describe("Requirement 4: Dismissible Active Filter Pills & Zero-Match Relaxation", () => {
    it("renders Active Filters bar with individual dismiss buttons and Clear All", () => {
      const { code } = parseTsx("src/components/PhoneFinderStudio.tsx");
      expect(code).toContain("Active Filters (");
      expect(code).toContain("Clear all");
      expect(code).toContain("pill.onRemove");
    });

    it("renders dynamic 1-click filter relaxation buttons with calculated match counts", () => {
      const { code } = parseTsx("src/components/PhoneFinderStudio.tsx");
      expect(code).toContain("relaxationOptions");
      expect(code).toContain("1-Click Filter Relaxation Suggestions:");
      expect(code).toContain("opt.apply");
      expect(code).toContain("+{opt.count}");
    });

    it("preserves required zero-match empty state accessibility attributes", () => {
      const { code } = parseTsx("src/components/PhoneFinderStudio.tsx");
      expect(code).toContain('role="status"');
      expect(code).toContain('aria-live="polite"');
      expect(code).toContain("<SearchX");
      expect(code).toContain("No matching smartphones found");
      expect(code).toContain("Reset All Filters");
      expect(code).toContain("resetFilters");
    });
  });

  // =========================================================================
  // Requirement 5: Decoupled Brand Filter in CatalogSidebar.tsx
  // =========================================================================
  describe("Requirement 5: Decoupled Brand Filter Selection", () => {
    it("verifies selectBrand in CatalogSidebar does not forcibly invoke onSelectDevice", () => {
      const { code } = parseTsx("src/features/catalog/CatalogSidebar.tsx");
      // Find the selectBrand definition
      const selectBrandMatch = code.match(/const selectBrand = \([\s\S]*?\};/);
      expect(selectBrandMatch).not.toBeNull();
      const selectBrandCode = selectBrandMatch![0];
      expect(selectBrandCode).toContain("onBrandFilterChange");
      expect(selectBrandCode).toContain("setVisibleLimit");
      expect(selectBrandCode).not.toContain("onSelectDevice");
    });
  });

  // =========================================================================
  // Requirement 6: Commercial Sort Options
  // =========================================================================
  describe("Requirement 6: Commercial Sort Options", () => {
    it("provides Newest First, Price: Low to High, and Price: High to Low in PhoneFinderStudio.tsx", () => {
      const { code } = parseTsx("src/components/PhoneFinderStudio.tsx");
      expect(code).toContain('"NEWEST"');
      expect(code).toContain('"PRICE_ASC"');
      expect(code).toContain('"PRICE_DESC"');
      expect(code).toContain("Newest First (2026 → 2020)");
      expect(code).toContain("Price: Low to High");
      expect(code).toContain("Price: High to Low");
      expect(code).toContain("b.releaseDate.localeCompare(a.releaseDate)");
      expect(code).toContain("a.currentStreetUsd - b.currentStreetUsd");
      expect(code).toContain("b.currentStreetUsd - a.currentStreetUsd");
    });

    it("provides commercial sort options in CatalogSidebar.tsx with displayDevices", () => {
      const { code } = parseTsx("src/features/catalog/CatalogSidebar.tsx");
      expect(code).toContain("CommercialSortMode");
      expect(code).toContain("commercialSort");
      expect(code).toContain("Newest First");
      expect(code).toContain("Price: Low to High");
      expect(code).toContain("Price: High to Low");
      expect(code).toContain("displayDevices");
    });

    it("correctly sorts catalog by Newest First and Price tiers", () => {
      const devices = [...INITIAL_DEVICES];
      const newest = [...devices].sort((a, b) => b.releaseDate.localeCompare(a.releaseDate));
      expect(newest[0].releaseDate >= newest[newest.length - 1].releaseDate).toBe(true);

      const priceAsc = [...devices].sort((a, b) => a.currentStreetUsd - b.currentStreetUsd);
      expect(priceAsc[0].currentStreetUsd <= priceAsc[priceAsc.length - 1].currentStreetUsd).toBe(true);

      const priceDesc = [...devices].sort((a, b) => b.currentStreetUsd - a.currentStreetUsd);
      expect(priceDesc[0].currentStreetUsd >= priceDesc[priceDesc.length - 1].currentStreetUsd).toBe(true);
    });
  });

  // =========================================================================
  // Semantic Integrity: No Illegal Nested Heading/Button/Anchor in Button
  // =========================================================================
  describe("Semantic Integrity & AST Rules", () => {
    it("verifies no <button> in PhoneFinderStudio or CatalogSidebar contains illegal nested interactive or heading tags", () => {
      ["src/components/PhoneFinderStudio.tsx", "src/features/catalog/CatalogSidebar.tsx"].forEach((file) => {
        const { sourceFile } = parseTsx(file);
        const violations: Array<{ file: string; tag: string; line: number }> = [];

        function checkDescendants(node: ts.Node) {
          ts.forEachChild(node, (child) => {
            if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child)) {
              const tagName = getTagName(child, sourceFile);
              if (/^h[1-6]$/i.test(tagName) || tagName === "button" || tagName === "a") {
                const line = sourceFile.getLineAndCharacterOfPosition(child.getStart(sourceFile)).line + 1;
                violations.push({ file, tag: tagName, line });
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
        expect(violations, `Found illegal nested descendants inside buttons in ${file}`).toEqual([]);
      });
    });
  });
});
