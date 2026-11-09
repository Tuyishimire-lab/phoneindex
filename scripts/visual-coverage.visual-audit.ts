import { expect, test } from "vitest";
import { FULL_UNIFIED_CATALOG } from "@/lib/brands/catalog-loader";
import { auditVisualCoverage } from "@/lib/visual-profiles/resolver";

test("report visual-profile coverage", () => {
  const audit = auditVisualCoverage(FULL_UNIFIED_CATALOG);
  const report = [
    "",
    "PhoneIndex visual coverage",
    "----------------------------",
    `Catalog devices:     ${audit.totalDevices}`,
    `Explicit profiles:   ${audit.explicitProfiles} (${audit.coveragePct}%)`,
    `Verified assets:     ${audit.verifiedAssets}`,
    `Verified vectors:    ${audit.verifiedVectors}`,
    `Approximate:         ${audit.approximate}`,
    `Generic fallbacks:   ${audit.genericFallbacks}`,
    `Verified coverage:   ${audit.verifiedPct}%`,
    `Invalid profiles:    ${audit.invalidProfiles.length}`,
    "",
    `First missing IDs: ${audit.missingDeviceIds.slice(0, 12).join(", ")}`,
    "",
  ].join("\n");

  process.stdout.write(report);

  expect(audit.totalDevices).toBeGreaterThan(900);
  expect(audit.explicitProfiles).toBeGreaterThanOrEqual(4);
  expect(audit.invalidProfiles).toEqual([]);
});
