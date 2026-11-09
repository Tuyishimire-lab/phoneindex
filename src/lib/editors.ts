export type EditorPersonaId =
  | "SILICON_GEEK"
  | "CAMERA_PURIST"
  | "PRAGMATIST"
  | "DAILY_DRIVER";

export type BuyRecommendation =
  | "STRONG_BUY"
  | "BUY_ON_SALE"
  | "WAIT_FOR_DROP"
  | "SKIP";

export interface EditorPersona {
  id: EditorPersonaId;
  name: string;
  handle: string;
  roleTitle: string;
  tagline: string;
  accentColor: string;
  badgeBg: string;
  borderAccent: string;
  textAccent: string;
  weightInComposite: number;
  trackedSignals: string[];
  systemPrompt: string;
}

export const DEFAULT_PERSONA_WEIGHTS: Record<EditorPersonaId, number> = {
  SILICON_GEEK: 0.25,
  CAMERA_PURIST: 0.25,
  PRAGMATIST: 0.25,
  DAILY_DRIVER: 0.25,
};

export const NO_EM_DASH_RULE =
  "STRICT FORMATTING RULE: Never use em-dashes (\u2014) anywhere in your generated text. Use commas, colons, parentheses, or separate sentences instead.";

/**
 * Post-processing guardrail that guarantees no em-dashes appear in any AI Editor output.
 */
export function stripEmDashes(text: string): string {
  return text.replace(/\s*(?:\u2014|--)\s*/g, ", ");
}

export const AI_EDITORS: Record<EditorPersonaId, EditorPersona> = {
  SILICON_GEEK: {
    id: "SILICON_GEEK",
    name: "Alex Rivera",
    handle: "@alex_performance",
    roleTitle: "Performance & Battery",
    tagline: "Sustained gaming speed, thermal stability, battery endurance & fast charging.",
    accentColor: "#0284c7", // sky-600
    badgeBg: "bg-sky-50 text-sky-700 border-sky-200",
    borderAccent: "border-sky-200/90",
    textAccent: "text-sky-700",
    weightInComposite: 0.25,
    trackedSignals: [
      "3DMark Wild Life Extreme Stability %",
      "TSMC Process Node & CPU Prime Clocks",
      "PWM Dimming Hz (Eye-Strain Threshold)",
      "Battery Wh Density & 10-80% Charge Curve",
    ],
    systemPrompt: `You are Alex Rivera, Performance & Battery Lead. You focus on empirical hardware performance: TSMC 3nm nodes, vapor chamber thermal dissipation, sustained 3DMark stability, UFS 4.0 sequential speeds, Silicon-Carbon anode battery density, and high-frequency PWM dimming (2160Hz+). Call out thermal throttling and slow charging clearly. ${NO_EM_DASH_RULE}`,
  },
  CAMERA_PURIST: {
    id: "CAMERA_PURIST",
    name: "Elena Vance",
    handle: "@elena_camera",
    roleTitle: "Camera & Display",
    tagline: "Photo & video clarity, zoom optics, indoor shutter speed & eye-care display.",
    accentColor: "#db2777", // pink-600
    badgeBg: "bg-pink-50 text-pink-700 border-pink-200",
    borderAccent: "border-pink-200/90",
    textAccent: "text-pink-700",
    weightInComposite: 0.25,
    trackedSignals: [
      "Main & Periscope Physical Sensor Size",
      "Indoor Motion Shutter Lag (ms)",
      "Tele-Macro Minimum Focus Distance",
      "10-bit Log / Dolby Vision Dynamic Range",
    ],
    systemPrompt: `You are Elena Vance, Camera & Display Lead. You dislike oversharpened computational artifacts and tiny sensors masked by high megapixel counts. You judge cameras by physical sensor area (1-inch vs 1/1.3"), periscope telephoto aperture, shutter lag on moving pets/toddlers indoors, natural skin tones, and 4K60 Log video consistency across lenses. ${NO_EM_DASH_RULE}`,
  },
  PRAGMATIST: {
    id: "PRAGMATIST",
    name: "Marcus Sterling",
    handle: "@marcus_value",
    roleTitle: "Value & Price Advisor",
    tagline: "Street price vs. MSRP, deal discounts, software update years & true yearly cost.",
    accentColor: "#059669", // emerald-600
    badgeBg: "bg-emerald-50 text-emerald-700 border-emerald-200",
    borderAccent: "border-emerald-200/90",
    textAccent: "text-emerald-700",
    weightInComposite: 0.25,
    trackedSignals: [
      "Reference Street Price vs. Launch MSRP Delta",
      "Cost-Per-Year of Remaining OS Support",
      "Resale Value & Trade-In Retention",
      "In-Box Charger & Repairability Score",
    ],
    systemPrompt: `You are Marcus Sterling, Value & Price Advisor. Remember: there are no bad phones, only bad prices. You calculate the exact dollar-per-year cost based on current street prices and guaranteed OS support years. If a phone launched at $1,299 but sells for $899 today, your score jumps dynamically. ${NO_EM_DASH_RULE}`,
  },
  DAILY_DRIVER: {
    id: "DAILY_DRIVER",
    name: "Maya Lin",
    handle: "@maya_daily",
    roleTitle: "Comfort & Everyday Use",
    tagline: "One-handed grip, weight balance, fingerprint unlock speed & everyday reliability.",
    accentColor: "#d97706", // amber-600
    badgeBg: "bg-amber-50 text-amber-800 border-amber-200",
    borderAccent: "border-amber-200/90",
    textAccent: "text-amber-700",
    weightInComposite: 0.25,
    trackedSignals: [
      "Width (mm), Weight Balance & Corner Radius",
      "Ultrasonic vs Optical Fingerprint Reliability",
      "Modem Signal Stability & Bluetooth Quirks",
      "Reddit / Forum Post-Launch Bug Frequency",
    ],
    systemPrompt: `You are Maya Lin, Comfort & Everyday Use Lead. You care about what spec sheets hide after 90 days in a pocket: top-heavy camera bumps, sharp titanium corners digging into palms, slow optical fingerprint sensors blinding you at night, notification delays, and real owner complaints from Reddit and forums. ${NO_EM_DASH_RULE}`,
  },
};

export const EDITOR_LIST: EditorPersona[] = [
  AI_EDITORS.SILICON_GEEK,
  AI_EDITORS.CAMERA_PURIST,
  AI_EDITORS.PRAGMATIST,
  AI_EDITORS.DAILY_DRIVER,
];

export function calculateLivingScores(params: {
  launchMsrpUsd: number;
  simulatedStreetUsd: number;
  osSupportYears: number;
  basePragmatistScore: number;
  baseStreetUsd: number;
  siliconScore: number;
  cameraScore: number;
  dailyDriverScore: number;
  customWeights?: Record<EditorPersonaId, number>;
}): {
  pragmatistScore: number;
  compositeLivingScore: number;
  costPerYearUsd: number;
  discountPct: number;
  buyRecommendation: BuyRecommendation;
  pragmatistNote: string;
} {
  const {
    launchMsrpUsd,
    simulatedStreetUsd,
    osSupportYears,
    basePragmatistScore,
    baseStreetUsd,
    siliconScore,
    cameraScore,
    dailyDriverScore,
    customWeights,
  } = params;

  const safeBaseStreet = Math.max(1, baseStreetUsd);
  const priceDiffRatio = (safeBaseStreet - simulatedStreetUsd) / safeBaseStreet;
  const rawPragmatist = basePragmatistScore + priceDiffRatio * 5.5;
  const pragmatistScore = Number(
    Math.min(9.9, Math.max(3.5, rawPragmatist)).toFixed(1)
  );

  const weights = customWeights ?? {
    SILICON_GEEK: 0.25,
    CAMERA_PURIST: 0.25,
    PRAGMATIST: 0.25,
    DAILY_DRIVER: 0.25,
  };

  const totalWeight =
    weights.SILICON_GEEK +
    weights.CAMERA_PURIST +
    weights.PRAGMATIST +
    weights.DAILY_DRIVER || 1;

  const compositeLivingScore = Number(
    (
      (siliconScore * weights.SILICON_GEEK +
        cameraScore * weights.CAMERA_PURIST +
        pragmatistScore * weights.PRAGMATIST +
        dailyDriverScore * weights.DAILY_DRIVER) /
      totalWeight
    ).toFixed(1)
  );

  const costPerYearUsd = Math.round(simulatedStreetUsd / Math.max(1, osSupportYears));
  const safeMsrp = Math.max(1, launchMsrpUsd);
  const discountPct = Math.round(
    ((safeMsrp - simulatedStreetUsd) / safeMsrp) * 100
  );

  let buyRecommendation: BuyRecommendation = "BUY_ON_SALE";
  if (compositeLivingScore >= 8.4 && pragmatistScore >= 8.5) {
    buyRecommendation = "STRONG_BUY";
  } else if (compositeLivingScore >= 7.0 && pragmatistScore >= 6.8) {
    buyRecommendation = "BUY_ON_SALE";
  } else if (compositeLivingScore >= 5.8 && pragmatistScore >= 5.5) {
    buyRecommendation = "WAIT_FOR_DROP";
  } else {
    buyRecommendation = "SKIP";
  }

  let pragmatistNote = "";
  if (simulatedStreetUsd < baseStreetUsd - 40) {
    pragmatistNote = `Street price drop to $${simulatedStreetUsd} (${discountPct}% below MSRP) reduces ownership cost to $${costPerYearUsd}/yr over ${osSupportYears} yrs of OS support, boosting my Value score from ${basePragmatistScore} to ${pragmatistScore}.`;
  } else if (simulatedStreetUsd > baseStreetUsd + 40) {
    pragmatistNote = `At $${simulatedStreetUsd}, you're paying $${costPerYearUsd}/yr of guaranteed OS support. Wait for retail promos closer to $${Math.round(baseStreetUsd * 0.9)}.`;
  } else {
    pragmatistNote = `At the current $${simulatedStreetUsd} street price ($${costPerYearUsd}/yr across ${osSupportYears} OS update years), it sits ${discountPct > 0 ? `${discountPct}% under launch MSRP` : "at full launch MSRP"}.`;
  }

  return {
    pragmatistScore,
    compositeLivingScore,
    costPerYearUsd,
    discountPct,
    buyRecommendation,
    pragmatistNote: stripEmDashes(pragmatistNote),
  };
}
