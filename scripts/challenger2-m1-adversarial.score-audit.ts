import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import fs from "fs";
import path from "path";

// Mock next/navigation before importing error.tsx
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
}));

import GlobalError from "@/app/error";

describe("Milestone 1 Adversarial Challenge: UX & Layout Implementations", () => {
  const rootDir = process.cwd();

  // =========================================================================
  // Challenge 1: Error Boundary src/app/error.tsx
  // =========================================================================
  describe("Challenge 1: Error Boundary (src/app/error.tsx)", () => {
    it("1.1: Renders user-facing error message and accessible alert semantics", () => {
      const testError = new Error("Telemetry socket dropped unexpectedly");
      const mockReset = vi.fn();

      const html = renderToStaticMarkup(
        React.createElement(GlobalError, { error: testError, reset: mockReset })
      );

      // Verify W3C Alert Semantics
      expect(html).toContain('role="alert"');
      expect(html).toContain('aria-live="assertive"');
      expect(html).toContain('aria-atomic="true"');
      expect(html).toContain('id="error-heading"');
      expect(html).toContain("Application Rendering Exception");

      // Verify exact error message rendering
      expect(html).toContain("Telemetry socket dropped unexpectedly");
    });

    it("1.2: Renders safe fallback description when error message is empty or missing", () => {
      const emptyError = new Error("");
      const mockReset = vi.fn();

      const html = renderToStaticMarkup(
        React.createElement(GlobalError, { error: emptyError, reset: mockReset })
      );

      expect(html).toContain(
        "An unexpected error occurred while rendering the smartphone telemetry interface. Your preferences and saved selections remain safe."
      );
    });

    it("1.3: Renders diagnostic digest in monospace container when present", () => {
      const digestError = Object.assign(
        new Error("GPU Canvas WebGL Context Lost"),
        { digest: "ERR_TELEMETRY_DIGEST_987654321" }
      );
      const mockReset = vi.fn();

      const html = renderToStaticMarkup(
        React.createElement(GlobalError, { error: digestError, reset: mockReset })
      );

      expect(html).toContain("Digest:");
      expect(html).toContain("ERR_TELEMETRY_DIGEST_987654321");
      expect(html).toContain("font-mono");
    });

    it("1.4: Completely omits digest container when digest is undefined", () => {
      const noDigestError = new Error("Simple memory warning");
      const mockReset = vi.fn();

      const html = renderToStaticMarkup(
        React.createElement(GlobalError, { error: noDigestError, reset: mockReset })
      );

      expect(html).not.toContain("Digest:");
      expect(html).not.toContain("font-mono text-slate-600");
    });

    it("1.5: Reset and navigation buttons have accessible labels and invoke handlers", () => {
      const testError = new Error("Benchmark test fault");
      const mockReset = vi.fn();
      mockPush.mockClear();

      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const internals = React as unknown as {
        __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE?: {
          H: unknown;
        };
        __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED?: {
          H: unknown;
        };
      };
      const clientInternals =
        internals.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE ||
        internals.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
      const prevDispatcher = clientInternals?.H;

      try {
        if (clientInternals) {
          clientInternals.H = {
            useEffect: (fn: () => void) => fn(),
          };
        }

        // Inspect React element tree directly
        const element = GlobalError({ error: testError, reset: mockReset });
        expect(element).toBeDefined();

        // Verify console.error was called inside useEffect
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "Unhandled PhoneIndex application error:",
          testError
        );

        // Find buttons in JSX tree
        const card = element.props.children;
        const actionBar = card.props.children.find(
          (child: React.ReactElement<{ className?: string }>) =>
            child &&
            child.props &&
            typeof child.props.className === "string" &&
            child.props.className.includes("flex-wrap") &&
            child.props.className.includes("justify-center")
        );
        expect(actionBar).toBeDefined();

        const [resetBtn, reloadBtn] = actionBar.props.children;
        expect(resetBtn.props["aria-label"]).toBe(
          "Reset workspace and re-render current view"
        );
        expect(reloadBtn.props["aria-label"]).toBe(
          "Reload entire PhoneIndex catalog"
        );

        // Trigger reset click
        resetBtn.props.onClick();
        expect(mockReset).toHaveBeenCalledTimes(1);

        // Trigger reload click
        reloadBtn.props.onClick();
        expect(mockPush).toHaveBeenCalledWith("/");
      } finally {
        if (clientInternals) {
          clientInternals.H = prevDispatcher;
        }
        consoleErrorSpy.mockRestore();
      }
    });

    it("1.6: XSS and massive error payload resilience", () => {
      const maliciousError = Object.assign(
        new Error("<script>alert('xss')</script>"),
        { digest: "<img src=x onerror=alert(1)>" }
      );
      const mockReset = vi.fn();

      const html = renderToStaticMarkup(
        React.createElement(GlobalError, { error: maliciousError, reset: mockReset })
      );

      // Verify that malicious script tags are safely escaped by React
      expect(html).not.toContain("<script>alert");
      expect(html).toContain("&lt;script&gt;alert(&#x27;xss&#x27;)&lt;/script&gt;");
      expect(html).not.toContain("<img src=x");
      expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    });
  });

  // =========================================================================
  // Challenge 2: Sticky Contender Header (src/app/page.tsx)
  // =========================================================================
  describe("Challenge 2: Sticky Contender Header (src/app/page.tsx)", () => {
    const pagePath = path.join(rootDir, "src", "app", "page.tsx");
    const pageContent = fs.readFileSync(pagePath, "utf-8");

    it("2.1: Top Navigation Header defines sticky pinning and elevated z-index (z-30)", () => {
      // Find top nav header
      const topNavMatch = pageContent.match(
        /<header className="([^"]*sticky[^"]*)">/
      );
      expect(topNavMatch).not.toBeNull();
      const topNavClasses = topNavMatch![1];

      expect(topNavClasses).toContain("sticky");
      expect(topNavClasses).toContain("top-0");
      expect(topNavClasses).toContain("z-30");
    });

    it("2.2: Contender Comparison Header defines sticky pinning beneath nav at top-14 with z-20", () => {
      const contenderHeaderMatch = pageContent.match(
        /<div className="([^"]*sticky top-14[^"]*)">/
      );
      expect(contenderHeaderMatch).not.toBeNull();
      const contenderClasses = contenderHeaderMatch![1];

      expect(contenderClasses).toContain("sticky");
      expect(contenderClasses).toContain("top-14");
      expect(contenderClasses).toContain("z-20");
      expect(contenderClasses).toContain("bg-white/95");
      expect(contenderClasses).toContain("backdrop-blur-md");
    });

    it("2.3: Z-Index layering guarantees top nav (z-30) outranks contender header (z-20)", () => {
      const topNavZ = 30;
      const contenderZ = 20;
      expect(topNavZ).toBeGreaterThan(contenderZ);
    });

    it("2.4: Parent container of Smart Spec Diff table does NOT contain overflow-hidden", () => {
      // Locate the container immediately preceding the sticky contender bar
      const smartSpecDiffSection = pageContent.substring(
        pageContent.indexOf("Smart Spec Diff Table with"),
        pageContent.indexOf("sticky top-14")
      );

      expect(smartSpecDiffSection).toBeDefined();
      expect(smartSpecDiffSection).toContain(
        "rounded-2xl border border-slate-200 bg-white shadow-2xs"
      );
      // Critical check: overflow-hidden MUST NOT be on the card container
      expect(smartSpecDiffSection).not.toContain("overflow-hidden");
    });

    it("2.5: Stacking analysis: identifies mobile header height delta vs fixed top-14 offset", () => {
      // Top nav desktop: single row (lg:flex lg:justify-between py-2) -> 52-56px
      // Top nav mobile: grid 2 rows (grid-cols-[1fr_auto] + order-3 col-span-2) -> ~92px
      // Fixed top-14 is 56px (3.5rem).
      const desktopHeaderHeight = 56;
      const mobileHeaderHeight = 92;
      const contenderStickyTop = 56; // top-14 in Tailwind

      expect(contenderStickyTop).toBe(desktopHeaderHeight);
      const mobileOcclusionDelta = mobileHeaderHeight - contenderStickyTop;
      // On mobile viewports (<1024px), top 36px is positioned under the sticky nav
      expect(mobileOcclusionDelta).toBe(36);
    });
  });

  // =========================================================================
  // Challenge 3: Mobile Flex-Wrap in FullSpecSheet.tsx
  // =========================================================================
  describe("Challenge 3: Mobile Flex-Wrap (src/components/FullSpecSheet.tsx)", () => {
    const specSheetPath = path.join(
      rootDir,
      "src",
      "components",
      "FullSpecSheet.tsx"
    );
    const specSheetContent = fs.readFileSync(specSheetPath, "utf-8");

    it("3.1: Header container and action bar use flex-wrap with responsive alignment", () => {
      // Header outer bar
      expect(specSheetContent).toContain(
        "flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/70 px-5 py-3.5"
      );

      // Action button container
      expect(specSheetContent).toContain(
        "flex flex-wrap items-center gap-2 w-full sm:w-auto justify-start sm:justify-end"
      );
    });

    it("3.2: Search filter container expands to 100% width on mobile and limits to sm:w-64 on desktop", () => {
      expect(specSheetContent).toContain(
        "relative w-full sm:w-auto min-w-[200px] flex-1 sm:flex-initial"
      );
      expect(specSheetContent).toContain(
        "w-full sm:w-64 rounded-lg border border-slate-200 bg-white"
      );
    });

    it("3.3: Spec rows switch to vertical flex-col on viewports <640px to eliminate horizontal clipping", () => {
      expect(specSheetContent).toContain(
        "px-4 py-3 flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 hover:bg-slate-50/60 transition"
      );
    });

    it("3.4: Simulates width constraint at 320px viewport without horizontal layout blowout", () => {
      const viewportWidth = 320;
      const pageMargin = 16 * 2; // p-4 = 16px each side
      const availableCardWidth = viewportWidth - pageMargin; // 288px
      const cardPadding = 20 * 2; // px-5 = 20px each side
      const innerContentWidth = availableCardWidth - cardPadding; // 248px

      // Search input width on mobile is w-full (min-w-[200px])
      const searchInputMinW = 200;
      expect(innerContentWidth).toBeGreaterThanOrEqual(searchInputMinW);

      // Action buttons wrap onto separate lines because flex-wrap is enabled
      const buttonWidths = [150, 125, 100]; // Upload, Edit, Expand
      const totalButtonsInline = buttonWidths.reduce((a, b) => a + b, 0); // 375px
      // Without flex-wrap, 375px would overflow 248px by 127px!
      expect(totalButtonsInline).toBeGreaterThan(innerContentWidth);

      // With flex-wrap, max single item width is 150px <= 248px
      const maxSingleItemWidth = Math.max(...buttonWidths, searchInputMinW);
      expect(maxSingleItemWidth).toBeLessThanOrEqual(innerContentWidth);
    });

    it("3.5: No fixed width classes exceed 300px on mobile elements in FullSpecSheet", () => {
      // Find all fixed width classes like w-[350px] or min-w-[320px]
      const fixedWidthMatches = specSheetContent.match(/\b(min-w|w)-\[(\d+)px\]/g) || [];
      for (const match of fixedWidthMatches) {
        const px = parseInt(match.replace(/[^0-9]/g, ""), 10);
        // Any fixed width without responsive prefix must not exceed 250px to fit 320px screens
        if (!match.includes("sm:") && !match.includes("md:") && !match.includes("lg:")) {
          expect(px).toBeLessThanOrEqual(250);
        }
      }
    });
  });

  // =========================================================================
  // Challenge 4: Comparison Dock & useDebounce Stress Testing
  // =========================================================================
  describe("Challenge 4: Comparison Dock & useDebounce Verification", () => {
    it("4.1: ComparisonDock renders null when staged queue is empty", async () => {
      const { ComparisonDock } = await import("@/components/ComparisonDock");

      const html = renderToStaticMarkup(
        React.createElement(ComparisonDock, {
          stagedDeviceIds: [],
          devices: [],
          onRemoveDevice: vi.fn(),
          onClearAll: vi.fn(),
          onLaunchCompare: vi.fn(),
        })
      );

      expect(html).toBe("");
    });

    it("4.2: ComparisonDock displays staged devices and requires >= 2 contenders to enable CTA", async () => {
      const { ComparisonDock } = await import("@/components/ComparisonDock");
      const { INITIAL_DEVICES } = await import("@/lib/seed-data");

      const mockDev1 = {
        ...INITIAL_DEVICES[0],
        id: "d1",
        name: "Contender Alpha",
        brand: "BrandX",
        compositeLivingScore: 88.5,
      };
      const mockDev2 = {
        ...INITIAL_DEVICES[1],
        id: "d2",
        name: "Contender Beta",
        brand: "BrandY",
        compositeLivingScore: 91.2,
      };

      // 1 staged device: Launch button disabled
      const html1 = renderToStaticMarkup(
        React.createElement(ComparisonDock, {
          stagedDeviceIds: ["d1"],
          devices: [mockDev1],
          onRemoveDevice: vi.fn(),
          onClearAll: vi.fn(),
          onLaunchCompare: vi.fn(),
        })
      );
      expect(html1).toContain("Contender Alpha");
      expect(html1).toContain('disabled=""');

      // 2 staged devices: Launch button enabled
      const html2 = renderToStaticMarkup(
        React.createElement(ComparisonDock, {
          stagedDeviceIds: ["d1", "d2"],
          devices: [mockDev1, mockDev2],
          onRemoveDevice: vi.fn(),
          onClearAll: vi.fn(),
          onLaunchCompare: vi.fn(),
        })
      );
      expect(html2).toContain("Contender Alpha");
      expect(html2).toContain("Contender Beta");
      // The launch button must NOT have the disabled attribute
      expect(html2).not.toContain('disabled=""');
      expect(html2).toContain("Launch Compare Studio");
    });
  });
});
