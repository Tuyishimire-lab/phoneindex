import type { ManualDeviceFormInput } from "./spec-synthesizer";

export const SCORE_MODEL_VERSION = "living-score-v2";

function clamp(value: number, min = 3, max = 9.8): number {
  return Math.round(Math.min(max, Math.max(min, value)) * 10) / 10;
}

function normalize(value: number, low: number, high: number): number {
  return Math.min(1, Math.max(0, (value - low) / (high - low)));
}

function pwmScore(hz: number): number {
  if (hz >= 3840) return 9.8;
  if (hz >= 2160) return 9.2;
  if (hz >= 1920) return 8.7;
  if (hz >= 960) return 7.4;
  if (hz >= 480) return 5.8;
  if (hz >= 240) return 4.2;
  return 3.2;
}

function sensorScore(sensor: string): number {
  const value = sensor.toLowerCase();
  if (value.includes("1.0") || value.includes("1-inch")) return 9.8;
  if (value.includes("1/1.1")) return 9.4;
  if (value.includes("1/1.2") || value.includes("1/1.28")) return 9.0;
  if (value.includes("1/1.3")) return 8.5;
  if (value.includes("1/1.4")) return 7.8;
  if (value.includes("1/1.5")) return 7.0;
  if (value.includes("1/1.7")) return 6.0;
  if (value.includes("1/2")) return 4.5;
  return 3.8;
}

function telephotoScore(spec: string): number {
  const value = spec.toLowerCase().trim();
  if (!value || value === "—" || value === "-" || value.includes("none") || value.includes("no tele") || value.includes("n/a")) return 2.5;
  if (value.includes("200mp") && value.includes("periscope")) return 9.6;
  if (value.includes("periscope")) return 8.8;
  if (/\b(5x|4x)\b/.test(value)) return 8.0;
  if (/\b(3x|3.2x|3.5x)\b/.test(value)) return 7.5;
  if (/\b(2x)\b/.test(value)) return 6.0;
  return 4.5;
}

function shutterScore(rating: string): number {
  const value = rating.toLowerCase();
  if (value.includes("zero-lag")) return 9.5;
  if (value.includes("fast")) return 8.2;
  if (value.includes("moderate")) return 5.8;
  if (value.includes("slow")) return 3.5;
  return 5.0;
}

function videoScore(capabilities: string): number {
  const value = capabilities.toLowerCase();
  let score = 4.5;
  if (value.includes("4k30")) score += 1.0;
  if (value.includes("4k60")) score += 1.5;
  if (value.includes("4k120")) score += 1.2;
  if (value.includes("8k")) score += 0.8;
  if (value.includes("log")) score += 1.0;
  if (value.includes("dolby vision")) score += 0.8;
  return clamp(score);
}

export interface ManualDeviceScoreBreakdown {
  siliconScore: number;
  cameraScore: number;
  pragmatistScore: number;
  dailyDriverScore: number;
  costPerYear: number;
  discountPct: number;
}

export function scoreManualDevice(
  input: ManualDeviceFormInput
): ManualDeviceScoreBreakdown {
  const performance = 2.5 + normalize(input.geekbenchMulti, 1800, 10500) * 7.3;
  const stability = 3.0 + normalize(input.wildlifeStabilityPct, 45, 90) * 6.5;
  const battery = 3.0 + normalize(input.batteryCapacityMah, 3200, 6500) * 6.5;
  const charging = 2.5 + normalize(input.wiredChargingW, 10, 100) * 7.0;
  const siliconScore = clamp(
    performance * 0.35 +
      stability * 0.2 +
      battery * 0.15 +
      charging * 0.15 +
      pwmScore(input.pwmDimmingHz) * 0.15
  );

  const cameraScore = clamp(
    sensorScore(input.mainSensorSize) * 0.4 +
      telephotoScore(input.telephotoSpecs) * 0.25 +
      shutterScore(input.shutterLagRating) * 0.2 +
      videoScore(input.videoCapabilities) * 0.15
  );

  const costPerYear = Math.round(
    input.currentStreetUsd / Math.max(1, input.osSupportYears)
  );
  const discountPct =
    ((input.launchMsrpUsd - input.currentStreetUsd) /
      Math.max(1, input.launchMsrpUsd)) *
    100;
  const costScore = 9.8 - normalize(costPerYear, 40, 360) * 6.8;
  const osBonus = Math.max(-0.6, Math.min(0.8, (input.osSupportYears - 4) * 0.2));
  const discountBonus = Math.min(1.0, Math.max(0, discountPct) * 0.025);
  const pragmatistScore = clamp(costScore + discountBonus + osBonus);

  const weightScore = 9.8 - normalize(input.weightGrams, 140, 240) * 5.8;
  const widthScore = 9.8 - normalize(input.widthMm, 68, 78) * 5.8;
  const biometric = input.fingerprintType.toLowerCase().includes("ultrasonic")
    ? 9.5
    : input.fingerprintType.toLowerCase().includes("face id")
    ? 9.3
    : input.fingerprintType.toLowerCase().includes("capacitive")
    ? 7.2
    : 5.5;
  const durability = input.ipRating.toLowerCase().includes("ip69")
    ? 9.8
    : input.ipRating.toLowerCase().includes("ip68")
    ? 8.8
    : input.ipRating.toLowerCase().includes("ip67")
    ? 7.2
    : input.ipRating.toLowerCase().includes("ip65") || input.ipRating.toLowerCase().includes("ip54")
    ? 5.8
    : 4.5;
  const dailyDriverScore = clamp(
    weightScore * 0.3 + widthScore * 0.3 + biometric * 0.2 + durability * 0.2
  );

  return {
    siliconScore,
    cameraScore,
    pragmatistScore,
    dailyDriverScore,
    costPerYear,
    discountPct,
  };
}
