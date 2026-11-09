import React from "react";
import { SmartphoneDevice } from "@/lib/seed-data";
import {
  getDeviceLabTelemetry,
  formatHoursDuration,
  formatCavityArchitecture,
  formatLoudnessClass,
  MANDATORY_LEGAL_DISCLAIMERS,
  DeviceLabTelemetry,
} from "@/lib/lab-measurements";
import {
  Activity,
  Battery,
  Volume2,
  ShieldCheck,
  Globe,
  Film,
  Gamepad2,
  Cpu,
  Layers,
  Info,
} from "lucide-react";

export interface DeviceLabTelemetryCardProps {
  device: SmartphoneDevice;
  telemetry?: DeviceLabTelemetry;
  variant?: "full" | "bento";
  className?: string;
}

export function DeviceLabTelemetryCard({
  device,
  telemetry: externalTelemetry,
  variant = "full",
  className = "",
}: DeviceLabTelemetryCardProps) {
  const telemetry = externalTelemetry ?? getDeviceLabTelemetry(device);
  const { battery, acoustics, provenance } = telemetry;

  const isPhysicalLab = provenance.provenance === "VERIFIED_PHYSICAL_LAB";
  const isBento = variant === "bento";

  return (
    <section
      aria-label="PhoneIndex OpenLab Telemetry and Standardized Measurements"
      className={`rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 ${
        isBento ? "p-4 sm:p-5" : "p-5 sm:p-6"
      } shadow-xs space-y-5 ${className}`}
    >
      {/* 1. Header Bar: Title, Protocol & Provenance Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800">
              <Activity className="h-4 w-4" />
            </span>
            <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-100">
              PhoneIndex OpenLab™ Telemetry &amp; Standardized Measurements
            </h2>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Standardized real-world battery endurance simulations and acoustic loudness profiling.
          </p>
        </div>

        {/* Provenance Badge */}
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold font-mono ${
              isPhysicalLab
                ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
                : "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800"
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>
              {isPhysicalLab ? "Verified Physical Lab" : "Parametric Lab Model"} (±{provenance.marginOfErrorPct}%)
            </span>
          </span>

          <span className="rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-1 text-[11px] font-mono text-slate-600 dark:text-slate-300">
            {provenance.protocolVersion}
          </span>
        </div>
      </div>

      {/* 2. Top Key Metric Highlights (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Metric 1: Blended Active Use Score */}
        <div className="rounded-xl border border-emerald-200/80 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/30 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wide">
              <span>Active Use Score</span>
              <Battery className="h-4 w-4" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-emerald-700 dark:text-emerald-300">
                {battery.activeUseScoreHours.toFixed(1)}
              </span>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                hours
              </span>
            </div>
            <div className="mt-1 font-mono text-xs font-semibold text-emerald-900 dark:text-emerald-200">
              {formatHoursDuration(battery.activeUseScoreHours)} runtime
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-emerald-200/60 dark:border-emerald-900/40 text-[11px] text-emerald-800/80 dark:text-emerald-300/80">
            40% Web • 35% Video • 25% 3D Gaming
          </div>
        </div>

        {/* Metric 2: Speaker Loudness (LUFS) */}
        <div className="rounded-xl border border-indigo-200/80 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/30 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-indigo-800 dark:text-indigo-300 uppercase tracking-wide">
              <span>Speaker Loudness</span>
              <Volume2 className="h-4 w-4" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-indigo-700 dark:text-indigo-300">
                {acoustics.lufs}
              </span>
              <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                LUFS
              </span>
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="rounded bg-indigo-100 dark:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 px-1.5 py-0.5 text-[11px] font-bold text-indigo-800 dark:text-indigo-300 uppercase">
                {acoustics.loudnessClass.replace("_", " ")}
              </span>
              <span className="text-[11px] text-slate-600 dark:text-slate-400">
                {formatLoudnessClass(acoustics.loudnessClass).split("(")[1]?.replace(")", "") || ""}
              </span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-indigo-200/60 dark:border-indigo-900/40 text-[11px] text-indigo-800/80 dark:text-indigo-300/80 truncate">
            {formatCavityArchitecture(acoustics.cavityArchitecture)}
          </div>
        </div>

        {/* Metric 3: Battery Energy & SoC Efficiency */}
        <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
              <span>Total Battery Energy</span>
              <Cpu className="h-4 w-4 text-sky-600 dark:text-sky-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-slate-900 dark:text-slate-100">
                {(battery.powerMetrics.energyTotalMwh / 1000).toFixed(1)}
              </span>
              <span className="text-sm font-bold text-slate-600 dark:text-slate-400">
                Watt-hours
              </span>
            </div>
            <div className="mt-1 font-mono text-xs text-slate-600 dark:text-slate-400">
              {battery.powerMetrics.batteryCapacityMah} mAh @ 3.85V
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-400">
            Node: {battery.powerMetrics.socNodeKey} (factor {battery.powerMetrics.socEfficiencyFactor})
          </div>
        </div>

        {/* Metric 4: Acoustic Cavity & THD */}
        <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
              <span>Chassis Cavity Volume</span>
              <Layers className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-slate-900 dark:text-slate-100">
                {acoustics.chassisVolumeCm3.toFixed(1)}
              </span>
              <span className="text-sm font-bold text-slate-600 dark:text-slate-400">
                cm³
              </span>
            </div>
            <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              THD: <strong className="text-slate-800 dark:text-slate-200">{acoustics.metrics.thdPct}%</strong> • Bass: <strong className="text-slate-800 dark:text-slate-200">{acoustics.metrics.bassRollOffHz}Hz</strong>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-400">
            Soundstage: {acoustics.metrics.soundstageWidthPct}% • Treble: {acoustics.metrics.trebleExtensionKhz} kHz
          </div>
        </div>
      </div>

      {/* 3. Detailed Battery Workload Endurance Breakdown Bars */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/60 p-4 space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Workload Runtime Simulation Breakdown (24-Hour Benchmark Scale)
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
            Display: {battery.powerMetrics.displayAreaInch2} in² • {battery.powerMetrics.displayPanelCoeff} mW/in²
          </span>
        </div>

        <div className="space-y-3 pt-1">
          {/* Workload 1: Web Browsing */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                <Globe className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                <span>Web Browsing &amp; Scrolling</span>
                <span className="font-normal text-[11px] text-slate-500 dark:text-slate-400">
                  (Interactive CPU bursts + variable refresh)
                </span>
              </div>
              <div className="font-mono font-bold text-slate-900 dark:text-white">
                {battery.webBrowsingHours.toFixed(1)} hrs ({formatHoursDuration(battery.webBrowsingHours)})
              </div>
            </div>
            <div className="h-2.5 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-sky-500 dark:bg-sky-400 transition-all duration-500"
                style={{ width: `${Math.min(100, (battery.webBrowsingHours / 24) * 100)}%` }}
              />
            </div>
          </div>

          {/* Workload 2: Video Playback */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                <Film className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Continuous Video Playback</span>
                <span className="font-normal text-[11px] text-slate-500 dark:text-slate-400">
                  (Dedicated hardware decoding offload @ 420mW)
                </span>
              </div>
              <div className="font-mono font-bold text-slate-900 dark:text-white">
                {battery.videoPlaybackHours.toFixed(1)} hrs ({formatHoursDuration(battery.videoPlaybackHours)})
              </div>
            </div>
            <div className="h-2.5 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 dark:bg-emerald-400 transition-all duration-500"
                style={{ width: `${Math.min(100, (battery.videoPlaybackHours / 24) * 100)}%` }}
              />
            </div>
          </div>

          {/* Workload 3: 3D Gaming */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                <Gamepad2 className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                <span>3D Gaming Runtime</span>
                <span className="font-normal text-[11px] text-slate-500 dark:text-slate-400">
                  (Sustained GPU load @ 2600mW + max display refresh)
                </span>
              </div>
              <div className="font-mono font-bold text-slate-900 dark:text-white">
                {battery.gaming3dHours.toFixed(1)} hrs ({formatHoursDuration(battery.gaming3dHours)})
              </div>
            </div>
            <div className="h-2.5 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-amber-500 dark:bg-amber-400 transition-all duration-500"
                style={{ width: `${Math.min(100, (battery.gaming3dHours / 24) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 4. Mandatory Legal Independence & Attribution Disclaimers */}
      <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3.5 text-xs text-slate-600 dark:text-slate-400 space-y-1.5">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p>
              <strong className="text-slate-800 dark:text-slate-200">Independence Assurance:</strong>{" "}
              {MANDATORY_LEGAL_DISCLAIMERS.INDEPENDENCE}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {MANDATORY_LEGAL_DISCLAIMERS.ATTRIBUTION_INTEGRITY}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
