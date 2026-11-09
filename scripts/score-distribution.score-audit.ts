import { expect, test } from "vitest";
import { FULL_UNIFIED_CATALOG } from "@/lib/brands/catalog-loader";

test("report Living Score distribution", () => {
  const scores = FULL_UNIFIED_CATALOG.map((device) => device.compositeLivingScore).sort(
    (a, b) => a - b
  );
  const percentile = (value: number) =>
    scores[Math.min(scores.length - 1, Math.floor(scores.length * value))];
  const ninePlus = scores.filter((score) => score >= 9).length;
  const uniqueScores = new Set(scores).size;
  const recommendations = FULL_UNIFIED_CATALOG.reduce<Record<string, number>>(
    (counts, device) => {
      counts[device.buyRecommendation] =
        (counts[device.buyRecommendation] || 0) + 1;
      return counts;
    },
    {}
  );

  process.stdout.write(
    [
      "",
      "PhoneIndex Living Score distribution",
      "------------------------------------",
      `Devices:          ${scores.length}`,
      `Minimum:          ${scores[0].toFixed(1)}`,
      `Median:           ${percentile(0.5).toFixed(1)}`,
      `90th percentile:  ${percentile(0.9).toFixed(1)}`,
      `Maximum:          ${scores[scores.length - 1].toFixed(1)}`,
      `Scores >= 9.0:    ${ninePlus} (${((ninePlus / scores.length) * 100).toFixed(1)}%)`,
      `Distinct scores:  ${uniqueScores}`,
      `Recommendations:  ${JSON.stringify(recommendations)}`,
      "",
    ].join("\n")
  );

  expect(scores.length).toBeGreaterThan(900);
  expect(uniqueScores).toBeGreaterThan(20);
  expect(ninePlus / scores.length).toBeLessThan(0.25);
  expect(scores[0]).toBeLessThan(6.5);
  expect(scores[scores.length - 1]).toBeLessThanOrEqual(9.3);
});
