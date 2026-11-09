"use client";

import React, { useMemo, useRef, useState } from "react";
import {
  Cpu,
  Camera,
  DollarSign,
  Smartphone,
  PlusCircle,
  Sliders,
  Check,
  Sparkles,
  FileCheck2,
  RefreshCw,
  Upload,
  Trash2,
  Image as ImageIcon,
} from "lucide-react";
import { SmartphoneDevice, EditorialDraftItem } from "@/lib/seed-data";
import {
  ManualDeviceFormInput,
  MANUAL_SPEC_PRESETS,
  buildDeviceFromManualInput,
  deviceToManualFormInput,
} from "@/lib/spec-synthesizer";
import {
  CustomPhysicalProfile,
  generatePhysicalProfileFromImage,
} from "@/lib/image-profile-extractor";

interface ManualSpecEntryStudioProps {
  devices: SmartphoneDevice[];
  selectedDevice: SmartphoneDevice;
  onPublishDevice: (device: SmartphoneDevice) => void;
  onStageDraft: (device: SmartphoneDevice, draft: EditorialDraftItem) => void;
  onUpdateExistingDevice: (updatedDevice: SmartphoneDevice) => void;
}

function deviceLabel(device: SmartphoneDevice): string {
  return device.name.toLowerCase().startsWith(device.brand.toLowerCase())
    ? device.name
    : `${device.brand} ${device.name}`;
}

const ISLAND_GEOMETRY_OPTIONS = [
  { value: "AUTO", label: "Auto-Detect from Brand & Model" },
  {
    value: "IPHONE_16_VERTICAL_PILL",
    label: "iPhone 16 / 16 Plus / 17: Tight Vertical 2-Lens Pill + Side Flash",
  },
  {
    value: "IPHONE_15_DIAGONAL_DUAL",
    label: "iPhone 15: Square Plateau with 2 Diagonal Lenses",
  },
  {
    value: "IPHONE_16E_SINGLE_LENS",
    label: "iPhone 16e: Single 48MP Corner Lens + Flash",
  },
  {
    value: "IPHONE_17_AIR_BAR",
    label: "iPhone 17 Air: Horizontal Single-Lens Visor Bar",
  },
  {
    value: "IPHONE_17_PRO_WIDE_PLATEAU",
    label: "iPhone 17 Pro / Pro Max: Full-Width Pro Camera Bar",
  },
  {
    value: "IPHONE_PRO_TRIPLE_SQUIRCLE",
    label: "iPhone 13-16 Pro / Pro Max: Classic 3-Lens Triangle Squircle",
  },
  {
    value: "S_ULTRA_5_RINGS",
    label: "Samsung Ultra: 5 Floating Vertical Lens Rings",
  },
  {
    value: "S_BASE_3_RINGS",
    label: "Samsung Base / Fold: 3 Vertical Lenses",
  },
  {
    value: "ZEISS_CIRCLE",
    label: "Vivo / Xiaomi / Oppo / Honor / TECNO: Center Circular Deco",
  },
  {
    value: "ONEPLUS_CIRCLE",
    label: "OnePlus / Huawei / Motorola: Offset Circular Deco",
  },
  {
    value: "PIXEL_PRO_VISOR",
    label: "Google Pixel Pro: Horizontal Oval Visor Bar",
  },
  {
    value: "PIXEL_9A_FLUSH_PILL",
    label: "Google Pixel 9a: Compact Flush Dual-Lens Pill",
  },
  {
    value: "TECNO_PHANTOM_V_FOLD2_RECT",
    label: "TECNO Phantom V Fold2 5G: 2-Tier Rectangular Loewe Camera Plateau",
  },
  {
    value: "TECNO_CAMON_SWAN_PILL",
    label: "TECNO Camon 40 Pro: Aerodynamic Swan-Neck Vertical 3-Lens Pill",
  },
  {
    value: "TECNO_POVA_MECHA_LED",
    label: "TECNO Pova Ultra / Pro: Cyber-Mecha Trapezoid + Mini-LED Arcs",
  },
  {
    value: "TECNO_SPARK_SLIM_VISOR",
    label: "TECNO Spark Slim: Horizontal Dual-Lens Visor + Mood Light Bar",
  },
  {
    value: "SONY_VERTICAL_PILL",
    label: "Sony Xperia: Vertical Metallic 3-Lens Pill",
  },
  {
    value: "REDMAGIC_FLUSH_GAMING",
    label: "RedMagic / ROG: Flush Gaming Lenses + Turbofan Ring",
  },
  {
    value: "NOTHING_GLYPH",
    label: "Nothing Phone: Center Camera + Glyph LED Strips",
  },
];

export const ManualSpecEntryStudio: React.FC<ManualSpecEntryStudioProps> = ({
  devices,
  selectedDevice,
  onPublishDevice,
  onStageDraft,
  onUpdateExistingDevice,
}) => {
  const [studioMode, setStudioMode] = useState<"NEW_DEVICE" | "EDIT_EXISTING">(
    "EDIT_EXISTING"
  );
  const [targetEditDeviceId, setTargetEditDeviceId] = useState<string>(
    selectedDevice.id
  );
  const [formState, setFormState] = useState<ManualDeviceFormInput>(() =>
    deviceToManualFormInput(selectedDevice)
  );
  const [rawPasteText, setRawPasteText] = useState("");
  const [showRawPasteBox, setShowRawPasteBox] = useState(false);

  // Model Image & Physical Profile State
  const [customProfile, setCustomProfile] = useState<
    CustomPhysicalProfile | undefined
  >(selectedDevice.customProfile);
  const [customIslandType, setCustomIslandType] = useState<string>(
    selectedDevice.customIslandType || "AUTO"
  );
  const [customHeightMm, setCustomHeightMm] = useState<number>(
    selectedDevice.customHeightMm || 147.6
  );
  const [splitMode, setSplitMode] = useState<"AUTO" | boolean>("AUTO");
  const [isScanningPhoto, setIsScanningPhoto] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleModeSwitch = (mode: "NEW_DEVICE" | "EDIT_EXISTING") => {
    setStudioMode(mode);
    if (mode === "EDIT_EXISTING") {
      const target =
        devices.find((d) => d.id === targetEditDeviceId) || selectedDevice;
      setTargetEditDeviceId(target.id);
      setFormState(deviceToManualFormInput(target));
      setCustomProfile(target.customProfile);
      setCustomIslandType(target.customIslandType || "AUTO");
      setCustomHeightMm(target.customHeightMm || 162.5);
    } else {
      setFormState(MANUAL_SPEC_PRESETS["sony-xperia-1-vii"]);
      setCustomProfile(undefined);
      setCustomIslandType("AUTO");
      setCustomHeightMm(162.0);
    }
  };

  const handleSelectEditDevice = (deviceId: string) => {
    setTargetEditDeviceId(deviceId);
    const found = devices.find((d) => d.id === deviceId);
    if (found) {
      setFormState(deviceToManualFormInput(found));
      setCustomProfile(found.customProfile);
      setCustomIslandType(found.customIslandType || "AUTO");
      setCustomHeightMm(found.customHeightMm || 162.5);
    }
  };

  const updateField = <K extends keyof ManualDeviceFormInput>(
    key: K,
    value: ManualDeviceFormInput[K]
  ) => {
    setFormState((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Convert uploaded model image into Physical Profile
  const handleScanImageToProfile = async (imageUrl: string) => {
    setIsScanningPhoto(true);
    try {
      const profile = await generatePhysicalProfileFromImage({
        deviceId:
          studioMode === "EDIT_EXISTING" ? targetEditDeviceId : "new-device",
        imageUrl,
        isDualBackFront: splitMode,
        renderStyle: "PARAMETRIC_SVG",
      });
      setCustomProfile(profile);
    } catch (err) {
      console.error("Failed to scan model image:", err);
    } finally {
      setIsScanningPhoto(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        handleScanImageToProfile(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Optional Smart Raw Text Parser to assist manual entry
  const handleExtractFromRawText = () => {
    if (!rawPasteText.trim()) return;
    const text = rawPasteText;
    const next = { ...formState };

    const mahMatch = text.match(/(\d{4,5})\s*mAh/i);
    if (mahMatch) next.batteryCapacityMah = Number(mahMatch[1]);

    const wattMatch = text.match(/(\d{2,3})\s*W\b/i);
    if (wattMatch) next.wiredChargingW = Number(wattMatch[1]);

    const pwmMatch = text.match(/(\d{3,4})\s*Hz\s*PWM/i);
    if (pwmMatch) next.pwmDimmingHz = Number(pwmMatch[1]);

    const weightMatch = text.match(/(\d{3})\s*g\b/i);
    if (weightMatch) next.weightGrams = Number(weightMatch[1]);

    const priceMatch = text.match(/\$(\d{3,4})/);
    if (priceMatch) next.currentStreetUsd = Number(priceMatch[1]);

    const nitsMatch = text.match(/(\d{3,4})\s*nits/i);
    if (nitsMatch) next.peakBrightnessNits = Number(nitsMatch[1]);

    setFormState(next);
    setShowRawPasteBox(false);
  };

  const livePreviewDevice = useMemo(() => {
    const base = buildDeviceFromManualInput(
      formState,
      studioMode === "EDIT_EXISTING" ? targetEditDeviceId : undefined
    );
    return {
      ...base,
      customProfile,
      customIslandType: customIslandType === "AUTO" ? undefined : customIslandType,
      customHeightMm,
    };
  }, [
    formState,
    studioMode,
    targetEditDeviceId,
    customProfile,
    customIslandType,
    customHeightMm,
  ]);

  const handlePublishNew = () => {
    onPublishDevice(livePreviewDevice);
  };

  const handleStageInQueue = () => {
    const built = livePreviewDevice;
    const draft: EditorialDraftItem = {
      id: `draft-manual-${Date.now()}`,
      deviceId: built.id,
      deviceName: deviceLabel(built),
      type: "NEW_DEVICE_REVIEW",
      title: `Manual Spec & Model Profile Staged: ${deviceLabel(built)}`,
      summary: `Manual spec entry completed with 28 hardware attributes (${built.specs.socName}, ${built.specs.mainSensorSize}, ${built.specs.batteryCapacityMah}mAh)${
        built.customProfile ? " + custom uploaded model profile" : ""
      }. Composite Living Score: ${built.compositeLivingScore}.`,
      leadEditorId: "SILICON_GEEK",
      coEditorId: "CAMERA_PURIST",
      confidenceScore: 99,
      status: "PENDING_REVIEW",
      proposedScoreDelta: `Initial Living Score: ${built.compositeLivingScore} (${built.buyRecommendation.replace(/_/g, " ")})`,
      citationsCount: 1,
      createdAt: "Just now (Manual Spec Studio)",
      rawDiffSummary: [
        `Manual Silicon Spec: ${built.specs.socName} (${built.specs.ramOptions}, ${built.specs.storageType})`,
        `Manual Camera Spec: ${built.specs.mainSensorSize} + ${built.specs.telephotoSpecs}`,
        `Manual Battery & Price: ${built.specs.batteryCapacityMah}mAh (${built.specs.wiredChargingW}W) at $${built.currentStreetUsd}`,
      ],
    };
    onStageDraft(built, draft);
  };

  const handleSaveOverride = () => {
    const existing = devices.find((d) => d.id === targetEditDeviceId);
    const updated: SmartphoneDevice = {
      ...livePreviewDevice,
      customSpecOverrides: existing?.customSpecOverrides,
    };
    onUpdateExistingDevice(updated);
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs space-y-5">
      {/* Top Header & Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-sky-700 dark:text-sky-300">
              <Sliders className="h-3 w-3" /> Hybrid Spec & Model Image Studio
            </span>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
              Manual Spec Editor, Hardware Override & Model Image Vectorizer
            </h3>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Edit any model&apos;s hardware specifications, upload or replace its product image to generate a physical profile, or add a brand-new phone.
          </p>
        </div>

        {/* Mode Toggle Pills */}
        <div className="flex items-center gap-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => handleModeSwitch("EDIT_EXISTING")}
            className={`h-8 shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 rounded-lg px-3 text-xs font-bold transition cursor-pointer ${
              studioMode === "EDIT_EXISTING"
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            }`}
          >
            <RefreshCw className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Edit Any Catalog Model & Image</span>
          </button>
          <button
            type="button"
            onClick={() => handleModeSwitch("NEW_DEVICE")}
            className={`h-8 shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 rounded-lg px-3 text-xs font-bold transition cursor-pointer ${
              studioMode === "NEW_DEVICE"
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            }`}
          >
            <PlusCircle className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
            <span>Add New Phone Model</span>
          </button>
        </div>
      </div>

      {/* Sub-Bar: Device Selector (for Edit) OR Template Presets (for New Device) */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 px-4 py-3">
        {studioMode === "EDIT_EXISTING" ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Select Model to Edit Specs & Image ({devices.length} Models):
            </span>
            <select
              value={targetEditDeviceId}
              onChange={(e) => handleSelectEditDevice(e.target.value)}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-slate-100 focus:border-sky-500 focus:outline-none"
            >
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {deviceLabel(d)} (${d.currentStreetUsd} • Score{" "}
                  {d.compositeLivingScore})
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mr-1">
              Quick Pre-Fill Templates:
            </span>
            <button
              type="button"
              onClick={() =>
                setFormState(MANUAL_SPEC_PRESETS["sony-xperia-1-vii"])
              }
              className="h-8 shrink-0 whitespace-nowrap inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:border-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition cursor-pointer"
            >
              Sony Xperia 1 VII
            </button>
            <button
              type="button"
              onClick={() =>
                setFormState(MANUAL_SPEC_PRESETS["xiaomi-15-ultra"])
              }
              className="h-8 shrink-0 whitespace-nowrap inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:border-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition cursor-pointer"
            >
              Xiaomi 15 Ultra
            </button>
            <button
              type="button"
              onClick={() => setFormState(MANUAL_SPEC_PRESETS["iphone-17-air"])}
              className="h-8 shrink-0 whitespace-nowrap inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:border-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition cursor-pointer"
            >
              iPhone 17 Air (5.5mm)
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowRawPasteBox((prev) => !prev)}
          className="h-8 shrink-0 whitespace-nowrap inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:border-sky-300 hover:text-sky-700 dark:hover:text-sky-300 transition cursor-pointer"
        >
          {showRawPasteBox
            ? "Hide Raw Spec Paste Box"
            : "Paste Raw Spec Snippet to Auto-Fill"}
        </button>
      </div>

      {/* Collapsible Raw Text Paste Extractor */}
      {showRawPasteBox && (
        <div className="rounded-xl border border-sky-200 dark:border-sky-900/60 bg-sky-50/40 dark:bg-sky-950/40 p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sky-900 dark:text-sky-300">
              Paste Unstructured OEM Press Release or Spec Sheet Numbers
            </span>
            <button
              type="button"
              onClick={handleExtractFromRawText}
              className="h-8 shrink-0 whitespace-nowrap inline-flex items-center rounded-lg bg-sky-600 px-3 text-xs font-bold text-white hover:bg-sky-700 transition cursor-pointer"
            >
              Extract Numbers into Form
            </button>
          </div>
          <textarea
            rows={2}
            value={rawPasteText}
            onChange={(e) => setRawPasteText(e.target.value)}
            placeholder="Example: 6100mAh battery, 100W wired charging, 2160Hz PWM dimming, 204g weight, $899 street price, 3500 nits..."
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-sky-500 focus:outline-none"
          />
        </div>
      )}

      {/* =================================================================
          SECTION 0: MODEL IMAGE UPLOAD & PHYSICAL PROFILE GENERATOR
         ================================================================= */}
      <div className="rounded-xl border border-sky-200 dark:border-sky-900/60 bg-sky-50/30 dark:bg-sky-950/30 p-4 space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0" />
            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                Model Image & Physical Silhouette Profile ({formState.brand}{" "}
                {formState.name})
              </h4>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                Upload a photo of the phone or select its exact camera island geometry. The system converts the image into a true-scale cutout, CAD blueprint vector, and color palette.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={
                splitMode === "AUTO" ? "AUTO" : splitMode ? "DUAL" : "SINGLE"
              }
              onChange={(e) => {
                const v = e.target.value;
                setSplitMode(v === "AUTO" ? "AUTO" : v === "DUAL");
              }}
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200"
            >
              <option value="AUTO">Auto-Detect Back+Front Split</option>
              <option value="DUAL">Dual Image (Left=Back, Right=Front)</option>
              <option value="SINGLE">Single Rear Image</option>
            </select>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isScanningPhoto}
              className="h-8 shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 text-xs font-bold text-white hover:bg-sky-700 transition shadow-2xs cursor-pointer"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>
                {isScanningPhoto
                  ? "Scanning Image..."
                  : "Upload Model Photo"}
              </span>
            </button>

            <button
              type="button"
              onClick={() =>
                handleScanImageToProfile("/models/iphone-16-ref.png")
              }
              disabled={isScanningPhoto}
              className="h-8 shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 rounded-lg border border-pink-300 dark:border-pink-800 bg-pink-50 dark:bg-pink-950/60 px-3 text-xs font-bold text-pink-700 dark:text-pink-300 hover:bg-pink-100 dark:hover:bg-pink-900/60 transition cursor-pointer"
            >
              <Check className="h-3.5 w-3.5" />
              <span>Load Uploaded Pink iPhone 16 Photo</span>
            </button>
          </div>
        </div>

        {/* Camera Island Geometry Override & Exact Height (mm) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          <div className="md:col-span-2">
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Parametric Rear Camera Island Geometry
            </label>
            <select
              value={customIslandType}
              onChange={(e) => setCustomIslandType(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:border-sky-500 focus:outline-none"
            >
              {ISLAND_GEOMETRY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Chassis Height (mm)
            </label>
            <input
              type="number"
              step="0.1"
              value={customHeightMm}
              onChange={(e) =>
                setCustomHeightMm(Number(e.target.value) || 147.6)
              }
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 font-mono text-xs font-semibold text-slate-900 dark:text-slate-100 focus:border-sky-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Preview of Extracted Image Profile if Present */}
        {customProfile && (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5">
            <div className="flex items-center gap-4">
              {/* Thumbnail 1: Rear Photo Cutout */}
              <div className="flex flex-col items-center">
                <div className="h-20 w-11 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-1 flex items-center justify-center overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element -- Local data URL preview is not an optimizable network asset. */}
                  <img
                    src={customProfile.rearCutoutDataUrl}
                    alt="Rear Cutout"
                    className="h-full w-full object-contain"
                  />
                </div>
                <span className="mt-1 font-mono text-[9px] font-bold text-slate-500 dark:text-slate-400">
                  Rear Cutout
                </span>
              </div>

              {/* Thumbnail 2: Sobel Blueprint Vector */}
              <div className="flex flex-col items-center">
                <div className="h-20 w-11 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-1 flex items-center justify-center overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element -- Local data URL preview is not an optimizable network asset. */}
                  <img
                    src={customProfile.rearBlueprintDataUrl}
                    alt="CAD Blueprint"
                    className="h-full w-full object-contain"
                  />
                </div>
                <span className="mt-1 font-mono text-[9px] font-bold text-slate-500 dark:text-slate-400">
                  CAD Vector
                </span>
              </div>

              {/* Thumbnail 3: Front Display Cutout (if dual image) */}
              {customProfile.frontCutoutDataUrl && (
                <div className="flex flex-col items-center">
                  <div className="h-20 w-11 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-1 flex items-center justify-center overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element -- Local data URL preview is not an optimizable network asset. */}
                    <img
                      src={customProfile.frontCutoutDataUrl}
                      alt="Front Display"
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <span className="mt-1 font-mono text-[9px] font-bold text-slate-500 dark:text-slate-400">
                    Front Screen
                  </span>
                </div>
              )}

              {/* Editable Extracted Hex Colors */}
              <div className="space-y-1.5 pl-2 border-l border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 text-xs">
                  <input
                    type="color"
                    value={customProfile.dominantBodyHex}
                    onChange={(e) =>
                      setCustomProfile({
                        ...customProfile,
                        dominantBodyHex: e.target.value,
                      })
                    }
                    className="h-5 w-5 cursor-pointer rounded border border-slate-300 dark:border-slate-700"
                  />
                  <span className="font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    Body Color: {customProfile.dominantBodyHex}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <input
                    type="color"
                    value={customProfile.cameraAccentHex}
                    onChange={(e) =>
                      setCustomProfile({
                        ...customProfile,
                        cameraAccentHex: e.target.value,
                      })
                    }
                    className="h-5 w-5 cursor-pointer rounded border border-slate-300 dark:border-slate-700"
                  />
                  <span className="font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    Camera Island: {customProfile.cameraAccentHex}
                  </span>
                </div>
              </div>
            </div>

            {/* Render Mode Selector + Remove */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() =>
                  setCustomProfile({
                    ...customProfile,
                    renderStyle: "PHOTO_CUTOUT",
                  })
                }
                className={`h-8 shrink-0 whitespace-nowrap inline-flex items-center rounded-lg px-2.5 text-xs font-bold transition cursor-pointer ${
                  customProfile.renderStyle === "PHOTO_CUTOUT"
                    ? "bg-sky-600 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                Photo Cutout
              </button>
              <button
                type="button"
                onClick={() =>
                  setCustomProfile({
                    ...customProfile,
                    renderStyle: "BLUEPRINT_VECTOR",
                  })
                }
                className={`h-8 shrink-0 whitespace-nowrap inline-flex items-center rounded-lg px-2.5 text-xs font-bold transition cursor-pointer ${
                  customProfile.renderStyle === "BLUEPRINT_VECTOR"
                    ? "bg-sky-600 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                CAD Blueprint
              </button>
              <button
                type="button"
                onClick={() =>
                  setCustomProfile({
                    ...customProfile,
                    renderStyle: "PARAMETRIC_SVG",
                  })
                }
                className={`h-8 shrink-0 whitespace-nowrap inline-flex items-center rounded-lg px-2.5 text-xs font-bold transition cursor-pointer ${
                  customProfile.renderStyle === "PARAMETRIC_SVG"
                    ? "bg-sky-600 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                Parametric SVG
              </button>
              <button
                type="button"
                onClick={() => setCustomProfile(undefined)}
                className="h-8 shrink-0 whitespace-nowrap inline-flex items-center gap-1 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 px-2.5 text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition cursor-pointer ml-1"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Clear Image</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Real-Time AI Editor Score Synthesis Preview Bar */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Deterministic Score Preview (Calculated from Entered Specs)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2.5 py-0.5 font-mono text-xs font-extrabold text-slate-900 dark:text-slate-100">
              Composite Living Score:{" "}
              <span className="text-sky-600 dark:text-sky-400">
                {livePreviewDevice.compositeLivingScore.toFixed(1)}
              </span>{" "}
              / 10
            </span>
            <span className="rounded-md bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 font-mono text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
              {livePreviewDevice.buyRecommendation.replace(/_/g, " ")}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Cpu className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                Performance &amp; Battery
              </span>
            </div>
            <span className="font-mono text-sm font-extrabold text-sky-700 dark:text-sky-300">
              {livePreviewDevice.verdicts.SILICON_GEEK.score.toFixed(1)}
            </span>
          </div>

          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Camera className="h-3.5 w-3.5 text-pink-600 dark:text-pink-400 shrink-0" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                Camera &amp; Display
              </span>
            </div>
            <span className="font-mono text-sm font-extrabold text-pink-700 dark:text-pink-300">
              {livePreviewDevice.verdicts.CAMERA_PURIST.score.toFixed(1)}
            </span>
          </div>

          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                Value &amp; Price
              </span>
            </div>
            <span className="font-mono text-sm font-extrabold text-emerald-700 dark:text-emerald-300">
              {livePreviewDevice.verdicts.PRAGMATIST.score.toFixed(1)}
            </span>
          </div>

          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Smartphone className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                Comfort &amp; Everyday
              </span>
            </div>
            <span className="font-mono text-sm font-extrabold text-amber-700 dark:text-amber-300">
              {livePreviewDevice.verdicts.DAILY_DRIVER.score.toFixed(1)}
            </span>
          </div>
        </div>
      </div>

      {/* Structured 4-Section Manual Spec Input Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Group 1: Identity, Release & Pricing */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-900/50 p-4 space-y-3">
          <div className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800 pb-2">
            1. Device Identity & Street Pricing
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Brand
              </label>
              <input
                type="text"
                value={formState.brand}
                onChange={(e) => updateField("brand", e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:border-sky-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Model Name
              </label>
              <input
                type="text"
                value={formState.name}
                onChange={(e) => updateField("name", e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:border-sky-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Category
              </label>
              <select
                value={formState.category}
                onChange={(e) =>
                  updateField(
                    "category",
                    e.target.value as SmartphoneDevice["category"]
                  )
                }
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:border-sky-500 focus:outline-none"
              >
                <option value="Ultra Flagship">Ultra Flagship</option>
                <option value="Camera Flagship">Camera Flagship</option>
                <option value="Foldable">Foldable (Book & Flip)</option>
                <option value="Performance Flagship">Performance Flagship</option>
                <option value="Battery King">Battery King</option>
                <option value="Value Disruptor">Value Disruptor</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                OS Support (Years)
              </label>
              <input
                type="number"
                value={formState.osSupportYears}
                onChange={(e) =>
                  updateField("osSupportYears", Number(e.target.value) || 1)
                }
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 font-mono text-xs font-semibold text-slate-900 dark:text-slate-100 focus:border-sky-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Launch MSRP ($ USD)
              </label>
              <input
                type="number"
                value={formState.launchMsrpUsd}
                onChange={(e) =>
                  updateField("launchMsrpUsd", Number(e.target.value) || 0)
                }
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 font-mono text-xs font-semibold text-slate-900 dark:text-slate-100 focus:border-sky-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 mb-1">
                Current Street Price ($ USD)
              </label>
              <input
                type="number"
                value={formState.currentStreetUsd}
                onChange={(e) =>
                  updateField("currentStreetUsd", Number(e.target.value) || 0)
                }
                className="w-full rounded-lg border border-emerald-300 dark:border-emerald-700 bg-emerald-50/30 dark:bg-emerald-950/30 px-2.5 py-1.5 font-mono text-xs font-bold text-emerald-900 dark:text-emerald-300 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Editorial Tagline (No Em-Dashes)
            </label>
            <input
              type="text"
              value={formState.tagline}
              onChange={(e) => updateField("tagline", e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:border-sky-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Group 2: Silicon, Benchmarks & Display */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-900/50 p-4 space-y-3">
          <div className="text-xs font-extrabold uppercase tracking-wider text-sky-700 dark:text-sky-400 border-b border-slate-100 dark:border-slate-800 pb-2">
            2. Silicon, Thermal Stability & Display
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                SoC Chipset
              </label>
              <input
                type="text"
                value={formState.socName}
                onChange={(e) => updateField("socName", e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:border-sky-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                RAM & Memory Tier
              </label>
              <input
                type="text"
                value={formState.ramOptions}
                onChange={(e) => updateField("ramOptions", e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:border-sky-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Geekbench 6 Multi-Core
              </label>
              <input
                type="number"
                value={formState.geekbenchMulti}
                onChange={(e) =>
                  updateField("geekbenchMulti", Number(e.target.value) || 0)
                }
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 font-mono text-xs font-semibold text-slate-900 dark:text-slate-100 focus:border-sky-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                3DMark Stability (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={formState.wildlifeStabilityPct}
                onChange={(e) =>
                  updateField(
                    "wildlifeStabilityPct",
                    Number(e.target.value) || 0
                  )
                }
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 font-mono text-xs font-semibold text-slate-900 dark:text-slate-100 focus:border-sky-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Peak Brightness (Nits)
              </label>
              <input
                type="number"
                value={formState.peakBrightnessNits}
                onChange={(e) =>
                  updateField("peakBrightnessNits", Number(e.target.value) || 0)
                }
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 font-mono text-xs font-semibold text-slate-900 dark:text-slate-100 focus:border-sky-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                PWM Dimming (Hz)
              </label>
              <input
                type="number"
                value={formState.pwmDimmingHz}
                onChange={(e) =>
                  updateField("pwmDimmingHz", Number(e.target.value) || 0)
                }
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 font-mono text-xs font-semibold text-slate-900 dark:text-slate-100 focus:border-sky-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Group 3: Camera Optics & Shutter Lag */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-900/50 p-4 space-y-3">
          <div className="text-xs font-extrabold uppercase tracking-wider text-pink-700 dark:text-pink-400 border-b border-slate-100 dark:border-slate-800 pb-2">
            3. Camera Sensors, Periscope & Shutter Response
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Main Sensor Size & Model
              </label>
              <input
                type="text"
                value={formState.mainSensorSize}
                onChange={(e) => updateField("mainSensorSize", e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:border-sky-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Main Lens Aperture
              </label>
              <input
                type="text"
                value={formState.mainAperture}
                onChange={(e) => updateField("mainAperture", e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:border-sky-500 focus:outline-none"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Telephoto / Periscope Architecture
              </label>
              <input
                type="text"
                value={formState.telephotoSpecs}
                onChange={(e) => updateField("telephotoSpecs", e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:border-sky-500 focus:outline-none"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Indoor Moving-Subject Shutter Lag Rating
              </label>
              <input
                type="text"
                value={formState.shutterLagRating}
                onChange={(e) =>
                  updateField("shutterLagRating", e.target.value)
                }
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:border-sky-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Group 4: Battery, Charging & Ergonomics */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-900/50 p-4 space-y-3">
          <div className="text-xs font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-400 border-b border-slate-100 dark:border-slate-800 pb-2">
            4. Battery Chemistry, Charging & Physical Chassis
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Battery (mAh)
              </label>
              <input
                type="number"
                value={formState.batteryCapacityMah}
                onChange={(e) =>
                  updateField(
                    "batteryCapacityMah",
                    Number(e.target.value) || 0
                  )
                }
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 font-mono text-xs font-semibold text-slate-900 dark:text-slate-100 focus:border-sky-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Wired (W)
              </label>
              <input
                type="number"
                value={formState.wiredChargingW}
                onChange={(e) =>
                  updateField("wiredChargingW", Number(e.target.value) || 0)
                }
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 font-mono text-xs font-semibold text-slate-900 dark:text-slate-100 focus:border-sky-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                0-100% (Mins)
              </label>
              <input
                type="number"
                value={formState.fullChargeMins}
                onChange={(e) =>
                  updateField("fullChargeMins", Number(e.target.value) || 0)
                }
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 font-mono text-xs font-semibold text-slate-900 dark:text-slate-100 focus:border-sky-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Weight (g)
              </label>
              <input
                type="number"
                value={formState.weightGrams}
                onChange={(e) =>
                  updateField("weightGrams", Number(e.target.value) || 0)
                }
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 font-mono text-xs font-semibold text-slate-900 dark:text-slate-100 focus:border-sky-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Thickness (mm)
              </label>
              <input
                type="number"
                step="0.1"
                value={formState.thicknessMm}
                onChange={(e) =>
                  updateField("thicknessMm", Number(e.target.value) || 0)
                }
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 font-mono text-xs font-semibold text-slate-900 dark:text-slate-100 focus:border-sky-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Width (mm)
              </label>
              <input
                type="number"
                step="0.1"
                value={formState.widthMm}
                onChange={(e) =>
                  updateField("widthMm", Number(e.target.value) || 0)
                }
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 font-mono text-xs font-semibold text-slate-900 dark:text-slate-100 focus:border-sky-500 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800 pt-4">
        <div className="text-xs text-slate-500 dark:text-slate-400">
          Saves changes in the current browser session and recalculates all four deterministic editor scores.
        </div>

        {studioMode === "NEW_DEVICE" ? (
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleStageInQueue}
              className="h-9 shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-amber-400 hover:bg-amber-50/50 dark:hover:bg-amber-950/40 transition cursor-pointer"
            >
              <FileCheck2 className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              <span>Stage in Approval Queue</span>
            </button>
            <button
              type="button"
              onClick={handlePublishNew}
              className="h-9 shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-4 text-xs font-bold text-white hover:bg-sky-700 transition shadow-2xs cursor-pointer"
            >
              <Check className="h-3.5 w-3.5" />
              <span>
                Add {formState.brand} {formState.name} to Session Catalog
              </span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleSaveOverride}
            className="h-9 shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-xs font-bold text-white hover:bg-emerald-700 transition shadow-2xs cursor-pointer"
          >
            <Check className="h-3.5 w-3.5" />
            <span>
              Save Spec & Model Image Changes for {formState.name}
            </span>
          </button>
        )}
      </div>
    </div>
  );
};
