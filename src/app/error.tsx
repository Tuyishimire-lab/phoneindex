"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, RotateCcw, RefreshCw } from "lucide-react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Root Client Error Boundary for PhoneIndex (Next.js 16 App Router).
 * Traps unhandled rendering exceptions, logs diagnostic details,
 * and provides recovery mechanisms without crashing the client SPA.
 */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  const router = useRouter();

  useEffect(() => {
    // Log unexpected client exceptions for observability
    console.error("Unhandled PhoneIndex application error:", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] w-full flex items-center justify-center p-4 sm:p-6 bg-slate-50/50 dark:bg-slate-950">
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        aria-labelledby="error-heading"
        className="w-full max-w-lg rounded-2xl border border-rose-200/90 bg-white/95 p-6 sm:p-8 shadow-xl shadow-rose-950/5 backdrop-blur-md text-center transition-all animate-in fade-in zoom-in-95 duration-200 dark:border-rose-900/60 dark:bg-slate-900/95 dark:shadow-rose-950/20"
      >
        {/* Warning Icon Badge */}
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 shadow-2xs dark:bg-rose-950/50 dark:border-rose-900/60 dark:text-rose-400">
          <AlertTriangle className="h-7 w-7" aria-hidden="true" />
        </div>

        {/* Heading */}
        <h2
          id="error-heading"
          className="text-xl font-bold tracking-tight text-slate-900 dark:text-white"
        >
          Application Rendering Exception
        </h2>

        {/* User-facing error message */}
        <p className="mt-2 text-xs leading-relaxed text-slate-600 sm:text-sm dark:text-slate-300">
          {error.message ||
            "An unexpected error occurred while rendering the smartphone telemetry interface. Your preferences and saved selections remain safe."}
        </p>

        {/* Optional Error Digest for Debugging / Telemetry */}
        {error.digest && (
          <div className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-mono text-slate-600 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400">
            <span className="font-semibold text-slate-400 dark:text-slate-500">Digest:</span>
            <span className="select-all text-slate-800 font-medium dark:text-slate-200">
              {error.digest}
            </span>
          </div>
        )}

        {/* Recovery Action Bar */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-sky-700 active:bg-sky-800 focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 transition dark:bg-sky-500 dark:hover:bg-sky-600"
            aria-label="Reset workspace and re-render current view"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            <span>Reset Workspace</span>
          </button>

          <button
            type="button"
            onClick={() => {
              router.push("/");
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 active:bg-slate-100 focus:outline-hidden focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 transition dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:border-slate-700"
            aria-label="Reload entire PhoneIndex catalog"
          >
            <RefreshCw className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" aria-hidden="true" />
            <span>Reload Catalog</span>
          </button>
        </div>

        {/* Subtle Help Text */}
        <p className="mt-5 text-[11px] text-slate-400 dark:text-slate-500">
          If this issue persists across reloads, clearing your browser storage or selecting a standard catalog device will restore default telemetry.
        </p>
      </div>
    </div>
  );
}
