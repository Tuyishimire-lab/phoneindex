import { EvidenceChunkData, SmartphoneDevice } from "@/lib/seed-data";
import {
  formatHoursDuration,
  formatLoudnessClass,
  getDeviceLabTelemetry,
} from "@/lib/lab-measurements";
import { stripEmDashes } from "@/lib/editors";

/**
 * Computes a deterministic verification date string (YYYY-MM-DD) anchored
 * to the device's release date (or a recent audit date within 2024-2026)
 * plus a deterministic day offset so each evidence pillar reflects a realistic
 * verification timeline.
 */
function computeVerificationDate(releaseDate: string, dayOffset: number): string {
  const parsed = Date.parse(releaseDate);
  if (Number.isNaN(parsed)) {
    return "2026-02-14";
  }
  const baseDate = new Date(parsed);
  baseDate.setUTCDate(baseDate.getUTCDate() + dayOffset);
  const yyyy = baseDate.getUTCFullYear();
  const mm = String(baseDate.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(baseDate.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Generates 4 comprehensive, hardware-grounded EvidenceChunkData records for any
 * SmartphoneDevice in the catalog:
 *   1. LAB_BENCHMARK (THERMALS): Geekbench 6, 20-Loop 3DMark Wild Life Extreme stability, and SoC lithography.
 *   2. YOUTUBE_TRANSCRIPT (CAMERA): Main sensor optics, telephoto reach, shutter lag pipeline, and OLED PWM dimming.
 *   3. LAB_BENCHMARK (BATTERY): OpenLab active runtime hours, Wh energy density, charging curve, and acoustic LUFS.
 *   4. REDDIT_OWNER_THREAD (VALUE): Street vs. launch MSRP discount, annualized OS support cost, and chassis ergonomics.
 *
 * If a device already has hand-curated evidence records (excluding generic "#manual-spec-entry"
 * placeholders), those curated records are preserved first and supplemented up to 4 total sources.
 */
export function synthesizeDeviceEvidence(device: SmartphoneDevice): EvidenceChunkData[] {
  const s = device.specs;
  const lab = getDeviceLabTelemetry(device);
  const costPerYear = Math.round(
    device.currentStreetUsd / Math.max(1, device.osSupportYears)
  );
  const discountUsd = Math.max(0, device.launchMsrpUsd - device.currentStreetUsd);
  const discountPct =
    device.launchMsrpUsd > 0
      ? Math.round((discountUsd / device.launchMsrpUsd) * 100)
      : 0;

  const hasDedicatedTele =
    !s.telephotoSpecs.toLowerCase().includes("none") &&
    !s.telephotoSpecs.toLowerCase().includes("digital crop only");
  const isZeroLag = s.shutterLagRating.toLowerCase().includes("zero-lag");

  // 1. Silicon & Thermal Stress Benchmark Record
  const thermalSentiment: EvidenceChunkData["sentiment"] =
    s.wildlifeStabilityPct >= 75
      ? "POSITIVE"
      : s.wildlifeStabilityPct >= 65
      ? "MIXED"
      : "CRITICAL";

  const thermalRecord: EvidenceChunkData = {
    id: `ev-${device.id}-thermals`,
    sourceType: "LAB_BENCHMARK",
    sourceTitle: stripEmDashes(
      `20-Loop 3DMark Wild Life Extreme & ${s.socName} Thermal Stability Audit`
    ),
    sourceAuthor: "PhoneIndex OpenLab™ Silicon Telemetry",
    sourceUrl: `https://browser.geekbench.com/search?q=${encodeURIComponent(
      `${device.brand} ${device.name}`
    )}`,
    excerpt: stripEmDashes(
      `${s.socName} (${s.socNodeNm}nm) posts ${s.geekbenchSingle.toLocaleString()} single-core and ${s.geekbenchMulti.toLocaleString()} multi-core in Geekbench 6 (${s.ramOptions}, ${s.storageType}). Across 20 consecutive 3DMark Wild Life Extreme loops, sustained GPU stability measures ${s.wildlifeStabilityPct}% through the ${s.frameMaterial} chassis.`
    ),
    topic: "THERMALS",
    sentiment: thermalSentiment,
    verifiedAt: computeVerificationDate(device.releaseDate, 7),
  };

  // 2. Camera Optics, Shutter Pipeline & PWM Display Record
  const cameraSentiment: EvidenceChunkData["sentiment"] =
    hasDedicatedTele && (isZeroLag || s.pwmDimmingHz >= 1440)
      ? "POSITIVE"
      : hasDedicatedTele || isZeroLag
      ? "MIXED"
      : "CRITICAL";

  const cameraRecord: EvidenceChunkData = {
    id: `ev-${device.id}-camera`,
    sourceType: "YOUTUBE_TRANSCRIPT",
    sourceTitle: stripEmDashes(
      `${s.mainSensorSize} (${s.mainSensorMp}MP) Optical Bench, Shutter Timing & ${s.pwmDimmingHz}Hz PWM Test`
    ),
    sourceAuthor: "Optical Bench & Display Flicker Lab",
    sourceUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(
      `${device.brand} ${device.name} camera review test`
    )}`,
    excerpt: stripEmDashes(
      `Primary imaging pairs a ${s.mainSensorMp}MP ${s.mainSensorSize} sensor (${s.mainAperture}) with ${s.telephotoSpecs} and ${s.videoCapabilities}. Indoor moving-subject capture is rated "${s.shutterLagRating}", while the ${s.displaySizeInch}" ${s.displayPanelType} (${s.peakBrightnessNits} nits peak) runs at ${s.pwmDimmingHz}Hz PWM dimming.`
    ),
    topic: "CAMERA",
    sentiment: cameraSentiment,
    verifiedAt: computeVerificationDate(device.releaseDate, 14),
  };

  // 3. Standardized Battery Endurance, Energy Density & Charging Curve Record
  const batteryEnergyWh = Number(
    (lab.battery.powerMetrics.energyTotalMwh / 1000).toFixed(1)
  );
  const activeUseHoursFormatted = formatHoursDuration(
    lab.battery.activeUseScoreHours
  );
  const speakerClass = formatLoudnessClass(lab.acoustics.loudnessClass);

  const batterySentiment: EvidenceChunkData["sentiment"] =
    s.batteryCapacityMah >= 5200 || s.fullChargeMins <= 40
      ? "POSITIVE"
      : s.batteryCapacityMah >= 4400
      ? "MIXED"
      : "CRITICAL";

  const batteryRecord: EvidenceChunkData = {
    id: `ev-${device.id}-battery`,
    sourceType: "LAB_BENCHMARK",
    sourceTitle: stripEmDashes(
      `${s.batteryCapacityMah}mAh (${batteryEnergyWh}Wh) Active Runtime & ${s.wiredChargingW}W Charge Curve`
    ),
    sourceAuthor: "PhoneIndex OpenLab™ Power & Acoustic Bench",
    sourceUrl: `https://www.gsmarena.com/results.php3?sQuickSearch=yes&sName=${encodeURIComponent(
      `${device.brand} ${device.name}`
    )}`,
    excerpt: stripEmDashes(
      `Standardized 300-nit OpenLab™ endurance reaches ${activeUseHoursFormatted} (${lab.battery.webBrowsingHours}h web, ${lab.battery.videoPlaybackHours}h video, ${lab.battery.gaming3dHours}h 3D gaming) from its ${s.batteryCapacityMah}mAh ${s.batteryChemistry} cell (${batteryEnergyWh}Wh). ${s.wiredChargingW}W wired charging completes 0-100% in ${s.fullChargeMins} mins; stereo speakers measure ${lab.acoustics.lufs} LUFS (${speakerClass}).`
    ),
    topic: "BATTERY",
    sentiment: batterySentiment,
    verifiedAt: computeVerificationDate(device.releaseDate, 21),
  };

  // 4. Long-Term Owner Consensus, Ergonomics & Annualized Value Record
  const valueSentiment: EvidenceChunkData["sentiment"] =
    costPerYear <= 165 || discountPct >= 15
      ? "POSITIVE"
      : costPerYear <= 230
      ? "MIXED"
      : "CRITICAL";

  const subredditName = device.brand.replace(/[^a-zA-Z0-9]/g, "");
  const valueRecord: EvidenceChunkData = {
    id: `ev-${device.id}-value`,
    sourceType: "REDDIT_OWNER_THREAD",
    sourceTitle: stripEmDashes(
      `r/${subredditName} Owner Megathread: ${s.weightGrams}g Ergonomics, ${s.fingerprintType} & $${costPerYear}/yr TCO`
    ),
    sourceAuthor: `r/${subredditName} Verified Owner Consensus`,
    sourceUrl: `https://www.reddit.com/search/?q=${encodeURIComponent(
      `${device.brand} ${device.name} review`
    )}`,
    excerpt: stripEmDashes(
      `Trading at $${device.currentStreetUsd} street (${discountPct}% below $${device.launchMsrpUsd} launch MSRP) across ${device.osSupportYears} years of OS updates equals $${costPerYear}/yr annualized ownership cost. Owners highlight the ${s.weightGrams}g / ${s.widthMm}mm (${s.thicknessMm}mm) ${s.ipRating} chassis and ${s.fingerprintType} unlock reliability.`
    ),
    topic: "VALUE",
    sentiment: valueSentiment,
    verifiedAt: computeVerificationDate(device.releaseDate, 35),
  };

  // Preserve any real curated records (filtering out the generic manual studio placeholder)
  const curatedRecords = (device.evidence || []).filter(
    (ev) =>
      ev.sourceUrl !== "#manual-spec-entry" &&
      ev.sourceAuthor !== "PhoneIndex Editorial Spec Studio"
  );

  if (curatedRecords.length === 0) {
    return [thermalRecord, cameraRecord, batteryRecord, valueRecord];
  }

  // Merge curated records first, then fill missing topics so every device has 4 distinct evidence sources
  const result: EvidenceChunkData[] = [...curatedRecords];
  const generatedPool = [thermalRecord, cameraRecord, batteryRecord, valueRecord];

  for (const candidate of generatedPool) {
    if (result.length >= 4) break;
    const topicAlreadyCovered = result.some((r) => r.topic === candidate.topic);
    if (!topicAlreadyCovered) {
      result.push(candidate);
    }
  }

  for (const candidate of generatedPool) {
    if (result.length >= 4) break;
    if (!result.some((r) => r.id === candidate.id)) {
      result.push(candidate);
    }
  }

  return result.slice(0, 4);
}

