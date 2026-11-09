import { AI_EDITORS, EditorPersonaId, stripEmDashes } from "./editors";
import {
  DETERMINISTIC_INTELLIGENCE,
  IntelligenceMetadata,
} from "./intelligence";
import { SmartphoneDevice } from "./seed-data";

export interface SpecDiffRow {
  id: string;
  category:
    | "Silicon & Compute"
    | "Display & Eye Care"
    | "Camera Optics"
    | "Battery & Charging"
    | "Ergonomics & Build"
    | "Value & Longevity";
  label: string;
  valueA: string;
  valueB: string;
  values?: string[];
  isDifferent: boolean;
  isSignificant: boolean;
  winner: "A" | "B" | "TIE" | string;
  winnerIndex?: number;
  winningDeviceIds?: string[];
  editorId: EditorPersonaId;
  whyItMatters: string;
}

const CONTENDER_LETTERS = ["A", "B", "C", "D"] as const;

export function computeSmartSpecDiff(
  contendersOrDevA: SmartphoneDevice[] | SmartphoneDevice,
  devB?: SmartphoneDevice,
  ...remaining: SmartphoneDevice[]
): SpecDiffRow[] {
  const contenders: SmartphoneDevice[] = Array.isArray(contendersOrDevA)
    ? contendersOrDevA.slice(0, 4)
    : [contendersOrDevA, devB, ...remaining].filter(Boolean).slice(0, 4) as SmartphoneDevice[];

  if (contenders.length === 0) {
    return [];
  }

  const devA = contenders[0];
  const devBContender = contenders[1] ?? devA;

  // Helper to format letter winner
  const getWinnerLetter = (winnerIdx: number): string => {
    if (winnerIdx < 0 || winnerIdx >= contenders.length) return "TIE";
    return CONTENDER_LETTERS[winnerIdx] ?? "TIE";
  };

  // 1. SoC & Process Node
  const socValues = contenders.map((c) => `${c.specs.socName} (${c.specs.socNodeNm}nm)`);
  const geekbenchScores = contenders.map((c) => c.specs.geekbenchMulti);
  const maxGeekbench = Math.max(...geekbenchScores);
  const minGeekbench = Math.min(...geekbenchScores);
  const topGeekbenchIdx = geekbenchScores.indexOf(maxGeekbench);
  const secondGeekbench = Math.max(...geekbenchScores.filter((s) => s !== maxGeekbench), 0);
  const isSocTie = maxGeekbench - secondGeekbench < 300;
  const socWinnerIdx = isSocTie ? -1 : topGeekbenchIdx;
  const socDiffers = new Set(socValues).size > 1;
  const socSignificant = maxGeekbench - minGeekbench > 600;

  const socWhy =
    maxGeekbench - minGeekbench > 1500
      ? `Massive ${Math.abs(
          maxGeekbench - minGeekbench
        ).toLocaleString()}-pt multi-core compute gap impacts 3D gaming frame floors and 4K video export speeds.`
      : `All contenders run cutting-edge ${Math.min(
          ...contenders.map((c) => c.specs.socNodeNm)
        )}nm flagship silicon with negligible day-to-day UI latency difference.`;

  // 2. 3DMark Wild Life Stability & Storage
  const stabilityValues = contenders.map(
    (c) => `${c.specs.wildlifeStabilityPct}% Stability • ${c.specs.storageType}`
  );
  const stabilityPcts = contenders.map((c) => c.specs.wildlifeStabilityPct);
  const maxStability = Math.max(...stabilityPcts);
  const minStability = Math.min(...stabilityPcts);
  const topStabilityIdx = stabilityPcts.indexOf(maxStability);
  const nextStability = Math.max(...stabilityPcts.filter((p) => p !== maxStability), 0);
  const isStabilityTie = maxStability - nextStability <= 2;
  const stabilityWinnerIdx = isStabilityTie ? -1 : topStabilityIdx;
  const storageTypes = contenders.map((c) => c.specs.storageType);
  const hasMultipleStorage = new Set(storageTypes).size > 1;
  const stabilityDiffers = new Set(stabilityValues).size > 1;
  const stabilitySignificant = maxStability - minStability >= 5 || hasMultipleStorage;

  const stabilityWhy = hasMultipleStorage
    ? `Storage standard disparity (${Array.from(new Set(storageTypes)).join(
        " vs "
      )}) directly affects app installation speed and burst RAW photo buffer clearing.`
    : `Higher thermal stability means less frame throttling after 25 minutes of Genshin Impact or Wuthering Waves.`;

  // 3. PWM Flicker Dimming & Peak Brightness
  const pwmValues = contenders.map(
    (c) => `${c.specs.pwmDimmingHz}Hz PWM • ${c.specs.peakBrightnessNits} nits`
  );
  const pwmHzs = contenders.map((c) => c.specs.pwmDimmingHz);
  const maxPwm = Math.max(...pwmHzs);
  const minPwm = Math.min(...pwmHzs);
  const pwmWinnerIdx = (() => {
    const highestPwmDevices = contenders
      .map((c, i) => ({ c, i }))
      .filter(({ c }) => c.specs.pwmDimmingHz === maxPwm);
    if (highestPwmDevices.length === 1) return highestPwmDevices[0].i;
    // Tiebreaker: peak brightness
    highestPwmDevices.sort((a, b) => b.c.specs.peakBrightnessNits - a.c.specs.peakBrightnessNits);
    if (
      highestPwmDevices.length > 1 &&
      highestPwmDevices[0].c.specs.peakBrightnessNits ===
        highestPwmDevices[1].c.specs.peakBrightnessNits
    ) {
      return -1;
    }
    return highestPwmDevices[0].i;
  })();
  const pwmDiffers = new Set(pwmValues).size > 1;
  const pwmSignificant = maxPwm - minPwm >= 480;

  const pwmWhy =
    maxPwm >= 2160 && minPwm <= 480
      ? `2160Hz PWM eliminates invisible low-brightness OLED strobe flicker that causes headaches on 240Hz/480Hz panels.`
      : `Displays offer comparable PWM modulation frequencies for comfortable night reading.`;

  // 4. Main Sensor Size & Aperture
  const cameraScores = contenders.map((c) => c.verdicts.CAMERA_PURIST.score);
  const maxCameraScore = Math.max(...cameraScores);
  const cameraWinnerIdx = (() => {
    const topCam = contenders
      .map((c, i) => ({ c, i }))
      .filter(({ c }) => c.verdicts.CAMERA_PURIST.score === maxCameraScore);
    return topCam.length === 1 ? topCam[0].i : -1;
  })();
  const mainCamValues = contenders.map(
    (c) => `${c.specs.mainSensorSize} (${c.specs.mainSensorMp}MP, ${c.specs.mainAperture})`
  );
  const mainCamDiffers = new Set(mainCamValues).size > 1;

  // 5. Periscope Telephoto & Shutter Lag
  const telephotoValues = contenders.map(
    (c) => `${c.specs.telephotoSpecs} • ${c.specs.shutterLagRating.split("(")[0].trim()}`
  );
  const teleWinnerIdx = (() => {
    // 1/1.4" sensors get immediate priority
    const hasLargePeriscope = contenders.map((c) => c.specs.telephotoSpecs.includes("1/1.4"));
    const largeIdx = hasLargePeriscope.indexOf(true);
    if (largeIdx !== -1 && hasLargePeriscope.filter(Boolean).length === 1) {
      return largeIdx;
    }
    return cameraWinnerIdx >= 0 ? cameraWinnerIdx : 0;
  })();
  const teleDiffers = new Set(telephotoValues).size > 1;

  // 6. Battery Chemistry & 0 to 100% Charge Time
  const batteryValues = contenders.map(
    (c) =>
      `${c.specs.batteryCapacityMah}mAh (${c.specs.batteryChemistry
        .split("(")[0]
        .trim()}) • ${c.specs.wiredChargingW}W (${c.specs.fullChargeMins}m)`
  );
  const batteryCapacities = contenders.map((c) => c.specs.batteryCapacityMah);
  const chargeTimes = contenders.map((c) => c.specs.fullChargeMins);
  const maxCap = Math.max(...batteryCapacities);
  const minCap = Math.min(...batteryCapacities);
  const maxMins = Math.max(...chargeTimes);
  const minMins = Math.min(...chargeTimes);
  const batteryFormulaScores = contenders.map(
    (c) => c.specs.batteryCapacityMah - c.specs.fullChargeMins * 25
  );
  const maxBatteryFormula = Math.max(...batteryFormulaScores);
  const batteryWinnerIdx = batteryFormulaScores.indexOf(maxBatteryFormula);
  const batteryDiffers = new Set(batteryValues).size > 1;
  const batterySignificant = maxCap - minCap >= 500 || maxMins - minMins >= 15;

  const batteryWhy = `High-density Silicon-Carbon anodes pack more energy into chassis thickness and finish charging ${
    maxMins - minMins > 0 ? `${maxMins - minMins} minutes faster` : "at top speeds"
  }.`;

  // 7. Weight, Width & Biometrics
  const ergonomicsScores = contenders.map((c) => c.verdicts.DAILY_DRIVER.score);
  const maxErgoScore = Math.max(...ergonomicsScores);
  const ergoWinnerIdx = (() => {
    const topErgo = contenders
      .map((c, i) => ({ c, i }))
      .filter(({ c }) => c.verdicts.DAILY_DRIVER.score === maxErgoScore);
    return topErgo.length === 1 ? topErgo[0].i : -1;
  })();
  const ergoValues = contenders.map(
    (c) => `${c.specs.weightGrams}g • ${c.specs.widthMm}mm wide • ${c.specs.fingerprintType}`
  );
  const weights = contenders.map((c) => c.specs.weightGrams);
  const maxWeight = Math.max(...weights);
  const minWeight = Math.min(...weights);
  const ergoDiffers = new Set(ergoValues).size > 1;
  const ergoSignificant = maxWeight - minWeight >= 7 || new Set(contenders.map((c) => c.specs.fingerprintType)).size > 1;

  // 8. Street Price & Annualized OS Cost
  const annualizedCosts = contenders.map((c) =>
    Math.round(c.currentStreetUsd / c.osSupportYears)
  );
  const minAnnualizedCost = Math.min(...annualizedCosts);
  const valueWinnerIdx = (() => {
    const topVal = contenders
      .map((c, i) => ({ c, i, cost: annualizedCosts[i] }))
      .filter(({ cost }) => cost === minAnnualizedCost);
    return topVal.length === 1 ? topVal[0].i : -1;
  })();
  const valueValues = contenders.map(
    (c, i) => `$${c.currentStreetUsd} (${c.osSupportYears} yrs OS = $${annualizedCosts[i]}/yr)`
  );
  const prices = contenders.map((c) => c.currentStreetUsd);
  const maxPrice = Math.max(...prices);
  const minPrice = Math.min(...prices);
  const valueDiffers = new Set(valueValues).size > 1;
  const valueSignificant = maxPrice - minPrice >= 50;

  const valueWhy = `Saves $${maxPrice - minPrice} upfront between highest and lowest contender, anchoring annualized OS ownership at $${minAnnualizedCost}/yr.`;

  return [
    {
      id: "soc",
      category: "Silicon & Compute",
      label: "SoC & Process Node",
      valueA: socValues[0] ?? `${devA.specs.socName} (${devA.specs.socNodeNm}nm)`,
      valueB: socValues[1] ?? `${devBContender.specs.socName} (${devBContender.specs.socNodeNm}nm)`,
      values: socValues,
      isDifferent: socDiffers,
      isSignificant: socSignificant,
      winner: getWinnerLetter(socWinnerIdx),
      winnerIndex: socWinnerIdx,
      editorId: "SILICON_GEEK",
      whyItMatters: socWhy,
    },
    {
      id: "stability",
      category: "Silicon & Compute",
      label: "3DMark Wild Life Stability & Storage",
      valueA: stabilityValues[0] ?? "",
      valueB: stabilityValues[1] ?? "",
      values: stabilityValues,
      isDifferent: stabilityDiffers,
      isSignificant: stabilitySignificant,
      winner: getWinnerLetter(stabilityWinnerIdx),
      winnerIndex: stabilityWinnerIdx,
      editorId: "SILICON_GEEK",
      whyItMatters: stabilityWhy,
    },
    {
      id: "pwm",
      category: "Display & Eye Care",
      label: "PWM Flicker Dimming & Peak Brightness",
      valueA: pwmValues[0] ?? "",
      valueB: pwmValues[1] ?? "",
      values: pwmValues,
      isDifferent: pwmDiffers,
      isSignificant: pwmSignificant,
      winner: getWinnerLetter(pwmWinnerIdx),
      winnerIndex: pwmWinnerIdx,
      editorId: "SILICON_GEEK",
      whyItMatters: pwmWhy,
    },
    {
      id: "main-camera",
      category: "Camera Optics",
      label: "Main Sensor Size & Aperture",
      valueA: mainCamValues[0] ?? "",
      valueB: mainCamValues[1] ?? "",
      values: mainCamValues,
      isDifferent: mainCamDiffers,
      isSignificant: true,
      winner: getWinnerLetter(cameraWinnerIdx),
      winnerIndex: cameraWinnerIdx,
      editorId: "CAMERA_PURIST",
      whyItMatters:
        "Physical sensor surface area dictates natural optical depth-of-field and low-light photon capture far more than megapixel count.",
    },
    {
      id: "telephoto",
      category: "Camera Optics",
      label: "Periscope Telephoto & Shutter Lag",
      valueA: telephotoValues[0] ?? "",
      valueB: telephotoValues[1] ?? "",
      values: telephotoValues,
      isDifferent: teleDiffers,
      isSignificant: true,
      winner: getWinnerLetter(teleWinnerIdx),
      winnerIndex: teleWinnerIdx,
      editorId: "CAMERA_PURIST",
      whyItMatters:
        'Larger periscope sensors (like 1/1.4" or 1/1.95") keep 3x to 10x portraits and concert zoom sharp indoors without switching to a blurry digital crop.',
    },
    {
      id: "battery",
      category: "Battery & Charging",
      label: "Battery Chemistry & 0 to 100% Charge Time",
      valueA: batteryValues[0] ?? "",
      valueB: batteryValues[1] ?? "",
      values: batteryValues,
      isDifferent: batteryDiffers,
      isSignificant: batterySignificant,
      winner: getWinnerLetter(batteryWinnerIdx),
      winnerIndex: batteryWinnerIdx,
      editorId: "SILICON_GEEK",
      whyItMatters: batteryWhy,
    },
    {
      id: "ergonomics",
      category: "Ergonomics & Build",
      label: "Weight, Width & Biometrics",
      valueA: ergoValues[0] ?? "",
      valueB: ergoValues[1] ?? "",
      values: ergoValues,
      isDifferent: ergoDiffers,
      isSignificant: ergoSignificant,
      winner: getWinnerLetter(ergoWinnerIdx),
      winnerIndex: ergoWinnerIdx,
      editorId: "DAILY_DRIVER",
      whyItMatters:
        "Every 10g above 215g and every millimeter past 76mm width compounds pinky fatigue; 3D Ultrasonic sensors also unlock through wet thumbs and dark rooms.",
    },
    {
      id: "value",
      category: "Value & Longevity",
      label: "Street Price & Annualized OS Cost",
      valueA: valueValues[0] ?? "",
      valueB: valueValues[1] ?? "",
      values: valueValues,
      isDifferent: valueDiffers,
      isSignificant: valueSignificant,
      winner: getWinnerLetter(valueWinnerIdx),
      winnerIndex: valueWinnerIdx,
      editorId: "PRAGMATIST",
      whyItMatters: valueWhy,
    },
  ];
}

export interface DebateTurn {
  editorId: EditorPersonaId;
  editorName: string;
  roleTitle: string;
  stanceBadge: string;
  pickedWinnerName: string;
  message: string;
  citedMetric: string;
}

export interface DebateResponse {
  intelligence: IntelligenceMetadata;
  scenarioTitle: string;
  turns: DebateTurn[];
  consensusWinnerId: string;
  consensusWinnerName: string;
  consensusSummary: string;
  confidencePct: number;
}

export interface GroundedDebateParams {
  query: string;
  deviceA?: SmartphoneDevice;
  deviceB?: SmartphoneDevice;
  devices?: SmartphoneDevice[];
}

function formatFullDeviceName(device: SmartphoneDevice): string {
  return device.name.toLowerCase().startsWith(device.brand.toLowerCase())
    ? device.name
    : `${device.brand} ${device.name}`;
}

export function generateGroundedDebate(
  params: GroundedDebateParams
): DebateResponse {
  const { query, deviceA, deviceB, devices } = params;
  const contenders: SmartphoneDevice[] = (
    devices && devices.length >= 2
      ? devices
      : [deviceA, deviceB].filter(Boolean) as SmartphoneDevice[]
  ).slice(0, 4);

  if (contenders.length === 0) {
    throw new Error("generateGroundedDebate requires at least one device");
  }

  const cleanQuery = stripEmDashes(query);
  const q = cleanQuery.toLowerCase();

  const isCameraHeavy =
    q.includes("camera") ||
    q.includes("photo") ||
    q.includes("kid") ||
    q.includes("toddler") ||
    q.includes("concert") ||
    q.includes("video") ||
    q.includes("zoom") ||
    q.includes("portrait");
  const isGamingBatteryHeavy =
    q.includes("game") ||
    q.includes("genshin") ||
    q.includes("battery") ||
    q.includes("thermal") ||
    q.includes("charge") ||
    q.includes("pwm") ||
    q.includes("eye");
  const isBudgetValueHeavy =
    q.includes("value") ||
    q.includes("budget") ||
    q.includes("price") ||
    q.includes("year") ||
    q.includes("worth") ||
    q.includes("cheap");

  // Multi-contender evaluation per persona
  // 1. Silicon Geek
  const sortedSilicon = [...contenders].sort(
    (a, b) => b.verdicts.SILICON_GEEK.score - a.verdicts.SILICON_GEEK.score
  );
  const siliconWinner = sortedSilicon[0];
  const siliconRunnersUp = sortedSilicon.slice(1);

  // 2. Camera Purist
  const sortedCamera = [...contenders].sort(
    (a, b) => b.verdicts.CAMERA_PURIST.score - a.verdicts.CAMERA_PURIST.score
  );
  const cameraWinner = sortedCamera[0];
  const cameraRunnersUp = sortedCamera.slice(1);

  // 3. Pragmatist (lowest annualized street cost)
  const sortedPragmatist = [...contenders].sort((a, b) => {
    const costA = a.currentStreetUsd / a.osSupportYears;
    const costB = b.currentStreetUsd / b.osSupportYears;
    return costA - costB;
  });
  const pragmatistWinner = sortedPragmatist[0];
  const pragmatistRunnersUp = sortedPragmatist.slice(1);

  // 4. Daily Driver
  const sortedDaily = [...contenders].sort(
    (a, b) => b.verdicts.DAILY_DRIVER.score - a.verdicts.DAILY_DRIVER.score
  );
  const dailyWinner = sortedDaily[0];
  const dailyRunnersUp = sortedDaily.slice(1);

  // Build persona messages with adaptive 2-device vs 3-to-4 contender awareness
  const isPairwise = contenders.length === 2;

  const siliconMessage = isPairwise
    ? `Looking strictly at silicon and battery physics for "${cleanQuery}": ${siliconWinner.name} pairs ${siliconWinner.specs.socName} (${siliconWinner.specs.wildlifeStabilityPct}% 3DMark stability) with a ${siliconWinner.specs.batteryCapacityMah}mAh ${siliconWinner.specs.batteryChemistry
        .split("(")[0]
        .trim()} cell (${siliconWinner.specs.fullChargeMins}m full charge) and ${siliconWinner.specs.pwmDimmingHz}Hz PWM dimming. Meanwhile, ${siliconRunnersUp[0].name} sits at ${siliconRunnersUp[0].specs.batteryCapacityMah}mAh (${siliconRunnersUp[0].specs.fullChargeMins}m charge) and ${siliconRunnersUp[0].specs.pwmDimmingHz}Hz PWM.`
    : `Looking strictly at silicon and battery physics for "${cleanQuery}": ${siliconWinner.name} leads the ${contenders.length}-device lineup with ${siliconWinner.specs.socName} (${siliconWinner.specs.wildlifeStabilityPct}% 3DMark stability), a ${siliconWinner.specs.batteryCapacityMah}mAh cell (${siliconWinner.specs.fullChargeMins}m full charge), and ${siliconWinner.specs.pwmDimmingHz}Hz PWM dimming. It outperforms contenders ${siliconRunnersUp.map((c) => `${c.name} (${c.specs.socName}, ${c.specs.batteryCapacityMah}mAh)`).join(", ")}.`;

  const cameraMessage = isPairwise
    ? `Hold on, Alex, benchmarks do not capture optical glass. For "${cleanQuery}", ${cameraWinner.name} wins on optics with its ${cameraWinner.specs.mainSensorSize} main sensor and ${cameraWinner.specs.telephotoSpecs}. Its shutter response is rated "${cameraWinner.specs.shutterLagRating}", whereas ${cameraRunnersUp[0].name} has ${cameraRunnersUp[0].verdicts.CAMERA_PURIST.cons[0].toLowerCase()}.`
    : `Hold on, Alex, benchmarks do not capture optical glass. For "${cleanQuery}", ${cameraWinner.name} dominates optical performance with its ${cameraWinner.specs.mainSensorSize} main sensor and ${cameraWinner.specs.telephotoSpecs} (shutter rating: "${cameraWinner.specs.shutterLagRating}"). Across the other contenders, ${cameraRunnersUp.map((c) => `${c.name} faces ${c.verdicts.CAMERA_PURIST.cons[0].toLowerCase()}`).join("; ")}.`;

  const pragmatistMessage = isPairwise
    ? `Let's talk real street dollars. ${pragmatistWinner.name} is trading at $${pragmatistWinner.currentStreetUsd} ($${
        pragmatistWinner.launchMsrpUsd - pragmatistWinner.currentStreetUsd
      } off MSRP) with ${pragmatistWinner.osSupportYears} years of OS updates, which comes out to $${Math.round(
        pragmatistWinner.currentStreetUsd / pragmatistWinner.osSupportYears
      )}/year. Paying $${pragmatistRunnersUp[0].currentStreetUsd} for ${pragmatistRunnersUp[0].name} ($${Math.round(
        pragmatistRunnersUp[0].currentStreetUsd / pragmatistRunnersUp[0].osSupportYears
      )}/yr) only makes sense if its specific camera or ecosystem perk is non-negotiable for you.`
    : `Let's talk real street dollars across all ${contenders.length} contenders. ${pragmatistWinner.name} leads on total value at $${pragmatistWinner.currentStreetUsd} ($${
        pragmatistWinner.launchMsrpUsd - pragmatistWinner.currentStreetUsd
      } off MSRP), costing just $${Math.round(
        pragmatistWinner.currentStreetUsd / pragmatistWinner.osSupportYears
      )}/year over ${pragmatistWinner.osSupportYears} OS years. In comparison, ${pragmatistRunnersUp.map((c) => `${c.name} trades at $${c.currentStreetUsd} ($${Math.round(c.currentStreetUsd / c.osSupportYears)}/yr)`).join(", ")}.`;

  const dailyMessage = isPairwise
    ? `In your pocket every day, ${dailyWinner.name} (${dailyWinner.specs.weightGrams}g, ${dailyWinner.specs.widthMm}mm wide, ${dailyWinner.specs.fingerprintType}) wins because ${dailyWinner.verdicts.DAILY_DRIVER.pros[0].toLowerCase()}. On Reddit owner threads, watch out for ${dailyRunnersUp[0].name}'s main quirk: ${dailyRunnersUp[0].verdicts.DAILY_DRIVER.cons[0].toLowerCase()}.`
    : `In your pocket every day, ${dailyWinner.name} (${dailyWinner.specs.weightGrams}g, ${dailyWinner.specs.widthMm}mm wide, ${dailyWinner.specs.fingerprintType}) wins because ${dailyWinner.verdicts.DAILY_DRIVER.pros[0].toLowerCase()}. Watch out for the other contenders' main trade-offs: ${dailyRunnersUp.map((c) => `${c.name}: ${c.verdicts.DAILY_DRIVER.cons[0].toLowerCase()}`).join("; ")}.`;

  const turns: DebateTurn[] = [
    {
      editorId: "SILICON_GEEK",
      editorName: AI_EDITORS.SILICON_GEEK.name,
      roleTitle: AI_EDITORS.SILICON_GEEK.roleTitle,
      stanceBadge: `Backs ${siliconWinner.name} (${siliconWinner.verdicts.SILICON_GEEK.score}/10)`,
      pickedWinnerName: siliconWinner.name,
      message: stripEmDashes(siliconMessage),
      citedMetric: `${siliconWinner.specs.geekbenchMulti.toLocaleString()} Geekbench Multi • ${siliconWinner.specs.pwmDimmingHz}Hz PWM • ${siliconWinner.specs.fullChargeMins}m 0-100%`,
    },
    {
      editorId: "CAMERA_PURIST",
      editorName: AI_EDITORS.CAMERA_PURIST.name,
      roleTitle: AI_EDITORS.CAMERA_PURIST.roleTitle,
      stanceBadge: `Backs ${cameraWinner.name} (${cameraWinner.verdicts.CAMERA_PURIST.score}/10)`,
      pickedWinnerName: cameraWinner.name,
      message: stripEmDashes(cameraMessage),
      citedMetric: `Main: ${cameraWinner.specs.mainSensorSize} • Tele: ${cameraWinner.specs.telephotoSpecs
        .split("(")[0]
        .trim()}`,
    },
    {
      editorId: "PRAGMATIST",
      editorName: AI_EDITORS.PRAGMATIST.name,
      roleTitle: AI_EDITORS.PRAGMATIST.roleTitle,
      stanceBadge: `Backs ${pragmatistWinner.name} ($${Math.round(
        pragmatistWinner.currentStreetUsd / pragmatistWinner.osSupportYears
      )}/yr)`,
      pickedWinnerName: pragmatistWinner.name,
      message: stripEmDashes(pragmatistMessage),
      citedMetric: `$${pragmatistWinner.currentStreetUsd} Street Price • $${Math.round(
        pragmatistWinner.currentStreetUsd / pragmatistWinner.osSupportYears
      )}/yr OS Longevity Cost`,
    },
    {
      editorId: "DAILY_DRIVER",
      editorName: AI_EDITORS.DAILY_DRIVER.name,
      roleTitle: AI_EDITORS.DAILY_DRIVER.roleTitle,
      stanceBadge: `Backs ${dailyWinner.name} (${dailyWinner.verdicts.DAILY_DRIVER.score}/10)`,
      pickedWinnerName: dailyWinner.name,
      message: stripEmDashes(dailyMessage),
      citedMetric: `${dailyWinner.specs.weightGrams}g Weight • ${dailyWinner.specs.widthMm}mm Width • ${dailyWinner.specs.fingerprintType}`,
    },
  ];

  // Overall Consensus Scoring across all contenders
  const scoredContenders = contenders.map((dev) => {
    let score = dev.compositeLivingScore;
    if (isCameraHeavy) {
      score += dev.verdicts.CAMERA_PURIST.score * 0.6;
    }
    if (isGamingBatteryHeavy) {
      score += dev.verdicts.SILICON_GEEK.score * 0.6;
    }
    if (isBudgetValueHeavy) {
      score += dev.verdicts.PRAGMATIST.score * 0.6;
    }
    return { dev, score };
  });

  scoredContenders.sort((a, b) => b.score - a.score);

  const consensusWinner = scoredContenders[0].dev;
  const consensusRunnerUp = scoredContenders[1]?.dev ?? consensusWinner;
  const otherContenders = scoredContenders.slice(1).map((s) => s.dev);

  const summary = isPairwise
    ? `For "${cleanQuery}", the Editorial Panel awards a ${
        Math.abs(scoredContenders[0].score - scoredContenders[1].score) > 0.4
          ? "decisive 3-1"
          : "narrow 2-2 tiebreaker"
      } verdict to the ${formatFullDeviceName(consensusWinner)} ($${
        consensusWinner.currentStreetUsd
      } street price, ${
        consensusWinner.compositeLivingScore
      } Living Score). Choose the ${consensusRunnerUp.name} ($${
        consensusRunnerUp.currentStreetUsd
      }) only if you specifically prioritize ${consensusRunnerUp.verdicts.CAMERA_PURIST.pros[0].toLowerCase()}.`
    : `For "${cleanQuery}", the Editorial Panel awards the consensus verdict to the ${formatFullDeviceName(
        consensusWinner
      )} ($${consensusWinner.currentStreetUsd} street price, ${
        consensusWinner.compositeLivingScore
      } Living Score) against ${otherContenders.length} contenders. Runner-up ${
        consensusRunnerUp.name
      } ($${consensusRunnerUp.currentStreetUsd}) remains the top alternative if you prioritize ${consensusRunnerUp.verdicts.CAMERA_PURIST.pros[0].toLowerCase()}${
        otherContenders.length > 1
          ? `, while ${otherContenders[1].name} excels in ${otherContenders[1].verdicts.DAILY_DRIVER.pros[0].toLowerCase()}`
          : ""
      }.`;

  return {
    intelligence: DETERMINISTIC_INTELLIGENCE,
    scenarioTitle: cleanQuery,
    turns,
    consensusWinnerId: consensusWinner.id,
    consensusWinnerName: consensusWinner.name,
    consensusSummary: stripEmDashes(summary),
    confidencePct: 95,
  };
}
