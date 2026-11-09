import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as ts from "typescript";

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

function getTagName(node: ts.JsxElement | ts.JsxSelfClosingElement, sourceFile: ts.SourceFile): string {
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

describe("Unified Gate Challenger 2 — AST Invariants, Accessibility & Mobile Ergonomics", () => {
  // =========================================================================
  // Requirement 1: AST Slider Count Verification
  // =========================================================================
  describe("Requirement 1: AST Slider Count Verification", () => {
    interface SliderInfo {
      file: string;
      line: number;
      label?: string;
      valuemin?: string;
      valuemax?: string;
      valuenow?: string;
      valuetext?: string;
    }

    function extractSlidersFromAst(filePath: string): SliderInfo[] {
      const { sourceFile } = parseTsx(filePath);
      const sliders: SliderInfo[] = [];

      function visit(node: ts.Node) {
        if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
          const tagName = getTagName(node, sourceFile);
          if (tagName === "input") {
            const attrs = ts.isJsxElement(node)
              ? node.openingElement.attributes.properties
              : node.attributes.properties;
            let isRange = false;
            const meta: SliderInfo = {
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

    it("verifies page.tsx has strictly 2 sliders", () => {
      const sliders = extractSlidersFromAst("src/app/page.tsx");
      expect(sliders.length).toBe(2);
    });

    it("verifies PhoneFinderStudio.tsx has strictly 8 sliders", () => {
      const sliders = extractSlidersFromAst("src/components/PhoneFinderStudio.tsx");
      expect(sliders.length).toBe(8);
    });

    it("verifies total slider count is strictly 10 across page.tsx and PhoneFinderStudio.tsx", () => {
      const pageSliders = extractSlidersFromAst("src/app/page.tsx");
      const finderSliders = extractSlidersFromAst("src/components/PhoneFinderStudio.tsx");
      expect(pageSliders.length + finderSliders.length).toBe(10);
    });

    it("verifies all 10 sliders possess mandatory ARIA attributes", () => {
      const allSliders = [
        ...extractSlidersFromAst("src/app/page.tsx"),
        ...extractSlidersFromAst("src/components/PhoneFinderStudio.tsx"),
      ];
      expect(allSliders.length).toBe(10);

      allSliders.forEach((s) => {
        expect(s.label, `Slider at ${s.file}:${s.line} missing aria-label`).toBeDefined();
        expect(s.valuemin, `Slider at ${s.file}:${s.line} missing aria-valuemin`).toBeDefined();
        expect(s.valuemax, `Slider at ${s.file}:${s.line} missing aria-valuemax`).toBeDefined();
        expect(s.valuenow, `Slider at ${s.file}:${s.line} missing aria-valuenow`).toBeDefined();
        expect(s.valuetext, `Slider at ${s.file}:${s.line} missing aria-valuetext`).toBeDefined();
      });
    });
  });

  // =========================================================================
  // Requirement 2: AST Button Nesting & HTML Spec Conformance
  // =========================================================================
  describe("Requirement 2: AST Button Nesting & HTML Spec Conformance", () => {
    it("verifies no <button> contains headings (<h1-6>), nested <button>, or <a> tags across all src/**/*.tsx", () => {
      const files = getAllTsxFiles("src");
      expect(files.length).toBeGreaterThan(15);

      const violations: Array<{ file: string; tag: string; line: number; buttonLine: number }> = [];

      files.forEach((file) => {
        const { sourceFile } = parseTsx(file);

        function checkDescendants(node: ts.Node, buttonLine: number) {
          ts.forEachChild(node, (child) => {
            if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child)) {
              const tagName = getTagName(child, sourceFile);
              if (/^h[1-6]$/i.test(tagName) || tagName === "button" || tagName === "a") {
                const line = sourceFile.getLineAndCharacterOfPosition(child.getStart(sourceFile)).line + 1;
                violations.push({ file: path.relative(process.cwd(), file), tag: tagName, line, buttonLine });
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

    it("verifies no <a> tag contains nested <button> tags across all src/**/*.tsx", () => {
      const files = getAllTsxFiles("src");
      const violations: Array<{ file: string; line: number }> = [];

      files.forEach((file) => {
        const { sourceFile } = parseTsx(file);

        function checkDescendants(node: ts.Node) {
          ts.forEachChild(node, (child) => {
            if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child)) {
              const tagName = getTagName(child, sourceFile);
              if (tagName === "button") {
                const line = sourceFile.getLineAndCharacterOfPosition(child.getStart(sourceFile)).line + 1;
                violations.push({ file: path.relative(process.cwd(), file), line });
              }
            }
            checkDescendants(child);
          });
        }

        function visit(node: ts.Node) {
          if (ts.isJsxElement(node)) {
            const tagName = node.openingElement.tagName.getText(sourceFile);
            if (tagName === "a" || tagName === "Link") {
              checkDescendants(node);
            }
          }
          ts.forEachChild(node, visit);
        }

        visit(sourceFile);
      });

      expect(violations).toEqual([]);
    });
  });

  // =========================================================================
  // Requirement 3: W3C ARIA Table Hierarchy in FullSpecSheet.tsx
  // =========================================================================
  describe("Requirement 3: W3C ARIA Table Hierarchy in FullSpecSheet.tsx", () => {
    it("verifies zero orphaned rowheaders in FullSpecSheet.tsx (all rowheaders have parent role='row')", () => {
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

        // role="presentation" is skipped for semantic hierarchy check
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

      // Verify table node exists
      const tableNode = roleNodes.find((r) => r.role === "table");
      expect(tableNode).toBeDefined();

      // Verify rowgroups are inside table
      const rowgroups = roleNodes.filter((r) => r.role === "rowgroup");
      expect(rowgroups.length).toBeGreaterThan(0);
      rowgroups.forEach((rg) => {
        expect(rg.parentRole).toBe("table");
      });

      // Verify rows exist
      const rows = roleNodes.filter((r) => r.role === "row");
      expect(rows.length).toBeGreaterThan(0);

      // Verify cells have parent role="row"
      const cells = roleNodes.filter((r) => r.role === "cell");
      expect(cells.length).toBeGreaterThan(0);
      cells.forEach((cell) => {
        expect(cell.parentRole).toBe("row");
      });

      // Verify all rowheaders are inside a role="row"
      const rowheaders = roleNodes.filter((r) => r.role === "rowheader");
      expect(rowheaders.length).toBeGreaterThan(0);

      const orphanedRowheaders = rowheaders.filter((rh) => rh.parentRole !== "row");
      expect(orphanedRowheaders).toEqual([]);
    });

    it("verifies FullSpecSheet.tsx defaultExpanded prop behaves correctly in device detail view", () => {
      const { code } = parseTsx("src/app/devices/[slug]/page.tsx");
      // FullSpecSheet should be called with defaultExpanded={true} or expanded
      expect(code).toContain("defaultExpanded={true}");
    });
  });

  // =========================================================================
  // Requirement 4: Responsive Mobile Classes & Layout Ergonomics
  // =========================================================================
  describe("Requirement 4: Responsive Mobile Classes & Layout Ergonomics", () => {
    it("verifies pb-40 bottom clearance is defined and dynamically applied when ComparisonDock is active", () => {
      const dockCode = fs.readFileSync("src/components/ComparisonDock.tsx", "utf8");
      expect(dockCode).toContain('COMPARISON_DOCK_BOTTOM_PADDING = "pb-40"');
      expect(dockCode).toContain('data-dock-clearance="pb-40"');

      const pageCode = fs.readFileSync("src/app/page.tsx", "utf8");
      expect(pageCode).toContain('stagedCompareIds.length > 0 ? "pb-40" : ""');
    });

    it("verifies w-32 sm:w-56 is used for narrowed sticky specification columns", () => {
      const matrixCode = fs.readFileSync("src/components/CompareMatrixTable.tsx", "utf8");
      // Header th
      expect(matrixCode).toContain("w-32 sm:w-56 sticky left-0 top-0");
      // Body td
      expect(matrixCode).toContain("w-32 sm:w-56 align-top");
    });

    it("verifies sticky top-0 is applied to sticky headers in CompareMatrixTable", () => {
      const matrixCode = fs.readFileSync("src/components/CompareMatrixTable.tsx", "utf8");
      expect(matrixCode).toContain("thead className=\"sticky top-0");
      expect(matrixCode).toContain("sticky left-0 top-0");
    });

    it("verifies ComparisonDock includes mobile minimize/collapse toggle with touch-friendly targets", () => {
      const dockCode = fs.readFileSync("src/components/ComparisonDock.tsx", "utf8");
      expect(dockCode).toContain("isCollapsed");
      expect(dockCode).toContain("setIsCollapsed");
      expect(dockCode).toContain("min-h-[44px]");
      expect(dockCode).toContain("ChevronUp");
      expect(dockCode).toContain("ChevronDown");
    });
  });
});
