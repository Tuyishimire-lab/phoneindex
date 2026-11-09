import { BuyRecommendation, EditorPersonaId } from "./editors";
import type { CustomPhysicalProfile } from "./image-profile-extractor";

export interface DeviceSpecsData {
  // Silicon & Performance
  socName: string;
  socNodeNm: number;
  cpuTopology: string;
  gpuName: string;
  ramOptions: string;
  storageType: string;
  geekbenchSingle: number;
  geekbenchMulti: number;
  wildlifeStabilityPct: number;

  // Display & PWM
  displaySizeInch: number;
  displayPanelType: string;
  resolution: string;
  refreshRateHz: string;
  peakBrightnessNits: number;
  pwmDimmingHz: number;

  // Camera System
  mainSensorSize: string;
  mainSensorMp: number;
  mainAperture: string;
  telephotoSpecs: string;
  ultrawideSpecs: string;
  videoCapabilities: string;
  shutterLagRating: string;

  // Battery & Thermals
  batteryCapacityMah: number;
  batteryChemistry: string;
  wiredChargingW: number;
  wirelessChargingW: number;
  fullChargeMins: number;

  // Build & Ergonomics
  weightGrams: number;
  thicknessMm: number;
  widthMm: number;
  ipRating: string;
  fingerprintType: string;
  frameMaterial: string;
}

export interface EditorVerdictData {
  editorId: EditorPersonaId;
  score: number;
  headline: string;
  analysis: string;
  pros: string[];
  cons: string[];
}

export interface EvidenceChunkData {
  id: string;
  sourceType: "YOUTUBE_TRANSCRIPT" | "REDDIT_OWNER_THREAD" | "LAB_BENCHMARK";
  sourceTitle: string;
  sourceAuthor: string;
  sourceUrl: string;
  excerpt: string;
  topic: "THERMALS" | "CAMERA" | "BATTERY" | "BUGS" | "VALUE";
  sentiment: "POSITIVE" | "MIXED" | "CRITICAL";
  verifiedAt: string;
}

export interface AffiliateOfferData {
  merchantName: string;
  priceUsd: number;
  inStock: boolean;
  perkNote: string;
  affiliateUrl: string;
}

export interface SmartphoneDevice {
  id: string;
  slug: string;
  brand: string;
  name: string;
  tagline: string;
  releaseDate: string;
  category:
    | "Ultra Flagship"
    | "Camera Flagship"
    | "Performance Flagship"
    | "Foldable"
    | "Battery King"
    | "Value Disruptor";
  launchMsrpUsd: number;
  currentStreetUsd: number;
  osSupportYears: number;
  compositeLivingScore: number;
  buyRecommendation: BuyRecommendation;
  scoreMetadata?: {
    modelVersion: string;
    status: "CURATED" | "SYNTHETIC" | "REVIEWED";
  };
  specs: DeviceSpecsData;
  verdicts: Record<EditorPersonaId, EditorVerdictData>;
  evidence: EvidenceChunkData[];
  affiliateOffers: AffiliateOfferData[];
  priceHistory: { month: string; priceUsd: number; livingScore: number }[];
  customProfile?: CustomPhysicalProfile;
  customIslandType?: string;
  customHeightMm?: number;
  customSpecOverrides?: Record<string, string>;
}

export interface EditorialDraftItem {
  id: string;
  deviceId: string;
  deviceName: string;
  type: "LIVING_SCORE_UPDATE" | "BUG_RADAR_ALERT" | "NEW_DEVICE_REVIEW" | "PRICE_DROP_TRIGGER";
  title: string;
  summary: string;
  leadEditorId: EditorPersonaId;
  coEditorId?: EditorPersonaId;
  confidenceScore: number;
  status: "PENDING_REVIEW" | "APPROVED_PUBLISHED" | "DISMISSED";
  proposedScoreDelta?: string;
  proposedNewPriceUsd?: number;
  presetKey?: string;
  citationsCount: number;
  createdAt: string;
  rawDiffSummary: string[];
}

export const INITIAL_DEVICES: SmartphoneDevice[] = [
  {
    id: "dev-s25-ultra",
    slug: "samsung-galaxy-s25-ultra",
    brand: "Samsung",
    name: "Galaxy S25 Ultra",
    tagline: "Anti-reflective titanium powerhouse with Snapdragon 8 Elite, held back by legacy Li-Ion battery tech.",
    releaseDate: "2025-02-07",
    category: "Ultra Flagship",
    launchMsrpUsd: 1299,
    currentStreetUsd: 1049,
    osSupportYears: 7,
    compositeLivingScore: 8.8,
    buyRecommendation: "BUY_ON_SALE",
    specs: {
      socName: "Snapdragon 8 Elite for Galaxy",
      socNodeNm: 3,
      cpuTopology: "2x 4.47GHz Oryon + 6x 3.53GHz",
      gpuName: "Adreno 830",
      ramOptions: "12GB / 16GB LPDDR5X",
      storageType: "UFS 4.0",
      geekbenchSingle: 3210,
      geekbenchMulti: 10140,
      wildlifeStabilityPct: 71.5,
      displaySizeInch: 6.9,
      displayPanelType: "Dynamic LTPO AMOLED 2X (Gorilla Armor 2 Anti-Reflective)",
      resolution: "3120 x 1440 (505 ppi)",
      refreshRateHz: "1-120Hz Adaptive",
      peakBrightnessNits: 2600,
      pwmDimmingHz: 480,
      mainSensorSize: "1/1.3\" ISOCELL HP2",
      mainSensorMp: 200,
      mainAperture: "f/1.7 (24mm OIS)",
      telephotoSpecs: "50MP 5x Periscope (1/2.52\") + 10MP 3x Optical (1/3.52\")",
      ultrawideSpecs: "50MP f/1.9 Dual-Pixel PDAF Macro",
      videoCapabilities: "8K30, 4K120, 10-bit Galaxy Log",
      shutterLagRating: "Moderate (Indoor motion blur still present at 1/30s default)",
      batteryCapacityMah: 5000,
      batteryChemistry: "Standard Li-Ion (No Silicon-Carbon)",
      wiredChargingW: 45,
      wirelessChargingW: 25,
      fullChargeMins: 59,
      weightGrams: 218,
      thicknessMm: 8.2,
      widthMm: 77.6,
      ipRating: "IP68 (1.5m / 30min)",
      fingerprintType: "Qualcomm 3D Sonic Ultrasonic",
      frameMaterial: "Grade 5 Titanium + Rounded Corners",
    },
    verdicts: {
      SILICON_GEEK: {
        editorId: "SILICON_GEEK",
        score: 9.0,
        headline: "Monster Oryon clocks and 40% larger vapor chamber, but 480Hz PWM and 5000mAh Li-Ion feel dated.",
        analysis:
          "Overclocked Snapdragon 8 Elite hits 3,210 single-core and maintains 71.5% stability in 3DMark Wild Life Extreme thanks to the enlarged vapor chamber. However, Samsung refusing to adopt 6000mAh Silicon-Carbon cells or 2160Hz PWM dimming keeps this short of perfection.",
        pros: [
          "Class-leading 3,210 / 10,140 Geekbench 6 CPU throughput",
          "Gorilla Armor 2 cuts ambient screen reflections by ~75%",
          "Ultrasonic fingerprint sensor is instantaneous even with wet thumbs",
        ],
        cons: [
          "480Hz PWM dimming triggers eye fatigue for flicker-sensitive users",
          "Stuck on 5000mAh Li-Ion and 45W charging for the 4th straight generation",
        ],
      },
      CAMERA_PURIST: {
        editorId: "CAMERA_PURIST",
        score: 8.7,
        headline: "Versatile dual-telephoto rig and new 50MP ultrawide, but indoor shutter lag still haunts moving subjects.",
        analysis:
          "The upgraded 50MP ultrawide and 10-bit Galaxy Log video make it a tremendous hybrid rig. Still, Samsung's auto-exposure algorithm prioritizes lower ISO over faster shutter speeds indoors, blurring pets and toddlers compared to Pixel and Vivo.",
        pros: [
          "10-bit Galaxy Log video with seamless lens switching at 4K60",
          "Upgraded 50MP ultrawide delivers crisp macro detail",
          "Reliable 3x + 5x optical focal coverage",
        ],
        cons: [
          "Main 1/1.3\" sensor and 3x 10MP sensor haven't grown physically since S23U",
          "Shutter lag on moving indoor kids without Camera Assistant tweaks",
        ],
      },
      PRAGMATIST: {
        editorId: "PRAGMATIST",
        score: 8.3,
        headline: "At $1,299 MSRP it was steep, but street drops to $1,049 across 7 OS years equal $150/yr.",
        analysis:
          "Never pay full $1,299 retail for a Galaxy Ultra. Now that street prices have settled around $1,049, paired with 7 years of guaranteed OS updates and strong carrier trade-in values, the annualized cost drops to $150/year.",
        pros: [
          "7 years of OS & security updates lowers annualized ownership cost",
          "Already trading $250 below launch MSRP on major retailers",
        ],
        cons: [
          "No charger in box and Bluetooth removed from included S-Pen",
          "High $1,299 launch MSRP requires waiting for retail discounts",
        ],
      },
      DAILY_DRIVER: {
        editorId: "DAILY_DRIVER",
        score: 9.2,
        headline: "Shaving 14g and rounding the sharp titanium corners fixed my biggest complaint with Ultra phones.",
        analysis:
          "Dropping from 232g to 218g and ditching the palm-stabbing 90-degree corners makes the S25 Ultra vastly easier to hold one-handed. One UI 7 animations are fluid, and the anti-reflective display is a daily joy outdoors.",
        pros: [
          "Rounded corners + 218g weight transform pocket and palm ergonomics",
          "Anti-reflective Gorilla Armor 2 makes outdoor readability unmatched",
          "Zero modem dropouts with Snapdragon X80",
        ],
        cons: [
          "77.6mm width still requires two hands for small-handed typists",
          "Wobbles slightly on flat desks without a protective case",
        ],
      },
    },
    evidence: [
      {
        id: "ev-s25u-1",
        sourceType: "LAB_BENCHMARK",
        sourceTitle: "20-Loop 3DMark Wild Life Extreme & Surface Thermals",
        sourceAuthor: "Geekerwan / Lab Telemetry",
        sourceUrl: "https://youtube.com",
        excerpt:
          "Peak loop score reaches 6,420 with 71.5% stability. Peak frame temperature hits 43.8°C near the upper titanium rail under sustained ray-tracing load.",
        topic: "THERMALS",
        sentiment: "POSITIVE",
        verifiedAt: "2026-09-12",
      },
      {
        id: "ev-s25u-2",
        sourceType: "REDDIT_OWNER_THREAD",
        sourceTitle: "r/GalaxyS25Ultra 6-Month Owner Megathread: Indoor Shutter Speed & S-Pen",
        sourceAuthor: "r/GalaxyS25Ultra Consensus (412 comments)",
        sourceUrl: "https://reddit.com/r/GalaxyS25Ultra",
        excerpt:
          "82% of owners praise battery endurance and the anti-reflective screen, while 34% still recommend installing Good Lock Camera Assistant to force faster shutter speeds on pets.",
        topic: "CAMERA",
        sentiment: "MIXED",
        verifiedAt: "2026-10-04",
      },
    ],
    affiliateOffers: [
      {
        merchantName: "Amazon Direct",
        priceUsd: 1049,
        inStock: true,
        perkNote: "Unlocked 256GB + Free 45W Adapter Bundle",
        affiliateUrl: "#affiliate-amazon-s25u",
      },
      {
        merchantName: "Samsung Store",
        priceUsd: 1099,
        inStock: true,
        perkNote: "Up to $750 instant trade-in credit",
        affiliateUrl: "#affiliate-samsung-s25u",
      },
      {
        merchantName: "Best Buy",
        priceUsd: 1049,
        inStock: true,
        perkNote: "Same-day pickup available",
        affiliateUrl: "#affiliate-bestbuy-s25u",
      },
    ],
    priceHistory: [
      { month: "Feb", priceUsd: 1299, livingScore: 8.3 },
      { month: "Apr", priceUsd: 1199, livingScore: 8.5 },
      { month: "Jul", priceUsd: 1099, livingScore: 8.7 },
      { month: "Oct", priceUsd: 1049, livingScore: 8.8 },
    ],
  },
  {
    id: "dev-vivo-x200-pro",
    slug: "vivo-x200-pro",
    brand: "Vivo",
    name: "Vivo X200 Pro",
    tagline: "The undisputed 200MP periscope tele-macro king with a 6000mAh Silicon-Carbon battery.",
    releaseDate: "2024-11-19",
    category: "Camera Flagship",
    launchMsrpUsd: 1099,
    currentStreetUsd: 899,
    osSupportYears: 4,
    compositeLivingScore: 9.0,
    buyRecommendation: "STRONG_BUY",
    specs: {
      socName: "MediaTek Dimensity 9400",
      socNodeNm: 3,
      cpuTopology: "1x 3.63GHz Cortex-X925 + 3x Cortex-X4 + 4x Cortex-A720",
      gpuName: "Immortalis-G925 MC12",
      ramOptions: "16GB LPDDR5X",
      storageType: "UFS 4.0",
      geekbenchSingle: 2915,
      geekbenchMulti: 9180,
      wildlifeStabilityPct: 78.4,
      displaySizeInch: 6.78,
      displayPanelType: "8T LTPO AMOLED (Zeiss Natural Color)",
      resolution: "2800 x 1260 (452 ppi)",
      refreshRateHz: "0.1-120Hz Adaptive",
      peakBrightnessNits: 4500,
      pwmDimmingHz: 2160,
      mainSensorSize: "1/1.28\" Sony LYT-818 (22nm process)",
      mainSensorMp: 50,
      mainAperture: "f/1.57 (23mm Gimbal OIS)",
      telephotoSpecs: "200MP 3.7x Zeiss APO Periscope (1/1.4\" Samsung HP9, 13.5cm Tele-Macro)",
      ultrawideSpecs: "50MP f/2.0 AF (1/2.76\")",
      videoCapabilities: "8K30, 4K120 Dolby Vision, 4K60 10-bit Log across all focal lengths",
      shutterLagRating: "Zero-Lag (Dedicated V3+ Imaging ASIC freezes motion at 1/250s+)",
      batteryCapacityMah: 6000,
      batteryChemistry: "3rd-Gen Semi-Solid Silicon-Carbon (Works to -20°C)",
      wiredChargingW: 90,
      wirelessChargingW: 30,
      fullChargeMins: 38,
      weightGrams: 223,
      thicknessMm: 8.49,
      widthMm: 75.9,
      ipRating: "IP68 + IP69 (High-pressure hot water jets)",
      fingerprintType: "3D Ultrasonic Single-Point",
      frameMaterial: "Aluminum Alloy + Fiberglass/Glass Back",
    },
    verdicts: {
      SILICON_GEEK: {
        editorId: "SILICON_GEEK",
        score: 9.4,
        headline: "6000mAh Silicon-Carbon + 2160Hz PWM + Dimensity 9400 efficiency is an engineering masterclass.",
        analysis:
          "Vivo packed a 6000mAh Silicon-Carbon battery into an 8.49mm chassis while keeping 2160Hz high-frequency PWM dimming across all brightness levels. Dimensity 9400 runs cooler than Snapdragon 8 Elite with 78.4% 3DMark stability.",
        pros: [
          "6000mAh Silicon-Carbon cell delivers 1.5 to 2 full days of heavy use",
          "2160Hz PWM dimming eliminates OLED eye strain",
          "IP69 high-temperature pressure water resistance",
        ],
        cons: [
          "1.5K resolution (452 ppi) slightly softer on text than QHD+ panels",
          "USB-C port placement slightly crowds bottom speaker when gaming",
        ],
      },
      CAMERA_PURIST: {
        editorId: "CAMERA_PURIST",
        score: 9.8,
        headline: "The 1/1.4\" 200MP Zeiss APO periscope is the best telephoto lens ever fitted to a smartphone.",
        analysis:
          "By fitting a massive 1/1.4-inch sensor behind an f/2.67 85mm periscope with floating tele-macro elements, the X200 Pro destroys every rival in portraits, concerts, and macro photography. The Sony LYT-818 main sensor also freezes moving kids with zero shutter lag.",
        pros: [
          "1/1.4\" 200MP periscope gathers 2.2x more light than S25 Ultra's 5x lens",
          "Zero shutter lag on fast-moving subjects with Zeiss Natural Color mode",
          "4K60 10-bit Log + 4K120 slow-motion on the telephoto lens",
        ],
        cons: [
          "Massive circular camera island causes lens flare at a 45° angle",
          "32MP fixed-focus selfie camera lacks autofocus for close vlogging",
        ],
      },
      PRAGMATIST: {
        editorId: "PRAGMATIST",
        score: 8.5,
        headline: "$899 street price with 90W charger in the box, tempered only by 4 years of OS support.",
        analysis:
          "Getting a 16GB/512GB camera titan with a 90W GaN charger in the box for $899 is tremendous hardware value. Its only pragmatic drawback is 4 years of OS updates versus 7 on Samsung/Pixel and lower US carrier trade-in liquidity.",
        pros: [
          "$899 street price undercuts US flagships by $200-$300",
          "Includes 90W fast charger and protective case in the retail box",
        ],
        cons: [
          "4 years of OS updates ($225/yr) trails Samsung and Google's 7 years",
          "Limited domestic US carrier trade-in programs for imported units",
        ],
      },
      DAILY_DRIVER: {
        editorId: "DAILY_DRIVER",
        score: 8.3,
        headline: "Top-heavy camera bump rests on your index finger, though Funtouch OS 15 is cleaner than expected.",
        analysis:
          "That giant Zeiss camera housing acts as a shelf for your index finger, making the phone feel top-heavy in bed. Ultrasonic fingerprint Unlock is instant, and Funtouch OS 15 is fast, though global unit availability requires checking 5G band n71 for T-Mobile US.",
        pros: [
          "Narrower 75.9mm width feels more grippable than Galaxy Ultra",
          "Fast ultrasonic fingerprint scanner positioned at an ideal thumb height",
        ],
        cons: [
          "Huge camera plateau wobbles unless paired with a raised lip case",
          "Missing mmWave and Band n71 on certain imported regional SKUs",
        ],
      },
    },
    evidence: [
      {
        id: "ev-vivo-1",
        sourceType: "YOUTUBE_TRANSCRIPT",
        sourceTitle: "Blind Camera Shootout: Vivo X200 Pro vs iPhone 16 Pro Max vs Galaxy S25 Ultra",
        sourceAuthor: "DPReview / PetaPixel Consensus",
        sourceUrl: "https://youtube.com",
        excerpt:
          "At 85mm and 135mm portrait focal lengths, the X200 Pro's 1/1.4-inch periscope resolves real optical bokeh and eyelash detail where Apple and Samsung rely on synthetic depth maps.",
        topic: "CAMERA",
        sentiment: "POSITIVE",
        verifiedAt: "2026-09-28",
      },
      {
        id: "ev-vivo-2",
        sourceType: "REDDIT_OWNER_THREAD",
        sourceTitle: "r/Vivo X200 Pro Long-Term Thread: Diagonal Lens Glare & Battery Life",
        sourceAuthor: "r/Vivo Community (289 comments)",
        sourceUrl: "https://reddit.com/r/Vivo",
        excerpt:
          "Owners consistently report 9–11 hours of Screen-on-Time with the 6000mAh cell. Off-axis arc glare in direct sunlight was partially mitigated via OTA AI anti-glare toggle.",
        topic: "BUGS",
        sentiment: "MIXED",
        verifiedAt: "2026-10-09",
      },
    ],
    affiliateOffers: [
      {
        merchantName: "WondaMobile Global",
        priceUsd: 899,
        inStock: true,
        perkNote: "Global Funtouch OS 16GB/512GB + Express DHL",
        affiliateUrl: "#affiliate-wonda-x200p",
      },
      {
        merchantName: "Amazon Marketplace",
        priceUsd: 949,
        inStock: true,
        perkNote: "Global Version with 90W FlashCharge Included",
        affiliateUrl: "#affiliate-amazon-x200p",
      },
    ],
    priceHistory: [
      { month: "Nov", priceUsd: 1099, livingScore: 8.6 },
      { month: "Feb", priceUsd: 999, livingScore: 8.8 },
      { month: "Jun", priceUsd: 939, livingScore: 8.9 },
      { month: "Oct", priceUsd: 899, livingScore: 9.0 },
    ],
  },
  {
    id: "dev-oneplus-13",
    slug: "oneplus-13",
    brand: "OnePlus",
    name: "OnePlus 13",
    tagline: "6000mAh Glacier Silicon-Carbon battery, 100W charging, and Snapdragon 8 Elite at an aggressive price.",
    releaseDate: "2025-01-07",
    category: "Performance Flagship",
    launchMsrpUsd: 899,
    currentStreetUsd: 749,
    osSupportYears: 4,
    compositeLivingScore: 9.1,
    buyRecommendation: "STRONG_BUY",
    specs: {
      socName: "Snapdragon 8 Elite",
      socNodeNm: 3,
      cpuTopology: "2x 4.32GHz Oryon + 6x 3.53GHz",
      gpuName: "Adreno 830",
      ramOptions: "12GB / 16GB LPDDR5X",
      storageType: "UFS 4.0",
      geekbenchSingle: 3140,
      geekbenchMulti: 9890,
      wildlifeStabilityPct: 76.2,
      displaySizeInch: 6.82,
      displayPanelType: "BOE X2 8T LTPO AMOLED (DisplayMate A++)",
      resolution: "3168 x 1440 (510 ppi)",
      refreshRateHz: "1-120Hz Adaptive",
      peakBrightnessNits: 4500,
      pwmDimmingHz: 2160,
      mainSensorSize: "1/1.4\" Sony LYT-808",
      mainSensorMp: 50,
      mainAperture: "f/1.6 (23mm OIS)",
      telephotoSpecs: "50MP 3x Triprism Periscope (1/1.95\" Sony LYT-600)",
      ultrawideSpecs: "50MP f/2.0 (120° FOV, Macro)",
      videoCapabilities: "8K30, 4K60 Dolby Vision on all lenses",
      shutterLagRating: "Fast (Dual-Exposure Action Mode eliminates motion blur)",
      batteryCapacityMah: 6000,
      batteryChemistry: "Dual-Cell Glacier Silicon-Carbon",
      wiredChargingW: 100,
      wirelessChargingW: 50,
      fullChargeMins: 36,
      weightGrams: 210,
      thicknessMm: 8.5,
      widthMm: 76.5,
      ipRating: "IP68 + IP69",
      fingerprintType: "Ultrasonic Fingerprint + Aqua Touch 2.0",
      frameMaterial: "Aluminum + Microfiber Vegan Leather / Satin Glass",
    },
    verdicts: {
      SILICON_GEEK: {
        editorId: "SILICON_GEEK",
        score: 9.6,
        headline: "QHD+ 2160Hz PWM, 6000mAh dual-cell Silicon-Carbon, and 0-100% in 36 minutes.",
        analysis:
          "OnePlus checked every single item on my enthusiast wishlist: Snapdragon 8 Elite paired with a 9925mm² dual-cryo vapor chamber, a 6000mAh Silicon-Carbon battery that charges at 80W/100W in 36 minutes, QHD+ resolution with 2160Hz PWM dimming, and IP69 ingress protection.",
        pros: [
          "6000mAh Silicon-Carbon + 36-minute full charge crushes Apple/Samsung",
          "QHD+ BOE X2 panel with 2160Hz PWM DC-like dimming",
          "Upgraded from optical to fast ultrasonic fingerprint scanner",
        ],
        cons: [
          "Magnetic wireless charging requires an official MagSafe-style case",
          "Peak 100W charging requires proprietary SuperVOOC brick and cable",
        ],
      },
      CAMERA_PURIST: {
        editorId: "CAMERA_PURIST",
        score: 8.4,
        headline: "Hasselblad color tuning and zero-lag Dual Exposure impress, though 3x periscope lacks close macro focus.",
        analysis:
          "The new Dual-Exposure algorithm finally lets OnePlus freeze running pets in dim lighting, and Hasselblad portrait falloff looks organic. However, the 3x triprism periscope has a 45cm minimum focus distance, so it cannot do close-up tele-macro shots like Vivo.",
        pros: [
          "Dual-Exposure algorithm fixes historic OnePlus motion blur",
          "Rich, high-contrast Hasselblad color science and 4K60 Dolby Vision",
        ],
        cons: [
          "3x triprism lens cannot focus closely for tele-macro shots",
          "Low-light dynamic range trails Vivo X200 Pro past 6x zoom",
        ],
      },
      PRAGMATIST: {
        editorId: "PRAGMATIST",
        score: 9.2,
        headline: "At $749 street price, it delivers 95% of $1,300 Ultra flagships for $550 less.",
        analysis:
          "With street prices hitting $749 and an 80W SuperVOOC brick still included in the North American box, the OnePlus 13 is the undisputed flagship value king of 2025/2026.",
        pros: [
          "$749 street price makes $1,200+ flagships hard to justify",
          "80W/100W SuperVOOC charger included inside the box",
        ],
        cons: [
          "4 years of OS updates + 6 years security (shorter than Samsung's 7 yrs)",
          "50W AirVOOC wireless dock sold separately for $50",
        ],
      },
      DAILY_DRIVER: {
        editorId: "DAILY_DRIVER",
        score: 9.3,
        headline: "210g microfiber vegan leather back, physical Alert Slider, and Aqua Touch 2.0 make it effortless.",
        analysis:
          "The Midnight Ocean microfiber vegan leather back never shows fingerprints, weighs just 210g despite a 6000mAh battery, and Aqua Touch 2.0 lets you type accurately in pouring rain or with wet hands in the kitchen.",
        pros: [
          "Three-stage physical Alert Slider + IR blaster built in",
          "Aqua Touch 2.0 works flawlessly in rain or steamy bathrooms",
          "OxygenOS 15 has the snappiest multitasking animations on Android",
        ],
        cons: [
          "Micro-quad-curved glass edges make tempered glass protectors tricky",
          "Pre-applied plastic screen film attracts lint within two weeks",
        ],
      },
    },
    evidence: [
      {
        id: "ev-op13-1",
        sourceType: "YOUTUBE_TRANSCRIPT",
        sourceTitle: "OnePlus 13 Durability, IP69 Dishwasher Test & Charging Curve",
        sourceAuthor: "JerryRigEverything / Charging Lab",
        sourceUrl: "https://youtube.com",
        excerpt:
          "Survives an entire hot high-pressure dishwasher cycle via IP69 certification and charges from 1% to 50% in 13 minutes, 100% in 36 minutes.",
        topic: "BATTERY",
        sentiment: "POSITIVE",
        verifiedAt: "2026-09-18",
      },
      {
        id: "ev-op13-2",
        sourceType: "REDDIT_OWNER_THREAD",
        sourceTitle: "r/OnePlus 13 Owner Survey: Ultrasonic Sensor & Battery Degradation",
        sourceAuthor: "r/OnePlus Community (530 comments)",
        sourceUrl: "https://reddit.com/r/oneplus",
        excerpt:
          "94% satisfaction rate; owners highlight zero idle battery drain on OxygenOS 15 and praise the switch from low-mounted optical to high-mounted ultrasonic fingerprint.",
        topic: "VALUE",
        sentiment: "POSITIVE",
        verifiedAt: "2026-10-11",
      },
    ],
    affiliateOffers: [
      {
        merchantName: "Best Buy",
        priceUsd: 749,
        inStock: true,
        perkNote: "Unlocked 256GB + $100 Gift Card Promo",
        affiliateUrl: "#affiliate-bestbuy-op13",
      },
      {
        merchantName: "OnePlus Official",
        priceUsd: 779,
        inStock: true,
        perkNote: "Free Magnetic Aramid Case + 80W Charger in box",
        affiliateUrl: "#affiliate-oneplus-op13",
      },
    ],
    priceHistory: [
      { month: "Jan", priceUsd: 899, livingScore: 8.7 },
      { month: "Apr", priceUsd: 829, livingScore: 8.9 },
      { month: "Jul", priceUsd: 799, livingScore: 9.0 },
      { month: "Oct", priceUsd: 749, livingScore: 9.1 },
    ],
  },
  {
    id: "dev-iphone-16-pm",
    slug: "apple-iphone-16-pro-max",
    brand: "Apple",
    name: "iPhone 16 Pro Max",
    tagline: "Unrivaled 4K120 ProRes video and resale retention, paired with slow charging and a polarizing Camera Control button.",
    releaseDate: "2024-09-20",
    category: "Ultra Flagship",
    launchMsrpUsd: 1199,
    currentStreetUsd: 1089,
    osSupportYears: 6,
    compositeLivingScore: 8.5,
    buyRecommendation: "BUY_ON_SALE",
    specs: {
      socName: "Apple A18 Pro",
      socNodeNm: 3,
      cpuTopology: "2x 4.05GHz Performance + 4x 2.42GHz Efficiency",
      gpuName: "Apple 6-Core GPU",
      ramOptions: "8GB LPDDR5X",
      storageType: "NVMe",
      geekbenchSingle: 3420,
      geekbenchMulti: 8590,
      wildlifeStabilityPct: 68.0,
      displaySizeInch: 6.9,
      displayPanelType: "LTPO Super Retina XDR OLED (1 nit minimum)",
      resolution: "2868 x 1320 (460 ppi)",
      refreshRateHz: "1-120Hz ProMotion",
      peakBrightnessNits: 2000,
      pwmDimmingHz: 480,
      mainSensorSize: "1/1.28\" Sony IMX903 (2x faster readout)",
      mainSensorMp: 48,
      mainAperture: "f/1.78 (24mm Sensor-Shift OIS)",
      telephotoSpecs: "12MP 5x Tetraprism (1/3.06\" f/2.8, 120mm)",
      ultrawideSpecs: "48MP f/2.2 (1/2.55\" PDAF Macro)",
      videoCapabilities: "4K120 Dolby Vision & ProRes Log to External SSD, Studio Mics",
      shutterLagRating: "Zero-Lag (Faster IMX903 readout eliminates zero-shutter delay)",
      batteryCapacityMah: 4685,
      batteryChemistry: "Steel-Cased Li-Ion",
      wiredChargingW: 30,
      wirelessChargingW: 25,
      fullChargeMins: 102,
      weightGrams: 227,
      thicknessMm: 8.25,
      widthMm: 77.6,
      ipRating: "IP68 (6m / 30min)",
      fingerprintType: "Face ID (TrueDepth SL)",
      frameMaterial: "Grade 5 Titanium + Ceramic Shield (2024)",
    },
    verdicts: {
      SILICON_GEEK: {
        editorId: "SILICON_GEEK",
        score: 8.5,
        headline: "3,420 single-core IPC still leads the industry, but 8GB RAM and a 102-minute charge time are stubborn.",
        analysis:
          "A18 Pro's single-thread IPC and efficiency per watt enable stellar battery runtime from a 4685mAh cell. Yet taking 1 hour and 42 minutes to reach 100% and shipping 8GB RAM while Android rivals ship 16GB is classic Apple stinginess.",
        pros: [
          "Highest single-core CPU efficiency (3,420 Geekbench 6)",
          "1-nit minimum brightness is effortless for pitch-black bedroom reading",
        ],
        cons: [
          "102-minute 0-100% wired charge time is nearly 3x slower than OnePlus 13",
          "8GB RAM leaves less headroom for local on-device LLM caching",
        ],
      },
      CAMERA_PURIST: {
        editorId: "CAMERA_PURIST",
        score: 9.2,
        headline: "4K120 ProRes Log + 4-mic spatial audio is untouchable for video, and Photographic Styles v2 fixes skin tones.",
        analysis:
          "For video creators, nothing touches 4K120 ProRes Log recording directly to a MagSafe SSD. The new real-time Photographic Styles tone pad also lets you dial back Apple's flat shadows. However, the 1/3.06\" 5x tetraprism sensor gets noisy indoors, and the 2x-to-4.9x crop gap is rough.",
        pros: [
          "Industry-standard 4K120 ProRes Log + studio-grade wind noise reduction",
          "Updated Photographic Styles solve years of overly warm, flat HDR skin tones",
        ],
        cons: [
          "Tiny 1/3.06\" 5x sensor struggles in dim indoor lighting",
          "Awkward digital crop quality between 2.5x and 4.9x focal lengths",
        ],
      },
      PRAGMATIST: {
        editorId: "PRAGMATIST",
        score: 8.1,
        headline: "Rarely discounted deeply upfront, but 62% 2-year resale retention softens the net cost.",
        analysis:
          "While street discounts are modest ($1,089 vs $1,199 MSRP), the iPhone 16 Pro Max holds ~62% of its cash value after 24 months, meaning your net out-of-pocket depreciation is actually lower than many Android phones that lose 55% in year one.",
        pros: [
          "Highest cash resale and trade-in retention in the smartphone market",
          "6+ years of day-one iOS feature updates and easy Apple Store battery swaps",
        ],
        cons: [
          "High $1,089 upfront outlay and expensive AppleCare+ deductibles",
          "Storage upgrades ($200 for 512GB) carry steep OEM markups",
        ],
      },
      DAILY_DRIVER: {
        editorId: "DAILY_DRIVER",
        score: 8.3,
        headline: "227g heft and a awkwardly placed Camera Control button make one-handed grip a workout.",
        analysis:
          "Stretching to 6.9 inches at 227g makes pinky-shelf fatigue real. Worse, the capacitive Camera Control button sits too far from the bottom corner in portrait orientation and causes slight frame shift when half-pressed.",
        pros: [
          "Best MagSafe ecosystem accessories and ultra-consistent haptics",
          "Rock-solid Face ID and satellite roadside/messaging integration",
        ],
        cons: [
          "Camera Control button placement is awkward in both portrait and one-handed use",
          "227g weight + 77.6mm width is taxing for smaller hands",
        ],
      },
    },
    evidence: [
      {
        id: "ev-ip16pm-1",
        sourceType: "YOUTUBE_TRANSCRIPT",
        sourceTitle: "iPhone 16 Pro Max Cinema Rig Test & Camera Control Ergonomics",
        sourceAuthor: "MKBHD / Gerald Undone",
        sourceUrl: "https://youtube.com",
        excerpt:
          "4K120 Log graded in DaVinci Resolve cuts seamlessly with Sony FX3 B-cam footage, though almost every reviewer admits turning off the capacitive Camera Control swipe slider after week two.",
        topic: "CAMERA",
        sentiment: "POSITIVE",
        verifiedAt: "2026-08-30",
      },
      {
        id: "ev-ip16pm-2",
        sourceType: "REDDIT_OWNER_THREAD",
        sourceTitle: "r/iPhone 16 Pro Max Poll: Do you actually use the Camera Control button?",
        sourceAuthor: "r/iPhone Poll (1,420 votes)",
        sourceUrl: "https://reddit.com/r/iphone",
        excerpt:
          "68% of respondents use Camera Control solely as a quick-launch shutter shortcut and disabled the capacitive half-press menu due to accidental zooms.",
        topic: "BUGS",
        sentiment: "MIXED",
        verifiedAt: "2026-10-02",
      },
    ],
    affiliateOffers: [
      {
        merchantName: "Amazon Renewed Premium / Direct",
        priceUsd: 1089,
        inStock: true,
        perkNote: "256GB Desert Titanium Unlocked (100% Battery Health)",
        affiliateUrl: "#affiliate-amazon-16pm",
      },
      {
        merchantName: "B&H Photo",
        priceUsd: 1119,
        inStock: true,
        perkNote: "Tax-free with Payboo Card in eligible states",
        affiliateUrl: "#affiliate-bh-16pm",
      },
    ],
    priceHistory: [
      { month: "Sep", priceUsd: 1199, livingScore: 8.3 },
      { month: "Jan", priceUsd: 1149, livingScore: 8.4 },
      { month: "Jun", priceUsd: 1119, livingScore: 8.4 },
      { month: "Oct", priceUsd: 1089, livingScore: 8.5 },
    ],
  },
  {
    id: "dev-pixel-9-pro-xl",
    slug: "google-pixel-9-pro-xl",
    brand: "Google",
    name: "Pixel 9 Pro XL",
    tagline: "Fixed modem, ultra-bright Super Actua OLED, and effortless point-and-shoot stills, though limited by Tensor G4 gaming headroom.",
    releaseDate: "2024-08-22",
    category: "Camera Flagship",
    launchMsrpUsd: 1099,
    currentStreetUsd: 799,
    osSupportYears: 7,
    compositeLivingScore: 8.4,
    buyRecommendation: "BUY_ON_SALE",
    specs: {
      socName: "Google Tensor G4 (Samsung 4nm)",
      socNodeNm: 4,
      cpuTopology: "1x 3.1GHz Cortex-X4 + 3x 2.6GHz A720 + 4x 1.95GHz A520",
      gpuName: "Mali-G715 MC7",
      ramOptions: "16GB LPDDR5X",
      storageType: "UFS 3.1",
      geekbenchSingle: 1965,
      geekbenchMulti: 4720,
      wildlifeStabilityPct: 62.1,
      displaySizeInch: 6.8,
      displayPanelType: "LTPO OLED Super Actua",
      resolution: "2992 x 1344 (486 ppi)",
      refreshRateHz: "1-120Hz Adaptive",
      peakBrightnessNits: 3000,
      pwmDimmingHz: 240,
      mainSensorSize: "1/1.31\" Samsung GNK",
      mainSensorMp: 50,
      mainAperture: "f/1.68 (25mm OIS)",
      telephotoSpecs: "48MP 5x Periscope (1/2.55\" f/2.8)",
      ultrawideSpecs: "48MP f/1.7 Macro Focus",
      videoCapabilities: "8K30 (Cloud Video Boost), 4K60 HDR",
      shutterLagRating: "Zero-Lag (Best-in-class Face Unblur & indoor toddler freeze)",
      batteryCapacityMah: 5060,
      batteryChemistry: "Standard Li-Ion",
      wiredChargingW: 37,
      wirelessChargingW: 23,
      fullChargeMins: 76,
      weightGrams: 221,
      thicknessMm: 8.5,
      widthMm: 76.6,
      ipRating: "IP68",
      fingerprintType: "Qualcomm 3D Sonic Ultrasonic",
      frameMaterial: "Recycled Aluminum + Matte Gorilla Glass Victus 2",
    },
    verdicts: {
      SILICON_GEEK: {
        editorId: "SILICON_GEEK",
        score: 7.2,
        headline: "Shipping UFS 3.1 storage, a 4nm Tensor G4 at half the CPU score of Snapdragon, and 240Hz PWM in a $1,099 flagship is rough.",
        analysis:
          "While the Exynos 5400 modem finally fixed Pixel's cellular heating and signal drops, Tensor G4 scores 4,720 multi-core vs 10,140 on Snapdragon 8 Elite, uses older UFS 3.1 flash storage, and flickers at a harsh 240Hz PWM rate.",
        pros: [
          "New Exynos 5400 modem + vapor chamber cures older Pixel cellular overheating",
          "16GB RAM with 3GB dedicated to local Gemini Nano",
          "3000-nit Super Actua OLED cuts through noon glare",
        ],
        cons: [
          "Tensor G4 GPU/CPU trails Snapdragon 8 Elite by nearly 50% in raw compute",
          "UFS 3.1 storage and 240Hz PWM dimming belong on a $400 phone, not a Pro flagship",
        ],
      },
      CAMERA_PURIST: {
        editorId: "CAMERA_PURIST",
        score: 9.1,
        headline: "Still the easiest point-and-shoot camera for parents with moving kids and diverse skin tones.",
        analysis:
          "Real Tone color accuracy and HDR+ zero-shutter-lag burst merging make the Pixel 9 Pro XL foolproof for parents shooting hyperactive kids indoors. However, native on-device video lags behind Apple and Vivo unless you wait hours for Cloud Video Boost.",
        pros: [
          "Unbeatable point-and-shoot reliability on moving kids and pets indoors",
          "Real Tone skin rendering across all lighting conditions",
          "42MP front selfie camera with wide 103° FOV",
        ],
        cons: [
          "Best night video requires uploading clips to Google Cloud Video Boost",
          "Harsh portrait mode edge cutout on curly hair without optical depth",
        ],
      },
      PRAGMATIST: {
        editorId: "PRAGMATIST",
        score: 8.5,
        headline: "Never buy a Pixel at $1,099 MSRP, but at $799 street price with 7 years of updates ($114/yr), it's a smart buy.",
        analysis:
          "At its $1,099 launch price, Tensor G4 and 128GB UFS 3.1 base storage were overpriced. Now that street prices have dropped $300 to $799 with 7 years of day-one Android drops, it hits $114/year.",
        pros: [
          "$300 street price discount ($799) + 7 years of day-one Android OS drops",
          "Frequent Google Store enhanced trade-in promos",
        ],
        cons: [
          "Base SKU still starts at 128GB UFS 3.1",
          "Resale value drops faster than iPhone and Galaxy Ultra in year one",
        ],
      },
      DAILY_DRIVER: {
        editorId: "DAILY_DRIVER",
        score: 8.9,
        headline: "Call Screen, Hold for Me, and the new ultrasonic fingerprint scanner make it the smartest phone to live with.",
        analysis:
          "Replacing the slow optical scanner with a fast ultrasonic fingerprint reader and switching to a cool-running modem transformed daily Pixel ownership. Call Screen and Pixel Screenshots save genuine time every single week.",
        pros: [
          "Call Screen, Hold for Me, and clean zero-bloat Pixel UI",
          "Ultrasonic fingerprint scanner + Class 3 secure Face Unlock",
          "Flat rails and matte back feel premium and solid",
        ],
        cons: [
          "37W charging slows dramatically after 70%",
          "Glossy aluminum camera visor scratches easily in pockets with keys",
        ],
      },
    },
    evidence: [
      {
        id: "ev-p9pxl-1",
        sourceType: "REDDIT_OWNER_THREAD",
        sourceTitle: "r/GooglePixel: Did the Exynos 5400 Modem actually fix 5G battery drain?",
        sourceAuthor: "r/GooglePixel Megathread (690 comments)",
        sourceUrl: "https://reddit.com/r/GooglePixel",
        excerpt:
          "89% of upgraders coming from Pixel 6/7/8 confirm cellular reception and 5G standby temperatures are night-and-day cooler on the Pixel 9 Pro series.",
        topic: "THERMALS",
        sentiment: "POSITIVE",
        verifiedAt: "2026-09-21",
      },
      {
        id: "ev-p9pxl-2",
        sourceType: "LAB_BENCHMARK",
        sourceTitle: "UFS 3.1 vs UFS 4.0 Sequential Read/Write & Genshin Impact Frame Pacing",
        sourceAuthor: "NotebookCheck Lab",
        sourceUrl: "https://notebookcheck.net",
        excerpt:
          "Sequential write speeds top out around 1,180 MB/s (UFS 3.1) compared to 3,850 MB/s on UFS 4.0 rivals; heavy 3D games drop to 44fps after 20 minutes.",
        topic: "THERMALS",
        sentiment: "CRITICAL",
        verifiedAt: "2026-09-05",
      },
    ],
    affiliateOffers: [
      {
        merchantName: "Amazon Direct",
        priceUsd: 799,
        inStock: true,
        perkNote: "Unlocked Hazel / Obsidian ($300 Off MSRP)",
        affiliateUrl: "#affiliate-amazon-p9pxl",
      },
      {
        merchantName: "Best Buy",
        priceUsd: 819,
        inStock: true,
        perkNote: "Includes 3 Months Google One AI Premium",
        affiliateUrl: "#affiliate-bestbuy-p9pxl",
      },
    ],
    priceHistory: [
      { month: "Aug", priceUsd: 1099, livingScore: 7.9 },
      { month: "Nov", priceUsd: 949, livingScore: 8.1 },
      { month: "Apr", priceUsd: 849, livingScore: 8.3 },
      { month: "Oct", priceUsd: 799, livingScore: 8.4 },
    ],
  },
  {
    id: "dev-nothing-3a-pro",
    slug: "nothing-phone-3a-pro",
    brand: "Nothing",
    name: "Nothing Phone (3a) Pro",
    tagline: "A $459 mid-range rebel packing a true 3x periscope tele-macro lens, 2160Hz PWM, and zero-bloat Nothing OS.",
    releaseDate: "2025-03-11",
    category: "Value Disruptor",
    launchMsrpUsd: 459,
    currentStreetUsd: 419,
    osSupportYears: 4,
    compositeLivingScore: 8.6,
    buyRecommendation: "STRONG_BUY",
    specs: {
      socName: "Snapdragon 7s Gen 3",
      socNodeNm: 4,
      cpuTopology: "1x 2.5GHz Cortex-A720 + 3x 2.4GHz A720 + 4x 1.8GHz A520",
      gpuName: "Adreno 810",
      ramOptions: "12GB LPDDR4X",
      storageType: "UFS 2.2",
      geekbenchSingle: 1190,
      geekbenchMulti: 3340,
      wildlifeStabilityPct: 91.2,
      displaySizeInch: 6.77,
      displayPanelType: "Flexible AMOLED (Panda Glass)",
      resolution: "2392 x 1080 (387 ppi)",
      refreshRateHz: "30-120Hz Adaptive",
      peakBrightnessNits: 3000,
      pwmDimmingHz: 2160,
      mainSensorSize: "1/1.56\" Samsung GNJ",
      mainSensorMp: 50,
      mainAperture: "f/1.88 (24mm OIS)",
      telephotoSpecs: "50MP 3x Periscope (1/1.95\" Sony LYT-600, 15cm Tele-Macro)",
      ultrawideSpecs: "8MP f/2.2 (120° FOV)",
      videoCapabilities: "4K30 OIS, 1080p60",
      shutterLagRating: "Moderate (Slight HDR processing pause between rapid shots)",
      batteryCapacityMah: 5000,
      batteryChemistry: "High-Cycle Li-Ion",
      wiredChargingW: 50,
      wirelessChargingW: 0,
      fullChargeMins: 52,
      weightGrams: 211,
      thicknessMm: 8.39,
      widthMm: 77.5,
      ipRating: "IP64 (Splash resistant)",
      fingerprintType: "Optical Under-Display",
      frameMaterial: "Recycled Aluminum Mid-Frame + Transparent Glass Glyph Back",
    },
    verdicts: {
      SILICON_GEEK: {
        editorId: "SILICON_GEEK",
        score: 7.8,
        headline: "91.2% thermal stability and 2160Hz PWM dimming at $419, though UFS 2.2 storage is a bottleneck.",
        analysis:
          "Snapdragon 7s Gen 3 runs ice-cold with 91.2% stability, and Nothing included 2160Hz high-frequency PWM dimming that embarrasses $1,200 Samsung and Apple displays. My only gripe is UFS 2.2 storage slowing down large app installs.",
        pros: [
          "2160Hz PWM dimming protects flicker-sensitive eyes",
          "91.2% sustained thermal stability, so it never gets uncomfortably warm",
        ],
        cons: [
          "UFS 2.2 storage slows down heavy photo burst saving",
          "No wireless charging coils",
        ],
      },
      CAMERA_PURIST: {
        editorId: "CAMERA_PURIST",
        score: 8.4,
        headline: "A genuine 1/1.95\" Sony LYT-600 3x periscope with 15cm tele-macro on a $419 phone is unheard of.",
        analysis:
          "While Samsung and Apple sell $800 base phones without any telephoto lens, Nothing put a 50MP 3x periscope with 15cm close-focus macro into a $419 device. Portraits and macro shots punch $400 above its weight, though the 8MP ultrawide is forgettable.",
        pros: [
          "True 50MP 3x Sony LYT-600 periscope with 15cm tele-macro focus",
          "Glyph interface doubles as a diffused fill light for close portraits",
        ],
        cons: [
          "Weak 8MP ultrawide sensor and capped at 4K30 video",
          "Slight HDR processing pause when firing rapid consecutive shots",
        ],
      },
      PRAGMATIST: {
        editorId: "PRAGMATIST",
        score: 9.5,
        headline: "At $419 ($105/yr), it obliterates every $500 mid-ranger from Samsung Galaxy A-series and Pixel a-series.",
        analysis:
          "For $419 street price, you get distinctive industrial design, a 3x periscope camera, a 5000mAh battery that retains 90% capacity after 1,200 cycles, and zero pre-installed adware.",
        pros: [
          "$419 street price = $105/yr ownership cost",
          "Zero bloatware or lockscreen ads unlike Xiaomi/Poco mid-rangers",
        ],
        cons: [
          "Only IP64 splash resistance instead of full IP68 submersion",
          "No AC charging brick included in the slim retail box",
        ],
      },
      DAILY_DRIVER: {
        editorId: "DAILY_DRIVER",
        score: 8.7,
        headline: "Nothing OS 3.0 monochrome widgets and Glyph countdown timers make it genuinely fun to use.",
        analysis:
          "Nothing OS 3.0 feels cohesive, playful, and fast despite mid-range silicon. Flip-to-Glyph silences distractions in meetings while showing Uber/delivery progress bars on the back LED strips.",
        pros: [
          "Best Android skin aesthetic + practical Glyph progress timers",
          "Essential Key hardware shortcut for voice notes and visual reminders",
        ],
        cons: [
          "Low-mounted optical fingerprint sensor is bright in dark bedrooms",
          "Essential Key placement below power button can cause accidental presses",
        ],
      },
    },
    evidence: [
      {
        id: "ev-np3a-1",
        sourceType: "YOUTUBE_TRANSCRIPT",
        sourceTitle: "Nothing Phone (3a) Pro Review: How Did They Fit a Periscope for $459?",
        sourceAuthor: "Mrwhosetheboss / GSMArena Lab",
        sourceUrl: "https://youtube.com",
        excerpt:
          "The 3x Sony LYT-600 periscope captures 15cm macro insects and 70mm portraits that easily beat the base iPhone 16 and Galaxy S25.",
        topic: "VALUE",
        sentiment: "POSITIVE",
        verifiedAt: "2026-09-14",
      },
    ],
    affiliateOffers: [
      {
        merchantName: "Amazon Direct",
        priceUsd: 419,
        inStock: true,
        perkNote: "12GB/256GB Metallic Grey Unlocked",
        affiliateUrl: "#affiliate-amazon-np3a",
      },
      {
        merchantName: "Nothing US Store",
        priceUsd: 439,
        inStock: true,
        perkNote: "Includes Ear (a) 30% bundle discount",
        affiliateUrl: "#affiliate-nothing-np3a",
      },
    ],
    priceHistory: [
      { month: "Mar", priceUsd: 459, livingScore: 8.4 },
      { month: "Jun", priceUsd: 439, livingScore: 8.5 },
      { month: "Oct", priceUsd: 419, livingScore: 8.6 },
    ],
  },
];

