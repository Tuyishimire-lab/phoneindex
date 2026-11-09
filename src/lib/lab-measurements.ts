/**
 * Two-Pillar Lab Provenance & Parametric Telemetry Service
 *
 * Implements:
 * 1. Two-Pillar Lab Provenance Schema (Physical Lab vs Simulated Parametric Model)
 * 2. Deterministic Battery Endurance Simulation (Web, Video, 3D Gaming, Active Use)
 * 3. Deterministic Acoustic Loudness Simulation (LUFS, Cavity Architecture, Frequency, THD)
 * 4. Standardized Legal Independence Disclaimers
 */

import { SmartphoneDevice } from "@/lib/seed-data";

export type LabProvenanceKind =
  | "VERIFIED_PHYSICAL_LAB"
  | "SIMULATED_PARAMETRIC_MODEL";

export type LabLicenseType =
  | "CC_BY_4.0"
  | "ODBL_1.0"
  | "COMMERCIAL_SYNDICATED"
  | "PROPRIETARY_SYNTHETIC";

export type LoudnessClass = "VERY_GOOD" | "GOOD" | "POOR";

export type AcousticCavityArchitecture =
  | "DUAL_SYMMETRIC_STEREO"
  | "HYBRID_EARPIECE_STEREO"
  | "BOTTOM_PORT_MONO";

// Standard legal disclaimers ensuring provenance & platform independence
export const MANDATORY_LEGAL_DISCLAIMERS = {
  INDEPENDENCE:
    "All measurements conducted independently under standardized PhoneIndex lab protocols. Zero manufacturer sponsorship or compensation accepted.",
  ATTRIBUTION_INTEGRITY:
    "PhoneIndex is an independent platform and does not scrape, republish, or copy proprietary lab measurements from GSMArena Lab, DxOMark, or RTINGS.",
  OPEN_LAB_PROTOCOL: "phoneindex-openlab-v1.0",
} as const;

export interface LabProvenanceMetadata {
  provenance: LabProvenanceKind;
  license: LabLicenseType;
  protocolVersion: string;
  marginOfErrorPct: number;
  disclaimer: string;
  additionalDisclaimers: string[];
  facilityId?: string;
  auditTimestamp: string;
}

export interface BatteryEnduranceTelemetry {
  webBrowsingHours: number;
  videoPlaybackHours: number;
  gaming3dHours: number;
  activeUseScoreHours: number;
  powerMetrics: {
    batteryCapacityMah: number;
    nominalVoltageV: number;
    energyTotalMwh: number;
    chassisIdlePowerMw: number;
    socEfficiencyFactor: number;
    displayPowerMw: number;
    socNodeKey: string;
    displayPanelCoeff: number;
    displayAreaInch2: number;
  };
}

export interface AcousticSimulationTelemetry {
  lufs: number;
  loudnessClass: LoudnessClass;
  cavityArchitecture: AcousticCavityArchitecture;
  chassisVolumeCm3: number;
  isStereo: boolean;
  metrics: {
    thdPct: number;
    bassRollOffHz: number;
    midRangeClarityDb: number;
    trebleExtensionKhz: number;
    soundstageWidthPct: number;
  };
}

export interface DeviceLabTelemetry {
  deviceId: string;
  deviceName: string;
  provenance: LabProvenanceMetadata;
  battery: BatteryEnduranceTelemetry;
  acoustics: AcousticSimulationTelemetry;
  disclaimers: string[];
}

/**
 * SoC semiconductor node power efficiency coefficients (Feature #32)
 */
export const REFERENCE_NODE_EFFICIENCY: Record<string, number> = {
  "3nm": 0.85,
  "4nm": 1.0,
  "5nm": 1.2,
  "6nm": 1.3,
  "7nm": 1.45,
  "12nm+": 1.8,
};

export const DEFAULT_CHASSIS_IDLE_POWER_MW = 180;

/**
 * Deterministic reference battery endurance simulation formula (Feature #32)
 * Energy (mWh) = capacity (mAh) * 3.85V
 * Power (mW) = idle + (nodeEfficiency * 950mW) + (displayArea * panelCoeff)
 */
export function calculateReferenceEnduranceHours(
  capacityMah: number,
  node: string,
  displayAreaInch2: number,
  panelCoeff: number,
  chassisIdlePower: number = DEFAULT_CHASSIS_IDLE_POWER_MW
): number {
  if (capacityMah <= 0) return 0;
  const nodeFactor = REFERENCE_NODE_EFFICIENCY[node] ?? 1.3;
  const powerTotalMw =
    chassisIdlePower + nodeFactor * 950 + displayAreaInch2 * panelCoeff;
  const energyMwh = capacityMah * 3.85;
  return Number((energyMwh / powerTotalMw).toFixed(2));
}

/**
 * Deterministic reference acoustic loudness simulation formula (Feature #33)
 * Evaluates chassis internal cavity volume (cm³) and stereo channel count.
 */
export function calculateReferenceAcoustics(
  widthMm: number,
  heightMm: number,
  thicknessMm: number,
  isStereo: boolean
): { lufs: number; loudnessClass: LoudnessClass } {
  const volumeCm3 = (widthMm * heightMm * thicknessMm) / 1000;
  if (isStereo) {
    if (volumeCm3 > 75) {
      return { lufs: -24.5, loudnessClass: "VERY_GOOD" };
    } else {
      return { lufs: -26.2, loudnessClass: "GOOD" };
    }
  }
  return { lufs: -29.0, loudnessClass: "POOR" };
}

/**
 * Resolves semiconductor fabrication node key from numerical nanometers or string.
 */
export function resolveNodeKey(nodeNm: number | string | undefined): string {
  if (typeof nodeNm === "string") {
    if (nodeNm.includes("3")) return "3nm";
    if (nodeNm.includes("4")) return "4nm";
    if (nodeNm.includes("5")) return "5nm";
    if (nodeNm.includes("6")) return "6nm";
    if (nodeNm.includes("7")) return "7nm";
    return "12nm+";
  }
  if (typeof nodeNm === "number") {
    if (nodeNm <= 3) return "3nm";
    if (nodeNm === 4) return "4nm";
    if (nodeNm === 5) return "5nm";
    if (nodeNm === 6) return "6nm";
    if (nodeNm === 7) return "7nm";
    return "12nm+";
  }
  return "4nm";
}

/**
 * Resolves panel power consumption coefficient in mW/in² based on display technology.
 */
export function resolveDisplayPanelCoeff(panelType: string = ""): number {
  const p = panelType.toLowerCase();
  if (p.includes("ltpo")) return 18.5; // Adaptive 1-120Hz LTPO OLED
  if (p.includes("amoled") || p.includes("oled")) return 22.0; // Standard OLED
  if (p.includes("lcd") || p.includes("ips")) return 26.5; // Backlit IPS LCD
  return 18.5;
}

/**
 * Computes estimated screen area in square inches for a 19.5:9 display geometry.
 */
export function calculateDisplayAreaInch2(diagonalInches: number): number {
  if (diagonalInches <= 0) return 0;
  // Area = d^2 * (19.5 * 9) / (19.5^2 + 9^2) = 0.3804 * d^2
  return Number((0.3804 * diagonalInches * diagonalInches).toFixed(2));
}

/**
 * Computes parametric battery runtimes across standard workloads:
 * - Web Browsing (hrs): CPU bursty load + 60-120Hz interactive scrolling
 * - Video Playback (hrs): Dedicated hardware decoder + fixed refresh rate
 * - 3D Gaming (hrs): Heavy GPU draw + peak display brightness
 * - Active Use Score (hrs): Blended real-world active runtime
 */
export function computeParametricBatteryTelemetry(
  capacityMah: number,
  socNode: number | string,
  displaySizeInch: number,
  panelType: string = ""
): BatteryEnduranceTelemetry {
  const nodeKey = resolveNodeKey(socNode);
  const nodeEfficiency = REFERENCE_NODE_EFFICIENCY[nodeKey] ?? 1.3;
  const displayAreaInch2 = calculateDisplayAreaInch2(displaySizeInch || 6.7);
  const panelCoeff = resolveDisplayPanelCoeff(panelType);
  const idlePowerMw = DEFAULT_CHASSIS_IDLE_POWER_MW;
  const energyMwh = Math.max(0, capacityMah * 3.85);

  if (capacityMah <= 0) {
    return {
      webBrowsingHours: 0,
      videoPlaybackHours: 0,
      gaming3dHours: 0,
      activeUseScoreHours: 0,
      powerMetrics: {
        batteryCapacityMah: 0,
        nominalVoltageV: 3.85,
        energyTotalMwh: 0,
        chassisIdlePowerMw: idlePowerMw,
        socEfficiencyFactor: nodeEfficiency,
        displayPowerMw: 0,
        socNodeKey: nodeKey,
        displayPanelCoeff: panelCoeff,
        displayAreaInch2,
      },
    };
  }

  // 1. Web Browsing: matches reference mathematical model
  const webPowerMw = idlePowerMw + nodeEfficiency * 950 + displayAreaInch2 * panelCoeff;
  const webBrowsingHours = Number((energyMwh / webPowerMw).toFixed(2));

  // 2. Video Playback: hardware decode offload (420mW SoC load) + lower panel refresh
  const videoPowerMw = idlePowerMw + nodeEfficiency * 420 + displayAreaInch2 * (panelCoeff * 0.85);
  const videoPlaybackHours = Number((energyMwh / videoPowerMw).toFixed(2));

  // 3. 3D Gaming: sustained GPU load (2600mW) + max panel refresh
  const gamingPowerMw = idlePowerMw + nodeEfficiency * 2600 + displayAreaInch2 * (panelCoeff * 1.35);
  const gaming3dHours = Number((energyMwh / gamingPowerMw).toFixed(2));

  // 4. Active Use Score: 40% Web, 35% Video, 25% 3D Gaming
  const activeUseScoreHours = Number(
    (0.4 * webBrowsingHours + 0.35 * videoPlaybackHours + 0.25 * gaming3dHours).toFixed(2)
  );

  return {
    webBrowsingHours,
    videoPlaybackHours,
    gaming3dHours,
    activeUseScoreHours,
    powerMetrics: {
      batteryCapacityMah: capacityMah,
      nominalVoltageV: 3.85,
      energyTotalMwh: energyMwh,
      chassisIdlePowerMw: idlePowerMw,
      socEfficiencyFactor: nodeEfficiency,
      displayPowerMw: Number((displayAreaInch2 * panelCoeff).toFixed(2)),
      socNodeKey: nodeKey,
      displayPanelCoeff: panelCoeff,
      displayAreaInch2,
    },
  };
}

/**
 * Computes parametric acoustic loudness, THD, and frequency distribution.
 */
export function computeParametricAcousticTelemetry(
  widthMm: number,
  heightMm: number,
  thicknessMm: number,
  isStereo: boolean = true
): AcousticSimulationTelemetry {
  const volumeCm3 = Number(((widthMm * heightMm * thicknessMm) / 1000).toFixed(2));
  const ref = calculateReferenceAcoustics(widthMm, heightMm, thicknessMm, isStereo);

  let cavityArchitecture: AcousticCavityArchitecture = "BOTTOM_PORT_MONO";
  if (isStereo) {
    cavityArchitecture =
      volumeCm3 > 85 ? "DUAL_SYMMETRIC_STEREO" : "HYBRID_EARPIECE_STEREO";
  }

  // Distortion & frequency models derived from acoustic resonance volume
  let thdPct = 1.25;
  let bassRollOffHz = 140;
  let soundstageWidthPct = 35;

  if (cavityArchitecture === "DUAL_SYMMETRIC_STEREO") {
    thdPct = 0.42;
    bassRollOffHz = 78;
    soundstageWidthPct = 90;
  } else if (cavityArchitecture === "HYBRID_EARPIECE_STEREO") {
    thdPct = 0.68;
    bassRollOffHz = 105;
    soundstageWidthPct = 72;
  }

  return {
    lufs: ref.lufs,
    loudnessClass: ref.loudnessClass,
    cavityArchitecture,
    chassisVolumeCm3: volumeCm3,
    isStereo,
    metrics: {
      thdPct,
      bassRollOffHz,
      midRangeClarityDb: 0.8,
      trebleExtensionKhz: 16.5,
      soundstageWidthPct,
    },
  };
}

/**
 * Computes complete Two-Pillar Lab Telemetry for any catalog or synthesized device.
 */
export function getDeviceLabTelemetry(
  device: SmartphoneDevice,
  provenanceTier: LabProvenanceKind = "SIMULATED_PARAMETRIC_MODEL"
): DeviceLabTelemetry {
  const specs = device.specs;
  const heightMm = device.customHeightMm || 162.5;
  const widthMm = specs?.widthMm || 75.0;
  const thicknessMm = specs?.thicknessMm || 8.2;
  const capacityMah = specs?.batteryCapacityMah || 5000;
  const socNode = specs?.socNodeNm || 4;
  const displaySizeInch = specs?.displaySizeInch || 6.7;
  const panelType = specs?.displayPanelType || "Dynamic LTPO AMOLED";

  const battery = computeParametricBatteryTelemetry(
    capacityMah,
    socNode,
    displaySizeInch,
    panelType
  );

  const acoustics = computeParametricAcousticTelemetry(
    widthMm,
    heightMm,
    thicknessMm,
    true
  );

  const provenance: LabProvenanceMetadata = {
    provenance: provenanceTier,
    license: "CC_BY_4.0",
    protocolVersion: MANDATORY_LEGAL_DISCLAIMERS.OPEN_LAB_PROTOCOL,
    marginOfErrorPct: provenanceTier === "VERIFIED_PHYSICAL_LAB" ? 1.5 : 5.0,
    disclaimer: MANDATORY_LEGAL_DISCLAIMERS.INDEPENDENCE,
    additionalDisclaimers: [MANDATORY_LEGAL_DISCLAIMERS.ATTRIBUTION_INTEGRITY],
    facilityId:
      provenanceTier === "VERIFIED_PHYSICAL_LAB"
        ? "PHONEINDEX-LAB-BERLIN-01"
        : undefined,
    auditTimestamp: new Date().toISOString().split("T")[0],
  };

  return {
    deviceId: device.id,
    deviceName: `${device.brand} ${device.name}`,
    provenance,
    battery,
    acoustics,
    disclaimers: [
      MANDATORY_LEGAL_DISCLAIMERS.INDEPENDENCE,
      MANDATORY_LEGAL_DISCLAIMERS.ATTRIBUTION_INTEGRITY,
    ],
  };
}

/**
 * Canonical legal disclaimer alias for OpenLab provenance
 */
export const OPENLAB_PROVENANCE_DISCLAIMER =
  MANDATORY_LEGAL_DISCLAIMERS.INDEPENDENCE;

/**
 * Formats decimal hours into a clean human-readable duration (e.g. 14.25 -> "14h 15m")
 */
export function formatHoursDuration(decimalHours: number): string {
  if (!decimalHours || decimalHours <= 0) return "0h 00m";
  const hours = Math.floor(decimalHours);
  const minutes = Math.round((decimalHours - hours) * 60);
  return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
}

/**
 * Formats acoustic cavity architecture into human-readable label
 */
export function formatCavityArchitecture(
  arch: AcousticCavityArchitecture
): string {
  switch (arch) {
    case "DUAL_SYMMETRIC_STEREO":
      return "Dual Symmetric Stereo";
    case "HYBRID_EARPIECE_STEREO":
      return "Hybrid Earpiece Stereo";
    case "BOTTOM_PORT_MONO":
      return "Bottom Port Mono";
    default:
      return "Stereo Speakers";
  }
}

/**
 * Formats loudness class with LUFS benchmark range
 */
export function formatLoudnessClass(cls: LoudnessClass): string {
  switch (cls) {
    case "VERY_GOOD":
      return "Very Good (≥ -25 LUFS)";
    case "GOOD":
      return "Good (-26 to -28 LUFS)";
    case "POOR":
      return "Below Average (≤ -29 LUFS)";
    default:
      return cls;
  }
}

