"use client";

import React, { useState } from "react";
import { SmartphoneDevice } from "@/lib/seed-data";
import {
  ArrowLeftRight,
  ArrowRight,
  Smartphone,
  Trash2,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export interface ComparisonDockProps {
  devices: SmartphoneDevice[];
  stagedDeviceIds: string[];
  maxContenders?: number;
  onRemoveDevice: (deviceId: string) => void;
  onClearAll: () => void;
  onLaunchCompare: () => void;
  defaultCollapsed?: boolean;
}

export const COMPARISON_DOCK_BOTTOM_PADDING = "pb-40";

export function ComparisonDock({
  devices,
  stagedDeviceIds,
  maxContenders = 4,
  onRemoveDevice,
  onClearAll,
  onLaunchCompare,
  defaultCollapsed = false,
}: ComparisonDockProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const stagedDevices = stagedDeviceIds
    .map((id) => devices.find((d) => d.id === id))
    .filter((d): d is SmartphoneDevice => d !== undefined);

  if (stagedDevices.length === 0) return null;

  const emptySlotsCount = Math.max(0, maxContenders - stagedDevices.length);

  return (
    <>
      {/* Bottom clearance anchor hint to prevent occlusion of page elements */}
      <div
        className="pointer-events-none pb-40 sr-only"
        aria-hidden="true"
        data-dock-clearance="pb-40"
      />

      <aside
        aria-label="Comparison Staging Dock"
        className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-4xl rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-md shadow-2xl transition-all duration-300 dark:border-slate-800 dark:bg-slate-900/95 ${
          isCollapsed ? "p-2.5 sm:px-4 sm:py-2.5" : "p-3 sm:px-4 sm:py-3"
        }`}
      >
        {isCollapsed ? (
          /* Minimized / Collapsed Mobile & Desktop View */
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-7 items-center rounded-md bg-sky-50 border border-sky-200 px-2.5 font-mono text-xs font-bold text-sky-700 dark:bg-sky-950/60 dark:border-sky-800 dark:text-sky-300">
                Comparing {stagedDevices.length} of {maxContenders}
              </span>
              <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                {stagedDevices.length < 2
                  ? "Add at least 1 more device"
                  : "Ready to compare"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onLaunchCompare}
                disabled={stagedDevices.length < 2}
                aria-label="Launch comparison studio"
                className="min-h-[44px] px-3.5 rounded-xl font-bold text-xs bg-sky-600 text-white shadow-xs hover:bg-sky-700 disabled:opacity-40 disabled:cursor-not-allowed transition inline-flex items-center gap-1.5 dark:bg-sky-500 dark:hover:bg-sky-600"
              >
                <ArrowLeftRight className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Compare</span>
              </button>

              <button
                type="button"
                onClick={() => setIsCollapsed(false)}
                aria-label="Expand comparison dock"
                className="min-h-[44px] min-w-[44px] px-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold inline-flex items-center justify-center gap-1.5 transition dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <ChevronUp className="h-4 w-4" />
                <span>Expand Dock</span>
              </button>
            </div>
          </div>
        ) : (
          /* Expanded Full View */
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Meta & Count Info */}
            <div className="flex items-center justify-between w-full sm:w-auto gap-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 items-center rounded-md bg-sky-50 border border-sky-200 px-2 font-mono text-xs font-bold text-sky-700 dark:bg-sky-950/60 dark:border-sky-800 dark:text-sky-300">
                  Comparing {stagedDevices.length} of {maxContenders}
                </span>
                <span className="hidden md:inline text-xs text-slate-500 dark:text-slate-400">
                  {stagedDevices.length < 2
                    ? "Add at least 1 more device to compare"
                    : "Ready to compare"}
                </span>
              </div>

              <div className="flex items-center gap-1">
                {/* Mobile Minimize / Collapse Toggle Button with 44px min touch target */}
                <button
                  type="button"
                  onClick={() => setIsCollapsed(true)}
                  aria-label="Minimize comparison dock"
                  className="min-h-[44px] min-w-[44px] px-2.5 inline-flex items-center justify-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 transition dark:text-slate-400 dark:hover:text-slate-200"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                  <span className="text-[11px]">Minimize</span>
                </button>

                {/* Clear All Button with 44px min touch target */}
                <button
                  type="button"
                  onClick={onClearAll}
                  aria-label="Clear all staged devices"
                  className="min-h-[44px] min-w-[44px] px-2.5 inline-flex items-center justify-center gap-1 text-xs font-medium text-slate-500 hover:text-rose-600 transition underline underline-offset-2 dark:text-slate-400 dark:hover:text-rose-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Clear</span>
                </button>
              </div>
            </div>

            {/* Staged Device Pills */}
            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto max-w-full py-1">
              {stagedDevices.map((dev) => (
                <div
                  key={dev.id}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/90 pl-2.5 pr-1 py-1.5 shadow-2xs shrink-0 dark:border-slate-800 dark:bg-slate-800/90"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white border border-slate-200 shrink-0 dark:bg-slate-900 dark:border-slate-700">
                    <Smartphone className="h-3.5 w-3.5 text-sky-600" />
                  </div>
                  <div className="truncate max-w-[110px] sm:max-w-[130px]">
                    <span className="block truncate text-xs font-bold text-slate-900 leading-tight dark:text-white">
                      {dev.name}
                    </span>
                    <span className="block font-mono text-[10px] text-sky-700 font-semibold dark:text-sky-400">
                      Score {dev.compositeLivingScore.toFixed(1)}
                    </span>
                  </div>
                  {/* Remove Device Button with 44px touch target */}
                  <button
                    type="button"
                    onClick={() => onRemoveDevice(dev.id)}
                    aria-label={`Remove ${dev.name} from comparison`}
                    className="min-h-[44px] min-w-[44px] -m-2 inline-flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition dark:hover:bg-slate-700 dark:hover:text-slate-200"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}

              {/* Empty Slot Placeholders */}
              {Array.from({ length: emptySlotsCount }).map((_, idx) => (
                <div
                  key={`empty-slot-${idx}`}
                  className="hidden lg:flex items-center gap-1.5 rounded-xl border border-dashed border-slate-300 bg-slate-50/40 px-3 py-1.5 text-xs text-slate-400 shrink-0 select-none dark:border-slate-700 dark:bg-slate-800/30 dark:text-slate-500"
                >
                  <span className="font-mono text-[10px] font-medium">
                    + Slot {stagedDevices.length + idx + 1}
                  </span>
                </div>
              ))}
            </div>

            {/* Launch Compare Studio CTA with 44px min touch target */}
            <div className="w-full sm:w-auto shrink-0">
              <button
                type="button"
                onClick={onLaunchCompare}
                disabled={stagedDevices.length < 2}
                className="w-full sm:w-auto min-h-[44px] px-5 rounded-xl shrink-0 whitespace-nowrap inline-flex items-center justify-center gap-2 font-bold text-xs sm:text-sm bg-sky-600 text-white shadow-xs hover:bg-sky-700 disabled:opacity-40 disabled:cursor-not-allowed transition dark:bg-sky-500 dark:hover:bg-sky-600"
              >
                <ArrowLeftRight className="h-3.5 w-3.5" />
                <span>Launch Compare Studio</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
