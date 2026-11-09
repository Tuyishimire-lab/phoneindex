"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SmartphoneDevice } from "@/lib/seed-data";
import {
  getDeviceLabTelemetry,
  formatHoursDuration,
  formatCavityArchitecture,
} from "@/lib/lab-measurements";
import {
  Layers,
  Cpu,
  Camera,
  Battery,
  Shield,
  DollarSign,
  Activity,
  X,
  RefreshCw,
  Plus,
  Search,
  SlidersHorizontal,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

interface SpecMetricRow {
  label: string;
  getValue: (d: SmartphoneDevice) => string;
}

interface SpecMetricCategory {
  category: string;
  icon: React.ReactNode;
  rows: SpecMetricRow[];
}

interface CompareMatrixTableProps {
  initialContenders: SmartphoneDevice[];
  allCatalogDevices?: SmartphoneDevice[];
  onNavigate?: (slugPath: string) => void;
}

export function CompareMatrixTable({
  initialContenders,
  allCatalogDevices = [],
  onNavigate,
}: CompareMatrixTableProps) {
  let router: { push: (path: string) => void } | null = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    router = useRouter();
  } catch {
    router = null;
  }
  const [contenders, setContenders] = useState<SmartphoneDevice[]>(initialContenders);
  const [highlightDiffsOnly, setHighlightDiffsOnly] = useState(false);
  const [swapTargetIndex, setSwapTargetIndex] = useState<number | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [pickerSearchQuery, setPickerSearchQuery] = useState("");

  const specCategories: SpecMetricCategory[] = useMemo(
    () => [
      {
        category: "Display & Viewing",
        icon: <Layers className="h-4 w-4 text-sky-600" />,
        rows: [
          {
            label: "Screen Diagonal",
            getValue: (d) => `${d.specs.displaySizeInch}" inches`,
          },
          {
            label: "Panel Technology",
            getValue: (d) => d.specs.displayPanelType,
          },
          {
            label: "Resolution & Sharpness",
            getValue: (d) => d.specs.resolution,
          },
          {
            label: "Refresh Rate",
            getValue: (d) => d.specs.refreshRateHz,
          },
          {
            label: "Peak Brightness",
            getValue: (d) => `${d.specs.peakBrightnessNits} nits`,
          },
          {
            label: "PWM Eye-Care Dimming",
            getValue: (d) => `${d.specs.pwmDimmingHz} Hz`,
          },
        ],
      },
      {
        category: "Silicon & Performance",
        icon: <Cpu className="h-4 w-4 text-sky-600" />,
        rows: [
          {
            label: "Processor (SoC)",
            getValue: (d) => d.specs.socName,
          },
          {
            label: "Fabrication Node",
            getValue: (d) => `${d.specs.socNodeNm} nm`,
          },
          {
            label: "CPU Architecture",
            getValue: (d) => d.specs.cpuTopology,
          },
          {
            label: "Graphics (GPU)",
            getValue: (d) => d.specs.gpuName,
          },
          {
            label: "Memory (RAM)",
            getValue: (d) => d.specs.ramOptions,
          },
          {
            label: "Storage Standard",
            getValue: (d) => d.specs.storageType,
          },
          {
            label: "Geekbench 6 Single-Core",
            getValue: (d) => `${d.specs.geekbenchSingle}`,
          },
          {
            label: "Geekbench 6 Multi-Core",
            getValue: (d) => `${d.specs.geekbenchMulti}`,
          },
          {
            label: "3DMark Wild Life Stability",
            getValue: (d) => `${d.specs.wildlifeStabilityPct}%`,
          },
        ],
      },
      {
        category: "Camera Hardware & Optics",
        icon: <Camera className="h-4 w-4 text-pink-600" />,
        rows: [
          {
            label: "Main Sensor Resolution",
            getValue: (d) => `${d.specs.mainSensorMp} MP`,
          },
          {
            label: "Sensor Physical Size",
            getValue: (d) => d.specs.mainSensorSize,
          },
          {
            label: "Main Optical Aperture",
            getValue: (d) => d.specs.mainAperture,
          },
          {
            label: "Telephoto Zoom Specs",
            getValue: (d) => d.specs.telephotoSpecs,
          },
          {
            label: "Ultrawide Lens",
            getValue: (d) => d.specs.ultrawideSpecs,
          },
          {
            label: "Video Recording",
            getValue: (d) => d.specs.videoCapabilities,
          },
          {
            label: "Shutter Lag Response",
            getValue: (d) => d.specs.shutterLagRating,
          },
        ],
      },
      {
        category: "Battery & Charging",
        icon: <Battery className="h-4 w-4 text-emerald-600" />,
        rows: [
          {
            label: "Battery Capacity",
            getValue: (d) => `${d.specs.batteryCapacityMah} mAh`,
          },
          {
            label: "Battery Chemistry",
            getValue: (d) => d.specs.batteryChemistry,
          },
          {
            label: "Wired Fast Charging",
            getValue: (d) => `${d.specs.wiredChargingW}W`,
          },
          {
            label: "Wireless Charging",
            getValue: (d) =>
              d.specs.wirelessChargingW > 0
                ? `${d.specs.wirelessChargingW}W`
                : "Not supported",
          },
          {
            label: "Full Charge Time (0-100%)",
            getValue: (d) => `${d.specs.fullChargeMins} mins`,
          },
        ],
      },
      {
        category: "PhoneIndex OpenLab™ Telemetry & Benchmarks",
        icon: <Activity className="h-4 w-4 text-emerald-600" />,
        rows: [
          {
            label: "Active Use Runtime Score",
            getValue: (d) => {
              const tele = getDeviceLabTelemetry(d);
              return `${tele.battery.activeUseScoreHours.toFixed(1)} hrs (${formatHoursDuration(tele.battery.activeUseScoreHours)})`;
            },
          },
          {
            label: "Web Browsing Runtime",
            getValue: (d) => {
              const tele = getDeviceLabTelemetry(d);
              return `${tele.battery.webBrowsingHours.toFixed(1)} hrs (${formatHoursDuration(tele.battery.webBrowsingHours)})`;
            },
          },
          {
            label: "Continuous Video Playback",
            getValue: (d) => {
              const tele = getDeviceLabTelemetry(d);
              return `${tele.battery.videoPlaybackHours.toFixed(1)} hrs (${formatHoursDuration(tele.battery.videoPlaybackHours)})`;
            },
          },
          {
            label: "3D Gaming Runtime",
            getValue: (d) => {
              const tele = getDeviceLabTelemetry(d);
              return `${tele.battery.gaming3dHours.toFixed(1)} hrs (${formatHoursDuration(tele.battery.gaming3dHours)})`;
            },
          },
          {
            label: "Loudspeaker Loudness (LUFS)",
            getValue: (d) => {
              const tele = getDeviceLabTelemetry(d);
              return `${tele.acoustics.lufs} LUFS (${tele.acoustics.loudnessClass})`;
            },
          },
          {
            label: "Acoustic Cavity Architecture",
            getValue: (d) => {
              const tele = getDeviceLabTelemetry(d);
              return formatCavityArchitecture(tele.acoustics.cavityArchitecture);
            },
          },
          {
            label: "Chassis Acoustic Volume",
            getValue: (d) => {
              const tele = getDeviceLabTelemetry(d);
              return `${tele.acoustics.chassisVolumeCm3} cm³ (THD: ${tele.acoustics.metrics.thdPct}%)`;
            },
          },
          {
            label: "OpenLab Provenance Protocol",
            getValue: (d) => {
              const tele = getDeviceLabTelemetry(d);
              return `${tele.provenance.protocolVersion} (±${tele.provenance.marginOfErrorPct}%)`;
            },
          },
        ],
      },
      {
        category: "Chassis, Build & Ingress",
        icon: <Shield className="h-4 w-4 text-amber-600" />,
        rows: [
          {
            label: "Dimensions (H x W x D)",
            getValue: (d) =>
              `${(d.customHeightMm ?? 160.0).toFixed(1)} x ${d.specs.widthMm} x ${d.specs.thicknessMm} mm`,
          },
          {
            label: "Weight",
            getValue: (d) => `${d.specs.weightGrams} g`,
          },
          {
            label: "Chassis Frame Material",
            getValue: (d) => d.specs.frameMaterial,
          },
          {
            label: "Water & Dust Resistance",
            getValue: (d) => d.specs.ipRating,
          },
          {
            label: "Biometric Security",
            getValue: (d) => d.specs.fingerprintType,
          },
        ],
      },
      {
        category: "Longevity & Market Value",
        icon: <DollarSign className="h-4 w-4 text-sky-700" />,
        rows: [
          {
            label: "Current Street Price",
            getValue: (d) => `$${d.currentStreetUsd}`,
          },
          {
            label: "Original Launch MSRP",
            getValue: (d) => (d.launchMsrpUsd ? `$${d.launchMsrpUsd}` : "N/A"),
          },
          {
            label: "Guaranteed OS Support",
            getValue: (d) => `${d.osSupportYears} Years`,
          },
          {
            label: "PhoneIndex Recommendation",
            getValue: (d) => d.buyRecommendation,
          },
        ],
      },
    ],
    []
  );

  // Compute total and differing row metrics
  const { totalRows, totalDifferences } = useMemo(() => {
    let total = 0;
    let diffs = 0;
    for (const cat of specCategories) {
      for (const row of cat.rows) {
        total++;
        const vals = contenders.map((d) => row.getValue(d));
        if (new Set(vals).size > 1) {
          diffs++;
        }
      }
    }
    return { totalRows: total, totalDifferences: diffs };
  }, [specCategories, contenders]);

  // Navigate to updated slug path
  const syncUrlWithContenders = (newContenders: SmartphoneDevice[]) => {
    const slugPath = newContenders.map((d) => d.slug).join("-vs-");
    if (onNavigate) {
      onNavigate(slugPath);
    } else if (router) {
      router.push(`/compare/${slugPath}`);
    } else if (typeof window !== "undefined") {
      window.history.pushState(null, "", `/compare/${slugPath}`);
    }
  };

  // Remove a contender
  const handleRemoveContender = (indexToRemove: number) => {
    if (contenders.length <= 2) return;
    const next = contenders.filter((_, idx) => idx !== indexToRemove);
    setContenders(next);
    syncUrlWithContenders(next);
  };

  // Swap a contender with a selected replacement
  const handleSelectReplacement = (device: SmartphoneDevice) => {
    if (swapTargetIndex === null) return;
    const next = [...contenders];
    next[swapTargetIndex] = device;
    setContenders(next);
    setSwapTargetIndex(null);
    setPickerSearchQuery("");
    syncUrlWithContenders(next);
  };

  // Add a new contender
  const handleAddContender = (device: SmartphoneDevice) => {
    if (contenders.length >= 4) return;
    if (contenders.some((d) => d.id === device.id)) return;
    const next = [...contenders, device];
    setContenders(next);
    setIsAddModalOpen(false);
    setPickerSearchQuery("");
    syncUrlWithContenders(next);
  };

  // Filtered devices for picker modal
  const filteredPickerDevices = useMemo(() => {
    const existingIds = new Set(contenders.map((d) => d.id));
    const pool = allCatalogDevices.filter((d) => !existingIds.has(d.id));
    if (!pickerSearchQuery.trim()) return pool.slice(0, 12);
    const q = pickerSearchQuery.toLowerCase();
    return pool
      .filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.brand.toLowerCase().includes(q) ||
          d.specs.socName.toLowerCase().includes(q)
      )
      .slice(0, 16);
  }, [allCatalogDevices, contenders, pickerSearchQuery]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden dark:border-slate-800 dark:bg-slate-900">
      {/* Table Toolbar: Highlight Differences Toggle & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/80 p-4 sm:px-6 dark:border-slate-800 dark:bg-slate-800/80">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Full Side-by-Side Spec Comparison Matrix
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {highlightDiffsOnly
              ? `Showing ${totalDifferences} hardware differences only (${totalRows - totalDifferences} identical rows hidden)`
              : `Detailed hardware specifications across ${totalRows} parameters aligned row-by-row.`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Highlight Hardware Differences Only Toggle Button */}
          <button
            type="button"
            onClick={() => setHighlightDiffsOnly((prev) => !prev)}
            aria-pressed={highlightDiffsOnly}
            className={`min-h-[44px] px-3.5 rounded-xl font-bold text-xs inline-flex items-center gap-2 transition border shadow-2xs ${
              highlightDiffsOnly
                ? "border-amber-300 bg-amber-500 text-white hover:bg-amber-600 dark:border-amber-500 dark:bg-amber-600"
                : "border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:text-sky-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-sky-500"
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>Highlight Hardware Differences Only</span>
            <span
              className={`ml-1 rounded px-1.5 py-0.5 text-[10px] font-mono ${
                highlightDiffsOnly
                  ? "bg-amber-600 text-white dark:bg-amber-700"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
              }`}
            >
              {highlightDiffsOnly ? `${totalDifferences} Diffs` : "All Rows"}
            </span>
          </button>

          {/* Add Contender Slot Button (if < 4 contenders) */}
          {contenders.length < 4 && (
            <button
              type="button"
              onClick={() => {
                setIsAddModalOpen(true);
                setPickerSearchQuery("");
              }}
              className="min-h-[44px] px-3.5 rounded-xl font-bold text-xs inline-flex items-center gap-1.5 border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 transition shadow-2xs dark:border-sky-800 dark:bg-sky-950/60 dark:text-sky-300 dark:hover:bg-sky-900/60"
            >
              <Plus className="h-4 w-4" />
              <span>+ Add Contender ({contenders.length}/4)</span>
            </button>
          )}
        </div>
      </div>

      {/* Responsive Comparison Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs">
          {/* Sticky Table Header */}
          <thead className="sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur shadow-xs">
            <tr className="border-b border-slate-200 bg-slate-100/70 dark:border-slate-800 dark:bg-slate-800/70">
              {/* Corner Specification Label Header (Narrowed to w-32 sm:w-56) */}
              <th className="p-3 sm:p-4 font-bold text-slate-700 w-32 sm:w-56 sticky left-0 top-0 z-30 bg-slate-100/95 backdrop-blur shadow-2xs dark:bg-slate-800/95 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700">
                <div className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Specification
                </div>
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  Hardware Metrics
                </div>
              </th>

              {/* Contender Column Headers */}
              {contenders.map((dev, idx) => (
                <th
                  key={dev.id}
                  className="p-3 sm:p-4 font-bold text-slate-900 min-w-[180px] sm:min-w-[220px] dark:text-white border-r border-slate-100 dark:border-slate-800/60 align-top"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] sm:text-[11px] text-sky-700 font-extrabold uppercase dark:text-sky-400">
                      Contender {String.fromCharCode(65 + idx)}
                    </span>

                    {/* Interactive Remove Button (44px min touch target, disabled if only 2 contenders) */}
                    {contenders.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveContender(idx)}
                        aria-label={`Remove ${dev.name} from comparison`}
                        className="min-h-[44px] min-w-[44px] -mr-2 -mt-2 inline-flex items-center justify-center rounded-full text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="text-sm font-black mt-1 leading-tight truncate">
                    {dev.brand} {dev.name}
                  </div>

                  <div className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-400 mt-0.5">
                    ${dev.currentStreetUsd} • ★ {dev.compositeLivingScore.toFixed(1)}
                  </div>

                  {/* Interactive Swap Button */}
                  <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between gap-1 dark:border-slate-700/60">
                    <button
                      type="button"
                      onClick={() => {
                        setSwapTargetIndex(idx);
                        setPickerSearchQuery("");
                      }}
                      className="min-h-[36px] px-2.5 rounded-lg text-xs font-semibold border border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:text-sky-700 transition inline-flex items-center gap-1 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-sky-500"
                    >
                      <RefreshCw className="h-3 w-3 text-sky-600" />
                      <span>Swap</span>
                    </button>

                    <Link
                      href={`/devices/${dev.slug}`}
                      className="text-[11px] font-semibold text-sky-600 hover:underline inline-flex items-center gap-0.5 dark:text-sky-400"
                    >
                      <span>Specs</span>
                      <ExternalLink className="h-2.5 w-2.5" />
                    </Link>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {specCategories.map((category) => {
              // Filter rows if highlightDiffsOnly is active
              const visibleRows = category.rows.filter((row) => {
                if (!highlightDiffsOnly) return true;
                const values = contenders.map((d) => row.getValue(d));
                return new Set(values).size > 1;
              });

              if (visibleRows.length === 0) return null;

              return (
                <React.Fragment key={category.category}>
                  {/* Category Section Header Row */}
                  <tr className="bg-slate-50/80 dark:bg-slate-800/80">
                    <td
                      colSpan={contenders.length + 1}
                      className="p-3 font-extrabold text-slate-800 uppercase tracking-wide text-[11px] dark:text-slate-200"
                    >
                      <div className="flex items-center gap-2">
                        {category.icon}
                        <span>{category.category}</span>
                      </div>
                    </td>
                  </tr>

                  {/* Spec Rows */}
                  {visibleRows.map((row) => {
                    const values = contenders.map((d) => row.getValue(d));
                    const isDistinct = new Set(values).size > 1;

                    return (
                      <tr
                        key={row.label}
                        className={`transition-colors ${
                          isDistinct
                            ? "bg-amber-50/30 dark:bg-amber-950/15 hover:bg-amber-50/60 dark:hover:bg-amber-950/30"
                            : "hover:bg-slate-50/50 dark:hover:bg-slate-800/40"
                        }`}
                      >
                        {/* Narrowed Specification Column (w-32 sm:w-56) */}
                        <td className="p-3 sm:p-3.5 font-semibold text-slate-600 sticky left-0 bg-white/95 backdrop-blur-xs z-10 border-r border-slate-100 dark:bg-slate-900/95 dark:text-slate-400 dark:border-slate-800 w-32 sm:w-56 align-top">
                          <div className="flex items-center justify-between gap-1">
                            <span className="truncate sm:whitespace-normal">{row.label}</span>
                            {isDistinct && (
                              <span className="shrink-0 h-1.5 w-1.5 rounded-full bg-amber-500" title="Values differ between contenders" />
                            )}
                          </div>
                        </td>

                        {/* Contender Value Cells */}
                        {contenders.map((dev) => {
                          const val = row.getValue(dev);
                          return (
                            <td
                              key={dev.id}
                              className={`p-3 sm:p-3.5 text-slate-800 dark:text-slate-300 border-r border-slate-50 dark:border-slate-800/40 align-top ${
                                isDistinct
                                  ? "font-bold text-slate-900 dark:text-white"
                                  : ""
                              }`}
                            >
                              {val}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Contender Swap / Add Picker Modal */}
      {(swapTargetIndex !== null || isAddModalOpen) && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={
            swapTargetIndex !== null
              ? `Swap Contender ${String.fromCharCode(65 + swapTargetIndex)}`
              : "Add Contender to Comparison"
          }
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in"
        >
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl p-5 space-y-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                  {swapTargetIndex !== null
                    ? `Swap Contender ${String.fromCharCode(65 + swapTargetIndex)}`
                    : "Add Device to Comparison"}
                </span>
                <div className="text-base font-extrabold text-slate-900 dark:text-white">
                  {swapTargetIndex !== null
                    ? `Replace ${contenders[swapTargetIndex]?.name}`
                    : "Select a Phone from Catalog"}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSwapTargetIndex(null);
                  setIsAddModalOpen(false);
                  setPickerSearchQuery("");
                }}
                aria-label="Close device picker"
                className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Search Input in Picker */}
            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={pickerSearchQuery}
                onChange={(e) => setPickerSearchQuery(e.target.value)}
                placeholder="Search smartphone by name, brand, or chipset..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:bg-white focus:outline-none transition dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-900"
                autoFocus
              />
            </div>

            {/* Device List */}
            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {filteredPickerDevices.map((dev) => (
                <button
                  key={dev.id}
                  type="button"
                  onClick={() => {
                    if (swapTargetIndex !== null) {
                      handleSelectReplacement(dev);
                    } else {
                      handleAddContender(dev);
                    }
                  }}
                  className="w-full text-left p-3 rounded-xl border border-slate-100 bg-slate-50/60 hover:border-sky-300 hover:bg-sky-50/50 transition flex items-center justify-between group dark:border-slate-800 dark:bg-slate-800/60 dark:hover:border-sky-700 dark:hover:bg-slate-800"
                >
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase dark:text-slate-400">
                      {dev.brand}
                    </span>
                    <div className="text-xs font-bold text-slate-900 group-hover:text-sky-700 transition dark:text-white dark:group-hover:text-sky-300">
                      {dev.name}
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                      ${dev.currentStreetUsd} • {dev.specs.socName}
                    </span>
                  </div>

                  <span className="min-h-[36px] px-2.5 rounded-lg text-xs font-bold bg-white border border-slate-200 text-sky-700 group-hover:bg-sky-600 group-hover:text-white transition inline-flex items-center gap-1 dark:bg-slate-900 dark:border-slate-700 dark:text-sky-400 dark:group-hover:bg-sky-500 dark:group-hover:text-white">
                    <span>Select</span>
                    <ChevronRight className="h-3 w-3" />
                  </span>
                </button>
              ))}

              {filteredPickerDevices.length === 0 && (
                <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
                  No devices matching &quot;{pickerSearchQuery}&quot; found in catalog.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
