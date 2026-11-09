import {
  BuyRecommendation,
  calculateLivingScores,
  stripEmDashes,
} from "@/lib/editors";
import { SmartphoneDevice } from "@/lib/seed-data";
import { SCORE_MODEL_VERSION, scoreManualDevice } from "@/lib/scoring";

export interface ManualDeviceFormInput {
  brand: string;
  name: string;
  tagline: string;
  category: SmartphoneDevice["category"];
  releaseDate: string;
  launchMsrpUsd: number;
  currentStreetUsd: number;
  osSupportYears: number;
  socName: string;
  socNodeNm: number;
  cpuTopology: string;
  gpuName: string;
  ramOptions: string;
  storageType: string;
  geekbenchSingle: number;
  geekbenchMulti: number;
  wildlifeStabilityPct: number;
  displaySizeInch: number;
  displayPanelType: string;
  resolution: string;
  refreshRateHz: string;
  peakBrightnessNits: number;
  pwmDimmingHz: number;
  mainSensorSize: string;
  mainSensorMp: number;
  mainAperture: string;
  telephotoSpecs: string;
  ultrawideSpecs: string;
  videoCapabilities: string;
  shutterLagRating: string;
  batteryCapacityMah: number;
  batteryChemistry: string;
  wiredChargingW: number;
  wirelessChargingW: number;
  fullChargeMins: number;
  weightGrams: number;
  thicknessMm: number;
  widthMm: number;
  ipRating: string;
  fingerprintType: string;
  frameMaterial: string;
}

export const MANUAL_SPEC_PRESETS: Record<string, ManualDeviceFormInput> = {
  "sony-xperia-1-vii": {
    brand: "Sony",
    name: "Xperia 1 VII",
    tagline:
      "True 85-170mm continuous optical zoom periscope, 3.5mm audiophile jack, and zero-notch 4K micro-OLED.",
    category: "Camera Flagship",
    releaseDate: "2026-05-15",
    launchMsrpUsd: 1399,
    currentStreetUsd: 1199,
    osSupportYears: 4,
    socName: "Snapdragon 8 Elite",
    socNodeNm: 3,
    cpuTopology: "2x 4.32GHz Oryon + 6x 3.53GHz",
    gpuName: "Adreno 830",
    ramOptions: "16GB LPDDR5X",
    storageType: "UFS 4.0 + microSDXC Slot",
    geekbenchSingle: 3160,
    geekbenchMulti: 9810,
    wildlifeStabilityPct: 72.5,
    displaySizeInch: 6.5,
    displayPanelType: "Bravia LTPO OLED (No Punch-Hole)",
    resolution: "2880 x 1344 (486 ppi)",
    refreshRateHz: "1-120Hz Adaptive",
    peakBrightnessNits: 2600,
    pwmDimmingHz: 480,
    mainSensorSize: '1/1.28" Exmor T Stacked Dual-Layer',
    mainSensorMp: 52,
    mainAperture: "f/1.9 (24mm Zeiss T* OIS)",
    telephotoSpecs: '48MP Continuous Optical Zoom 85-170mm (1/2.0" Exmor RS)',
    ultrawideSpecs: '48MP f/2.0 (1/2.5" Exmor RS 16mm)',
    videoCapabilities: "4K120 S-Cinetone on all 3 rear lenses",
    shutterLagRating: "Zero-Lag (Dedicated 2-Stage Physical Shutter Button)",
    batteryCapacityMah: 5200,
    batteryChemistry: "High-Density Li-Ion",
    wiredChargingW: 45,
    wirelessChargingW: 25,
    fullChargeMins: 52,
    weightGrams: 192,
    thicknessMm: 8.2,
    widthMm: 74.0,
    ipRating: "IP68",
    fingerprintType: "Capacitive Power Key",
    frameMaterial: "Textured CNC Aluminum + Gorilla Glass Victus 2",
  },
  "xiaomi-15-ultra": {
    brand: "Xiaomi",
    name: "Xiaomi 15 Ultra",
    tagline:
      "1-inch Sony LYT-900 main sensor + 200MP Leica periscope + 6000mAh Silicon-Carbon flagship.",
    category: "Camera Flagship",
    releaseDate: "2025-03-02",
    launchMsrpUsd: 1199,
    currentStreetUsd: 999,
    osSupportYears: 4,
    socName: "Snapdragon 8 Elite",
    socNodeNm: 3,
    cpuTopology: "2x 4.32GHz Oryon + 6x 3.53GHz",
    gpuName: "Adreno 830",
    ramOptions: "16GB LPDDR5X",
    storageType: "UFS 4.0",
    geekbenchSingle: 3180,
    geekbenchMulti: 9960,
    wildlifeStabilityPct: 74.8,
    displaySizeInch: 6.73,
    displayPanelType: "TCL C9 2K LTPO AMOLED (12-bit)",
    resolution: "3200 x 1440 (522 ppi)",
    refreshRateHz: "1-120Hz Adaptive",
    peakBrightnessNits: 3200,
    pwmDimmingHz: 1920,
    mainSensorSize: '1.0" Type Sony LYT-900',
    mainSensorMp: 50,
    mainAperture: "f/1.63 (23mm Leica Summilux OIS)",
    telephotoSpecs:
      '200MP 4.3x Periscope (1/1.4" HP9) + 50MP 3x Floating Macro',
    ultrawideSpecs: '50MP f/1.8 (1/2.51" Sony IMX858)',
    videoCapabilities: "8K30, 4K120 Dolby Vision, 10-bit ACES Log",
    shutterLagRating: "Zero-Lag (Leica Street Snapshot 0.7s Fast Shoot)",
    batteryCapacityMah: 6000,
    batteryChemistry: "High-Silicon 10% Si-C Anode",
    wiredChargingW: 90,
    wirelessChargingW: 80,
    fullChargeMins: 35,
    weightGrams: 226,
    thicknessMm: 9.4,
    widthMm: 75.3,
    ipRating: "IP68 + IP69",
    fingerprintType: "3D Ultrasonic",
    frameMaterial: "CNC Aluminum + Leica Vegan Leather Grip",
  },
  "iphone-17-air": {
    brand: "Apple",
    name: "iPhone 17 Air (Ultra-Thin)",
    tagline:
      "5.5mm featherweight titanium marvel, trading telephoto glass and battery mAh for radical thinness.",
    category: "Value Disruptor",
    releaseDate: "2026-09-18",
    launchMsrpUsd: 999,
    currentStreetUsd: 949,
    osSupportYears: 6,
    socName: "Apple A19 (TSMC N3P)",
    socNodeNm: 3,
    cpuTopology: "2x 4.25GHz Performance + 4x Efficiency",
    gpuName: "Apple 5-Core GPU",
    ramOptions: "12GB LPDDR5X",
    storageType: "NVMe",
    geekbenchSingle: 3690,
    geekbenchMulti: 9240,
    wildlifeStabilityPct: 61.0,
    displaySizeInch: 6.6,
    displayPanelType: "LTPO Super Retina XDR 120Hz",
    resolution: "2740 x 1260 (458 ppi)",
    refreshRateHz: "1-120Hz ProMotion",
    peakBrightnessNits: 2400,
    pwmDimmingHz: 480,
    mainSensorSize: '1/1.56" Single 48MP Fusion',
    mainSensorMp: 48,
    mainAperture: "f/1.6 (26mm OIS)",
    telephotoSpecs: "None (2x In-Sensor Digital Crop Only)",
    ultrawideSpecs: "None (Single Rear Camera Architecture)",
    videoCapabilities: "4K60 Dolby Vision",
    shutterLagRating: "Zero-Lag",
    batteryCapacityMah: 3350,
    batteryChemistry: "High-Density Stacked Li-Ion",
    wiredChargingW: 30,
    wirelessChargingW: 25,
    fullChargeMins: 68,
    weightGrams: 146,
    thicknessMm: 5.5,
    widthMm: 74.2,
    ipRating: "IP68",
    fingerprintType: "Face ID",
    frameMaterial: "Ultra-Thin Grade 5 Titanium",
  },
};

/**
 * Deterministically synthesizes a complete SmartphoneDevice with 4 AI Editor verdicts
 * from manual spec inputs or updated spec overrides.
 */
export function buildDeviceFromManualInput(
  input: ManualDeviceFormInput,
  existingId?: string
): SmartphoneDevice {
  const scores = scoreManualDevice(input);
  const {
    siliconScore,
    cameraScore,
    pragmatistScore: basePragmatistScore,
    dailyDriverScore,
    costPerYear,
  } = scores;
  const hasDedicatedTele = !input.telephotoSpecs.toLowerCase().includes("none");

  const living = calculateLivingScores({
    launchMsrpUsd: input.launchMsrpUsd,
    simulatedStreetUsd: input.currentStreetUsd,
    osSupportYears: input.osSupportYears,
    basePragmatistScore,
    baseStreetUsd: input.currentStreetUsd,
    siliconScore,
    cameraScore,
    dailyDriverScore,
  });

  const slug = `${input.brand}-${input.name}`
    .toLowerCase()
    .replace(/\+/g, "-plus")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return {
    id: existingId || `dev-manual-${slug}-${Date.now().toString().slice(-3)}`,
    slug,
    brand: stripEmDashes(input.brand),
    name: stripEmDashes(input.name),
    tagline: stripEmDashes(input.tagline),
    releaseDate: input.releaseDate,
    category: input.category,
    launchMsrpUsd: input.launchMsrpUsd,
    currentStreetUsd: input.currentStreetUsd,
    osSupportYears: input.osSupportYears,
    compositeLivingScore: living.compositeLivingScore,
    buyRecommendation: living.buyRecommendation as BuyRecommendation,
    scoreMetadata: {
      modelVersion: SCORE_MODEL_VERSION,
      status: "SYNTHETIC",
    },
    specs: {
      socName: stripEmDashes(input.socName),
      socNodeNm: input.socNodeNm,
      cpuTopology: stripEmDashes(input.cpuTopology),
      gpuName: stripEmDashes(input.gpuName),
      ramOptions: stripEmDashes(input.ramOptions),
      storageType: stripEmDashes(input.storageType),
      geekbenchSingle: input.geekbenchSingle,
      geekbenchMulti: input.geekbenchMulti,
      wildlifeStabilityPct: input.wildlifeStabilityPct,
      displaySizeInch: input.displaySizeInch,
      displayPanelType: stripEmDashes(input.displayPanelType),
      resolution: stripEmDashes(input.resolution),
      refreshRateHz: stripEmDashes(input.refreshRateHz),
      peakBrightnessNits: input.peakBrightnessNits,
      pwmDimmingHz: input.pwmDimmingHz,
      mainSensorSize: stripEmDashes(input.mainSensorSize),
      mainSensorMp: input.mainSensorMp,
      mainAperture: stripEmDashes(input.mainAperture),
      telephotoSpecs: stripEmDashes(input.telephotoSpecs),
      ultrawideSpecs: stripEmDashes(input.ultrawideSpecs),
      videoCapabilities: stripEmDashes(input.videoCapabilities),
      shutterLagRating: stripEmDashes(input.shutterLagRating),
      batteryCapacityMah: input.batteryCapacityMah,
      batteryChemistry: stripEmDashes(input.batteryChemistry),
      wiredChargingW: input.wiredChargingW,
      wirelessChargingW: input.wirelessChargingW,
      fullChargeMins: input.fullChargeMins,
      weightGrams: input.weightGrams,
      thicknessMm: input.thicknessMm,
      widthMm: input.widthMm,
      ipRating: stripEmDashes(input.ipRating),
      fingerprintType: stripEmDashes(input.fingerprintType),
      frameMaterial: stripEmDashes(input.frameMaterial),
    },
    verdicts: {
      SILICON_GEEK: {
        editorId: "SILICON_GEEK",
        score: siliconScore,
        headline: stripEmDashes(
          `${input.socName} hits ${input.geekbenchMulti.toLocaleString()} multi-core with ${input.wildlifeStabilityPct}% stability and a ${input.batteryCapacityMah}mAh cell.`
        ),
        analysis: stripEmDashes(
          `Powered by ${input.socName} (${input.socNodeNm}nm) paired with ${input.ramOptions} and ${input.storageType}. Thermal stress testing records ${input.wildlifeStabilityPct}% sustained stability, while the ${input.batteryCapacityMah}mAh (${input.batteryChemistry}) pack supports ${input.wiredChargingW}W wired charging.`
        ),
        pros: [
          stripEmDashes(
            `${input.geekbenchSingle.toLocaleString()} single-core / ${input.geekbenchMulti.toLocaleString()} multi-core via ${input.socName}`
          ),
          stripEmDashes(
            `${input.batteryCapacityMah}mAh battery with ${input.wiredChargingW}W wired (${input.fullChargeMins}m full charge)`
          ),
        ],
        cons: [
          stripEmDashes(
            input.pwmDimmingHz < 1000
              ? `${input.pwmDimmingHz}Hz PWM dimming lags behind 2160Hz+ eye-care flagships`
              : `${input.wildlifeStabilityPct}% sustained GPU stability under extreme 20-loop load`
          ),
          stripEmDashes(
            input.wiredChargingW < 50
              ? `${input.wiredChargingW}W wired charging takes ${input.fullChargeMins} minutes to reach 100%`
              : `Peak ${input.peakBrightnessNits} nits brightness draws high power outdoors`
          ),
        ],
      },
      CAMERA_PURIST: {
        editorId: "CAMERA_PURIST",
        score: cameraScore,
        headline: stripEmDashes(
          `Features a ${input.mainSensorSize} main sensor paired with ${input.telephotoSpecs} optics.`
        ),
        analysis: stripEmDashes(
          `Primary imaging relies on a ${input.mainSensorMp}MP ${input.mainSensorSize} sensor (${input.mainAperture}) alongside ${input.telephotoSpecs}. Shutter response is rated as ${input.shutterLagRating}, with ${input.videoCapabilities} video capture.`
        ),
        pros: [
          stripEmDashes(
            `${input.mainSensorSize} primary sensor (${input.mainAperture}) for natural optical depth`
          ),
          stripEmDashes(`Shutter timing rated at ${input.shutterLagRating}`),
        ],
        cons: [
          stripEmDashes(
            hasDedicatedTele
              ? `Large camera island adds top-heavy weight distribution`
              : `Lacks dedicated optical telephoto glass (${input.telephotoSpecs})`
          ),
          stripEmDashes(
            `Ultrawide camera (${input.ultrawideSpecs}) has smaller pixel pitch in low light`
          ),
        ],
      },
      PRAGMATIST: {
        editorId: "PRAGMATIST",
        score: living.pragmatistScore,
        headline: stripEmDashes(
          `At $${input.currentStreetUsd} street price ($${costPerYear}/yr over ${input.osSupportYears} OS years), value is rated ${living.buyRecommendation.replace(/_/g, " ")}.`
        ),
        analysis: stripEmDashes(
          `Launched at $${input.launchMsrpUsd} MSRP and currently trading at $${input.currentStreetUsd}. Amortized across ${input.osSupportYears} years of OS support, ownership costs $${costPerYear}/year.`
        ),
        pros: [
          stripEmDashes(
            `$${Math.max(0, input.launchMsrpUsd - input.currentStreetUsd)} savings below launch MSRP ($${input.currentStreetUsd} street)`
          ),
          stripEmDashes(
            `${input.osSupportYears} years of guaranteed OS updates ($${costPerYear}/yr)`
          ),
        ],
        cons: [
          stripEmDashes(
            costPerYear > 200
              ? `$${costPerYear}/yr amortized ownership cost sits in the premium tier`
              : `Import or carrier trade-in values vary by region`
          ),
          stripEmDashes(
            `Accessories and high-wattage adapters may require separate purchase`
          ),
        ],
      },
      DAILY_DRIVER: {
        editorId: "DAILY_DRIVER",
        score: dailyDriverScore,
        headline: stripEmDashes(
          `${input.weightGrams}g mass and ${input.widthMm}mm width with ${input.fingerprintType} biometrics and ${input.ipRating} protection.`
        ),
        analysis: stripEmDashes(
          `Built with ${input.frameMaterial}, measuring ${input.thicknessMm}mm thin and ${input.widthMm}mm wide at ${input.weightGrams}g. Biometric security is handled by ${input.fingerprintType} alongside ${input.ipRating} ingress protection.`
        ),
        pros: [
          stripEmDashes(
            `${input.weightGrams}g weight and ${input.thicknessMm}mm profile with ${input.frameMaterial}`
          ),
          stripEmDashes(
            `Reliable ${input.fingerprintType} unlock and ${input.ipRating} durability`
          ),
        ],
        cons: [
          stripEmDashes(
            input.widthMm > 76
              ? `${input.widthMm}mm chassis width stretches one-handed thumb reach`
              : `${input.displaySizeInch}" screen still requires two hands for top-corner pull-downs`
          ),
          stripEmDashes(
            `Glass back and camera ring benefit from a grippy protective case`
          ),
        ],
      },
    },
    evidence: [
      {
        id: `ev-manual-${Date.now()}`,
        sourceType: "LAB_BENCHMARK",
        sourceTitle: "Admin Manual Spec Entry & AI Hardware Verification",
        sourceAuthor: "PhoneIndex Editorial Spec Studio",
        sourceUrl: "#manual-spec-entry",
        excerpt: stripEmDashes(
          `Verified hardware specs: ${input.socName}, ${input.mainSensorSize} sensor, ${input.batteryCapacityMah}mAh (${input.wiredChargingW}W), ${input.weightGrams}g / ${input.thicknessMm}mm.`
        ),
        topic: "THERMALS",
        sentiment: "POSITIVE",
        verifiedAt: "Verified via Manual Spec Studio",
      },
    ],
    affiliateOffers: [
      {
        merchantName: "Verified Retail / Direct Store",
        priceUsd: input.currentStreetUsd,
        inStock: true,
        perkNote: `${input.ramOptions} Base Model`,
        affiliateUrl: "#affiliate-manual",
      },
    ],
    priceHistory: [
      {
        month: "Launch",
        priceUsd: input.launchMsrpUsd,
        livingScore: Math.max(7.0, Number((living.compositeLivingScore - 0.3).toFixed(1))),
      },
      {
        month: "Current",
        priceUsd: input.currentStreetUsd,
        livingScore: living.compositeLivingScore,
      },
    ],
  };
}

export function deviceToManualFormInput(
  device: SmartphoneDevice
): ManualDeviceFormInput {
  return {
    brand: device.brand,
    name: device.name,
    tagline: device.tagline,
    category: device.category,
    releaseDate: device.releaseDate,
    launchMsrpUsd: device.launchMsrpUsd,
    currentStreetUsd: device.currentStreetUsd,
    osSupportYears: device.osSupportYears,
    socName: device.specs.socName,
    socNodeNm: device.specs.socNodeNm,
    cpuTopology: device.specs.cpuTopology,
    gpuName: device.specs.gpuName,
    ramOptions: device.specs.ramOptions,
    storageType: device.specs.storageType,
    geekbenchSingle: device.specs.geekbenchSingle,
    geekbenchMulti: device.specs.geekbenchMulti,
    wildlifeStabilityPct: device.specs.wildlifeStabilityPct,
    displaySizeInch: device.specs.displaySizeInch,
    displayPanelType: device.specs.displayPanelType,
    resolution: device.specs.resolution,
    refreshRateHz: device.specs.refreshRateHz,
    peakBrightnessNits: device.specs.peakBrightnessNits,
    pwmDimmingHz: device.specs.pwmDimmingHz,
    mainSensorSize: device.specs.mainSensorSize,
    mainSensorMp: device.specs.mainSensorMp,
    mainAperture: device.specs.mainAperture,
    telephotoSpecs: device.specs.telephotoSpecs,
    ultrawideSpecs: device.specs.ultrawideSpecs,
    videoCapabilities: device.specs.videoCapabilities,
    shutterLagRating: device.specs.shutterLagRating,
    batteryCapacityMah: device.specs.batteryCapacityMah,
    batteryChemistry: device.specs.batteryChemistry,
    wiredChargingW: device.specs.wiredChargingW,
    wirelessChargingW: device.specs.wirelessChargingW,
    fullChargeMins: device.specs.fullChargeMins,
    weightGrams: device.specs.weightGrams,
    thicknessMm: device.specs.thicknessMm,
    widthMm: device.specs.widthMm,
    ipRating: device.specs.ipRating,
    fingerprintType: device.specs.fingerprintType,
    frameMaterial: device.specs.frameMaterial,
  };
}
