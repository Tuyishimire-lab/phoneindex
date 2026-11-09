"use client";

import React, { useMemo, useRef, useState } from "react";
import { DeviceSpecsData, SmartphoneDevice } from "@/lib/seed-data";
import { AI_EDITORS, EditorPersonaId, stripEmDashes } from "@/lib/editors";
import { formatDeviceLabel } from "@/components/PhoneSizeComparator";
import { generatePhysicalProfileFromImage } from "@/lib/image-profile-extractor";
import { useDebounce } from "@/hooks/useDebounce";
import {
  Search,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  Table2,
  Edit3,
  Check,
  Upload,
} from "lucide-react";

interface FullSpecSheetProps {
  device: SmartphoneDevice;
  defaultExpanded?: boolean;
  showAdminControls?: boolean;
  onOpenManualSpecStudio?: () => void;
  onUpdateDevice?: (updatedDevice: SmartphoneDevice) => void;
}

interface RawSpecSubRow {
  label: string;
  value: string;
  editorNote?: {
    editorId: EditorPersonaId;
    type: "PRAISE" | "WARNING";
    text: string;
  };
}

interface RawSpecCategory {
  category: string;
  rows: RawSpecSubRow[];
}

function buildEncyclopedicSpecs(dev: SmartphoneDevice): RawSpecCategory[] {
  const s = dev.specs;
  const slug = dev.slug.toLowerCase();

  const isGlobalImport = slug.includes("vivo") || slug.includes("xiaomi");
  const isMidRange = slug.includes("nothing");
  const isApple = slug.includes("iphone");

  const heightMm =
    dev.customHeightMm ??
    (slug.includes("16-pro-max") || slug.includes("17-pro-max")
      ? 163.0
      : slug.includes("16-plus")
      ? 160.9
      : slug.includes("15-pro-max")
      ? 159.9
      : slug.includes("14-pro-max") || slug.includes("13-pro-max")
      ? 160.8
      : slug.includes("17-air")
      ? 156.2
      : slug.includes("16-pro") || slug.includes("17-pro") || slug.includes("iphone-17-base")
      ? 149.6
      : slug.includes("15-pro") || slug.includes("16e")
      ? 146.6
      : slug.includes("iphone-16") || slug.includes("iphone-15")
      ? 147.6
      : s.displaySizeInch <= 6.2
      ? 146.9
      : s.displaySizeInch <= 6.35
      ? 150.2
      : 162.8);

  return [
    {
      category: "NETWORK & CELLULAR BANDS",
      rows: [
        {
          label: "Technology",
          value: "GSM / HSPA / LTE / 5G Sub-6" + (isGlobalImport || isMidRange ? "" : " / mmWave (US SKU)"),
        },
        {
          label: "5G SA/NSA Bands",
          value: isGlobalImport
            ? "n1, n3, n5, n7, n8, n20, n28, n38, n40, n41, n66, n77, n78 (Check Band n71 on Global SKU)"
            : "n1, n2, n3, n5, n7, n8, n12, n20, n25, n28, n38, n40, n41, n66, n71, n77, n78, n258/260/261",
          editorNote: isGlobalImport
            ? {
                editorId: "DAILY_DRIVER",
                type: "WARNING",
                text: "Verify Band n71 support if using rural T-Mobile US 5G.",
              }
            : undefined,
        },
        {
          label: "Speed & Modem",
          value: isApple
            ? "Snapdragon X75 5G (Up to 7.5 Gbps DL)"
            : slug.includes("pixel")
            ? "Samsung Exynos 5400 5G + Satellite SOS"
            : "5G Advanced Release 18 Ready (Up to 10 Gbps DL)",
        },
      ],
    },
    {
      category: "LAUNCH & PRICING LEDGER",
      rows: [
        { label: "Announced / Released", value: dev.releaseDate },
        {
          label: "Launch MSRP vs Catalog Street Price",
          value: `$${dev.launchMsrpUsd} MSRP → $${dev.currentStreetUsd} Current Street ($${
            dev.launchMsrpUsd - dev.currentStreetUsd
          } discount)`,
          editorNote: {
            editorId: "PRAGMATIST",
            type: "PRAISE",
            text: `Annualized software-supported cost: $${Math.round(
              dev.currentStreetUsd / dev.osSupportYears
            )}/yr over ${dev.osSupportYears} years.`,
          },
        },
      ],
    },
    {
      category: "BODY, DIMENSIONS & DURABILITY",
      rows: [
        {
          label: "Dimensions & Weight",
          value: `${heightMm} × ${s.widthMm} × ${s.thicknessMm} mm • ${s.weightGrams} grams`,
        },
        { label: "Frame & Back Materials", value: s.frameMaterial },
        {
          label: "Ingress Protection",
          value: s.ipRating,
          editorNote: s.ipRating.includes("IP69")
            ? {
                editorId: "SILICON_GEEK",
                type: "PRAISE",
                text: "IP69 survives 80°C high-pressure steam/water jets beyond standard IP68 submersion.",
              }
            : undefined,
        },
        {
          label: "SIM Configuration",
          value: isApple
            ? "Dual eSIM (US) / Nano-SIM + eSIM (Intl)"
            : "Dual Nano-SIM + Multi-Profile eSIM support",
        },
      ],
    },
    {
      category: "DISPLAY & EYE-CARE TELEMETRY",
      rows: [
        { label: "Panel Architecture", value: s.displayPanelType },
        {
          label: "Size & Resolution",
          value: `${s.displaySizeInch} inches • ${s.resolution}`,
        },
        {
          label: "Adaptive Refresh & Peak Nits",
          value: `${s.refreshRateHz} • ${s.peakBrightnessNits} nits HBM/Peak`,
        },
        {
          label: "PWM Flicker Modulation",
          value: `${s.pwmDimmingHz} Hz PWM Dimming`,
          editorNote:
            s.pwmDimmingHz >= 1920
              ? {
                  editorId: "SILICON_GEEK",
                  type: "PRAISE",
                  text: "High-frequency ≥1920Hz PWM drastically reduces eye strain in dim rooms.",
                }
              : {
                  editorId: "SILICON_GEEK",
                  type: "WARNING",
                  text: `${s.pwmDimmingHz}Hz low-frequency PWM can trigger headaches for flicker-sensitive readers at night.`,
                },
        },
      ],
    },
    {
      category: "PLATFORM, SILICON & SUSTAINED THERMALS",
      rows: [
        { label: "Chipset & Foundry Node", value: `${s.socName} (${s.socNodeNm}nm)` },
        { label: "CPU Core Topology", value: s.cpuTopology },
        { label: "GPU Architecture", value: s.gpuName },
        {
          label: "Geekbench 6 & 3DMark Stability",
          value: `${s.geekbenchSingle.toLocaleString()} Single / ${s.geekbenchMulti.toLocaleString()} Multi • ${s.wildlifeStabilityPct}% 20-Loop Wild Life Extreme Stability`,
        },
        {
          label: "OS & Update Lifespan",
          value: `${dev.osSupportYears} Years Guaranteed OS & Security Maintenance`,
        },
      ],
    },
    {
      category: "MEMORY & FLASH STORAGE",
      rows: [
        { label: "RAM Configurations", value: s.ramOptions },
        {
          label: "NAND Flash Interface",
          value: `${s.storageType} (No microSD card slot)`,
          editorNote:
            s.storageType === "UFS 3.1" || s.storageType === "UFS 2.2"
              ? {
                  editorId: "SILICON_GEEK",
                  type: "WARNING",
                  text: `${s.storageType} sequential write speeds are 2x–3x slower than UFS 4.0 / NVMe.`,
                }
              : undefined,
        },
      ],
    },
    {
      category: "MAIN & PERISCOPE CAMERA SYSTEM",
      rows: [
        {
          label: "Primary Wide Module",
          value: `${s.mainSensorMp}MP, ${s.mainAperture}, ${s.mainSensorSize} physical sensor, OIS`,
        },
        {
          label: "Periscope / Telephoto Optics",
          value: s.telephotoSpecs,
          editorNote: s.telephotoSpecs.includes("1/1.4")
            ? {
                editorId: "CAMERA_PURIST",
                type: "PRAISE",
                text: "Massive 1/1.4\" periscope sensor captures 2.2x more photons than standard 1/2.5\" zoom lenses.",
              }
            : undefined,
        },
        { label: "Ultrawide Module", value: s.ultrawideSpecs },
        { label: "Video Capture & Log Profiles", value: s.videoCapabilities },
        { label: "Indoor Motion Shutter Response", value: s.shutterLagRating },
      ],
    },
    {
      category: "COMMS, WI-FI, BLUETOOTH & USB PORT",
      rows: [
        {
          label: "WLAN & Bluetooth",
          value: isMidRange
            ? "Wi-Fi 6 (802.11ax) Dual-Band • Bluetooth 5.4 (A2DP, LE, aptX HD, LDAC)"
            : "Wi-Fi 7 (802.11be) Tri-Band • Bluetooth 5.4 (LE Audio, aptX Lossless, LDAC, LHDC)",
        },
        {
          label: "Positioning & UWB",
          value: isMidRange
            ? "GPS (L1+L5), GLONASS, BDS, GALILEO (No UWB chip)"
            : "Dual-Band GNSS (L1+L5) + Ultra-Wideband (UWB) Precision Finding",
        },
        {
          label: "USB Type-C Controller",
          value: isMidRange
            ? "USB Type-C 2.0 (480 Mbps)"
            : "USB Type-C 3.2 Gen 2 (10 Gbps + DisplayPort Video Out)",
        },
      ],
    },
    {
      category: "BIOMETRICS, HAPTICS & BATTERY",
      rows: [
        { label: "Biometric Authentication", value: s.fingerprintType },
        {
          label: "Battery Capacity & Chemistry",
          value: `${s.batteryCapacityMah} mAh • ${s.batteryChemistry}`,
        },
        {
          label: "Charging Speed & Lab 0–100%",
          value: `${s.wiredChargingW}W Wired / ${s.wirelessChargingW}W Wireless • Full 0–100% in ${s.fullChargeMins} mins`,
        },
      ],
    },
  ];
}

/**
 * Mapping table from Encyclopedic Spec Sheet UI row labels (and legacy aliases)
 * to concrete DeviceSpecsData property keys.
 */
export const SPEC_ROW_TO_FIELD_MAP: Record<string, keyof DeviceSpecsData> = {
  // Canonical UI row labels emitted in buildEncyclopedicSpecs
  "Chipset & Foundry Node": "socName",
  "CPU Core Topology": "cpuTopology",
  "GPU Architecture": "gpuName",
  "RAM Configurations": "ramOptions",
  "Frame & Back Materials": "frameMaterial",
  "Ingress Protection": "ipRating",
  "Primary Wide Module": "mainSensorSize",
  "Periscope / Telephoto Optics": "telephotoSpecs",
  "Ultrawide Module": "ultrawideSpecs",
  "Indoor Motion Shutter Response": "shutterLagRating",
  "Biometric Authentication": "fingerprintType",

  // Legacy compatibility aliases for backwards compatibility
  "SoC Chipset & Process Node": "socName",
  "Memory & Flash Storage Tier": "ramOptions",
  "Primary Wide Camera": "mainSensorSize",
  "Telephoto / Periscope Optics": "telephotoSpecs",
  "Ultrawide Camera": "ultrawideSpecs",
  "Indoor Moving-Subject Shutter Lag": "shutterLagRating",
};

/**
 * Pure function that applies inline spec edits to DeviceSpecsData.
 * Canonical UI row labels take precedence over legacy aliases.
 * All modified string values are sanitized with stripEmDashes.
 */
export function applyInlineSpecEdits(
  specs: DeviceSpecsData,
  rowEdits: Record<string, string>
): DeviceSpecsData {
  const updatedSpecs: DeviceSpecsData = { ...specs };

  // 1. Chipset & Foundry Node (canonical) / SoC Chipset & Process Node (legacy)
  const socVal =
    rowEdits["Chipset & Foundry Node"] ?? rowEdits["SoC Chipset & Process Node"];
  if (socVal !== undefined && socVal.trim() !== "") {
    updatedSpecs.socName = stripEmDashes(socVal);
  }

  // 2. CPU Core Topology
  const cpuVal = rowEdits["CPU Core Topology"];
  if (cpuVal !== undefined && cpuVal.trim() !== "") {
    updatedSpecs.cpuTopology = stripEmDashes(cpuVal);
  }

  // 3. GPU Architecture
  const gpuVal = rowEdits["GPU Architecture"];
  if (gpuVal !== undefined && gpuVal.trim() !== "") {
    updatedSpecs.gpuName = stripEmDashes(gpuVal);
  }

  // 4. RAM Configurations (canonical) / Memory & Flash Storage Tier (legacy)
  const ramVal =
    rowEdits["RAM Configurations"] ?? rowEdits["Memory & Flash Storage Tier"];
  if (ramVal !== undefined && ramVal.trim() !== "") {
    updatedSpecs.ramOptions = stripEmDashes(ramVal);
  }

  // 5. Frame & Back Materials
  const frameVal = rowEdits["Frame & Back Materials"];
  if (frameVal !== undefined && frameVal.trim() !== "") {
    updatedSpecs.frameMaterial = stripEmDashes(frameVal);
  }

  // 6. Ingress Protection
  const ipVal = rowEdits["Ingress Protection"];
  if (ipVal !== undefined && ipVal.trim() !== "") {
    updatedSpecs.ipRating = stripEmDashes(ipVal);
  }

  // 7. Primary Wide Module (canonical) / Primary Wide Camera (legacy)
  const wideVal =
    rowEdits["Primary Wide Module"] ?? rowEdits["Primary Wide Camera"];
  if (wideVal !== undefined && wideVal.trim() !== "") {
    updatedSpecs.mainSensorSize = stripEmDashes(wideVal);
  }

  // 8. Periscope / Telephoto Optics (canonical) / Telephoto / Periscope Optics (legacy)
  const teleVal =
    rowEdits["Periscope / Telephoto Optics"] ??
    rowEdits["Telephoto / Periscope Optics"];
  if (teleVal !== undefined && teleVal.trim() !== "") {
    updatedSpecs.telephotoSpecs = stripEmDashes(teleVal);
  }

  // 9. Ultrawide Module (canonical) / Ultrawide Camera (legacy)
  const ultraVal =
    rowEdits["Ultrawide Module"] ?? rowEdits["Ultrawide Camera"];
  if (ultraVal !== undefined && ultraVal.trim() !== "") {
    updatedSpecs.ultrawideSpecs = stripEmDashes(ultraVal);
  }

  // 10. Indoor Motion Shutter Response (canonical) / Indoor Moving-Subject Shutter Lag (legacy)
  const shutterVal =
    rowEdits["Indoor Motion Shutter Response"] ??
    rowEdits["Indoor Moving-Subject Shutter Lag"];
  if (shutterVal !== undefined && shutterVal.trim() !== "") {
    updatedSpecs.shutterLagRating = stripEmDashes(shutterVal);
  }

  // 11. Biometric Authentication
  const bioVal = rowEdits["Biometric Authentication"];
  if (bioVal !== undefined && bioVal.trim() !== "") {
    updatedSpecs.fingerprintType = stripEmDashes(bioVal);
  }

  return updatedSpecs;
}

export function FullSpecSheet({
  device,
  defaultExpanded = false,
  showAdminControls = false,
  onOpenManualSpecStudio,
  onUpdateDevice,
}: FullSpecSheetProps) {
  const [localSpecFilter, setLocalSpecFilter] = useState("");
  const debouncedSpecFilter = useDebounce(localSpecFilter, 180);
  const [isExpanded, setIsExpanded] = useState(() => {
    if (defaultExpanded) return true;
    if (
      typeof window !== "undefined" &&
      window.location.pathname.includes("/devices/")
    ) {
      return true;
    }
    return false;
  });
  const [isEditingInline, setIsEditingInline] = useState(false);
  const [rowEdits, setRowEdits] = useState<Record<string, string>>(
    device.customSpecOverrides || {}
  );
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const rawCategories = useMemo(
    () => buildEncyclopedicSpecs(device),
    [device]
  );

  const handleToggleInlineEdit = () => {
    if (!isEditingInline) {
      setRowEdits(device.customSpecOverrides || {});
      setIsExpanded(true);
    }
    setIsEditingInline((prev) => !prev);
  };

  const handleSaveInlineEdits = () => {
    if (!onUpdateDevice) {
      setIsEditingInline(false);
      return;
    }
    const updatedSpecs = applyInlineSpecEdits(device.specs, rowEdits);

    onUpdateDevice({
      ...device,
      specs: updatedSpecs,
      customSpecOverrides: rowEdits,
    });
    setIsEditingInline(false);
  };

  const handleInlineImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUpdateDevice) return;
    setIsUploadingImage(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        if (typeof reader.result === "string") {
          const profile = await generatePhysicalProfileFromImage({
            deviceId: device.id,
            imageUrl: reader.result,
            isDualBackFront: "AUTO",
            renderStyle: "PHOTO_CUTOUT",
          });
          onUpdateDevice({
            ...device,
            customProfile: profile,
          });
        }
      } finally {
        setIsUploadingImage(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const filteredCategories = useMemo(() => {
    if (!debouncedSpecFilter.trim()) return rawCategories;
    const q = debouncedSpecFilter.toLowerCase();
    return rawCategories
      .map((cat) => ({
        ...cat,
        rows: cat.rows.filter(
          (r) =>
            r.label.toLowerCase().includes(q) ||
            r.value.toLowerCase().includes(q) ||
            cat.category.toLowerCase().includes(q) ||
            r.editorNote?.text.toLowerCase().includes(q)
        ),
      }))
      .filter((cat) => cat.rows.length > 0);
  }, [rawCategories, debouncedSpecFilter]);

  const totalRowCount = rawCategories.reduce(
    (acc, c) => acc + c.rows.length,
    0
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-2xs overflow-hidden dark:border-slate-800 dark:bg-slate-900">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/70 px-5 py-3.5 dark:border-slate-800 dark:bg-slate-800/60">
        <div className="flex items-center gap-2.5">
          <Table2 className="h-4 w-4 text-sky-600" />
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
              Complete Encyclopedic Spec Sheet: {formatDeviceLabel(device)} ({totalRowCount} Technical Rows)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Full GSMArena-depth technical reference with instant filtering and inline AI Editor hardware flags.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-start sm:justify-end">
          {/* Instant Spec Filter */}
          <div className="relative w-full sm:w-auto min-w-[200px] flex-1 sm:flex-initial">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={localSpecFilter}
              onChange={(e) => {
                setLocalSpecFilter(e.target.value);
                if (!isExpanded) setIsExpanded(true);
              }}
              placeholder="Filter specs (e.g. n71, UWB, USB, PWM)..."
              className="w-full sm:w-64 rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none transition shadow-2xs dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
            />
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleInlineImageUpload}
            className="hidden"
          />

          {showAdminControls && onUpdateDevice && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingImage}
              className="h-9 px-3 rounded-lg shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 text-xs font-bold border border-slate-200 bg-white text-slate-700 hover:border-sky-400 hover:text-sky-700 transition dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-sky-500 dark:hover:text-sky-300"
            >
              <Upload className="h-3.5 w-3.5 text-sky-600" />
              <span>
                {isUploadingImage ? "Updating Model..." : "Upload Model Image"}
              </span>
            </button>
          )}

          {showAdminControls && onUpdateDevice && (
            <button
              type="button"
              onClick={
                isEditingInline ? handleSaveInlineEdits : handleToggleInlineEdit
              }
              className={`h-9 px-3 rounded-lg shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 text-xs font-bold border transition ${
                isEditingInline
                  ? "border-emerald-300 bg-emerald-600 text-white hover:bg-emerald-700 dark:border-emerald-600 dark:bg-emerald-600"
                  : "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300 dark:hover:bg-amber-900/60"
              }`}
            >
              {isEditingInline ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Save Inline Spec Edits</span>
                </>
              ) : (
                <>
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>Edit Specs Inline</span>
                </>
              )}
            </button>
          )}

          {showAdminControls && onOpenManualSpecStudio && (
            <button
              type="button"
              onClick={onOpenManualSpecStudio}
              className="h-9 px-3 rounded-lg shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 text-xs font-bold border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 transition dark:border-sky-800 dark:bg-sky-950/60 dark:text-sky-300 dark:hover:bg-sky-900/60"
            >
              <span>Full Spec & Model Studio</span>
            </button>
          )}

          <button
            onClick={() => setIsExpanded((v) => !v)}
            className="h-9 px-3 rounded-lg shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 text-xs font-bold border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 transition dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <span>{isExpanded ? "Collapse" : "Expand All"}</span>
            {isExpanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Spec Table Body with Accessible ARIA Roles */}
      {isExpanded && (
        <div
          role="table"
          aria-label={`Complete Encyclopedic Spec Sheet for ${formatDeviceLabel(device)}`}
          className="divide-y divide-slate-200 dark:divide-slate-800"
        >
          {filteredCategories.map((cat) => (
            <div
              key={cat.category}
              role="rowgroup"
              className="grid grid-cols-1 md:grid-cols-12"
            >
              {/* Left Category Column (GSMArena style, modernized, W3C ARIA compliant) */}
              <div
                role="row"
                className="md:col-span-3 bg-slate-50/80 px-4 py-3 border-b md:border-b-0 md:border-r border-slate-200 flex items-start dark:bg-slate-800/80 dark:border-slate-800"
              >
                <div
                  role="rowheader"
                  aria-label={`Spec Category: ${cat.category}`}
                  className="w-full"
                >
                  <span className="text-xs font-extrabold uppercase tracking-wider text-sky-800 dark:text-sky-300">
                    {cat.category}
                  </span>
                </div>
              </div>

              {/* Right Sub-Rows */}
              <div role="presentation" className="md:col-span-9 divide-y divide-slate-100 dark:divide-slate-800/60">
                {cat.rows.map((row, idx) => {
                  const noteEditor = row.editorNote
                    ? AI_EDITORS[row.editorNote.editorId]
                    : null;

                  return (
                    <div
                      key={idx}
                      role="row"
                      className="px-4 py-3 flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 hover:bg-slate-50/60 transition dark:hover:bg-slate-800/40"
                    >
                      <span
                        role="rowheader"
                        className="w-full sm:w-48 shrink-0 text-xs font-semibold text-slate-500 dark:text-slate-400"
                      >
                        {row.label}
                      </span>

                      <div role="cell" className="min-w-0 flex-1 flex flex-col items-start gap-1.5">
                        {isEditingInline ? (
                          <input
                            type="text"
                            aria-label={`Edit ${row.label}`}
                            value={
                              rowEdits[row.label] !== undefined
                                ? rowEdits[row.label]
                                : device.customSpecOverrides?.[row.label] ??
                                  row.value
                            }
                            onChange={(e) =>
                              setRowEdits((prev) => ({
                                ...prev,
                                [row.label]: e.target.value,
                              }))
                            }
                            className="w-full rounded-lg border border-sky-300 bg-sky-50/30 px-2.5 py-1 text-xs font-semibold text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none dark:border-sky-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-800"
                          />
                        ) : (
                          <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                            {device.customSpecOverrides?.[row.label] ??
                              row.value}
                          </span>
                        )}

                        {row.editorNote && noteEditor && (
                          <div
                            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium ${
                              row.editorNote.type === "PRAISE"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                            }`}
                          >
                            {row.editorNote.type === "PRAISE" ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                            ) : (
                              <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                            )}
                            <span>
                              <strong className="font-bold">
                                {noteEditor.roleTitle.replace("The ", "")}:
                              </strong>{" "}
                              {row.editorNote.text}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
