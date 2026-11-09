"use client";

import React, { useState } from "react";
import { Info, ShieldCheck, CheckCircle2, AlertCircle, HelpCircle } from "lucide-react";
import { ResolvedDeviceVisual, VisualFidelityStatus } from "@/lib/visual-profiles/types";

interface VisualFidelityBadgeProps {
  visual: ResolvedDeviceVisual;
}

const BADGE_CONFIG: Record<
  VisualFidelityStatus,
  {
    badgeStyle: string;
    icon: React.ReactNode;
    title: string;
    explanation: string;
  }
> = {
  VERIFIED_ASSET: {
    badgeStyle:
      "bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
    icon: <ShieldCheck className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />,
    title: "Official OEM CAD / Calibrated Asset",
    explanation:
      "Millimeter-accurate chassis dimensions, camera bump protrusion, lens coordinates, and physical button placements verified against manufacturer blueprints or laboratory teardowns.",
  },
  VERIFIED_VECTOR: {
    badgeStyle:
      "bg-sky-50 text-sky-800 border border-sky-300 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800",
    icon: <CheckCircle2 className="h-3 w-3 text-sky-600 dark:text-sky-400 shrink-0" />,
    title: "Calibrated Vector Silhouette",
    explanation:
      "Physical dimensions and camera island geometry calibrated against caliper measurements and certified hardware teardowns.",
  },
  APPROXIMATE: {
    badgeStyle:
      "bg-amber-50 text-amber-900 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
    icon: <AlertCircle className="h-3 w-3 text-amber-600 dark:text-amber-400 shrink-0" />,
    title: "Parametrically Calibrated Vector",
    explanation:
      "Proportional silhouette derived from official manufacturer dimension sheets and sensor specifications. Minor curvature or bezel tolerances may exist.",
  },
  GENERIC_FALLBACK: {
    badgeStyle:
      "bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    icon: <HelpCircle className="h-3 w-3 text-slate-500 dark:text-slate-400 shrink-0" />,
    title: "Heuristic Baseline Outline",
    explanation:
      "Synthesized estimate based on screen diagonal and aspect ratio. Detailed camera bump protrusion is pending laboratory measurement.",
  },
};

export function VisualFidelityBadge({ visual }: VisualFidelityBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const config = BADGE_CONFIG[visual.status] ?? BADGE_CONFIG.GENERIC_FALLBACK;

  return (
    <div className="relative inline-flex items-center group">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        aria-label={`Visual fidelity rating: ${visual.label}. Click or hover for detailed precision information.`}
        className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-bold transition shadow-2xs cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-600 ${config.badgeStyle}`}
      >
        {config.icon}
        <span>{visual.label}</span>
        <Info className="h-3 w-3 opacity-60 group-hover:opacity-100 transition" />
      </button>

      {/* Floating Accessible Tooltip */}
      {isOpen && (
        <div
          role="tooltip"
          className="absolute bottom-full left-0 mb-2 z-50 w-72 sm:w-80 rounded-xl border border-slate-200 bg-white p-3 shadow-xl text-left pointer-events-none dark:border-slate-800 dark:bg-slate-900 dark:shadow-slate-950/60"
        >
          <div className="flex items-center gap-2 border-b border-slate-100 pb-1.5 mb-1.5 dark:border-slate-800">
            {config.icon}
            <span className="text-xs font-extrabold text-slate-900 dark:text-white">
              {config.title}
            </span>
          </div>
          <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            {config.explanation}
          </p>
          {visual.description && visual.description !== config.explanation && (
            <p className="mt-1.5 text-xs text-slate-500 border-t border-slate-100 pt-1 dark:border-slate-800 dark:text-slate-400">
              <strong className="dark:text-slate-300">Source:</strong> {visual.description}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
