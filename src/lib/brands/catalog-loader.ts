import { SmartphoneDevice, INITIAL_DEVICES } from "@/lib/seed-data";
import { EXPANDED_CATALOG_DEVICES } from "@/lib/expanded-catalog";
import { APPLE_CATALOG_DEVICES } from "@/lib/brands/apple-catalog";
import { SAMSUNG_CATALOG_DEVICES } from "@/lib/brands/samsung-catalog";
import { GOOGLE_CATALOG_DEVICES } from "@/lib/brands/google-catalog";
import { TECNO_CATALOG_DEVICES } from "@/lib/brands/tecno-catalog";
import { GSMARENA_2023_2026_DEVICES } from "@/lib/brands/gsmarena-2023-2026-catalog";
import {
  buildDeviceFromManualInput,
  deviceToManualFormInput,
  ManualDeviceFormInput,
} from "@/lib/spec-synthesizer";
import { calculateLivingScores } from "@/lib/editors";
import { SCORE_MODEL_VERSION, scoreManualDevice } from "@/lib/scoring";
import { synthesizeDeviceEvidence } from "@/lib/evidence-generator";
import generatedArchiveJson from "@/lib/brands/generated-gsmarena-catalog.json";

interface GeneratedCompactSpec {
  id: string;
  brand: string;
  name: string;
  releaseDate: string;
  category: SmartphoneDevice["category"];
  msrp: number;
  street: number;
  osYrs: number;
  soc: string;
  nm: number;
  cpu: string;
  gpu: string;
  ram: string;
  storage: string;
  gbS: number;
  gbM: number;
  stab: number;
  dispIn: number;
  panel: string;
  res: string;
  hz: string;
  nits: number;
  pwm: number;
  sensor: string;
  mp: number;
  ap: string;
  tele: string;
  uw: string;
  vid: string;
  lag: string;
  mah: number;
  chem: string;
  wiredW: number;
  wirelessW: number;
  mins: number;
  g: number;
  thick: number;
  width: number;
  height: number;
  ip: string;
  fp: string;
  frame: string;
  tagline: string;
}

function normalizeModelKey(brand: string, name: string): string {
  const b = brand.toLowerCase().trim();
  let n = name.toLowerCase().trim();
  if (n.startsWith(b + " ")) {
    n = n.slice(b.length + 1).trim();
  }
  return `${b}::${n.replace(/\+/g, "-plus").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

function applyLivingScoreV2(device: SmartphoneDevice): SmartphoneDevice {
  const scores = scoreManualDevice(deviceToManualFormInput(device));
  const living = calculateLivingScores({
    launchMsrpUsd: device.launchMsrpUsd,
    simulatedStreetUsd: device.currentStreetUsd,
    osSupportYears: device.osSupportYears,
    basePragmatistScore: scores.pragmatistScore,
    baseStreetUsd: device.currentStreetUsd,
    siliconScore: scores.siliconScore,
    cameraScore: scores.cameraScore,
    dailyDriverScore: scores.dailyDriverScore,
  });

  return {
    ...device,
    compositeLivingScore: living.compositeLivingScore,
    buyRecommendation: living.buyRecommendation,
    scoreMetadata: {
      modelVersion: SCORE_MODEL_VERSION,
      status: device.scoreMetadata?.status ?? "CURATED",
    },
    verdicts: {
      ...device.verdicts,
      SILICON_GEEK: {
        ...device.verdicts.SILICON_GEEK,
        score: scores.siliconScore,
      },
      CAMERA_PURIST: {
        ...device.verdicts.CAMERA_PURIST,
        score: scores.cameraScore,
      },
      PRAGMATIST: {
        ...device.verdicts.PRAGMATIST,
        score: scores.pragmatistScore,
      },
      DAILY_DRIVER: {
        ...device.verdicts.DAILY_DRIVER,
        score: scores.dailyDriverScore,
      },
    },
    evidence: synthesizeDeviceEvidence(device),
  };
}

const PYTHON_GENERATED_DEVICES: SmartphoneDevice[] = (
  generatedArchiveJson as GeneratedCompactSpec[]
).map((item) => {
  const manualInput: ManualDeviceFormInput = {
    brand: item.brand,
    name: item.name,
    tagline: item.tagline,
    category: item.category,
    releaseDate: item.releaseDate,
    launchMsrpUsd: item.msrp,
    currentStreetUsd: item.street,
    osSupportYears: item.osYrs,
    socName: item.soc,
    socNodeNm: item.nm,
    cpuTopology: item.cpu,
    gpuName: item.gpu,
    ramOptions: item.ram,
    storageType: item.storage,
    geekbenchSingle: item.gbS,
    geekbenchMulti: item.gbM,
    wildlifeStabilityPct: item.stab,
    displaySizeInch: item.dispIn,
    displayPanelType: item.panel,
    resolution: item.res,
    refreshRateHz: item.hz,
    peakBrightnessNits: item.nits,
    pwmDimmingHz: item.pwm,
    mainSensorSize: item.sensor,
    mainSensorMp: item.mp,
    mainAperture: item.ap,
    telephotoSpecs: item.tele,
    ultrawideSpecs: item.uw,
    videoCapabilities: item.vid,
    shutterLagRating: item.lag,
    batteryCapacityMah: item.mah,
    batteryChemistry: item.chem,
    wiredChargingW: item.wiredW,
    wirelessChargingW: item.wirelessW,
    fullChargeMins: item.mins,
    weightGrams: item.g,
    thicknessMm: item.thick,
    widthMm: item.width,
    ipRating: item.ip,
    fingerprintType: item.fp,
    frameMaterial: item.frame,
  };

  const built = buildDeviceFromManualInput(manualInput, item.id);
  return {
    ...built,
    customHeightMm: item.height,
  };
});

/**
 * Merges and deduplicates all curated brand catalogs with the Python-generated
 * 2020-2026 GSMArena-scale archive across 38+ global brands.
 */
function buildUnifiedDeduplicatedCatalog(): SmartphoneDevice[] {
  const rawSources: SmartphoneDevice[] = [
    ...INITIAL_DEVICES,
    ...SAMSUNG_CATALOG_DEVICES,
    ...APPLE_CATALOG_DEVICES,
    ...GOOGLE_CATALOG_DEVICES,
    ...TECNO_CATALOG_DEVICES,
    ...EXPANDED_CATALOG_DEVICES,
    ...GSMARENA_2023_2026_DEVICES,
    ...PYTHON_GENERATED_DEVICES,
  ];

  const seenIds = new Set<string>();
  const seenKeys = new Set<string>();
  const result: SmartphoneDevice[] = [];

  for (const dev of rawSources) {
    const key = normalizeModelKey(dev.brand, dev.name);
    if (seenIds.has(dev.id) || seenKeys.has(key)) {
      continue;
    }
    seenIds.add(dev.id);
    seenKeys.add(key);
    result.push(applyLivingScoreV2(dev));
  }

  return result;
}

export const FULL_UNIFIED_CATALOG: SmartphoneDevice[] =
  buildUnifiedDeduplicatedCatalog();


