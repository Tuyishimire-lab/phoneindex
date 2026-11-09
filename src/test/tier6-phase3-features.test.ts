import { describe, it, expect, vi } from "vitest";
import React from "react";
import * as ReactDOMServer from "react-dom/server";
import * as fs from "fs";
import * as path from "path";
import * as ts from "typescript";
import { FullSpecSheet } from "@/components/FullSpecSheet";
import { ComparisonDock, COMPARISON_DOCK_BOTTOM_PADDING } from "@/components/ComparisonDock";
import { CompareMatrixTable } from "@/components/CompareMatrixTable";
import { INITIAL_DEVICES } from "@/lib/seed-data";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/compare/samsung-galaxy-s25-ultra-vs-apple-iphone-16-pro-max",
}));

function renderClean(element: React.ReactElement): string {
  return ReactDOMServer.renderToStaticMarkup(element);
}

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

describe("Phase 3 Verification: Spec Sheet UX, Comparison Route Parity & Mobile Dock Ergonomics", () => {
  const testDevice = INITIAL_DEVICES[0]; // e.g. Samsung Galaxy S25 Ultra
  const testDeviceB = INITIAL_DEVICES[1]; // e.g. Apple iPhone 16 Pro Max
  const testDeviceC = INITIAL_DEVICES[2]; // e.g. Google Pixel 9 Pro XL

  // =========================================================================
  // 1. FullSpecSheet Enhancements
  // =========================================================================
  describe("1. FullSpecSheet: Default Expansion, Admin Gating & ARIA Hierarchy", () => {
    it("renders collapsed by default when defaultExpanded is omitted or false", () => {
      const html = renderClean(
        React.createElement(FullSpecSheet, {
          device: testDevice,
        })
      );
      // Collapsed: shows Expand All button, does not render full table body
      expect(html).toContain("Expand All");
      expect(html).not.toContain("role=\"table\"");
    });

    it("renders expanded by default when defaultExpanded={true} is provided", () => {
      const html = renderClean(
        React.createElement(FullSpecSheet, {
          device: testDevice,
          defaultExpanded: true,
        })
      );
      // Expanded: shows Collapse button and renders table body
      expect(html).toContain("Collapse");
      expect(html).toContain("role=\"table\"");
      expect(html).toContain("Complete Encyclopedic Spec Sheet");
      expect(html).toContain("NETWORK &amp; CELLULAR BANDS");
    });

    it("gates administrative buttons behind showAdminControls prop", () => {
      // Normal consumer view (showAdminControls omitted or false):
      // Even if admin callbacks are passed, buttons must NOT be rendered
      const consumerHtml = renderClean(
        React.createElement(FullSpecSheet, {
          device: testDevice,
          defaultExpanded: true,
          showAdminControls: false,
          onUpdateDevice: vi.fn(),
          onOpenManualSpecStudio: vi.fn(),
        })
      );
      expect(consumerHtml).not.toContain("Upload Model Image");
      expect(consumerHtml).not.toContain("Edit Specs Inline");
      expect(consumerHtml).not.toContain("Full Spec &amp; Model Studio");

      // Admin view (showAdminControls={true}):
      const adminHtml = renderClean(
        React.createElement(FullSpecSheet, {
          device: testDevice,
          defaultExpanded: true,
          showAdminControls: true,
          onUpdateDevice: vi.fn(),
          onOpenManualSpecStudio: vi.fn(),
        })
      );
      expect(adminHtml).toContain("Upload Model Image");
      expect(adminHtml).toContain("Edit Specs Inline");
      expect(adminHtml).toContain("Full Spec &amp; Model Studio");
    });

    it("enforces W3C ARIA compliance: 0 orphaned rowheaders in FullSpecSheet.tsx", () => {
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
      }
      const roleNodes: RoleNode[] = [];

      function traverse(node: ts.Node, parentRole: string | null) {
        const currentRole = getRole(node);
        if (currentRole) {
          roleNodes.push({ role: currentRole, parentRole });
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

      const rowheaders = roleNodes.filter((r) => r.role === "rowheader");
      expect(rowheaders.length).toBeGreaterThan(0);

      // Verify no rowheaders bypass a role="row"
      const orphanedRowheaders = rowheaders.filter((rh) => rh.parentRole !== "row");
      expect(orphanedRowheaders.length).toBe(0);
    });

    it("implements responsive horizontal flex wrapping on sub-rows (w-full sm:w-48)", () => {
      const { code } = parseTsx("src/components/FullSpecSheet.tsx");
      expect(code).toContain("w-full sm:w-48");
    });
  });

  // =========================================================================
  // 2. ComparisonDock Enhancements
  // =========================================================================
  describe("2. ComparisonDock: Minimize Toggle, Touch Targets & Bottom Clearance", () => {
    it("exports COMPARISON_DOCK_BOTTOM_PADDING constant with pb-40", () => {
      expect(COMPARISON_DOCK_BOTTOM_PADDING).toBe("pb-40");
    });

    it("renders bottom clearance anchor attribute data-dock-clearance=pb-40", () => {
      const html = renderClean(
        React.createElement(ComparisonDock, {
          devices: INITIAL_DEVICES,
          stagedDeviceIds: [testDevice.id, testDeviceB.id],
          onRemoveDevice: vi.fn(),
          onClearAll: vi.fn(),
          onLaunchCompare: vi.fn(),
        })
      );
      expect(html).toContain('data-dock-clearance="pb-40"');
      expect(html).toContain("pb-40");
    });

    it("renders expanded dock with mobile minimize button by default", () => {
      const html = renderClean(
        React.createElement(ComparisonDock, {
          devices: INITIAL_DEVICES,
          stagedDeviceIds: [testDevice.id, testDeviceB.id],
          onRemoveDevice: vi.fn(),
          onClearAll: vi.fn(),
          onLaunchCompare: vi.fn(),
        })
      );
      expect(html).toContain("Minimize");
      expect(html).toContain("Comparing 2 of 4");
      expect(html).toContain("Ready to compare");
      expect(html).toContain("Launch Compare Studio");
    });

    it("renders collapsed dock when defaultCollapsed={true} is passed", () => {
      const html = renderClean(
        React.createElement(ComparisonDock, {
          devices: INITIAL_DEVICES,
          stagedDeviceIds: [testDevice.id, testDeviceB.id],
          defaultCollapsed: true,
          onRemoveDevice: vi.fn(),
          onClearAll: vi.fn(),
          onLaunchCompare: vi.fn(),
        })
      );
      expect(html).toContain("Expand Dock");
      expect(html).toContain("Comparing 2 of 4");
      expect(html).not.toContain("Launch Compare Studio");
    });

    it("enforces 44px minimum touch targets across buttons in ComparisonDock.tsx", () => {
      const { code } = parseTsx("src/components/ComparisonDock.tsx");
      // Touch target classes
      expect(code).toContain("min-h-[44px]");
      expect(code).toContain("min-w-[44px]");
    });
  });

  // =========================================================================
  // 3. CompareMatrixTable & /compare/[slugs] Page Parity
  // =========================================================================
  describe("3. CompareMatrixTable: Sticky Header, Diff Filter & Contender Controls", () => {
    it("renders comparison matrix with sticky header styling", () => {
      const html = renderClean(
        React.createElement(CompareMatrixTable, {
          initialContenders: [testDevice, testDeviceB],
          allCatalogDevices: INITIAL_DEVICES,
        })
      );
      // Sticky thead
      expect(html).toContain("sticky top-0 z-20");
      expect(html).toContain("backdrop-blur");
      // Contenders present
      expect(html).toContain(testDevice.name);
      expect(html).toContain(testDeviceB.name);
      expect(html).toContain("Contender A");
      expect(html).toContain("Contender B");
    });

    it("narrows sticky specification column on mobile to w-32 sm:w-56", () => {
      const html = renderClean(
        React.createElement(CompareMatrixTable, {
          initialContenders: [testDevice, testDeviceB],
          allCatalogDevices: INITIAL_DEVICES,
        })
      );
      expect(html).toContain("w-32 sm:w-56");
    });

    it("renders Highlight Hardware Differences Only toggle button", () => {
      const html = renderClean(
        React.createElement(CompareMatrixTable, {
          initialContenders: [testDevice, testDeviceB],
          allCatalogDevices: INITIAL_DEVICES,
        })
      );
      expect(html).toContain("Highlight Hardware Differences Only");
    });

    it("provides interactive contender swap and remove controls in table header", () => {
      // With 2 contenders: swap controls are present, remove button disabled/hidden (<3)
      const html2 = renderClean(
        React.createElement(CompareMatrixTable, {
          initialContenders: [testDevice, testDeviceB],
          allCatalogDevices: INITIAL_DEVICES,
        })
      );
      expect(html2).toContain("Swap");
      expect(html2).toContain("+ Add Contender (2/4)");

      // With 3 contenders: remove button is present with 44px touch target
      const html3 = renderClean(
        React.createElement(CompareMatrixTable, {
          initialContenders: [testDevice, testDeviceB, testDeviceC],
          allCatalogDevices: INITIAL_DEVICES,
        })
      );
      expect(html3).toContain("Remove");
      expect(html3).toContain("+ Add Contender (3/4)");
    });

    it("ensures PhoneSizeComparator is integrated on /compare/[slugs] with responsive overflow", () => {
      const { code } = parseTsx("src/app/compare/[slugs]/page.tsx");
      expect(code).toContain("<PhoneSizeComparator devices={contenders}");
      expect(code).toContain("overflow-x-auto");
    });

    it("conforms strictly to AST constraint: no <button> contains headings, buttons, or links", () => {
      const filesToCheck = [
        "src/components/FullSpecSheet.tsx",
        "src/components/ComparisonDock.tsx",
        "src/components/CompareMatrixTable.tsx",
        "src/app/compare/[slugs]/page.tsx",
      ];

      function getTagName(node: ts.JsxElement | ts.JsxSelfClosingElement, sourceFile: ts.SourceFile): string {
        if (ts.isJsxElement(node)) {
          return node.openingElement.tagName.getText(sourceFile);
        }
        return node.tagName.getText(sourceFile);
      }

      filesToCheck.forEach((filePath) => {
        const { sourceFile } = parseTsx(filePath);
        const violations: Array<{ file: string; tag: string; line: number }> = [];

        function checkDescendants(node: ts.Node, buttonLine: number) {
          ts.forEachChild(node, (child) => {
            if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child)) {
              const tagName = getTagName(child, sourceFile);
              if (/^h[1-6]$/i.test(tagName) || tagName === "button" || tagName === "a") {
                const line = sourceFile.getLineAndCharacterOfPosition(child.getStart(sourceFile)).line + 1;
                violations.push({ file: filePath, tag: tagName, line });
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
        expect(violations, `Violations found in ${filePath}`).toEqual([]);
      });
    });
  });
});
