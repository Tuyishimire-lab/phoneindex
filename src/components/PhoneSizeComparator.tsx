"use client";

import React, { useRef, useState } from "react";
import Image from "next/image";
import { SmartphoneDevice, INITIAL_DEVICES } from "@/lib/seed-data";
import { VisualFidelityBadge } from "@/components/VisualFidelityBadge";
import { resolveDeviceVisualProfile } from "@/lib/visual-profiles/resolver";
import {
  Layers,
  Maximize2,
  Hand,
  RotateCcw,
  Upload,
  Sparkles,
  Trash2,
  Scale,
  SlidersHorizontal,
  Eye,
} from "lucide-react";
import {
  CustomPhysicalProfile,
  ModeledIslandShape,
  ModeledLensArrangement,
  ModeledPropDummyGeometry,
  generatePhysicalProfileFromImage,
} from "@/lib/image-profile-extractor";
import {
  CameraIslandGeometry,
  FrontCutoutGeometry,
  calculateChassisDimensions,
} from "@/lib/visual-profiles/cad-engine";

export interface PhoneSizeComparatorProps {
  deviceA?: SmartphoneDevice;
  deviceB?: SmartphoneDevice;
  devices?: SmartphoneDevice[];
  onUpdateDeviceProfile?: (
    deviceId: string,
    profile: CustomPhysicalProfile | undefined
  ) => void;
}

export const PARAMETRIC_ARCHETYPE_PRESETS: {
  name: string;
  geometry: ModeledPropDummyGeometry;
}[] = [
  {
    name: "5-Ring Ultra",
    geometry: {
      islandShape: "FLOATING_RINGS",
      lensArrangement: "VERTICAL_STACK",
      lensCount: 4,
      wPct: 36,
      hPct: 32,
      xPct: 6,
      yPct: 5,
      islandCornerRadiusPx: 8,
      chassisCornerRadiusPx: 4,
      hasPeriscopePrism: true,
      badgeText: "ULTRA",
    },
  },
  {
    name: "Center Zeiss Circle",
    geometry: {
      islandShape: "CENTER_CIRCLE",
      lensArrangement: "QUAD_MATRIX",
      lensCount: 4,
      wPct: 52,
      hPct: 25,
      xPct: 24,
      yPct: 8,
      islandCornerRadiusPx: 50,
      chassisCornerRadiusPx: 22,
      hasPeriscopePrism: false,
      badgeText: "ZEISS",
    },
  },
  {
    name: "3-Lens Pro Squircle",
    geometry: {
      islandShape: "SQUIRCLE_PLATEAU",
      lensArrangement: "TRIANGLE_PRO",
      lensCount: 3,
      wPct: 44,
      hPct: 23,
      xPct: 7,
      yPct: 5,
      islandCornerRadiusPx: 16,
      chassisCornerRadiusPx: 24,
      hasPeriscopePrism: false,
      badgeText: "PRO",
    },
  },
  {
    name: "Vertical Stadium Pill",
    geometry: {
      islandShape: "VERTICAL_PILL",
      lensArrangement: "VERTICAL_STACK",
      lensCount: 3,
      wPct: 28,
      hPct: 28,
      xPct: 7,
      yPct: 6,
      islandCornerRadiusPx: 16,
      chassisCornerRadiusPx: 20,
      hasPeriscopePrism: false,
      badgeText: "PILL",
    },
  },
  {
    name: "Pixel Oval Visor",
    geometry: {
      islandShape: "HORIZONTAL_VISOR",
      lensArrangement: "HORIZONTAL_ROW",
      lensCount: 3,
      wPct: 84,
      hPct: 16,
      xPct: 8,
      yPct: 9,
      islandCornerRadiusPx: 18,
      chassisCornerRadiusPx: 22,
      hasPeriscopePrism: false,
      badgeText: "VISOR",
    },
  },
  {
    name: "2x2 Leica Squircle",
    geometry: {
      islandShape: "SQUIRCLE_PLATEAU",
      lensArrangement: "QUAD_MATRIX",
      lensCount: 4,
      wPct: 46,
      hPct: 24,
      xPct: 7,
      yPct: 5,
      islandCornerRadiusPx: 14,
      chassisCornerRadiusPx: 20,
      hasPeriscopePrism: false,
      badgeText: "LEICA",
    },
  },
  {
    name: "2-Tier Loewe Rect",
    geometry: {
      islandShape: "TWO_TIER_RECT",
      lensArrangement: "TWO_TIER_LOEWE",
      lensCount: 3,
      wPct: 64,
      hPct: 26,
      xPct: 18,
      yPct: 6,
      islandCornerRadiusPx: 8,
      chassisCornerRadiusPx: 12,
      hasPeriscopePrism: true,
      badgeText: "LOEWE.",
    },
  },
];

export function formatDeviceLabel(dev: SmartphoneDevice): string {
  if (dev.name.toLowerCase().startsWith(dev.brand.toLowerCase())) {
    return dev.name;
  }
  return `${dev.brand} ${dev.name}`;
}

function getBasePhysicalProfile(dev: SmartphoneDevice): {
  heightMm: number;
  widthMm: number;
  thicknessMm: number;
  cornerRadiusPx: number;
  islandType: CameraIslandGeometry;
  frontCutout: FrontCutoutGeometry;
  bezelMm: number;
} {
  return calculateChassisDimensions(dev);
}

export type FoldableFormFactor = "BOOK_FOLD" | "CLAMSHELL_FLIP";
export type FoldablePostureState = "UNFOLDED_OPEN" | "FOLDED_CLOSED";

export interface FoldableKinematicsProfile {
  foldType: FoldableFormFactor;
  unfoldedHeightMm: number;
  unfoldedWidthMm: number;
  unfoldedThicknessMm: number;
  foldedHeightMm: number;
  foldedWidthMm: number;
  foldedThicknessMm: number;
  innerDisplayInch: number;
  innerDisplayLabel: string;
  coverDisplayInch: number;
  coverDisplayLabel: string;
  hingeArchitecture: string;
  creaseDepthMm: string;
}

export function getFoldableKinematics(
  dev: SmartphoneDevice
): FoldableKinematicsProfile | null {
  const slug = dev.slug.toLowerCase();
  const name = dev.name.toLowerCase();
  const isFoldable =
    dev.category === "Foldable" ||
    slug.includes("fold") ||
    slug.includes("flip") ||
    name.includes("fold") ||
    name.includes("flip");

  if (!isFoldable) return null;

  // 1. TECNO Phantom V Fold2 5G & Phantom V Fold (2023)
  if (slug.includes("phantom-v-fold")) {
    const is2023 = slug.includes("2023");
    return {
      foldType: "BOOK_FOLD",
      unfoldedHeightMm: is2023 ? 159.4 : 159.0,
      unfoldedWidthMm: is2023 ? 140.4 : 140.4,
      unfoldedThicknessMm: is2023 ? 6.9 : 5.5,
      foldedHeightMm: is2023 ? 159.4 : 159.0,
      foldedWidthMm: is2023 ? 72.0 : 72.1,
      foldedThicknessMm: is2023 ? 14.2 : 11.98,
      innerDisplayInch: 7.85,
      innerDisplayLabel: '7.85" 2K+ 120Hz LTPO Inner Canvas',
      coverDisplayInch: 6.42,
      coverDisplayLabel: '6.42" FHD+ 120Hz LTPO Cover Screen',
      hingeArchitecture: is2023
        ? "1st-Gen Aerospace Drop-Shaped Hinge"
        : "Aerospace Waterdrop Hinge (400K Folds)",
      creaseDepthMm: is2023 ? "0.14mm" : "0.11mm",
    };
  }

  // 2. Samsung Galaxy Z Fold 7
  if (slug.includes("z-fold-7")) {
    return {
      foldType: "BOOK_FOLD",
      unfoldedHeightMm: 153.5,
      unfoldedWidthMm: 134.8,
      unfoldedThicknessMm: 4.2,
      foldedHeightMm: 153.5,
      foldedWidthMm: 68.5,
      foldedThicknessMm: 8.9,
      innerDisplayInch: 8.0,
      innerDisplayLabel: '8.0" QXGA+ 120Hz LTPO Inner Canvas',
      coverDisplayInch: 6.5,
      coverDisplayLabel: '6.5" Dynamic AMOLED 2X Cover Screen',
      hingeArchitecture: "Dual-Rail Armor Aluminum FlexHinge",
      creaseDepthMm: "0.12mm",
    };
  }

  // 3. Samsung Galaxy Z Fold 6 / Z Fold 5
  if (slug.includes("z-fold-6") || slug.includes("z-fold-5") || slug.includes("z-fold")) {
    const isFold5 = slug.includes("z-fold-5");
    return {
      foldType: "BOOK_FOLD",
      unfoldedHeightMm: isFold5 ? 154.9 : 153.5,
      unfoldedWidthMm: isFold5 ? 129.9 : 132.6,
      unfoldedThicknessMm: isFold5 ? 6.1 : 5.6,
      foldedHeightMm: isFold5 ? 154.9 : 153.5,
      foldedWidthMm: isFold5 ? 67.1 : 68.1,
      foldedThicknessMm: isFold5 ? 13.4 : 12.1,
      innerDisplayInch: 7.6,
      innerDisplayLabel: '7.6" QXGA+ 120Hz LTPO Inner Canvas',
      coverDisplayInch: isFold5 ? 6.2 : 6.3,
      coverDisplayLabel: isFold5
        ? '6.2" HD+ 120Hz Dynamic AMOLED Cover'
        : '6.3" HD+ 120Hz Dynamic AMOLED Cover',
      hingeArchitecture: "Symmetrical Dual-Rail FlexHinge",
      creaseDepthMm: isFold5 ? "0.17mm" : "0.15mm",
    };
  }

  // 4. Honor Magic V3 / Oppo Find N5 / Vivo X Fold3 Pro / OnePlus Open
  if (slug.includes("magic-v3") || slug.includes("find-n5")) {
    const isFindN5 = slug.includes("find-n5");
    return {
      foldType: "BOOK_FOLD",
      unfoldedHeightMm: isFindN5 ? 160.9 : 156.6,
      unfoldedWidthMm: isFindN5 ? 145.6 : 145.3,
      unfoldedThicknessMm: isFindN5 ? 4.21 : 4.35,
      foldedHeightMm: isFindN5 ? 160.9 : 156.6,
      foldedWidthMm: isFindN5 ? 74.4 : 74.0,
      foldedThicknessMm: isFindN5 ? 8.93 : 9.2,
      innerDisplayInch: isFindN5 ? 8.12 : 7.92,
      innerDisplayLabel: isFindN5
        ? '8.12" 2K+ 120Hz LTPO Inner Canvas'
        : '7.92" FHD+ 120Hz LTPO Inner Canvas',
      coverDisplayInch: isFindN5 ? 6.62 : 6.43,
      coverDisplayLabel: isFindN5
        ? '6.62" FHD+ 120Hz LTPO Cover Screen'
        : '6.43" FHD+ 120Hz LTPO Cover Screen',
      hingeArchitecture: isFindN5
        ? "3D-Printed Titanium Alloy Flexion Hinge"
        : "Super Steel 2.0 Ultra-Thin Hinge (500K Folds)",
      creaseDepthMm: "0.10mm",
    };
  }
  if (slug.includes("x-fold3-pro") || slug.includes("oneplus-open")) {
    const isOpen = slug.includes("oneplus-open");
    return {
      foldType: "BOOK_FOLD",
      unfoldedHeightMm: isOpen ? 153.4 : 159.96,
      unfoldedWidthMm: isOpen ? 143.1 : 142.4,
      unfoldedThicknessMm: isOpen ? 5.8 : 5.2,
      foldedHeightMm: isOpen ? 153.4 : 159.96,
      foldedWidthMm: isOpen ? 73.3 : 72.55,
      foldedThicknessMm: isOpen ? 11.7 : 11.2,
      innerDisplayInch: isOpen ? 7.82 : 8.03,
      innerDisplayLabel: isOpen
        ? '7.82" 2K 120Hz LTPO3 Open Canvas'
        : '8.03" E7 2K+ 120Hz LTPO Inner Canvas',
      coverDisplayInch: isOpen ? 6.31 : 6.53,
      coverDisplayLabel: isOpen
        ? '6.31" 2K 120Hz Super Fluid OLED Cover'
        : '6.53" Q9+ 120Hz LTPO Cover Screen',
      hingeArchitecture: isOpen
        ? "Cobalt-Molybdenum Flexion Teardrop Hinge"
        : "Carbon Fiber Ultra-Light Hinge (500K Folds)",
      creaseDepthMm: "0.11mm",
    };
  }

  // 5. Google Pixel 9 Pro Fold
  if (slug.includes("pixel-9-pro-fold")) {
    return {
      foldType: "BOOK_FOLD",
      unfoldedHeightMm: 155.2,
      unfoldedWidthMm: 150.2,
      unfoldedThicknessMm: 5.1,
      foldedHeightMm: 155.2,
      foldedWidthMm: 77.1,
      foldedThicknessMm: 10.5,
      innerDisplayInch: 8.0,
      innerDisplayLabel: '8.0" Super Actua Flex LTPO Inner Canvas',
      coverDisplayInch: 6.3,
      coverDisplayLabel: '6.3" Actua OLED 120Hz Cover Screen',
      hingeArchitecture: "Multi-Alloy Fluid-Friction Hinge",
      creaseDepthMm: "0.13mm",
    };
  }

  // 6. Google Pixel Fold (1st Gen)
  if (slug.includes("pixel-fold-1")) {
    return {
      foldType: "BOOK_FOLD",
      unfoldedHeightMm: 139.7,
      unfoldedWidthMm: 158.7,
      unfoldedThicknessMm: 5.8,
      foldedHeightMm: 139.7,
      foldedWidthMm: 79.5,
      foldedThicknessMm: 12.1,
      innerDisplayInch: 7.6,
      innerDisplayLabel: '7.6" Passport OLED 120Hz Inner Canvas',
      coverDisplayInch: 5.8,
      coverDisplayLabel: '5.8" Wide-Aspect OLED 120Hz Cover',
      hingeArchitecture: "180° Custom Gearless Fluid-Friction Hinge",
      creaseDepthMm: "0.16mm",
    };
  }

  // 7. TECNO Phantom V Flip2 5G & Infinix Zero Flip 5G
  if (slug.includes("phantom-v-flip") || slug.includes("zero-flip")) {
    const isZeroFlip = slug.includes("zero-flip");
    return {
      foldType: "CLAMSHELL_FLIP",
      unfoldedHeightMm: isZeroFlip ? 170.35 : 170.7,
      unfoldedWidthMm: 73.4,
      unfoldedThicknessMm: isZeroFlip ? 7.64 : 7.6,
      foldedHeightMm: isZeroFlip ? 87.5 : 87.8,
      foldedWidthMm: 73.4,
      foldedThicknessMm: 16.0,
      innerDisplayInch: 6.9,
      innerDisplayLabel: '6.9" FHD+ 120Hz LTPO Inner Display',
      coverDisplayInch: 3.64,
      coverDisplayLabel: isZeroFlip
        ? '3.64" 120Hz AMOLED Vlogger Cover'
        : '3.64" ThruPool AMOLED Cover Screen',
      hingeArchitecture: isZeroFlip
        ? "Zero-Gap Free-Hover Hinge (30°-150°)"
        : "Drop-Shaped FreeCam Hover Hinge (30°-150°)",
      creaseDepthMm: "0.11mm",
    };
  }

  // 8. Xiaomi Mix Flip & Motorola Razr 60 Ultra / 50 Ultra
  if (slug.includes("mix-flip") || slug.includes("razr-60") || slug.includes("razr-50")) {
    const isRazr60 = slug.includes("razr-60");
    const isRazr = isRazr60 || slug.includes("razr-50");
    return {
      foldType: "CLAMSHELL_FLIP",
      unfoldedHeightMm: isRazr60 ? 171.48 : isRazr ? 171.4 : 167.5,
      unfoldedWidthMm: 74.0,
      unfoldedThicknessMm: isRazr60 ? 7.19 : isRazr ? 7.1 : 7.6,
      foldedHeightMm: isRazr60 ? 88.12 : isRazr ? 88.1 : 85.5,
      foldedWidthMm: 74.0,
      foldedThicknessMm: isRazr60 ? 15.69 : isRazr ? 15.3 : 16.0,
      innerDisplayInch: isRazr60 ? 7.0 : isRazr ? 6.9 : 6.86,
      innerDisplayLabel: isRazr60
        ? '7.0" 1.5K 165Hz LTPO pOLED Inner Display'
        : isRazr
        ? '6.9" FHD+ 165Hz LTPO pOLED Inner Display'
        : '6.86" 1.5K 120Hz LTPO Inner Display',
      coverDisplayInch: isRazr ? 4.0 : 4.01,
      coverDisplayLabel: isRazr
        ? '4.0" 165Hz LTPO Edge-to-Edge pOLED Cover'
        : '4.01" All Around Liquid AMOLED Cover',
      hingeArchitecture: isRazr60
        ? "Titanium Star-Track Hinge (IP48)"
        : isRazr
        ? "5th-Gen Star-Track Teardrop Hinge (IPX8)"
        : "Leica Dual-Link Micro-Drop Hinge (500K Folds)",
      creaseDepthMm: "0.11mm",
    };
  }

  // 9. Samsung Galaxy Z Flip 7 / Z Flip 6 / Z Flip 5
  if (slug.includes("z-flip") || slug.includes("flip")) {
    const isFlip7 = slug.includes("flip-7");
    const isFlip5 = slug.includes("flip-5");
    return {
      foldType: "CLAMSHELL_FLIP",
      unfoldedHeightMm: 165.1,
      unfoldedWidthMm: 71.9,
      unfoldedThicknessMm: 6.9,
      foldedHeightMm: 85.1,
      foldedWidthMm: 71.9,
      foldedThicknessMm: isFlip7 ? 14.7 : isFlip5 ? 15.1 : 14.9,
      innerDisplayInch: 6.7,
      innerDisplayLabel: '6.7" FHD+ 120Hz LTPO Inner Display',
      coverDisplayInch: isFlip7 ? 4.0 : 3.4,
      coverDisplayLabel: isFlip7
        ? '4.0" Edge-to-Edge FlexWindow Cover'
        : '3.4" Folder-Cut FlexWindow Cover',
      hingeArchitecture: "Armor Aluminum Dual-Rail FlexHinge",
      creaseDepthMm: "0.14mm",
    };
  }

  // Fallback for any custom Foldable added via Admin Studio
  return {
    foldType: dev.specs.displaySizeInch <= 7.0 ? "CLAMSHELL_FLIP" : "BOOK_FOLD",
    unfoldedHeightMm: 158.0,
    unfoldedWidthMm:
      dev.specs.displaySizeInch <= 7.0
        ? dev.specs.widthMm
        : Number((dev.specs.widthMm * 1.94).toFixed(1)),
    unfoldedThicknessMm: Number((dev.specs.thicknessMm * 0.48).toFixed(1)),
    foldedHeightMm: dev.specs.displaySizeInch <= 7.0 ? 86.0 : 158.0,
    foldedWidthMm: dev.specs.widthMm,
    foldedThicknessMm: dev.specs.thicknessMm,
    innerDisplayInch: dev.specs.displaySizeInch,
    innerDisplayLabel: `${dev.specs.displaySizeInch}" 120Hz LTPO Inner Display`,
    coverDisplayInch: dev.specs.displaySizeInch <= 7.0 ? 3.6 : 6.4,
    coverDisplayLabel:
      dev.specs.displaySizeInch <= 7.0
        ? '3.6" AMOLED Cover Screen'
        : '6.4" LTPO Cover Screen',
    hingeArchitecture: "Precision Waterdrop Teardrop Hinge",
    creaseDepthMm: "0.12mm",
  };
}

function getPhysicalProfile(
  dev: SmartphoneDevice,
  foldPosture: FoldablePostureState = "UNFOLDED_OPEN"
) {
  const base = getBasePhysicalProfile(dev);
  const foldKin = getFoldableKinematics(dev);
  const visualResolution = resolveDeviceVisualProfile(dev);
  const explicitDimensions = visualResolution.profile?.dimensions;

  if (foldKin) {
    const explicitPostureDimensions =
      foldPosture === "UNFOLDED_OPEN"
        ? explicitDimensions?.unfolded
        : explicitDimensions?.folded;
    const heightMm =
      explicitPostureDimensions?.heightMm ??
      (foldPosture === "UNFOLDED_OPEN"
        ? dev.customHeightMm || foldKin.unfoldedHeightMm
        : foldKin.foldedHeightMm);
    const widthMm =
      explicitPostureDimensions?.widthMm ??
      (foldPosture === "UNFOLDED_OPEN"
        ? foldKin.unfoldedWidthMm
        : foldKin.foldedWidthMm);
    const thicknessMm =
      explicitPostureDimensions?.thicknessMm ??
      (foldPosture === "UNFOLDED_OPEN"
        ? foldKin.unfoldedThicknessMm
        : foldKin.foldedThicknessMm);

    return {
      ...base,
      heightMm,
      widthMm,
      thicknessMm,
      islandType:
        (dev.customIslandType as CameraIslandGeometry) || base.islandType,
      foldKinematics: foldKin,
      foldPosture,
      visualResolution,
    };
  }

  return {
    ...base,
    heightMm:
      dev.customHeightMm || explicitDimensions?.heightMm || base.heightMm,
    widthMm: explicitDimensions?.widthMm || base.widthMm,
    thicknessMm: explicitDimensions?.thicknessMm || base.thicknessMm,
    islandType:
      (dev.customIslandType as CameraIslandGeometry) || base.islandType,
    foldKinematics: null,
    foldPosture,
    visualResolution,
  };
}

export interface ContenderVisualTheme {
  theme: "PRIMARY" | "CHALLENGER" | "CONTENDER_C" | "CONTENDER_D";
  label: string;
  letter: string;
  primaryColor: string;
  strokeColor: string;
  fillTint: string;
  badgeBg: string;
  badgeText: string;
  borderClass: string;
  textClass: string;
  bgClass: string;
  dashArray?: string;
}

export const CONTENDER_THEMES: ContenderVisualTheme[] = [
  {
    theme: "PRIMARY",
    label: "Contender A",
    letter: "A",
    primaryColor: "#0284c7",
    strokeColor: "#0284c7",
    fillTint: "rgba(2, 132, 199, 0.12)",
    badgeBg: "bg-sky-600",
    badgeText: "text-white",
    borderClass: "border-sky-300",
    textClass: "text-sky-700",
    bgClass: "bg-sky-50",
    dashArray: undefined,
  },
  {
    theme: "CHALLENGER",
    label: "Contender B",
    letter: "B",
    primaryColor: "#db2777",
    strokeColor: "#db2777",
    fillTint: "rgba(219, 39, 119, 0.12)",
    badgeBg: "bg-pink-600",
    badgeText: "text-white",
    borderClass: "border-pink-300",
    textClass: "text-pink-700",
    bgClass: "bg-pink-50",
    dashArray: "5 3",
  },
  {
    theme: "CONTENDER_C",
    label: "Contender C",
    letter: "C",
    primaryColor: "#8b5cf6",
    strokeColor: "#8b5cf6",
    fillTint: "rgba(139, 92, 246, 0.12)",
    badgeBg: "bg-violet-600",
    badgeText: "text-white",
    borderClass: "border-violet-300",
    textClass: "text-violet-700",
    bgClass: "bg-violet-50",
    dashArray: "3 3",
  },
  {
    theme: "CONTENDER_D",
    label: "Contender D",
    letter: "D",
    primaryColor: "#10b981",
    strokeColor: "#10b981",
    fillTint: "rgba(16, 185, 129, 0.12)",
    badgeBg: "bg-emerald-600",
    badgeText: "text-white",
    borderClass: "border-emerald-300",
    textClass: "text-emerald-700",
    bgClass: "bg-emerald-50",
    dashArray: "6 2 2 2",
  },
];

export function PhoneSizeComparator({
  deviceA: propDeviceA,
  deviceB: propDeviceB,
  devices,
  onUpdateDeviceProfile,
}: PhoneSizeComparatorProps) {
  // Extract 2 to 4 contenders cleanly with safe fallback for 1 device or legacy props
  const rawContenders = (
    devices && devices.length > 0
      ? devices
      : [propDeviceA, propDeviceB].filter(Boolean) as SmartphoneDevice[]
  );

  const fallbackDeviceA = rawContenders[0] ?? propDeviceA ?? INITIAL_DEVICES[0];
  const fallbackDeviceB =
    rawContenders[1] ??
    propDeviceB ??
    (fallbackDeviceA.id !== INITIAL_DEVICES[1].id
      ? INITIAL_DEVICES[1]
      : INITIAL_DEVICES[0]);

  const contenders: SmartphoneDevice[] = (
    rawContenders.length >= 2
      ? rawContenders
      : rawContenders.length === 1
      ? [rawContenders[0], fallbackDeviceB]
      : [fallbackDeviceA, fallbackDeviceB]
  ).slice(0, 4);

  // Guarantee backwards compatibility with legacy props and single device testing
  const deviceA = contenders[0] ?? fallbackDeviceA;
  const deviceB = contenders[1] ?? fallbackDeviceB ?? deviceA;

  const [viewMode, setViewMode] = useState<"SIDE_BY_SIDE" | "STACKED_OVERLAY">(
    "SIDE_BY_SIDE"
  );
  const [showBackCamera, setShowBackCamera] = useState<boolean>(true);
  const [showThumbZone, setShowThumbZone] = useState<boolean>(false);
  const [foldPosture, setFoldPosture] =
    useState<FoldablePostureState>("UNFOLDED_OPEN");

  // Multi-device CAD visualizer view controls
  const [isOneToOneScale, setIsOneToOneScale] = useState<boolean>(false);
  const [stackAlignment, setStackAlignment] = useState<"BOTTOM" | "CENTER">("BOTTOM");
  const [renderMode, setRenderMode] = useState<"FILL" | "OUTLINE">("FILL");
  const [showSpecOverlay, setShowSpecOverlay] = useState<boolean>(true);

  // Admin Image-to-Physical-Profile Converter State
  const [showProfileScanner, setShowProfileScanner] = useState<boolean>(false);
  const [scannerTargetId, setScannerTargetId] = useState<string>(deviceA ? deviceA.id : "");
  const [splitMode, setSplitMode] = useState<"AUTO" | boolean>("AUTO");
  const [isScanningImage, setIsScanningImage] = useState<boolean>(false);
  const [customProfiles, setCustomProfiles] = useState<
    Record<string, CustomPhysicalProfile>
  >({});

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const contenderProfiles = contenders.map((dev) => ({
    dev,
    prof: getPhysicalProfile(dev, foldPosture),
    label: formatDeviceLabel(dev),
  }));

  const profA = contenderProfiles[0]?.prof ?? getPhysicalProfile(deviceA, foldPosture);
  const profB = contenderProfiles[1]?.prof ?? getPhysicalProfile(deviceB, foldPosture);
  const hasAnyFoldable = contenderProfiles.some((cp) => Boolean(cp.prof.foldKinematics));

  const labelA = contenderProfiles[0]?.label ?? (deviceA ? formatDeviceLabel(deviceA) : "Device A");
  const labelB = contenderProfiles[1]?.label ?? (deviceB ? formatDeviceLabel(deviceB) : "Device B");

  // 1:1 true scale calibration (~3.78 px per mm at standard 96 DPI) vs compact fit (1.65x)
  const scale = isOneToOneScale ? 3.78 : 1.65;

  // Handle converting an uploaded reference photo into a Vector Prop/Dummy Profile
  const handleRunImageScanner = async (
    targetDeviceId: string,
    imageUrl: string
  ) => {
    setIsScanningImage(true);
    try {
      const profile = await generatePhysicalProfileFromImage({
        deviceId: targetDeviceId,
        imageUrl,
        isDualBackFront: splitMode,
        renderStyle: "PARAMETRIC_SVG",
      });
      const withTraceGuide: CustomPhysicalProfile = {
        ...profile,
        renderStyle: "PARAMETRIC_SVG",
        showReferenceGhostUnderlay: true,
        useModeledPropGeometry: true,
      };
      setCustomProfiles((prev) => ({
        ...prev,
        [targetDeviceId]: withTraceGuide,
      }));
      onUpdateDeviceProfile?.(targetDeviceId, withTraceGuide);
    } catch (err) {
      console.error("Image-to-profile conversion failed:", err);
    } finally {
      setIsScanningImage(false);
    }
  };

  const updateModeledGeometry = (
    deviceId: string,
    patch: Partial<ModeledPropDummyGeometry>
  ) => {
    const existing =
      customProfiles[deviceId] ||
      (deviceId === deviceA.id ? deviceA.customProfile : deviceB.customProfile);
    if (!existing || !existing.modeledPropGeometry) return;
    const updated: CustomPhysicalProfile = {
      ...existing,
      useModeledPropGeometry: true,
      modeledPropGeometry: {
        ...existing.modeledPropGeometry,
        ...patch,
      },
    };
    setCustomProfiles((prev) => ({
      ...prev,
      [deviceId]: updated,
    }));
    onUpdateDeviceProfile?.(deviceId, updated);
  };

  const toggleProfileFlag = (
    deviceId: string,
    key: "showReferenceGhostUnderlay" | "useModeledPropGeometry"
  ) => {
    const existing =
      customProfiles[deviceId] ||
      (deviceId === deviceA.id ? deviceA.customProfile : deviceB.customProfile);
    if (!existing) return;
    const updated: CustomPhysicalProfile = {
      ...existing,
      [key]: !existing[key],
    };
    setCustomProfiles((prev) => ({
      ...prev,
      [deviceId]: updated,
    }));
    onUpdateDeviceProfile?.(deviceId, updated);
  };

  const applyParametricArchetypePreset = (
    targetDeviceId: string,
    preset: ModeledPropDummyGeometry
  ) => {
    const existing =
      customProfiles[targetDeviceId] ||
      (targetDeviceId === deviceA.id ? deviceA.customProfile : deviceB.customProfile);

    const baseProfile: CustomPhysicalProfile = existing || {
      deviceId: targetDeviceId,
      sourceImageUrl: "",
      rearCutoutDataUrl: "",
      rearBlueprintDataUrl: "",
      dominantBodyHex: "#1e293b",
      cameraAccentHex: "#38bdf8",
      renderStyle: "PARAMETRIC_SVG",
      showReferenceGhostUnderlay: false,
      useModeledPropGeometry: true,
    };

    const updated: CustomPhysicalProfile = {
      ...baseProfile,
      useModeledPropGeometry: true,
      modeledPropGeometry: {
        ...preset,
      },
    };

    setCustomProfiles((prev) => ({
      ...prev,
      [targetDeviceId]: updated,
    }));
    onUpdateDeviceProfile?.(targetDeviceId, updated);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        const targetId =
          scannerTargetId === deviceB.id ? deviceB.id : deviceA.id;
        handleRunImageScanner(targetId, reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const renderPhoneSvg = (
    dev: SmartphoneDevice,
    prof: ReturnType<typeof getPhysicalProfile>,
    theme: "PRIMARY" | "CHALLENGER" | "CONTENDER_C" | "CONTENDER_D" = "PRIMARY",
    isOverlayGhost = false,
    contenderIdx = 0
  ) => {
    const w = prof.widthMm * scale;
    const h = prof.heightMm * scale;
    const isBookFoldOpen =
      prof.foldKinematics?.foldType === "BOOK_FOLD" &&
      prof.foldPosture === "UNFOLDED_OPEN";
    const isBookFoldClosed =
      prof.foldKinematics?.foldType === "BOOK_FOLD" &&
      prof.foldPosture === "FOLDED_CLOSED";
    const isClamshellClosed =
      prof.foldKinematics?.foldType === "CLAMSHELL_FLIP" &&
      prof.foldPosture === "FOLDED_CLOSED";
    const leafW = isBookFoldOpen ? w / 2 : w;
    const customProf = customProfiles[dev.id] ?? dev.customProfile;

    const currentTheme =
      CONTENDER_THEMES[contenderIdx] ??
      (theme === "CHALLENGER" ? CONTENDER_THEMES[1] : CONTENDER_THEMES[0]);

    const strokeColor =
      customProf && !isOverlayGhost
        ? customProf.cameraAccentHex
        : currentTheme.primaryColor;

    let fillColor: string;
    if (renderMode === "OUTLINE" && !isOverlayGhost) {
      fillColor = "rgba(248, 250, 252, 0.45)";
    } else if (isOverlayGhost) {
      fillColor = currentTheme.fillTint;
    } else if (customProf) {
      fillColor = customProf.dominantBodyHex;
    } else {
      fillColor =
        contenderIdx === 0
          ? "#f8fafc"
          : contenderIdx === 1
          ? "#fff1f2"
          : contenderIdx === 2
          ? "#f5f3ff"
          : "#ecfdf5";
    }

    const clipId = `clip-${dev.id}-${theme}-${contenderIdx}-${isOverlayGhost ? "ghost" : "main"}`;

    return (
      <g>
        <defs>
          <clipPath id={clipId}>
            <rect
              x={0}
              y={0}
              width={w}
              height={h}
              rx={prof.cornerRadiusPx}
            />
          </clipPath>
        </defs>

        {/* Outer Chassis */}
        <rect
          x={0}
          y={0}
          width={w}
          height={h}
          rx={prof.cornerRadiusPx}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={isOverlayGhost ? 2.2 : 2.5}
          strokeDasharray={
            isOverlayGhost ? currentTheme.dashArray : undefined
          }
        />

        {/* Book-Style Foldable CLOSED: Left-Edge Metallic Hinge Spine */}
        {isBookFoldClosed && !isOverlayGhost && (
          <g>
            <rect
              x={0}
              y={6}
              width={5.5}
              height={h - 12}
              rx={2.5}
              fill="#cbd5e1"
              stroke={strokeColor}
              strokeWidth={1.2}
            />
            <line
              x1={5.5}
              y1={4}
              x2={5.5}
              y2={h - 4}
              stroke={strokeColor}
              strokeWidth={1.2}
              strokeDasharray="3 2"
            />
          </g>
        )}

        {/* Clamshell Flip CLOSED: Top-Edge Metallic Hinge Spine Bar */}
        {isClamshellClosed && !isOverlayGhost && (
          <rect
            x={8}
            y={0}
            width={w - 16}
            height={6}
            rx={3}
            fill="#cbd5e1"
            stroke={strokeColor}
            strokeWidth={1.2}
          />
        )}

        {/* Book-Style Foldable UNFOLDED OPEN (Rear / Dual-Leaf Exterior View):
            Left Half = Rear Camera Back | Center = Hinge Spine | Right Half = Active Cover Display */}
        {isBookFoldOpen &&
          showBackCamera &&
          !isOverlayGhost &&
          (!customProf || customProf.renderStyle === "PARAMETRIC_SVG") && (
            <g>
              {/* Left Rear Vegan-Leather / Matte-Glass Leaf Tint */}
              <rect
                x={2}
                y={2}
                width={leafW - 3.5}
                height={h - 4}
                rx={Math.max(6, prof.cornerRadiusPx - 2)}
                fill={
                  dev.slug.includes("phantom-v-fold")
                    ? "rgba(99, 132, 204, 0.22)"
                    : theme === "PRIMARY"
                    ? "rgba(226, 232, 240, 0.45)"
                    : "rgba(254, 205, 211, 0.35)"
                }
              />

              {/* Center Precision Hinge Spine Dividing Left & Right Halves */}
              <rect
                x={leafW - 2.2}
                y={1}
                width={4.4}
                height={h - 2}
                rx={2}
                fill="#cbd5e1"
                stroke={strokeColor}
                strokeWidth={1.2}
              />
              {/* Top & Bottom Hinge T-Caps */}
              <rect
                x={leafW - 4}
                y={1}
                width={8}
                height={5}
                rx={1.5}
                fill="#64748b"
              />
              <rect
                x={leafW - 4}
                y={h - 6}
                width={8}
                height={5}
                rx={1.5}
                fill="#64748b"
              />

              {/* Right Leaf: Active Outer Cover Display (6.42" / 6.5" / 6.3" OLED) */}
              <rect
                x={leafW + 5}
                y={5}
                width={leafW - 10}
                height={h - 10}
                rx={Math.max(6, prof.cornerRadiusPx - 3)}
                fill="#0f172a"
                stroke="#334155"
                strokeWidth={1.4}
              />

              {/* Feather / Wing Dynamic OLED Wallpaper Graphic on Cover Screen (Matches Phantom V Fold2 Reference Photo) */}
              <path
                d={`M ${leafW + 7} ${h * 0.66} Q ${leafW + leafW * 0.55} ${
                  h * 0.28
                } ${w - 14} ${h * 0.14} Q ${leafW + leafW * 0.72} ${
                  h * 0.48
                } ${leafW + 7} ${h * 0.82} Z`}
                fill="rgba(56, 189, 248, 0.32)"
                stroke="#38bdf8"
                strokeWidth={1.2}
              />
              <path
                d={`M ${leafW + 7} ${h * 0.56} Q ${leafW + leafW * 0.45} ${
                  h * 0.24
                } ${w - 20} ${h * 0.12} Q ${leafW + leafW * 0.58} ${
                  h * 0.38
                } ${leafW + 7} ${h * 0.68} Z`}
                fill="rgba(255, 255, 255, 0.78)"
              />

              {/* Cover Screen Top-Center Punch-Hole Camera */}
              <circle
                cx={leafW + leafW / 2}
                cy={12.5}
                r={3}
                fill="#020617"
                stroke="#475569"
                strokeWidth={0.8}
              />

              {/* Cover Display Telemetry Pill */}
              <rect
                x={leafW + 10}
                y={22}
                width={leafW - 20}
                height={15}
                rx={4}
                fill="rgba(15, 23, 42, 0.82)"
                stroke="#38bdf8"
                strokeWidth={0.8}
              />
              <text
                x={leafW + leafW / 2}
                y={32}
                textAnchor="middle"
                className="fill-sky-300 text-[7px] font-mono font-bold"
              >
                {prof.foldKinematics?.coverDisplayInch}&quot; Cover OLED
              </text>
            </g>
          )}

        {/* Optional 28% Onion-Skin Reference Underlay (ONLY visible while Admin is calibrating the Vector Prop/Dummy against the uploaded reference photo) */}
        {customProf &&
          !isOverlayGhost &&
          showProfileScanner &&
          customProf.showReferenceGhostUnderlay && (
            <g clipPath={`url(#${clipId})`} opacity={0.28}>
              <image
                href={
                  !showBackCamera && customProf.frontCutoutDataUrl
                    ? customProf.frontCutoutDataUrl
                    : customProf.rearCutoutDataUrl
                }
                x={0}
                y={0}
                width={leafW}
                height={h}
                preserveAspectRatio="none"
              />
            </g>
          )}

        {/* Inner Display Area (when in Front mode and no Front Image Override) */}
        {!showBackCamera &&
          !isOverlayGhost &&
          (!customProf ||
            customProf.renderStyle === "PARAMETRIC_SVG" ||
            !customProf.frontCutoutDataUrl) && (
            <>
              <rect
                x={prof.bezelMm * scale * 2}
                y={prof.bezelMm * scale * 2}
                width={w - prof.bezelMm * scale * 4}
                height={h - prof.bezelMm * scale * 4}
                rx={Math.max(8, prof.cornerRadiusPx - 4)}
                fill="#ffffff"
                stroke="#e2e8f0"
                strokeWidth={1}
              />

              {/* If Unfolded Book-Fold in Front Mode: Show Center Waterdrop Crease + Multitasking Split-Screen Canvas */}
              {isBookFoldOpen && prof.foldKinematics && (
                <g>
                  {/* Split-Screen Left App Pane */}
                  <rect
                    x={prof.bezelMm * scale * 2 + 6}
                    y={24}
                    width={leafW - prof.bezelMm * scale * 2 - 10}
                    height={h - 96}
                    rx={6}
                    fill="#f1f5f9"
                    stroke="#cbd5e1"
                    strokeWidth={1}
                  />
                  {/* Split-Screen Right App Pane */}
                  <rect
                    x={leafW + 4}
                    y={24}
                    width={leafW - prof.bezelMm * scale * 2 - 10}
                    height={h - 96}
                    rx={6}
                    fill="#e0f2fe"
                    stroke="#bae6fd"
                    strokeWidth={1}
                  />
                  {/* Center Vertical Waterdrop Crease Line */}
                  <line
                    x1={w / 2}
                    y1={prof.bezelMm * scale * 2 + 2}
                    x2={w / 2}
                    y2={h - prof.bezelMm * scale * 2 - 2}
                    stroke={strokeColor}
                    strokeWidth={1.3}
                    strokeDasharray="4 3"
                    opacity={0.65}
                  />
                  <text
                    x={w / 2}
                    y={38}
                    textAnchor="middle"
                    className="fill-slate-600 text-[7.5px] font-mono font-bold"
                  >
                    {prof.foldKinematics.innerDisplayLabel}
                  </text>
                  <text
                    x={w / 2}
                    y={50}
                    textAnchor="middle"
                    className="fill-sky-700 text-[7px] font-mono font-semibold"
                  >
                    Crease: {prof.foldKinematics.creaseDepthMm} • Split Multitasking
                  </text>
                </g>
              )}

              {/* If Clamshell Flip in Front Mode: Show Horizontal Center Crease Line */}
              {prof.foldKinematics?.foldType === "CLAMSHELL_FLIP" &&
                !isClamshellClosed && (
                  <line
                    x1={prof.bezelMm * scale * 2 + 2}
                    y1={h / 2}
                    x2={w - prof.bezelMm * scale * 2 - 2}
                    y2={h / 2}
                    stroke={strokeColor}
                    strokeWidth={1.2}
                    strokeDasharray="4 3"
                    opacity={0.6}
                  />
                )}

              {prof.frontCutout === "DYNAMIC_ISLAND" && (
                <rect
                  x={w / 2 - 17}
                  y={10}
                  width={34}
                  height={9.5}
                  rx={4.75}
                  fill="#0f172a"
                />
              )}
              {prof.frontCutout === "CLASSIC_NOTCH" && (
                <rect
                  x={w / 2 - 24}
                  y={prof.bezelMm * scale * 2}
                  width={48}
                  height={11}
                  rx={4}
                  fill="#0f172a"
                />
              )}
              {prof.frontCutout === "PUNCH_HOLE" && (
                <circle cx={w / 2} cy={13} r={3.8} fill="#0f172a" />
              )}

              {!dev.specs.fingerprintType.includes("Face ID") && (
                <g>
                  <circle
                    cx={w / 2}
                    cy={
                      dev.specs.fingerprintType.includes("Ultrasonic")
                        ? h - 62
                        : h - 36
                    }
                    r={10}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={1.2}
                    strokeDasharray="2 2"
                  />
                  <text
                    x={w / 2}
                    y={
                      dev.specs.fingerprintType.includes("Ultrasonic")
                        ? h - 45
                        : h - 19
                    }
                    textAnchor="middle"
                    className="fill-slate-400 text-[8px] font-mono"
                  >
                    {dev.specs.fingerprintType.includes("Ultrasonic")
                      ? "3D Ultrasonic (Ergonomic High)"
                      : "Optical / Side Biometrics"}
                  </text>
                </g>
              )}
            </>
          )}

        {/* One-Handed Right-Thumb Reachability Arc */}
        {showThumbZone && !isOverlayGhost && (
          <path
            d={`M ${w} ${h - 25} A 135 135 0 0 0 ${w - 115} ${h - 135} L ${w} ${
              h - 135
            } Z`}
            fill="rgba(16, 185, 129, 0.16)"
            stroke="#059669"
            strokeWidth={1.2}
            strokeDasharray="3 2"
          />
        )}

        {/* ============================================================
            REAR CAMERA ISLAND ARCHITECTURES (TRUE-TO-MODEL GEOMETRY)
           ============================================================ */}
        {showBackCamera &&
          !isOverlayGhost &&
          customProf?.useModeledPropGeometry &&
          customProf.modeledPropGeometry && (
            /* 0. REFERENCE-MODELED VECTOR PROP/DUMMY (Constructed & Calibrated from Uploaded Reference Frame) */
            (() => {
              const mg = customProf.modeledPropGeometry;
              const ix = (mg.xPct / 100) * leafW;
              const iy = (mg.yPct / 100) * h;
              const iw = (mg.wPct / 100) * leafW;
              const ih = (mg.hPct / 100) * h;

              if (mg.islandShape === "TWO_TIER_RECT") {
                return (
                  <g>
                    {/* Outer Brushed Metallic Plateau */}
                    <rect
                      x={ix}
                      y={iy}
                      width={iw}
                      height={ih}
                      rx={mg.islandCornerRadiusPx}
                      fill="#cbd5e1"
                      stroke={strokeColor}
                      strokeWidth={1.8}
                    />
                    <rect
                      x={ix + 2}
                      y={iy + 2}
                      width={iw - 4}
                      height={ih - 4}
                      rx={Math.max(2, mg.islandCornerRadiusPx - 1)}
                      fill="#94a3b8"
                      stroke="#64748b"
                      strokeWidth={0.9}
                    />
                    {/* Top Glossy Black Visor Window */}
                    <rect
                      x={ix + 3.5}
                      y={iy + 3.5}
                      width={iw - 7}
                      height={ih * 0.45}
                      rx={3}
                      fill="#0f172a"
                      stroke="#334155"
                      strokeWidth={1}
                    />
                    {/* 2 Side-by-Side Circular Lenses inside Top Black Window */}
                    <circle
                      cx={ix + iw * 0.22}
                      cy={iy + 3.5 + ih * 0.225}
                      r={Math.min(10.5, ih * 0.17)}
                      fill="#1e293b"
                      stroke="#cbd5e1"
                      strokeWidth={1.8}
                    />
                    <circle
                      cx={ix + iw * 0.22}
                      cy={iy + 3.5 + ih * 0.225}
                      r={3.2}
                      fill="#38bdf8"
                    />
                    <circle
                      cx={ix + iw * 0.54}
                      cy={iy + 3.5 + ih * 0.225}
                      r={Math.min(10.5, ih * 0.17)}
                      fill="#1e293b"
                      stroke="#cbd5e1"
                      strokeWidth={1.8}
                    />
                    <circle
                      cx={ix + iw * 0.54}
                      cy={iy + 3.5 + ih * 0.225}
                      r={3.2}
                      fill="#38bdf8"
                    />
                    {/* Top-Right LED Flash */}
                    <circle
                      cx={ix + iw - 12}
                      cy={iy + 3.5 + ih * 0.2}
                      r={3.2}
                      fill="#ffffff"
                      stroke="#fef08a"
                      strokeWidth={1.2}
                    />
                    {/* Bottom-Left Rectangular Periscope Window */}
                    <rect
                      x={ix + iw * 0.12}
                      y={iy + ih * 0.54}
                      width={15}
                      height={ih * 0.35}
                      rx={2.2}
                      fill="#0f172a"
                      stroke="#cbd5e1"
                      strokeWidth={1.2}
                    />
                    <circle
                      cx={ix + iw * 0.12 + 7.5}
                      cy={iy + ih * 0.715}
                      r={4.2}
                      fill="#1e293b"
                      stroke="#38bdf8"
                      strokeWidth={0.9}
                    />
                    {/* Center Badge Text */}
                    <text
                      x={ix + iw * 0.56}
                      y={iy + ih * 0.76}
                      textAnchor="middle"
                      className="fill-slate-100 text-[6.5px] font-mono font-extrabold tracking-widest"
                    >
                      {mg.badgeText || "LOEWE."}
                    </text>
                    {/* Bottom-Right Vertical Sensor Slot */}
                    <rect
                      x={ix + iw - 14}
                      y={iy + ih * 0.64}
                      width={3.6}
                      height={8.5}
                      rx={1.8}
                      fill="#0f172a"
                    />
                  </g>
                );
              }

              if (mg.islandShape === "CENTER_CIRCLE") {
                const r = Math.min(iw, ih) / 2;
                const cx = leafW / 2;
                const cy = iy + r;
                return (
                  <g transform={`translate(${cx}, ${cy})`}>
                    <circle
                      cx={0}
                      cy={0}
                      r={r}
                      fill="#0f172a"
                      stroke={strokeColor}
                      strokeWidth={2.2}
                    />
                    <circle cx={-r * 0.34} cy={-r * 0.32} r={r * 0.24} fill="#1e293b" stroke="#94a3b8" />
                    <circle cx={r * 0.34} cy={-r * 0.32} r={r * 0.24} fill="#1e293b" stroke="#38bdf8" />
                    <circle cx={-r * 0.34} cy={r * 0.32} r={r * 0.24} fill="#1e293b" stroke="#94a3b8" />
                    <text
                      x={r * 0.32}
                      y={r * 0.38}
                      textAnchor="middle"
                      className="fill-sky-400 text-[6px] font-mono font-bold"
                    >
                      {mg.badgeText || dev.brand.slice(0, 5).toUpperCase()}
                    </text>
                  </g>
                );
              }

              // Generic Pill / Visor / Squircle Reference-Modeled Vector Prop
              return (
                <g>
                  <rect
                    x={ix}
                    y={iy}
                    width={iw}
                    height={ih}
                    rx={mg.islandCornerRadiusPx}
                    fill={customProf.cameraAccentHex}
                    stroke={strokeColor}
                    strokeWidth={1.7}
                  />
                  {mg.lensArrangement === "HORIZONTAL_ROW" ? (
                    <>
                      <circle
                        cx={ix + iw * 0.25}
                        cy={iy + ih / 2}
                        r={Math.min(9.5, ih * 0.34)}
                        fill="#0f172a"
                        stroke="#cbd5e1"
                        strokeWidth={1.3}
                      />
                      <circle
                        cx={ix + iw * 0.55}
                        cy={iy + ih / 2}
                        r={Math.min(9.5, ih * 0.34)}
                        fill="#0f172a"
                        stroke="#cbd5e1"
                        strokeWidth={1.3}
                      />
                      <circle
                        cx={ix + iw - 12}
                        cy={iy + ih / 2}
                        r={3.2}
                        fill="#fef08a"
                        stroke="#94a3b8"
                        strokeWidth={0.8}
                      />
                    </>
                  ) : mg.lensArrangement === "TRIANGLE_PRO" ? (
                    <>
                      <circle
                        cx={ix + iw * 0.28}
                        cy={iy + ih * 0.28}
                        r={Math.min(9.5, iw * 0.2)}
                        fill="#0f172a"
                        stroke="#cbd5e1"
                        strokeWidth={1.3}
                      />
                      <circle
                        cx={ix + iw * 0.28}
                        cy={iy + ih * 0.72}
                        r={Math.min(9.5, iw * 0.2)}
                        fill="#0f172a"
                        stroke="#cbd5e1"
                        strokeWidth={1.3}
                      />
                      <circle
                        cx={ix + iw * 0.72}
                        cy={iy + ih * 0.5}
                        r={Math.min(9.5, iw * 0.2)}
                        fill="#0f172a"
                        stroke="#cbd5e1"
                        strokeWidth={1.3}
                      />
                    </>
                  ) : (
                    <>
                      {/* Vertical Stack (2 or 3 lenses) */}
                      <circle
                        cx={ix + iw / 2}
                        cy={iy + ih * 0.27}
                        r={Math.min(9.2, iw * 0.36)}
                        fill="#0f172a"
                        stroke="#e2e8f0"
                        strokeWidth={1.3}
                      />
                      <circle
                        cx={ix + iw / 2}
                        cy={iy + ih * (mg.lensCount >= 3 ? 0.54 : 0.73)}
                        r={Math.min(9.2, iw * 0.36)}
                        fill="#0f172a"
                        stroke="#e2e8f0"
                        strokeWidth={1.3}
                      />
                      {mg.lensCount >= 3 && (
                        <circle
                          cx={ix + iw / 2}
                          cy={iy + ih * 0.8}
                          r={Math.min(8.5, iw * 0.33)}
                          fill="#0f172a"
                          stroke="#e2e8f0"
                          strokeWidth={1.3}
                        />
                      )}
                      {/* Bare-Glass Flash to the Right of the Pill */}
                      <circle
                        cx={ix + iw + 9}
                        cy={iy + ih / 2}
                        r={3.5}
                        fill="#fef9c3"
                        stroke="#eab308"
                        strokeWidth={1}
                      />
                    </>
                  )}
                </g>
              );
            })()
          )}

        {showBackCamera &&
          !isOverlayGhost &&
          !customProf?.useModeledPropGeometry &&
          (!customProf || customProf.renderStyle === "PARAMETRIC_SVG") && (
            <>
              {/* 1. iPhone 16 / 16 Plus / 17: Tight Vertical 2-Lens Stadium Pill + Bare-Glass Flash */}
              {prof.islandType === "IPHONE_16_VERTICAL_PILL" && (
                <g>
                  {/* Subtle Apple-style center back emblem */}
                  <circle
                    cx={w / 2}
                    cy={h * 0.45}
                    r={7.5}
                    fill={customProf ? customProf.cameraAccentHex : strokeColor}
                    opacity={0.18}
                  />
                  {/* Tight Stadium Pill wrapping ONLY the 2 vertical lenses (No box around flash!) */}
                  <rect
                    x={9}
                    y={10}
                    width={25}
                    height={49}
                    rx={12.5}
                    fill={
                      customProf
                        ? customProf.cameraAccentHex
                        : theme === "PRIMARY"
                        ? "#bae6fd"
                        : "#fbcfe8"
                    }
                    stroke={strokeColor}
                    strokeWidth={1.6}
                  />
                  {/* Top 48MP Fusion Lens Ring */}
                  <circle
                    cx={21.5}
                    cy={22.5}
                    r={9.2}
                    fill="#0f172a"
                    stroke="#e2e8f0"
                    strokeWidth={1.3}
                  />
                  <circle cx={21.5} cy={22.5} r={3.6} fill="#1e293b" />
                  {/* Bottom 12MP Ultrawide Lens Ring */}
                  <circle
                    cx={21.5}
                    cy={46.5}
                    r={9.2}
                    fill="#0f172a"
                    stroke="#e2e8f0"
                    strokeWidth={1.3}
                  />
                  <circle cx={21.5} cy={46.5} r={3.6} fill="#1e293b" />
                  {/* Tiny mic pinhole inside right edge of the pill */}
                  <circle cx={30.5} cy={34.5} r={1.1} fill="#334155" />
                  {/* True Tone Flash sitting directly on the bare back glass to the right of the pill */}
                  <circle
                    cx={42}
                    cy={34.5}
                    r={3.8}
                    fill="#f8fafc"
                    stroke="#94a3b8"
                    strokeWidth={1}
                  />
                  <circle cx={42} cy={34.5} r={2.2} fill="#fef08a" />
                </g>
              )}

              {/* 2. iPhone 15 (Base): Square Plateau with 2 Diagonal Lenses */}
              {prof.islandType === "IPHONE_15_DIAGONAL_DUAL" && (
                <g transform="translate(11, 11)">
                  <rect
                    x={0}
                    y={0}
                    width={46}
                    height={46}
                    rx={13}
                    fill="#e2e8f0"
                    stroke={strokeColor}
                    strokeWidth={1.5}
                  />
                  <circle cx={14} cy={14} r={9} fill="#0f172a" />
                  <circle cx={32} cy={32} r={9} fill="#0f172a" />
                  <circle
                    cx={33}
                    cy={13}
                    r={3.2}
                    fill="#fef08a"
                    stroke="#94a3b8"
                    strokeWidth={0.8}
                  />
                  <circle cx={13} cy={33} r={1.8} fill="#475569" />
                </g>
              )}

              {/* 3. iPhone 16e: Minimalist Single 48MP Corner Camera + Flash */}
              {prof.islandType === "IPHONE_16E_SINGLE_LENS" && (
                <g transform="translate(12, 12)">
                  <circle
                    cx={13}
                    cy={13}
                    r={10.5}
                    fill="#0f172a"
                    stroke={strokeColor}
                    strokeWidth={1.8}
                  />
                  <circle cx={13} cy={13} r={4.5} fill="#1e293b" />
                  <circle
                    cx={31}
                    cy={13}
                    r={3.5}
                    fill="#fef08a"
                    stroke="#94a3b8"
                    strokeWidth={0.8}
                  />
                  <circle cx={24} cy={22} r={1.6} fill="#475569" />
                </g>
              )}

              {/* 4. iPhone 17 Air: Sleek Horizontal Single-Lens Visor Bar */}
              {prof.islandType === "IPHONE_17_AIR_BAR" && (
                <g transform="translate(9, 14)">
                  <rect
                    x={0}
                    y={0}
                    width={w - 18}
                    height={26}
                    rx={13}
                    fill="#e2e8f0"
                    stroke={strokeColor}
                    strokeWidth={1.5}
                  />
                  <circle cx={16} cy={13} r={9} fill="#0f172a" />
                  <circle cx={16} cy={13} r={4} fill="#1e293b" />
                  <circle
                    cx={w - 34}
                    cy={13}
                    r={3.2}
                    fill="#fef08a"
                    stroke="#94a3b8"
                    strokeWidth={0.8}
                  />
                  <circle cx={w - 44} cy={13} r={1.8} fill="#475569" />
                </g>
              )}

              {/* 5. iPhone 17 Pro / 17 Pro Max: Full-Width Pro Camera Bar */}
              {prof.islandType === "IPHONE_17_PRO_WIDE_PLATEAU" && (
                <g transform="translate(9, 11)">
                  <rect
                    x={0}
                    y={0}
                    width={w - 18}
                    height={56}
                    rx={14}
                    fill="#e2e8f0"
                    stroke={strokeColor}
                    strokeWidth={1.6}
                  />
                  <circle cx={16} cy={15} r={9.8} fill="#0f172a" />
                  <circle cx={16} cy={41} r={9.8} fill="#0f172a" />
                  <circle cx={38} cy={28} r={9.8} fill="#0f172a" />
                  <circle
                    cx={w - 32}
                    cy={15}
                    r={3.6}
                    fill="#fef08a"
                    stroke="#94a3b8"
                    strokeWidth={0.8}
                  />
                  <circle cx={w - 32} cy={41} r={4.2} fill="#334155" />
                  <circle cx={w - 43} cy={28} r={1.8} fill="#475569" />
                </g>
              )}

              {/* 6. iPhone 13/14/15/16 Pro & Pro Max: Classic Pro Triple Squircle */}
              {prof.islandType === "IPHONE_PRO_TRIPLE_SQUIRCLE" && (
                <g transform="translate(10, 10)">
                  <rect
                    x={0}
                    y={0}
                    width={54}
                    height={56}
                    rx={14}
                    fill="#e2e8f0"
                    stroke={strokeColor}
                    strokeWidth={1.5}
                  />
                  <circle cx={16} cy={15} r={9.8} fill="#0f172a" />
                  <circle cx={16} cy={41} r={9.8} fill="#0f172a" />
                  <circle cx={39} cy={28} r={9.8} fill="#0f172a" />
                  <circle
                    cx={39}
                    cy={12}
                    r={3.3}
                    fill="#fef08a"
                    stroke="#94a3b8"
                    strokeWidth={0.8}
                  />
                  <circle cx={39} cy={44} r={3.8} fill="#334155" />
                </g>
              )}

              {/* 7. Samsung Galaxy S25 Ultra / S24 Ultra / S23 Ultra: 5 Individual Floating Rings + Flash */}
              {prof.islandType === "S_ULTRA_5_RINGS" && (
                <g transform="translate(11, 13)">
                  {[0, 24, 48].map((cy, i) => (
                    <g key={i}>
                      <circle
                        cx={13}
                        cy={cy + 12}
                        r={10.2}
                        fill="#0f172a"
                        stroke={strokeColor}
                        strokeWidth={2}
                      />
                      <circle cx={13} cy={cy + 12} r={4} fill="#1e293b" />
                    </g>
                  ))}
                  {/* Laser AF Ring (Top-Right) */}
                  <circle
                    cx={36}
                    cy={15}
                    r={6.2}
                    fill="#1e293b"
                    stroke="#64748b"
                    strokeWidth={1.2}
                  />
                  {/* LED Flash between the two right rings */}
                  <circle
                    cx={36}
                    cy={29}
                    r={3.2}
                    fill="#fef08a"
                    stroke="#94a3b8"
                    strokeWidth={0.8}
                  />
                  {/* 3x Telephoto Ring (Bottom-Right) */}
                  <circle
                    cx={36}
                    cy={43}
                    r={6.8}
                    fill="#0f172a"
                    stroke={strokeColor}
                    strokeWidth={1.5}
                  />
                </g>
              )}

              {/* 8. Samsung Galaxy S25 / S25+ / S24 / S24+ / S24 FE / A36 / M56: 3 Individual Floating Rings on Bare Glass */}
              {prof.islandType === "S_BASE_3_RINGS" && (
                <g transform="translate(12, 13)">
                  {[12, 34, 56].map((cy, i) => (
                    <g key={i}>
                      <circle
                        cx={12}
                        cy={cy}
                        r={9.2}
                        fill="#0f172a"
                        stroke={strokeColor}
                        strokeWidth={1.8}
                      />
                      <circle cx={12} cy={cy} r={3.6} fill="#1e293b" />
                    </g>
                  ))}
                  {/* Flash sitting directly on the bare back glass */}
                  <circle
                    cx={31}
                    cy={23}
                    r={3.3}
                    fill="#fef08a"
                    stroke="#94a3b8"
                    strokeWidth={0.8}
                  />
                </g>
              )}

              {/* 8b. Samsung Galaxy Z Fold 7 / Z Fold 6 / Galaxy A56: 3 Vertical Lenses in Raised Pill Island */}
              {prof.islandType === "S_PILL_3_RINGS" && (
                <g transform="translate(11, 13)">
                  <rect
                    x={2}
                    y={0}
                    width={24}
                    height={66}
                    rx={12}
                    fill="#1e293b"
                    stroke={strokeColor}
                    strokeWidth={1.5}
                  />
                  {[12, 33, 54].map((cy, i) => (
                    <circle
                      key={i}
                      cx={14}
                      cy={cy}
                      r={8.2}
                      fill="#0f172a"
                      stroke="#94a3b8"
                      strokeWidth={1.2}
                    />
                  ))}
                  <circle
                    cx={34}
                    cy={22}
                    r={3.2}
                    fill="#fef08a"
                    stroke="#94a3b8"
                    strokeWidth={0.8}
                  />
                </g>
              )}

              {/* 8c. Samsung Galaxy S25 Edge: Ultra-Thin Dual-Lens Vertical Pill */}
              {prof.islandType === "S_EDGE_DUAL_PILL" && (
                <g transform="translate(11, 13)">
                  <rect
                    x={2}
                    y={0}
                    width={24}
                    height={46}
                    rx={12}
                    fill="#e2e8f0"
                    stroke={strokeColor}
                    strokeWidth={1.5}
                  />
                  <circle
                    cx={14}
                    cy={13}
                    r={8.8}
                    fill="#0f172a"
                    stroke={strokeColor}
                    strokeWidth={1.4}
                  />
                  <circle
                    cx={14}
                    cy={33}
                    r={8.5}
                    fill="#0f172a"
                    stroke={strokeColor}
                    strokeWidth={1.4}
                  />
                  <circle
                    cx={34}
                    cy={23}
                    r={3.2}
                    fill="#fef08a"
                    stroke="#94a3b8"
                    strokeWidth={0.8}
                  />
                </g>
              )}

              {/* 8d. Clamshell Flip Phones (Galaxy Z Flip 7/6/5, Razr 60/50 Ultra, Phantom V Flip2, Infinix Zero Flip, Xiaomi Mix Flip) */}
              {prof.islandType === "Z_FLIP_CLAMSHELL" && (
                <g>
                  {/* Top FlexWindow / ThruPool / pOLED Cover Screen (Full compact square face when Folded Closed; upper half when Unfolded Open) */}
                  <rect
                    x={8}
                    y={10}
                    width={w - 16}
                    height={isClamshellClosed ? h - 18 : h * 0.43}
                    rx={12}
                    fill="#0f172a"
                    stroke={strokeColor}
                    strokeWidth={1.6}
                  />
                  {dev.slug.includes("phantom-v-flip") ||
                  dev.slug.includes("zero-flip") ||
                  dev.slug.includes("mix-flip") ? (
                    <>
                      {/* TECNO Phantom V Flip2 / Infinix Zero Flip / Xiaomi Mix Flip: 2 Vertically Stacked 50MP Rings on Left + Wrap-Around Cover Screen */}
                      <rect
                        x={40}
                        y={15}
                        width={w - 53}
                        height={isClamshellClosed ? 64 : h * 0.43 - 14}
                        rx={8}
                        fill="rgba(56, 189, 248, 0.16)"
                        stroke="#38bdf8"
                        strokeWidth={0.8}
                      />
                      <text
                        x={40 + (w - 53) / 2}
                        y={36}
                        textAnchor="middle"
                        className="fill-sky-300 text-[6.5px] font-mono font-bold"
                      >
                        {prof.foldKinematics?.coverDisplayInch ?? 3.64}&quot; Cover
                      </text>
                      <text
                        x={40 + (w - 53) / 2}
                        y={47}
                        textAnchor="middle"
                        className="fill-slate-300 text-[6px] font-mono"
                      >
                        120Hz AMOLED
                      </text>
                      {/* Top 50MP Main Ring */}
                      <circle
                        cx={23}
                        cy={27}
                        r={9.2}
                        fill="#1e293b"
                        stroke="#cbd5e1"
                        strokeWidth={1.8}
                      />
                      <circle cx={23} cy={27} r={3.8} fill="#38bdf8" />
                      {/* Bottom 50MP Ultrawide / Telephoto Ring */}
                      <circle
                        cx={23}
                        cy={49}
                        r={9.2}
                        fill="#1e293b"
                        stroke="#cbd5e1"
                        strokeWidth={1.8}
                      />
                      <circle cx={23} cy={49} r={3.8} fill="#0f172a" />
                      {/* Flash Ring */}
                      <circle
                        cx={23}
                        cy={65}
                        r={2.8}
                        fill="#fef08a"
                        stroke="#eab308"
                        strokeWidth={0.8}
                      />
                    </>
                  ) : (
                    <>
                      {/* Samsung Galaxy Z Flip 7 / 6 / 5 & Motorola Razr 60 / 50 Ultra: 2 Horizontal Camera Rings on Top-Left + Full Cover Window */}
                      <rect
                        x={12}
                        y={38}
                        width={w - 24}
                        height={isClamshellClosed ? 42 : h * 0.43 - 34}
                        rx={8}
                        fill="rgba(56, 189, 248, 0.14)"
                        stroke="#38bdf8"
                        strokeWidth={0.7}
                      />
                      <text
                        x={w / 2}
                        y={56}
                        textAnchor="middle"
                        className="fill-sky-300 text-[7px] font-mono font-bold"
                      >
                        {prof.foldKinematics?.coverDisplayInch ?? 4.0}&quot;{" "}
                        {dev.slug.includes("razr") ? "pOLED Cover" : "FlexWindow"}
                      </text>
                      <circle
                        cx={23}
                        cy={24}
                        r={8.8}
                        fill="#1e293b"
                        stroke={strokeColor}
                        strokeWidth={1.8}
                      />
                      <circle
                        cx={44}
                        cy={24}
                        r={8.8}
                        fill="#1e293b"
                        stroke={strokeColor}
                        strokeWidth={1.8}
                      />
                      <circle
                        cx={60}
                        cy={24}
                        r={3.2}
                        fill="#fef08a"
                        stroke="#94a3b8"
                        strokeWidth={0.8}
                      />
                    </>
                  )}
                  {/* Center Clamshell Hinge Seam (only visible when Unfolded Open) */}
                  {!isClamshellClosed && (
                    <line
                      x1={2}
                      y1={h * 0.49}
                      x2={w - 2}
                      y2={h * 0.49}
                      stroke={strokeColor}
                      strokeWidth={1.8}
                      strokeDasharray="4 2"
                    />
                  )}
                </g>
              )}

              {/* 9. Vivo / Xiaomi Ultra / Oppo / Honor / Realme / TECNO / OnePlus Open Center Circular Deco (Centered on Left Leaf for Book-Foldables) */}
              {prof.islandType === "ZEISS_CIRCLE" && (
                <g transform={`translate(${leafW / 2}, 56)`}>
                  <circle
                    cx={0}
                    cy={0}
                    r={38}
                    fill="#0f172a"
                    stroke={strokeColor}
                    strokeWidth={2.3}
                  />
                  <circle
                    cx={-12}
                    cy={-11}
                    r={8.5}
                    fill="#1e293b"
                    stroke="#64748b"
                  />
                  <circle
                    cx={13}
                    cy={-11}
                    r={9.5}
                    fill="#1e293b"
                    stroke="#38bdf8"
                  />
                  <circle
                    cx={-12}
                    cy={12}
                    r={8.5}
                    fill="#1e293b"
                    stroke="#64748b"
                  />
                  <text
                    x={12}
                    y={15}
                    textAnchor="middle"
                    className="fill-sky-400 text-[6.5px] font-bold tracking-wider"
                  >
                    {dev.brand.toUpperCase().slice(0, 5)}
                  </text>
                </g>
              )}

              {/* 10. OnePlus / Huawei / Motorola Offset Deco */}
              {prof.islandType === "ONEPLUS_CIRCLE" && (
                <g transform="translate(44, 50)">
                  <circle
                    cx={0}
                    cy={0}
                    r={32}
                    fill="#0f172a"
                    stroke={strokeColor}
                    strokeWidth={2}
                  />
                  <circle cx={-10} cy={-10} r={7.5} fill="#334155" />
                  <circle cx={10} cy={-10} r={7.5} fill="#334155" />
                  <circle cx={-10} cy={10} r={7.5} fill="#334155" />
                  <circle cx={10} cy={10} r={5} fill="#475569" />
                </g>
              )}

              {/* 11. Google Pixel 9/10 Pro & Pro XL: Floating Metallic Stadium Pill + Inner Dark Glass Capsule */}
              {prof.islandType === "PIXEL_PRO_VISOR" && (
                <g transform="translate(10, 18)">
                  {/* Outer Metallic Stadium Pill */}
                  <rect
                    x={0}
                    y={0}
                    width={w - 20}
                    height={34}
                    rx={17}
                    fill="#e2e8f0"
                    stroke={strokeColor}
                    strokeWidth={1.6}
                  />
                  {/* Inner Dark Glass Capsule housing the 3 lenses */}
                  <rect
                    x={5}
                    y={4}
                    width={w - 46}
                    height={26}
                    rx={13}
                    fill="#0f172a"
                  />
                  {/* 50MP Wide + 48MP Ultrawide Circles */}
                  <circle cx={19} cy={17} r={7.2} fill="#1e293b" stroke="#475569" strokeWidth={1} />
                  <circle cx={38} cy={17} r={6.8} fill="#1e293b" stroke="#475569" strokeWidth={1} />
                  {/* 5x Periscope Rectangular Prism Cutout */}
                  <rect
                    x={51}
                    y={10.5}
                    width={11}
                    height={13}
                    rx={3.5}
                    fill="#1e293b"
                    stroke="#38bdf8"
                    strokeWidth={1}
                  />
                  {/* Right-Side Flash (Top) & Temperature Sensor (Bottom) on Metallic Rim */}
                  <circle
                    cx={w - 31}
                    cy={11}
                    r={3.2}
                    fill="#fef08a"
                    stroke="#94a3b8"
                    strokeWidth={0.8}
                  />
                  <circle
                    cx={w - 31}
                    cy={23}
                    r={3.5}
                    fill="#334155"
                    stroke="#64748b"
                    strokeWidth={0.8}
                  />
                </g>
              )}

              {/* 11b. Google Pixel 9 (Base): Floating Metallic Stadium Pill with 2 Lenses */}
              {prof.islandType === "PIXEL_9_BASE_DUAL_OVAL" && (
                <g transform="translate(11, 18)">
                  <rect
                    x={0}
                    y={0}
                    width={w - 22}
                    height={32}
                    rx={16}
                    fill="#e2e8f0"
                    stroke={strokeColor}
                    strokeWidth={1.6}
                  />
                  <rect
                    x={5}
                    y={4}
                    width={w - 48}
                    height={24}
                    rx={12}
                    fill="#0f172a"
                  />
                  <circle cx={20} cy={16} r={7.5} fill="#1e293b" stroke="#475569" strokeWidth={1} />
                  <circle cx={42} cy={16} r={7.2} fill="#1e293b" stroke="#475569" strokeWidth={1} />
                  <circle
                    cx={w - 33}
                    cy={16}
                    r={3.4}
                    fill="#fef08a"
                    stroke="#94a3b8"
                    strokeWidth={0.8}
                  />
                </g>
              )}

              {/* 11c. Google Pixel 9 Pro Fold: Top-Left Squircle with 2 Stacked Horizontal Pills */}
              {prof.islandType === "PIXEL_9_PRO_FOLD_SQUIRCLE" && (
                <g transform="translate(10, 12)">
                  <rect
                    x={0}
                    y={0}
                    width={62}
                    height={44}
                    rx={11}
                    fill="#e2e8f0"
                    stroke={strokeColor}
                    strokeWidth={1.6}
                  />
                  {/* Top Horizontal Pill */}
                  <rect x={5} y={5} width={40} height={15} rx={7.5} fill="#0f172a" />
                  <circle cx={14} cy={12.5} r={5} fill="#334155" />
                  <rect x={26} y={8} width={11} height={9} rx={2.5} fill="#1e293b" stroke="#38bdf8" strokeWidth={0.8} />
                  {/* Bottom Horizontal Pill */}
                  <rect x={5} y={24} width={40} height={15} rx={7.5} fill="#0f172a" />
                  <circle cx={15} cy={31.5} r={5.5} fill="#334155" />
                  {/* Flash on Top-Right */}
                  <circle cx={53} cy={12.5} r={3.2} fill="#fef08a" stroke="#94a3b8" strokeWidth={0.8} />
                  <circle cx={53} cy={31.5} r={2} fill="#475569" />
                </g>
              )}

              {/* 11d. Google Pixel 8 Pro / 8 / 8a / 7 Pro / Pixel Fold 1st Gen: Full-Width Edge-to-Edge Aluminum Visor Bar */}
              {prof.islandType === "PIXEL_CLASSIC_EDGE_VISOR" && (
                <g transform="translate(0, 20)">
                  {/* Edge-to-edge metallic visor bar wrapping into left/right frame rails */}
                  <rect
                    x={1}
                    y={0}
                    width={leafW - 2}
                    height={28}
                    rx={2}
                    fill="#cbd5e1"
                    stroke={strokeColor}
                    strokeWidth={1.5}
                  />
                  {/* Dark glass lens cutout inside the metallic visor */}
                  <rect
                    x={11}
                    y={4}
                    width={leafW - 44}
                    height={20}
                    rx={10}
                    fill="#0f172a"
                  />
                  <circle cx={23} cy={14} r={6.8} fill="#334155" />
                  <circle cx={41} cy={14} r={6.2} fill="#334155" />
                  {dev.specs.telephotoSpecs !== "None (2x Super Res Crop)" && (
                    <rect
                      x={54}
                      y={8.5}
                      width={12}
                      height={11}
                      rx={3.5}
                      fill="#1e293b"
                      stroke="#38bdf8"
                      strokeWidth={0.9}
                    />
                  )}
                  <circle
                    cx={leafW - 20}
                    cy={10}
                    r={3.2}
                    fill="#fef08a"
                    stroke="#94a3b8"
                    strokeWidth={0.8}
                  />
                  <circle cx={leafW - 20} cy={19} r={2.2} fill="#475569" />
                </g>
              )}

              {/* 12. Google Pixel 9a: Flush Compact Dual-Lens Pill */}
              {prof.islandType === "PIXEL_9A_FLUSH_PILL" && (
                <g transform="translate(14, 16)">
                  <rect
                    x={0}
                    y={0}
                    width={48}
                    height={24}
                    rx={12}
                    fill="#0f172a"
                    stroke={strokeColor}
                    strokeWidth={1.5}
                  />
                  <circle cx={14} cy={12} r={7.5} fill="#334155" />
                  <circle cx={34} cy={12} r={7} fill="#334155" />
                  <circle
                    cx={58}
                    cy={12}
                    r={3}
                    fill="#fef08a"
                    stroke="#94a3b8"
                    strokeWidth={0.8}
                  />
                </g>
              )}

              {/* 13. Sony Xperia 1 VII: Vertical Metallic Pill with 3 Lenses */}
              {prof.islandType === "SONY_VERTICAL_PILL" && (
                <g transform="translate(12, 12)">
                  <rect
                    x={0}
                    y={0}
                    width={24}
                    height={72}
                    rx={12}
                    fill="#0f172a"
                    stroke={strokeColor}
                    strokeWidth={1.6}
                  />
                  <circle cx={12} cy={15} r={7.5} fill="#334155" />
                  <circle cx={12} cy={36} r={7.5} fill="#334155" />
                  <circle
                    cx={12}
                    cy={57}
                    r={8}
                    fill="#1e293b"
                    stroke="#38bdf8"
                    strokeWidth={1.2}
                  />
                </g>
              )}

              {/* 14. RedMagic 10 Pro / Asus ROG: Flush Lenses + Active Turbofan Ring */}
              {prof.islandType === "REDMAGIC_FLUSH_GAMING" && (
                <g transform="translate(12, 14)">
                  <circle cx={14} cy={14} r={9} fill="#0f172a" />
                  <circle cx={14} cy={36} r={9} fill="#0f172a" />
                  <circle
                    cx={14}
                    cy={58}
                    r={9}
                    fill="#1e293b"
                    stroke="#ec4899"
                    strokeWidth={1.8}
                  />
                </g>
              )}

              {/* 15. Nothing Phone (3a) Pro: Center Circle + Glyph LEDs */}
              {prof.islandType === "NOTHING_GLYPH" && (
                <g transform={`translate(${w / 2}, 54)`}>
                  <circle
                    cx={0}
                    cy={0}
                    r={30}
                    fill="#1e293b"
                    stroke={strokeColor}
                    strokeWidth={1.8}
                  />
                  <path
                    d="M -36 -18 A 40 40 0 0 1 20 -35"
                    fill="none"
                    stroke="#0284c7"
                    strokeWidth={3.5}
                    strokeLinecap="round"
                  />
                  <path
                    d="M 36 10 A 40 40 0 0 1 -15 38"
                    fill="none"
                    stroke="#0284c7"
                    strokeWidth={3.5}
                    strokeLinecap="round"
                  />
                  <circle cx={-10} cy={-6} r={7} fill="#0f172a" />
                  <circle cx={10} cy={-6} r={7} fill="#0f172a" />
                  <circle
                    cx={0}
                    cy={12}
                    r={8}
                    fill="#0f172a"
                    stroke="#38bdf8"
                  />
                </g>
              )}

              {/* 16. TECNO Camon 50 vs Camon 40 Series:
                  - Camon 50: Swan-Neck S-Curve + Inner 3-Lens Stadium Pill + Right Black Sensor Circle, Red Dot & Round Flash
                  - Camon 40: Sculpted Swan-Neck Plateau (No Inner Pill) + 3 Individual Silver-Rimmed Lenses + Right Vertical Pill (Red Dot on Top + Dual Flash on Bottom) */}
              {prof.islandType === "TECNO_CAMON_SWAN_PILL" && (
                <g clipPath={`url(#${clipId})`}>
                  {/* Two-Tone Swan-Neck S-Curve Left Panel Zone */}
                  <path
                    d={`M 0 0 L 43 0 L 43 70 C 43 94, 10 98, 10 126 L 10 ${h} L 0 ${h} Z`}
                    fill={
                      theme === "PRIMARY"
                        ? "rgba(148, 163, 184, 0.26)"
                        : "rgba(244, 63, 94, 0.15)"
                    }
                  />
                  {/* Crisp Swan-Neck S-Curve Sculpted Bevel Seam Line */}
                  <path
                    d={`M 43 0 L 43 70 C 43 94, 10 98, 10 126 L 10 ${h}`}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={dev.slug.toLowerCase().includes("camon-50") ? 1.1 : 1.5}
                    strokeOpacity={dev.slug.toLowerCase().includes("camon-50") ? 0.55 : 0.8}
                  />

                  {/* Camon 50 Only: Inner Raised Symmetrical Vertical Stadium Pill Around the 3 Lenses */}
                  {dev.slug.toLowerCase().includes("camon-50") && (
                    <rect
                      x={10}
                      y={10}
                      width={26}
                      height={76}
                      rx={13}
                      fill={
                        theme === "PRIMARY"
                          ? "rgba(226, 232, 240, 0.95)"
                          : "rgba(254, 205, 211, 0.95)"
                      }
                      stroke={strokeColor}
                      strokeWidth={1.6}
                    />
                  )}

                  {/* Lens 1 (Top): 50MP Sony LYT-700C OIS Main Camera */}
                  <circle
                    cx={23}
                    cy={24}
                    r={10.2}
                    fill="#090d16"
                    stroke={dev.slug.toLowerCase().includes("camon-50") ? "#475569" : "#cbd5e1"}
                    strokeWidth={dev.slug.toLowerCase().includes("camon-50") ? 1.4 : 1.9}
                  />
                  <circle cx={23} cy={24} r={6.8} fill="#0f172a" stroke="#1e293b" strokeWidth={0.9} />
                  <circle cx={23} cy={24} r={3.6} fill="#1e293b" />
                  <circle cx={21.6} cy={22.6} r={1.5} fill="#38bdf8" />

                  {/* Lens 2 (Middle): 50MP Telephoto / Ultrawide Camera */}
                  <circle
                    cx={23}
                    cy={48}
                    r={10.2}
                    fill="#090d16"
                    stroke={dev.slug.toLowerCase().includes("camon-50") ? "#475569" : "#cbd5e1"}
                    strokeWidth={dev.slug.toLowerCase().includes("camon-50") ? 1.4 : 1.9}
                  />
                  <circle cx={23} cy={48} r={6.8} fill="#0f172a" stroke="#1e293b" strokeWidth={0.9} />
                  <circle cx={23} cy={48} r={3.4} fill="#1e293b" />
                  <circle cx={21.8} cy={46.8} r={1.2} fill="#38bdf8" />

                  {/* Lens 3 (Bottom): 3rd Camera Module */}
                  <circle
                    cx={23}
                    cy={72}
                    r={10.2}
                    fill="#090d16"
                    stroke={dev.slug.toLowerCase().includes("camon-50") ? "#475569" : "#cbd5e1"}
                    strokeWidth={dev.slug.toLowerCase().includes("camon-50") ? 1.4 : 1.9}
                  />
                  <circle cx={23} cy={72} r={6.8} fill="#0f172a" stroke="#1e293b" strokeWidth={0.9} />
                  <circle cx={23} cy={72} r={3.2} fill="#1e293b" />

                  {dev.slug.toLowerCase().includes("camon-50") ? (
                    <>
                      {/* Camon 50 Right-Side Column:
                          1. Top Black Circular Auxiliary Sensor
                          2. Middle Small Red Indicator Dot
                          3. Bottom Circular White/Silver LED Flash */}
                      <circle
                        cx={55}
                        cy={26}
                        r={5.6}
                        fill="#090d16"
                        stroke="#475569"
                        strokeWidth={1.1}
                      />
                      <circle cx={55} cy={38.5} r={1.9} fill="#ef4444" />
                      <circle
                        cx={55}
                        cy={48}
                        r={4.2}
                        fill="#f8fafc"
                        stroke="#cbd5e1"
                        strokeWidth={1.2}
                      />
                      <circle cx={55} cy={48} r={2.0} fill="#fef9c3" />
                    </>
                  ) : (
                    <>
                      {/* Camon 40 Right-Side Metallic Vertical Pill (Next to Top Lens):
                          Houses Red Tally Indicator Dot on Top + Vertical Dual-LED Flash on Bottom */}
                      <rect
                        x={49}
                        y={15}
                        width={7.5}
                        height={20.5}
                        rx={3.75}
                        fill="#e2e8f0"
                        stroke="#94a3b8"
                        strokeWidth={1.1}
                      />
                      <circle cx={52.75} cy={19.5} r={1.9} fill="#ef4444" />
                      <rect
                        x={50.75}
                        y={23.5}
                        width={4}
                        height={9.5}
                        rx={2}
                        fill="#fef9c3"
                        stroke="#cbd5e1"
                        strokeWidth={0.8}
                      />
                    </>
                  )}

                  {/* Vertical "TECNO CAMON" Lower-Left Wordmark */}
                  <text
                    transform={`translate(26, ${Math.max(175, h - 54)}) rotate(-90)`}
                    className="fill-slate-400 text-[7.5px] font-sans font-extrabold tracking-[0.18em] uppercase select-none"
                  >
                    TECNO CAMON
                  </text>
                </g>
              )}

              {/* 17. TECNO Pova 7 Ultra 5G / Pova 6 Pro 5G: Cyber-Mecha Trapezoid + Dynamic Mini-LED Light Arcs */}
              {prof.islandType === "TECNO_POVA_MECHA_LED" && (
                <g>
                  {/* Cyber-Mecha Top Trapezoidal Visor */}
                  <polygon
                    points={`10,12 ${w - 14},12 ${w - 8},26 ${w - 8},76 10,76`}
                    fill="#0f172a"
                    stroke={strokeColor}
                    strokeWidth={1.8}
                  />
                  {/* Dynamic Mini-LED Glowing Arcs / Propeller Light Glyph */}
                  <circle
                    cx={w - 30}
                    cy={44}
                    r={16}
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth={2.4}
                    strokeDasharray="16 6"
                  />
                  <line
                    x1={w - 30}
                    y1={82}
                    x2={w - 14}
                    y2={118}
                    stroke="#38bdf8"
                    strokeWidth={2}
                    strokeLinecap="round"
                  />
                  <line
                    x1={14}
                    y1={82}
                    x2={32}
                    y2={106}
                    stroke={strokeColor}
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                  />
                  {/* 3 Mecha Camera Rings on Left */}
                  <circle
                    cx={26}
                    cy={29}
                    r={10.5}
                    fill="#1e293b"
                    stroke={strokeColor}
                    strokeWidth={1.8}
                  />
                  <circle cx={26} cy={29} r={4.2} fill="#38bdf8" />
                  <circle
                    cx={26}
                    cy={57}
                    r={10.5}
                    fill="#1e293b"
                    stroke={strokeColor}
                    strokeWidth={1.8}
                  />
                  <circle cx={26} cy={57} r={4.2} fill="#0f172a" />
                  <circle
                    cx={48}
                    cy={43}
                    r={8}
                    fill="#1e293b"
                    stroke="#94a3b8"
                    strokeWidth={1.4}
                  />
                  <circle
                    cx={w - 30}
                    cy={44}
                    r={4}
                    fill="#fef08a"
                    stroke="#eab308"
                    strokeWidth={1}
                  />
                </g>
              )}

              {/* 18. TECNO Spark Slim (5.75mm): Ultra-Sleek Horizontal Visor Pill + Central Mood Light Bar */}
              {prof.islandType === "TECNO_SPARK_SLIM_VISOR" && (
                <g transform="translate(8, 16)">
                  <rect
                    x={0}
                    y={0}
                    width={w - 16}
                    height={32}
                    rx={16}
                    fill={
                      theme === "PRIMARY"
                        ? "rgba(226, 232, 240, 0.92)"
                        : "rgba(254, 205, 211, 0.92)"
                    }
                    stroke={strokeColor}
                    strokeWidth={1.8}
                  />
                  {/* Left & Right Camera Rings */}
                  <circle
                    cx={18}
                    cy={16}
                    r={10.5}
                    fill="#0f172a"
                    stroke={strokeColor}
                    strokeWidth={1.6}
                  />
                  <circle cx={18} cy={16} r={4} fill="#38bdf8" />
                  <circle
                    cx={w - 34}
                    cy={16}
                    r={10.5}
                    fill="#0f172a"
                    stroke={strokeColor}
                    strokeWidth={1.6}
                  />
                  <circle cx={w - 34} cy={16} r={4} fill="#1e293b" />
                  {/* Central Dynamic Mood Light Strip */}
                  <rect
                    x={(w - 16) / 2 - 14}
                    y={12.5}
                    width={28}
                    height={7}
                    rx={3.5}
                    fill="#38bdf8"
                    stroke="#0284c7"
                    strokeWidth={1}
                  />
                </g>
              )}

              {/* 19. TECNO Phantom V Fold2 5G: Authentic 2-Tier Rectangular Camera Plateau (Top Black Dual-Lens Window + Bottom Brushed Silver Loewe Deck with Rectangular Periscope Window) */}
              {prof.islandType === "TECNO_PHANTOM_V_FOLD2_RECT" && (
                <g>
                  {/* Outer Raised Brushed Metallic Rectangular Camera Plateau (Fits inside Left Rear Leaf when Unfolded Open, or Full Width when Folded Closed) */}
                  <rect
                    x={8}
                    y={12}
                    width={leafW - 16}
                    height={63}
                    rx={5}
                    fill="#cbd5e1"
                    stroke={strokeColor}
                    strokeWidth={1.8}
                  />
                  {/* Inner Metallic Bevel Step */}
                  <rect
                    x={10}
                    y={14}
                    width={leafW - 20}
                    height={59}
                    rx={4}
                    fill="#94a3b8"
                    stroke="#64748b"
                    strokeWidth={0.9}
                  />

                  {/* Top Half: Glossy Black Horizontal Visor Window */}
                  <rect
                    x={11.5}
                    y={15.5}
                    width={leafW - 23}
                    height={28}
                    rx={3}
                    fill="#0f172a"
                    stroke="#334155"
                    strokeWidth={1}
                  />
                  {/* Subtle Diagonal Glass Reflection Across Top Black Window */}
                  <polygon
                    points={`12,16 ${leafW / 2 + 6},16 ${
                      leafW / 2 - 10
                    },43 12,43`}
                    fill="rgba(255,255,255,0.08)"
                  />

                  {/* Top-Left 50MP Main OIS Circular Lens with Silver Bezel Ring */}
                  <circle
                    cx={27}
                    cy={29.5}
                    r={10.5}
                    fill="#1e293b"
                    stroke="#cbd5e1"
                    strokeWidth={1.8}
                  />
                  <circle
                    cx={27}
                    cy={29.5}
                    r={6.5}
                    fill="#0f172a"
                    stroke="#475569"
                    strokeWidth={1}
                  />
                  <circle cx={27} cy={29.5} r={3.2} fill="#1e293b" />
                  <circle cx={25.2} cy={27.8} r={1.4} fill="#38bdf8" />

                  {/* Top-Center 50MP Portrait Circular Lens with Silver Bezel Ring */}
                  <circle
                    cx={55}
                    cy={29.5}
                    r={10.5}
                    fill="#1e293b"
                    stroke="#cbd5e1"
                    strokeWidth={1.8}
                  />
                  <circle
                    cx={55}
                    cy={29.5}
                    r={6.5}
                    fill="#0f172a"
                    stroke="#475569"
                    strokeWidth={1}
                  />
                  <circle cx={55} cy={29.5} r={3.2} fill="#1e293b" />
                  <circle cx={53.2} cy={27.8} r={1.4} fill="#38bdf8" />

                  {/* Top-Right LED Flash & Flicker Sensor inside Black Window */}
                  <circle
                    cx={leafW - 22}
                    cy={26.5}
                    r={3.4}
                    fill="#ffffff"
                    stroke="#fef08a"
                    strokeWidth={1.2}
                  />
                  <circle cx={leafW - 22} cy={35.5} r={1.5} fill="#64748b" />

                  {/* Bottom Half: Brushed Silver-Slate Lower Deck */}
                  {/* Bottom-Left Vertical Rectangular 50MP Ultrawide/Tele Window */}
                  <rect
                    x={18}
                    y={46.5}
                    width={15}
                    height={22}
                    rx={2.2}
                    fill="#0f172a"
                    stroke="#cbd5e1"
                    strokeWidth={1.2}
                  />
                  <circle
                    cx={25.5}
                    cy={57.5}
                    r={4.8}
                    fill="#1e293b"
                    stroke="#475569"
                    strokeWidth={1}
                  />
                  <circle cx={24.5} cy={56.5} r={1.3} fill="#38bdf8" />

                  {/* Bottom-Center "LOEWE." Co-Engineered Metallic Wordmark */}
                  <text
                    x={leafW / 2 + 4}
                    y={59.5}
                    textAnchor="middle"
                    className="fill-slate-100 text-[6.5px] font-mono font-extrabold tracking-widest"
                  >
                    LOEWE.
                  </text>

                  {/* Bottom-Right Vertical Pill Sensor Cutout */}
                  <rect
                    x={leafW - 23.5}
                    y={53}
                    width={3.8}
                    height={9}
                    rx={1.9}
                    fill="#0f172a"
                  />

                  {/* Lower-Left Vertical "PHANTOM" Debossed Brand Stamp */}
                  <text
                    x={16}
                    y={h - 86}
                    transform={`rotate(-90, 16, ${h - 86})`}
                    className="fill-slate-400 text-[6.5px] font-mono font-bold tracking-widest"
                  >
                    PHANTOM
                  </text>
                </g>
              )}

              {/* 20. Xiaomi 15/14/13 Pro & Base / Redmi K80 Pro / OnePlus 13T / iQOO 13/12: Top-Left 2x2 Leica / Flagship Squircle Plateau */}
              {prof.islandType === "XIAOMI_LEICA_SQUIRCLE" && (
                <g transform="translate(10, 12)">
                  <rect
                    x={0}
                    y={0}
                    width={54}
                    height={54}
                    rx={13}
                    fill="#0f172a"
                    stroke={strokeColor}
                    strokeWidth={1.8}
                  />
                  {/* Subtle cross-hair grid lines */}
                  <line x1={27} y1={4} x2={27} y2={50} stroke="#334155" strokeWidth={0.7} />
                  <line x1={4} y1={27} x2={50} y2={27} stroke="#334155" strokeWidth={0.7} />
                  {/* Top-Left 50MP Main Lens */}
                  <circle cx={14.5} cy={14.5} r={8.8} fill="#1e293b" stroke="#cbd5e1" strokeWidth={1.3} />
                  <circle cx={14.5} cy={14.5} r={3.5} fill="#38bdf8" />
                  {/* Bottom-Left Telephoto Lens */}
                  <circle cx={14.5} cy={39.5} r={8.8} fill="#1e293b" stroke="#cbd5e1" strokeWidth={1.3} />
                  <circle cx={14.5} cy={39.5} r={3.5} fill="#0f172a" />
                  {/* Top-Right Ultrawide Lens */}
                  <circle cx={39.5} cy={14.5} r={8.2} fill="#1e293b" stroke="#94a3b8" strokeWidth={1.2} />
                  {/* Bottom-Right LEICA / Brand Badge + External Pill Flash */}
                  <text
                    x={39.5}
                    y={42}
                    textAnchor="middle"
                    className="fill-rose-400 text-[5.8px] font-mono font-extrabold tracking-wider"
                  >
                    {dev.brand.toLowerCase() === "xiaomi" ? "LEICA" : dev.brand.slice(0, 4).toUpperCase()}
                  </text>
                  <rect
                    x={58}
                    y={16}
                    width={4.5}
                    height={12}
                    rx={2.2}
                    fill="#fef08a"
                    stroke="#eab308"
                    strokeWidth={0.9}
                  />
                </g>
              )}

              {/* 21. Huawei Pura 70 Ultra: Iconic Top-Left Penrose Triangular Camera Island with Retractable 1-Inch Lens */}
              {prof.islandType === "HUAWEI_PURA_TRIANGLE" && (
                <g transform="translate(9, 11)">
                  <path
                    d="M 4 0 L 34 0 Q 44 0 50 10 L 62 34 Q 68 46 58 58 L 42 72 Q 32 80 18 80 L 6 80 Q 0 80 0 70 L 0 8 Q 0 0 4 0 Z"
                    fill="#0f172a"
                    stroke={strokeColor}
                    strokeWidth={1.8}
                  />
                  {/* Top-Left Ultrawide Ring */}
                  <circle cx={17} cy={17} r={8.5} fill="#1e293b" stroke="#cbd5e1" strokeWidth={1.4} />
                  {/* Center-Right Giant 1-Inch Retractable Main Lens Ring with Red XMAGE Accent */}
                  <circle cx={39} cy={39} r={13} fill="#1e293b" stroke="#f43f5e" strokeWidth={1.8} />
                  <circle cx={39} cy={39} r={5.5} fill="#38bdf8" />
                  {/* Bottom-Left Periscope Telephoto Ring */}
                  <circle cx={17} cy={61} r={9} fill="#1e293b" stroke="#cbd5e1" strokeWidth={1.4} />
                  <text
                    x={38}
                    y={69}
                    textAnchor="middle"
                    className="fill-slate-300 text-[5.5px] font-mono font-bold tracking-widest"
                  >
                    XMAGE
                  </text>
                </g>
              )}

              {/* 22. Nothing Phone (3) (2025): Top-Left Triple 50MP Periscope Array + Top-Right 489-LED Glyph Matrix Circle */}
              {prof.islandType === "NOTHING_GLYPH_MATRIX_3" && (
                <g>
                  {/* Top-Left Triple 50MP Lenses */}
                  <circle cx={22} cy={24} r={9} fill="#0f172a" stroke={strokeColor} strokeWidth={1.5} />
                  <circle cx={44} cy={24} r={9} fill="#0f172a" stroke="#38bdf8" strokeWidth={1.5} />
                  <circle cx={22} cy={46} r={9} fill="#0f172a" stroke={strokeColor} strokeWidth={1.5} />
                  {/* Top-Right 489-LED Glyph Matrix Monochrome Dot-Matrix Display */}
                  <circle
                    cx={w - 28}
                    cy={34}
                    r={17}
                    fill="#0f172a"
                    stroke="#38bdf8"
                    strokeWidth={1.6}
                  />
                  {[-6, 0, 6].map((dx) =>
                    [-6, 0, 6].map((dy) => (
                      <circle
                        key={`${dx}-${dy}`}
                        cx={w - 28 + dx}
                        cy={34 + dy}
                        r={1.4}
                        fill="#e0f2fe"
                      />
                    ))
                  )}
                </g>
              )}

              {/* 23B. TECNO Spark 50 Pro / Spark 50 5G: Full-Width Upper Rounded Plateau + Top-Left Horizontal 2-Lens Pill + Bottom-Left 3rd Lens + Right Flash, Pinhole & Conical Sensor Disc + Centered TECNO SPARK Wordmark */}
              {prof.islandType === "TECNO_SPARK_50_WIDE_PLATEAU" && (
                <g clipPath={`url(#${clipId})`}>
                  {/* Outer Stepped Full-Width Upper Camera Plateau */}
                  <rect
                    x={6}
                    y={7}
                    width={w - 12}
                    height={66}
                    rx={15}
                    fill="#1e293b"
                    stroke={strokeColor}
                    strokeWidth={1.7}
                  />
                  {/* Inner Beveled Plateau Deck */}
                  <rect
                    x={8}
                    y={9}
                    width={w - 16}
                    height={62}
                    rx={13.5}
                    fill="#0f172a"
                    stroke="#334155"
                    strokeWidth={0.9}
                  />

                  {/* Top-Left Horizontal Stadium Pill Sub-Island (Houses 2 Side-by-Side Lenses) */}
                  <rect
                    x={13}
                    y={13.5}
                    width={47}
                    height={23}
                    rx={11.5}
                    fill="#090d16"
                    stroke="#64748b"
                    strokeWidth={1.3}
                  />
                  {/* Pill Left Lens: 50MP Main Camera */}
                  <circle cx={24.5} cy={25} r={8.8} fill="#1e293b" stroke="#334155" strokeWidth={0.9} />
                  <circle cx={24.5} cy={25} r={5.4} fill="#090d16" />
                  <circle cx={24.5} cy={25} r={2.6} fill="#1e293b" />
                  <circle cx={23.4} cy={23.9} r={1.2} fill="#38bdf8" />

                  {/* Pill Right Lens: Secondary Camera Ring */}
                  <circle cx={48.5} cy={25} r={8.8} fill="#1e293b" stroke="#334155" strokeWidth={0.9} />
                  <circle cx={48.5} cy={25} r={5.4} fill="#090d16" stroke="#1e293b" strokeWidth={0.7} />
                  <circle cx={48.5} cy={25} r={2.4} fill="#0f172a" />

                  {/* Bottom-Left Standalone 3rd Circular Lens (Directly Below Pill Left Lens) */}
                  <circle
                    cx={24.5}
                    cy={52}
                    r={9.8}
                    fill="#090d16"
                    stroke="#64748b"
                    strokeWidth={1.4}
                  />
                  <circle cx={24.5} cy={52} r={6.0} fill="#0f172a" stroke="#1e293b" strokeWidth={0.8} />
                  <circle cx={24.5} cy={52} r={2.6} fill="#1e293b" />
                  <circle cx={23.5} cy={51.0} r={1.1} fill="#38bdf8" />

                  {/* Right-Side 3-Element Vertical Column Inside Plateau:
                      1. Top-Right Circular Pearl-White LED Flash
                      2. Middle-Right Tiny Pinhole Mic/Sensor
                      3. Bottom-Right Conical-Brushed Metallic Sensor Disc */}
                  <circle
                    cx={w - 21}
                    cy={22}
                    r={4.2}
                    fill="#f8fafc"
                    stroke="#94a3b8"
                    strokeWidth={1.1}
                  />
                  <circle cx={w - 21} cy={22} r={2.0} fill="#fef9c3" />

                  <circle cx={w - 21} cy={37} r={1.3} fill="#020617" />

                  <circle
                    cx={w - 21}
                    cy={52}
                    r={4.5}
                    fill="#1e293b"
                    stroke="#475569"
                    strokeWidth={1.0}
                  />
                  <line
                    x1={w - 24.2}
                    y1={48.8}
                    x2={w - 17.8}
                    y2={55.2}
                    stroke="#64748b"
                    strokeWidth={0.8}
                  />
                  <line
                    x1={w - 24.2}
                    y1={55.2}
                    x2={w - 17.8}
                    y2={48.8}
                    stroke="#475569"
                    strokeWidth={0.8}
                  />
                  <circle cx={w - 21} cy={52} r={1.4} fill="#0f172a" />

                  {/* Lower-Center Horizontal "TECNO SPARK" Wordmark */}
                  <text
                    x={w / 2}
                    y={Math.min(h - 56, h * 0.74)}
                    textAnchor="middle"
                    className="fill-slate-400 text-[7px] font-sans font-extrabold tracking-[0.2em] uppercase select-none"
                  >
                    TECNO SPARK
                  </text>
                </g>
              )}

              {/* 23C. TECNO Spark 50 5G: Full-Width Horizontal Stadium Visor Bar + Left Black Pill Window (Main Lens + Sensor) + Right Black Circular Flash Module + Lower-Center TECNO Wordmark */}
              {prof.islandType === "TECNO_SPARK_50_5G_PILL_VISOR" && (
                <g clipPath={`url(#${clipId})`}>
                  {/* Full-Width Horizontal Stadium Pill Visor Plateau */}
                  <rect
                    x={7}
                    y={10}
                    width={w - 14}
                    height={30}
                    rx={15}
                    fill={
                      theme === "PRIMARY"
                        ? "rgba(203, 213, 225, 0.85)"
                        : "rgba(254, 205, 211, 0.85)"
                    }
                    stroke={strokeColor}
                    strokeWidth={1.6}
                  />

                  {/* Left Glossy Black Horizontal Pill Window (~64% of Visor Width) */}
                  <rect
                    x={11}
                    y={13}
                    width={Math.max(52, (w - 22) * 0.64)}
                    height={24}
                    rx={12}
                    fill="#090d16"
                    stroke="#334155"
                    strokeWidth={1.0}
                  />
                  {/* Left Main 50MP Lens Inside Black Pill */}
                  <circle cx={23} cy={25} r={8.2} fill="#1e293b" stroke="#334155" strokeWidth={0.8} />
                  <circle cx={23} cy={25} r={4.6} fill="#090d16" />
                  <circle cx={21.8} cy={23.8} r={1.3} fill="#38bdf8" />

                  {/* Right Auxiliary Lens / IR Sensor Inside Black Pill */}
                  <circle
                    cx={11 + Math.max(52, (w - 22) * 0.64) - 12}
                    cy={25}
                    r={6.8}
                    fill="#111827"
                    stroke="#1e293b"
                    strokeWidth={0.7}
                  />
                  <circle
                    cx={11 + Math.max(52, (w - 22) * 0.64) - 12}
                    cy={25}
                    r={2.8}
                    fill="#090d16"
                  />

                  {/* Right Standalone Black Circular Ring Housing the Bright White LED Flash */}
                  <circle
                    cx={w - 22}
                    cy={25}
                    r={11.5}
                    fill="#090d16"
                    stroke="#334155"
                    strokeWidth={1.0}
                  />
                  <circle
                    cx={w - 22}
                    cy={25}
                    r={4.2}
                    fill="#f8fafc"
                    stroke="#cbd5e1"
                    strokeWidth={0.9}
                  />
                  <circle cx={w - 22} cy={25} r={2.0} fill="#fef9c3" />

                  {/* Lower-Center Horizontal "TECNO" Wordmark */}
                  <text
                    x={w / 2}
                    y={Math.min(h - 56, h * 0.74)}
                    textAnchor="middle"
                    className="fill-slate-400 text-[7.5px] font-sans font-extrabold tracking-[0.22em] uppercase select-none"
                  >
                    TECNO
                  </text>
                </g>
              )}

              {/* 23. Infinix Note 50 Pro+ / GT 20 Pro / TECNO Spark 20 Pro+ / POCO X7 Pro / Nubia Z70 Ultra: Top-Left Armored Squircle + Halo LED */}
              {prof.islandType === "INFINIX_SQUIRCLE_HALO" && (
                <g transform="translate(10, 12)">
                  <rect
                    x={0}
                    y={0}
                    width={52}
                    height={58}
                    rx={14}
                    fill="#0f172a"
                    stroke={strokeColor}
                    strokeWidth={1.7}
                  />
                  {/* Top-Left & Bottom-Left Large Camera Rings */}
                  <circle cx={16} cy={17} r={9.5} fill="#1e293b" stroke="#cbd5e1" strokeWidth={1.5} />
                  <circle cx={16} cy={17} r={3.8} fill="#38bdf8" />
                  <circle cx={16} cy={41} r={9.5} fill="#1e293b" stroke="#cbd5e1" strokeWidth={1.5} />
                  <circle cx={16} cy={41} r={3.8} fill="#0f172a" />
                  {/* Right Auxiliary Lens + Glowing Bio-Active / Mecha Halo Ring */}
                  <circle cx={37} cy={19} r={7.5} fill="#1e293b" stroke="#94a3b8" strokeWidth={1.2} />
                  <circle
                    cx={37}
                    cy={41}
                    r={6.8}
                    fill="none"
                    stroke="#fef08a"
                    strokeWidth={2}
                    strokeDasharray="6 2"
                  />
                </g>
              )}
            </>
          )}

        {/* Center Dimension Callout */}
        {!isOverlayGhost && showSpecOverlay && (
          <g
            transform={`translate(${w / 2}, ${
              isClamshellClosed ? h - 32 : h - 46
            })`}
          >
            <rect
              x={prof.foldKinematics ? -54 : -52}
              y={-22}
              width={prof.foldKinematics ? 108 : 104}
              height={prof.foldKinematics ? 44 : 38}
              rx={8}
              fill="rgba(255, 255, 255, 0.95)"
              stroke="#cbd5e1"
              strokeWidth={1}
            />
            {prof.foldKinematics && (
              <text
                x={0}
                y={-10}
                textAnchor="middle"
                className="fill-sky-700 text-[7.5px] font-mono font-extrabold uppercase tracking-wider"
              >
                {prof.foldPosture === "UNFOLDED_OPEN"
                  ? "UNFOLDED OPEN STATE"
                  : "FOLDED POCKET STATE"}
              </text>
            )}
            <text
              x={0}
              y={prof.foldKinematics ? 2 : -3}
              textAnchor="middle"
              className="fill-slate-900 text-[9px] font-bold"
            >
              {prof.heightMm} × {prof.widthMm} × {prof.thicknessMm}mm
            </text>
            <text
              x={0}
              y={prof.foldKinematics ? 14 : 11}
              textAnchor="middle"
              className="fill-slate-600 text-[8.5px] font-mono font-semibold"
            >
              {prof.foldKinematics
                ? `${dev.specs.weightGrams}g • ${prof.foldKinematics.innerDisplayInch}" + ${prof.foldKinematics.coverDisplayInch}"`
                : `${dev.specs.weightGrams}g • ${dev.specs.displaySizeInch}"`}
            </text>
          </g>
        )}
      </g>
    );
  };

  const widthDiffMm = Number((profA.widthMm - profB.widthMm).toFixed(1));
  const weightDiffG = deviceA.specs.weightGrams - deviceB.specs.weightGrams;

  const activeTargetId =
    contenders.find((c) => c.id === scannerTargetId)?.id ?? deviceA.id;
  const activeCustomProfile =
    customProfiles[activeTargetId] ??
    contenders.find((c) => c.id === activeTargetId)?.customProfile;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3.5 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Maximize2 className="h-4 w-4 text-sky-600" />
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
              True-Scale Physical Size, Camera Bump & Thumb-Reach Visualizer
            </h3>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Compare physical dimensions side-by-side with dimensional alignment (height, width, depth, weight) and verified visual fidelity.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {contenderProfiles.map(({ prof, label }, idx) => {
              const ct = CONTENDER_THEMES[idx] ?? CONTENDER_THEMES[0];
              return (
                <div key={idx} className="flex items-center gap-1.5">
                  <span className={`inline-flex items-center justify-center h-4 w-4 rounded-full ${ct.badgeBg} ${ct.badgeText} text-[10px] font-black`}>
                    {ct.letter}
                  </span>
                  <span className={`text-xs font-semibold ${ct.textClass}`}>
                    {label}:
                  </span>
                  <VisualFidelityBadge visual={prof.visualResolution} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Interactive CAD View Controls */}
        <div className="flex flex-wrap items-center gap-1.5">
          {hasAnyFoldable && (
            <div className="h-8 inline-flex items-center rounded-lg border border-indigo-200 bg-indigo-50/70 p-0.5 shrink-0 whitespace-nowrap dark:border-indigo-900/60 dark:bg-indigo-950/30">
              <button
                type="button"
                onClick={() => setFoldPosture("UNFOLDED_OPEN")}
                className={`h-full px-2.5 rounded-md shrink-0 whitespace-nowrap inline-flex items-center justify-center text-xs font-bold transition ${
                  foldPosture === "UNFOLDED_OPEN"
                    ? "bg-indigo-600 text-white shadow-2xs dark:bg-indigo-500"
                    : "text-indigo-700 hover:bg-indigo-100/70 dark:text-indigo-300 dark:hover:bg-indigo-900/50"
                }`}
              >
                Unfolded Open (Dual-Leaf)
              </button>
              <button
                type="button"
                onClick={() => setFoldPosture("FOLDED_CLOSED")}
                className={`h-full px-2.5 rounded-md shrink-0 whitespace-nowrap inline-flex items-center justify-center text-xs font-bold transition ${
                  foldPosture === "FOLDED_CLOSED"
                    ? "bg-indigo-600 text-white shadow-2xs dark:bg-indigo-500"
                    : "text-indigo-700 hover:bg-indigo-100/70 dark:text-indigo-300 dark:hover:bg-indigo-900/50"
                }`}
              >
                Folded Closed (Pocket Grip)
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsOneToOneScale((s) => !s)}
            className={`h-8 px-2.5 rounded-lg shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 text-xs font-semibold border transition ${
              isOneToOneScale
                ? "border-sky-500 bg-sky-50 text-sky-700 font-bold dark:border-sky-500 dark:bg-sky-950/60 dark:text-sky-300"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            }`}
          >
            <Scale className="h-3.5 w-3.5" />
            <span>
              {isOneToOneScale ? "1:1 Scale: Active" : "1:1 Scale: Off (1.65x)"}
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              setStackAlignment((a) => (a === "BOTTOM" ? "CENTER" : "BOTTOM"))
            }
            className={`h-8 px-2.5 rounded-lg shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 text-xs font-semibold border transition ${
              stackAlignment === "CENTER"
                ? "border-sky-500 bg-sky-50 text-sky-700 font-bold dark:border-sky-500 dark:bg-sky-950/60 dark:text-sky-300"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>
              {stackAlignment === "BOTTOM"
                ? "Align: Bottom-Aligned"
                : "Align: Center-Aligned"}
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              setRenderMode((m) => (m === "FILL" ? "OUTLINE" : "FILL"))
            }
            className={`h-8 px-2.5 rounded-lg shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 text-xs font-semibold border transition ${
              renderMode === "OUTLINE"
                ? "border-sky-500 bg-sky-50 text-sky-700 font-bold dark:border-sky-500 dark:bg-sky-950/60 dark:text-sky-300"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
            <span>
              {renderMode === "OUTLINE"
                ? "Mode: CAD Outline"
                : "Mode: Solid Fill"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setShowSpecOverlay((v) => !v)}
            className={`h-8 px-2.5 rounded-lg shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 text-xs font-semibold border transition ${
              showSpecOverlay
                ? "border-sky-500 bg-sky-50 text-sky-700 font-bold dark:border-sky-500 dark:bg-sky-950/60 dark:text-sky-300"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            }`}
          >
            <span>
              {showSpecOverlay ? "Spec Overlay: ON" : "Spec Overlay: OFF"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setScannerTargetId(deviceA.id);
              setShowProfileScanner((v) => !v);
            }}
            className={`h-8 px-2.5 rounded-lg shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 text-xs font-semibold border transition ${
              showProfileScanner
                ? "border-sky-500 bg-sky-50 text-sky-700 font-bold dark:border-sky-500 dark:bg-sky-950/60 dark:text-sky-300"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            }`}
          >
            <Upload className="h-3.5 w-3.5" />
            <span>CAD Prop Calibration</span>
          </button>

          <button
            type="button"
            onClick={() =>
              setViewMode((m) =>
                m === "SIDE_BY_SIDE" ? "STACKED_OVERLAY" : "SIDE_BY_SIDE"
              )
            }
            className={`h-8 px-2.5 rounded-lg shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 text-xs font-semibold border transition ${
              viewMode === "STACKED_OVERLAY"
                ? "border-sky-500 bg-sky-50 text-sky-700 font-bold dark:border-sky-500 dark:bg-sky-950/60 dark:text-sky-300"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>
              {viewMode === "SIDE_BY_SIDE"
                ? "Stack Overlay"
                : "Side-by-Side View"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setShowBackCamera((v) => !v)}
            className={`h-8 px-2.5 rounded-lg shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 text-xs font-semibold border transition ${
              showBackCamera
                ? "border-sky-500 bg-sky-50 text-sky-700 font-bold dark:border-sky-500 dark:bg-sky-950/60 dark:text-sky-300"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            }`}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>
              {showBackCamera
                ? "Showing: Rear Camera Bump"
                : "Showing: Front Bezels & Biometrics"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setShowThumbZone((v) => !v)}
            className={`h-8 px-2.5 rounded-lg shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 text-xs font-semibold border transition ${
              showThumbZone
                ? "border-sky-500 bg-sky-50 text-sky-700 font-bold dark:border-sky-500 dark:bg-sky-950/60 dark:text-sky-300"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            }`}
          >
            <Hand className="h-3.5 w-3.5" />
            <span>Thumb Reach Zone</span>
          </button>
        </div>
      </div>

      {/* =================================================================
          ADMIN REFERENCE IMAGE -> VECTOR PROP / DUMMY MODELER STUDIO
         ================================================================= */}
      {showProfileScanner && (
        <div className="rounded-xl border border-sky-200 bg-sky-50/40 p-4 space-y-3 dark:border-sky-900/60 dark:bg-sky-950/30">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-sky-600 shrink-0" />
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-white">
                  Reference Image → Vector Prop/Dummy Modeler
                </h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  Upload a phone photo as a <strong>Reference Frame</strong>. The vision engine measures the camera island bounding box, lens layout, and body tint to construct a clean <strong>Vector Prop/Dummy</strong> (never pasting raw bitmap photos into the comparison view).
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Target Phone Selector */}
              <select
                value={activeTargetId}
                onChange={(e) => setScannerTargetId(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                {contenderProfiles.map(({ dev, label }, idx) => {
                  const ct = CONTENDER_THEMES[idx] ?? CONTENDER_THEMES[0];
                  return (
                    <option key={dev.id} value={dev.id}>
                      Target Dummy ({ct.letter}): {label}
                    </option>
                  );
                })}
              </select>

              {/* Dual vs Single Image Split Selector */}
              <select
                value={
                  splitMode === "AUTO"
                    ? "AUTO"
                    : splitMode
                    ? "DUAL"
                    : "SINGLE"
                }
                onChange={(e) => {
                  const val = e.target.value;
                  setSplitMode(
                    val === "AUTO" ? "AUTO" : val === "DUAL"
                  );
                }}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="AUTO">Auto-Detect Dual Back+Front</option>
                <option value="DUAL">Force Split: Left=Back / Right=Front</option>
                <option value="SINGLE">Single Full Rear Photo</option>
              </select>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isScanningImage}
                className="h-8 px-3 rounded-lg shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 bg-sky-600 text-xs font-bold text-white hover:bg-sky-700 transition shadow-2xs dark:bg-sky-500 dark:hover:bg-sky-600"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>
                  {isScanningImage
                    ? "Analyzing Reference..."
                    : "Upload Reference Photo"}
                </span>
              </button>

              {PARAMETRIC_ARCHETYPE_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() =>
                    applyParametricArchetypePreset(
                      activeTargetId,
                      preset.geometry
                    )
                  }
                  className="h-8 px-2.5 rounded-lg shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <Sparkles className="h-3.5 w-3.5 text-sky-500" />
                  <span>{preset.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Reference Frame Preview + Interactive Vector Prop/Dummy Calibration Controls */}
          {activeCustomProfile && activeCustomProfile.modeledPropGeometry && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 rounded-xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900">
              {/* Left 3 Cols: Uploaded Reference Picture with Detected Camera Bounding Box */}
              <div className="lg:col-span-3 flex items-center gap-3 border-b lg:border-b-0 lg:border-r border-slate-100 pb-3 lg:pb-0 lg:pr-3 dark:border-slate-800">
                <div className="relative h-24 w-16 shrink-0 rounded-lg border border-slate-200 bg-slate-50 p-1 flex items-center justify-center overflow-hidden dark:border-slate-700 dark:bg-slate-800">
                  {activeCustomProfile.rearCutoutDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={activeCustomProfile.rearCutoutDataUrl}
                      alt="Reference Frame"
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400 p-2 text-center">
                      <Sparkles className="h-6 w-6 text-sky-500 mb-1" />
                      <span className="text-[9px] font-mono leading-tight">Vector CAD Preset</span>
                    </div>
                  )}
                  {/* Visual Bounding Box of Traced Camera Island on Reference Photo */}
                  <div
                    className="absolute border-2 border-sky-500 bg-sky-400/20 pointer-events-none rounded-xs"
                    style={{
                      left: `${activeCustomProfile.modeledPropGeometry.xPct}%`,
                      top: `${activeCustomProfile.modeledPropGeometry.yPct}%`,
                      width: `${activeCustomProfile.modeledPropGeometry.wPct}%`,
                      height: `${activeCustomProfile.modeledPropGeometry.hPct}%`,
                    }}
                  />
                </div>
                <div className="space-y-1 text-[11px]">
                  <div className="font-extrabold text-slate-900 uppercase tracking-wider text-[10px] dark:text-white">
                    Reference Frame Guide
                  </div>
                  <div className="text-slate-500 leading-snug dark:text-slate-400">
                    Blue box shows the camera island coordinates traced onto the Vector Prop/Dummy.
                  </div>
                  <div className="flex items-center gap-2 pt-1 font-mono text-[10px] text-slate-600 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1">
                      <span
                        className="h-3 w-3 rounded-full border border-slate-300 inline-block dark:border-slate-600"
                        style={{
                          backgroundColor: activeCustomProfile.dominantBodyHex,
                        }}
                      />
                      {activeCustomProfile.dominantBodyHex}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span
                        className="h-3 w-3 rounded-full border border-slate-300 inline-block dark:border-slate-600"
                        style={{
                          backgroundColor: activeCustomProfile.cameraAccentHex,
                        }}
                      />
                      {activeCustomProfile.cameraAccentHex}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right 9 Cols: Vector Prop/Dummy Geometry Sliders & Trace Guide Toggle */}
              <div className="lg:col-span-9 flex flex-col justify-between gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        toggleProfileFlag(
                          activeTargetId,
                          "useModeledPropGeometry"
                        )
                      }
                      className={`h-8 px-2.5 rounded-lg shrink-0 whitespace-nowrap inline-flex items-center text-xs font-bold transition ${
                        activeCustomProfile.useModeledPropGeometry
                          ? "bg-sky-600 text-white dark:bg-sky-500"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                      }`}
                    >
                      {activeCustomProfile.useModeledPropGeometry
                        ? "Mode: Reference-Modeled Vector Prop (Active)"
                        : "Switch to Reference-Modeled Vector Prop"}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        toggleProfileFlag(
                          activeTargetId,
                          "showReferenceGhostUnderlay"
                        )
                      }
                      className={`h-8 px-2.5 rounded-lg shrink-0 whitespace-nowrap inline-flex items-center text-xs font-bold border transition ${
                        activeCustomProfile.showReferenceGhostUnderlay
                          ? "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                          : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                      }`}
                    >
                      {activeCustomProfile.showReferenceGhostUnderlay
                        ? "28% Reference Trace Guide: ON (Click to Hide)"
                        : "Show 28% Reference Trace Guide Behind Prop"}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setCustomProfiles((prev) => {
                        const next = { ...prev };
                        delete next[activeTargetId];
                        return next;
                      });
                      onUpdateDeviceProfile?.(activeTargetId, undefined);
                    }}
                    className="h-8 px-2.5 rounded-lg shrink-0 whitespace-nowrap inline-flex items-center gap-1 border border-rose-200 bg-rose-50 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-300 dark:hover:bg-rose-900/60"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>Reset to Default Prop</span>
                  </button>
                </div>

                {/* Live Geometry Sliders to Calibrate the Vector Prop/Dummy Against the Reference Photo */}
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 pt-1 border-t border-slate-100 text-[11px] dark:border-slate-800">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5 dark:text-slate-400">
                      Prop Island Shape
                    </label>
                    <select
                      value={activeCustomProfile.modeledPropGeometry.islandShape}
                      onChange={(e) =>
                        updateModeledGeometry(activeTargetId, {
                          islandShape: e.target.value as ModeledIslandShape,
                        })
                      }
                      className="w-full rounded border border-slate-200 bg-slate-50 px-1.5 py-1 text-[11px] font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                      <option value="TWO_TIER_RECT">2-Tier Loewe Rect</option>
                      <option value="VERTICAL_PILL">Vertical Pill</option>
                      <option value="SQUIRCLE_PLATEAU">Corner Squircle</option>
                      <option value="HORIZONTAL_VISOR">Horizontal Visor</option>
                      <option value="CENTER_CIRCLE">Center Circle Deco</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5 dark:text-slate-400">
                      Lens Layout
                    </label>
                    <select
                      value={
                        activeCustomProfile.modeledPropGeometry.lensArrangement
                      }
                      onChange={(e) =>
                        updateModeledGeometry(activeTargetId, {
                          lensArrangement: e.target
                            .value as ModeledLensArrangement,
                        })
                      }
                      className="w-full rounded border border-slate-200 bg-slate-50 px-1.5 py-1 text-[11px] font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                      <option value="TWO_TIER_LOEWE">2-Tier + Periscope</option>
                      <option value="VERTICAL_STACK">Vertical Stack</option>
                      <option value="TRIANGLE_PRO">Pro Triangle</option>
                      <option value="HORIZONTAL_ROW">Horizontal Row</option>
                      <option value="QUAD_MATRIX">Quad Ring Matrix</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5 dark:text-slate-400">
                      Island Width ({activeCustomProfile.modeledPropGeometry.wPct}%)
                    </label>
                    <input
                      type="range"
                      min={16}
                      max={88}
                      value={activeCustomProfile.modeledPropGeometry.wPct}
                      onChange={(e) =>
                        updateModeledGeometry(activeTargetId, {
                          wPct: Number(e.target.value),
                        })
                      }
                      className="w-full accent-sky-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5 dark:text-slate-400">
                      Island Height ({activeCustomProfile.modeledPropGeometry.hPct}%)
                    </label>
                    <input
                      type="range"
                      min={10}
                      max={36}
                      value={activeCustomProfile.modeledPropGeometry.hPct}
                      onChange={(e) =>
                        updateModeledGeometry(activeTargetId, {
                          hPct: Number(e.target.value),
                        })
                      }
                      className="w-full accent-sky-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5 dark:text-slate-400">
                      X Offset ({activeCustomProfile.modeledPropGeometry.xPct}%)
                    </label>
                    <input
                      type="range"
                      min={4}
                      max={40}
                      value={activeCustomProfile.modeledPropGeometry.xPct}
                      onChange={(e) =>
                        updateModeledGeometry(activeTargetId, {
                          xPct: Number(e.target.value),
                        })
                      }
                      className="w-full accent-sky-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5 dark:text-slate-400">
                      Y Offset ({activeCustomProfile.modeledPropGeometry.yPct}%)
                    </label>
                    <input
                      type="range"
                      min={3}
                      max={20}
                      value={activeCustomProfile.modeledPropGeometry.yPct}
                      onChange={(e) =>
                        updateModeledGeometry(activeTargetId, {
                          yPct: Number(e.target.value),
                        })
                      }
                      className="w-full accent-sky-600"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =================================================================
          FOLDABLE DUAL-STATE KINEMATICS & HINGE ARCHITECTURE SHOWCASE
         ================================================================= */}
      {hasAnyFoldable && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-3.5 space-y-2.5 dark:border-indigo-900/60 dark:bg-indigo-950/30">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-indigo-600 px-2 py-0.5 font-mono text-[10px] font-extrabold uppercase tracking-wider text-white">
                Foldable Kinematics Engine
              </span>
              <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                Dual-State Physical Profile: Switch Between Unfolded Open Canvas & Folded Pocket Grip
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-800 dark:text-indigo-300">
              <span>Current Posture:</span>
              <button
                type="button"
                onClick={() =>
                  setFoldPosture((p) =>
                    p === "UNFOLDED_OPEN" ? "FOLDED_CLOSED" : "UNFOLDED_OPEN"
                  )
                }
                className="h-8 px-2.5 rounded-lg shrink-0 whitespace-nowrap inline-flex items-center border border-indigo-300 bg-white font-mono text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition dark:border-indigo-700 dark:bg-slate-800 dark:text-indigo-300 dark:hover:bg-slate-700"
              >
                {foldPosture === "UNFOLDED_OPEN"
                  ? "Showing: Unfolded Open (Click to Fold Closed)"
                  : "Showing: Folded Closed (Click to Unfold Open)"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {contenderProfiles
              .filter((item) => item.prof.foldKinematics !== null)
              .map(({ dev, prof, label }, idx) => {
                const fk = prof.foldKinematics!;
                const ct = CONTENDER_THEMES[idx] ?? CONTENDER_THEMES[0];
                return (
                  <div
                    key={dev.id}
                    className="rounded-lg border border-indigo-200/80 bg-white p-3 flex flex-col justify-between gap-2 dark:border-indigo-900/60 dark:bg-slate-900"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`inline-flex items-center justify-center h-4 w-4 rounded-full ${ct.badgeBg} ${ct.badgeText} text-[10px] font-black shrink-0`}>
                          {ct.letter}
                        </span>
                        <span className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                          {label}
                        </span>
                      </div>
                      <span className="rounded bg-indigo-50 border border-indigo-200 px-2 py-0.5 font-mono text-[10px] font-bold text-indigo-700 shrink-0 dark:bg-indigo-950/60 dark:border-indigo-800 dark:text-indigo-300">
                        {fk.foldType === "BOOK_FOLD"
                          ? "Book Fold"
                          : "Flip Fold"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                      <div
                        className={`rounded-md p-2 border ${
                          foldPosture === "UNFOLDED_OPEN"
                            ? "border-indigo-400 bg-indigo-50/60 dark:border-indigo-700 dark:bg-indigo-950/60"
                            : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60"
                        }`}
                      >
                        <div className="text-[10px] font-bold uppercase text-indigo-700 dark:text-indigo-300">
                          Unfolded State
                        </div>
                        <div className="font-extrabold text-slate-900 dark:text-white mt-0.5 text-[11px]">
                          {fk.unfoldedHeightMm} × {fk.unfoldedWidthMm} × {fk.unfoldedThicknessMm}mm
                        </div>
                        <div className="text-[10px] text-slate-600 dark:text-slate-400 truncate">
                          {fk.innerDisplayLabel}
                        </div>
                      </div>

                      <div
                        className={`rounded-md p-2 border ${
                          foldPosture === "FOLDED_CLOSED"
                            ? "border-indigo-400 bg-indigo-50/60 dark:border-indigo-700 dark:bg-indigo-950/60"
                            : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60"
                        }`}
                      >
                        <div className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400">
                          Folded State
                        </div>
                        <div className="font-extrabold text-slate-900 dark:text-white mt-0.5 text-[11px]">
                          {fk.foldedHeightMm} × {fk.foldedWidthMm} × {fk.foldedThicknessMm}mm
                        </div>
                        <div className="text-[10px] text-slate-600 dark:text-slate-400 truncate">
                          {fk.coverDisplayLabel}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800 dark:text-slate-400">
                      <span className="truncate">Hinge: {fk.hingeArchitecture}</span>
                      <span className="font-bold text-indigo-700 dark:text-indigo-300 shrink-0">
                        Crease: {fk.creaseDepthMm}
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* SVG Canvas & Comparison Visualizer */}
      <div className="flex flex-col gap-6 rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-950/80">
        {viewMode === "SIDE_BY_SIDE" ? (
          <div
            className={`flex flex-wrap ${
              stackAlignment === "BOTTOM" ? "items-end" : "items-center"
            } justify-center gap-6 overflow-x-auto pb-4 max-w-full scrollbar-thin`}
          >
            {contenderProfiles.map(({ dev, prof, label }, idx) => {
              const ct = CONTENDER_THEMES[idx] ?? CONTENDER_THEMES[0];
              const phoneW = prof.widthMm * scale + 10;
              const phoneH = prof.heightMm * scale + 10;
              return (
                <div key={dev.id} className="flex flex-col items-center shrink-0">
                  {prof.visualResolution.renderer === "OEM_ASSET" &&
                  prof.visualResolution.profile?.assets?.rear ? (
                    <div
                      className="relative"
                      style={{
                        width: phoneW,
                        height: phoneH,
                      }}
                    >
                      <Image
                        src={prof.visualResolution.profile.assets.rear}
                        alt={`${label} verified rear view`}
                        fill
                        unoptimized
                        className="object-contain"
                      />
                    </div>
                  ) : (
                    <svg
                      width={phoneW}
                      height={phoneH}
                      className="overflow-visible"
                    >
                      <g transform="translate(5, 5)">
                        {renderPhoneSvg(dev, prof, ct.theme, false, idx)}
                      </g>
                    </svg>
                  )}
                  <div className="mt-2.5 flex items-center gap-1.5">
                    <span className={`inline-flex items-center justify-center h-4 w-4 rounded-full ${ct.badgeBg} ${ct.badgeText} text-[10px] font-black`}>
                      {ct.letter}
                    </span>
                    <span className={`text-xs font-bold ${ct.textClass} max-w-[150px] truncate text-center`}>
                      {label}
                    </span>
                  </div>
                  <VisualFidelityBadge visual={prof.visualResolution} />
                  {prof.foldKinematics && (
                    <span className="mt-0.5 rounded bg-indigo-50 border border-indigo-200 px-2 py-0.5 font-mono text-[10px] font-bold text-indigo-700 dark:bg-indigo-950/60 dark:border-indigo-800 dark:text-indigo-300">
                      {foldPosture === "UNFOLDED_OPEN"
                        ? `Unfolded: ${prof.widthMm}mm wide • ${prof.thicknessMm}mm thin`
                        : `Folded: ${prof.widthMm}mm grip • ${prof.thicknessMm}mm thick`}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center">
            {(() => {
              const maxWidthMm = Math.max(...contenderProfiles.map((cp) => cp.prof.widthMm));
              const maxHeightMm = Math.max(...contenderProfiles.map((cp) => cp.prof.heightMm));
              const canvasW = maxWidthMm * scale + 24;
              const canvasH = maxHeightMm * scale + 24;
              return (
                <div className="flex flex-col items-center">
                  <svg
                    width={canvasW}
                    height={canvasH}
                    className="overflow-visible"
                  >
                    {contenderProfiles.map(({ dev, prof }, idx) => {
                      const ct = CONTENDER_THEMES[idx] ?? CONTENDER_THEMES[0];
                      const offsetX = ((maxWidthMm - prof.widthMm) * scale) / 2;
                      const offsetY =
                        stackAlignment === "BOTTOM"
                          ? (maxHeightMm - prof.heightMm) * scale
                          : ((maxHeightMm - prof.heightMm) * scale) / 2;
                      return (
                        <g
                          key={dev.id}
                          transform={`translate(${12 + offsetX}, ${12 + offsetY})`}
                        >
                          {renderPhoneSvg(dev, prof, ct.theme, true, idx)}
                        </g>
                      );
                    })}
                  </svg>
                  <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-xs font-bold">
                    {contenderProfiles.map(({ dev, prof, label }, idx) => {
                      const ct = CONTENDER_THEMES[idx] ?? CONTENDER_THEMES[0];
                      const lineDesc = idx === 0 ? "■ Solid" : `▪ ${ct.dashArray ? "Dashed" : "Dotted"}`;
                      return (
                        <span key={dev.id} className={ct.textClass}>
                          {lineDesc}: {label} ({prof.heightMm} × {prof.widthMm}mm)
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* =================================================================
            CAD DIMENSIONAL ALIGNMENT MATRIX (Height, Width, Depth, Weight)
           ================================================================= */}
        <div className="w-full overflow-x-auto rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-100 dark:border-slate-800">
            <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider dark:text-white">
              CAD Dimensional Alignment & Spec Telemetry
            </span>
            <span className="rounded bg-sky-50 border border-sky-200 px-2 py-0.5 font-mono text-[10px] font-bold text-sky-700 dark:bg-sky-950/60 dark:border-sky-800 dark:text-sky-300">
              {contenderProfiles.length} Contenders Evaluated
            </span>
          </div>

          <table className="w-full text-left font-mono text-[11px] border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider dark:border-slate-800 dark:text-slate-400">
                <th className="py-1.5 pr-2">Contender</th>
                <th className="py-1.5 px-2">Height</th>
                <th className="py-1.5 px-2">Width (Palm)</th>
                <th className="py-1.5 px-2">Thickness (Depth)</th>
                <th className="py-1.5 px-2">Weight</th>
                <th className="py-1.5 px-2">Display</th>
                <th className="py-1.5 pl-2">Frame Material</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {(() => {
                const minH = Math.min(...contenderProfiles.map((cp) => cp.prof.heightMm));
                const minW = Math.min(...contenderProfiles.map((cp) => cp.prof.widthMm));
                const minT = Math.min(...contenderProfiles.map((cp) => cp.prof.thicknessMm));
                const minWeight = Math.min(...contenderProfiles.map((cp) => cp.dev.specs.weightGrams));

                return contenderProfiles.map(({ dev, prof, label }, idx) => {
                  const ct = CONTENDER_THEMES[idx] ?? CONTENDER_THEMES[0];
                  const isShortest = prof.heightMm === minH;
                  const isSlimmest = prof.widthMm === minW;
                  const isThinnest = prof.thicknessMm === minT;
                  const isLightest = dev.specs.weightGrams === minWeight;

                  return (
                    <tr key={dev.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                      <td className="py-2 pr-2 font-bold flex items-center gap-1.5 whitespace-nowrap">
                        <span className={`inline-flex items-center justify-center h-4 w-4 rounded-full ${ct.badgeBg} ${ct.badgeText} text-[10px] font-black`}>
                          {ct.letter}
                        </span>
                        <span className={ct.textClass}>{label}</span>
                      </td>
                      <td className={`py-2 px-2 whitespace-nowrap ${isShortest ? "text-emerald-700 font-extrabold dark:text-emerald-400" : "text-slate-700 dark:text-slate-300"}`}>
                        {prof.heightMm}mm {isShortest && "(Shortest)"}
                      </td>
                      <td className={`py-2 px-2 whitespace-nowrap ${isSlimmest ? "text-emerald-700 font-extrabold dark:text-emerald-400" : "text-slate-700 dark:text-slate-300"}`}>
                        {prof.widthMm}mm {isSlimmest && "(Slimmest)"}
                      </td>
                      <td className={`py-2 px-2 whitespace-nowrap ${isThinnest ? "text-emerald-700 font-extrabold dark:text-emerald-400" : "text-slate-700 dark:text-slate-300"}`}>
                        {prof.thicknessMm}mm {isThinnest && "(Thinnest)"}
                      </td>
                      <td className={`py-2 px-2 whitespace-nowrap ${isLightest ? "text-emerald-700 font-extrabold dark:text-emerald-400" : "text-slate-700 dark:text-slate-300"}`}>
                        {dev.specs.weightGrams}g {isLightest && "(Lightest)"}
                      </td>
                      <td className="py-2 px-2 whitespace-nowrap text-slate-600 dark:text-slate-400">
                        {dev.specs.displaySizeInch}&quot; {dev.specs.displayPanelType.split("(")[0].trim()}
                      </td>
                      <td className="py-2 pl-2 whitespace-nowrap text-slate-600 dark:text-slate-400">
                        {dev.specs.frameMaterial}
                      </td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>

        {/* Maya Lin Ergonomic Telemetry Summary */}
        <div className="w-full space-y-2.5 rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/60 dark:bg-amber-950/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 dark:text-amber-300">
              Maya Lin (Comfort &amp; Everyday Use): Ergonomic Verdict
            </span>
            <span className="rounded bg-white border border-amber-200 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-800 dark:bg-slate-900 dark:border-amber-800 dark:text-amber-300">
              Palm & Pocket Grip Analysis
            </span>
          </div>

          <p className="text-xs text-slate-700 leading-relaxed dark:text-slate-300">
            {contenders.length === 2
              ? Math.abs(weightDiffG) <= 3 && Math.abs(widthDiffMm) <= 0.5
                ? `Both devices have virtually identical palm width (${profA.widthMm}mm vs ${profB.widthMm}mm) and weight (${deviceA.specs.weightGrams}g vs ${deviceB.specs.weightGrams}g). Your main ergonomic difference is the rear camera shelf and corner curvature.`
                : `${
                    weightDiffG > 0 ? labelB : labelA
                  } is ${Math.abs(weightDiffG)}g lighter and ${
                    widthDiffMm > 0
                      ? `${labelB} is ${Math.abs(widthDiffMm)}mm narrower`
                      : `${labelA} is ${Math.abs(widthDiffMm)}mm narrower`
                  } in palm grip, resulting in noticeably less pinky-shelf strain during 45-minute scrolling sessions.`
              : (() => {
                  const sortedW = [...contenderProfiles].sort((a, b) => a.dev.specs.weightGrams - b.dev.specs.weightGrams);
                  const lightest = sortedW[0];
                  const heaviest = sortedW[sortedW.length - 1];
                  const sortedWidth = [...contenderProfiles].sort((a, b) => a.prof.widthMm - b.prof.widthMm);
                  const slimmest = sortedWidth[0];
                  const widest = sortedWidth[sortedWidth.length - 1];
                  const wDelta = heaviest.dev.specs.weightGrams - lightest.dev.specs.weightGrams;
                  const widthDelta = Number((widest.prof.widthMm - slimmest.prof.widthMm).toFixed(1));

                  return `Across all ${contenders.length} contenders, ${lightest.label} leads on pocket comfort at ${lightest.dev.specs.weightGrams}g (${wDelta}g lighter than the ${heaviest.label} at ${heaviest.dev.specs.weightGrams}g). In one-handed reach, ${slimmest.label} (${slimmest.prof.widthMm}mm) provides the least finger fatigue, measuring ${widthDelta}mm narrower than ${widest.label} (${widest.prof.widthMm}mm).`;
                })()}
          </p>

          <div className={`grid grid-cols-2 md:grid-cols-${Math.min(contenderProfiles.length, 4)} gap-2 pt-2 border-t border-amber-200/60 font-mono text-[11px] dark:border-amber-900/60`}>
            {contenderProfiles.map(({ dev, prof, label }, idx) => {
              const ct = CONTENDER_THEMES[idx] ?? CONTENDER_THEMES[0];
              return (
                <div key={dev.id} className="rounded-lg bg-white p-2 border border-amber-200/70 dark:bg-slate-900 dark:border-amber-900/60">
                  <div className="flex items-center gap-1 text-[10px] text-slate-500 truncate mb-0.5 dark:text-slate-400">
                    <span className={`inline-flex items-center justify-center h-3.5 w-3.5 rounded-full ${ct.badgeBg} ${ct.badgeText} text-[8.5px] font-black`}>
                      {ct.letter}
                    </span>
                    <span className="truncate">{label}</span>
                  </div>
                  <div className="font-bold text-slate-900 dark:text-white">
                    {dev.specs.weightGrams}g • {prof.thicknessMm}mm thin
                  </div>
                  <div className={`text-[10px] ${ct.textClass} truncate`}>
                    {dev.specs.frameMaterial}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
