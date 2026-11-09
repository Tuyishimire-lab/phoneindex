"use client";

import React, { useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FULL_UNIFIED_CATALOG } from "@/lib/brands/catalog-loader";
import { SmartphoneDevice } from "@/lib/seed-data";
import {
  Sparkles,
  ChevronRight,
  ArrowLeftRight,
  X,
  ArrowRight,
} from "lucide-react";

const FEATURED_BATTLES = [
  {
    title: "Flagship Heavyweights",
    slugs: "samsung-galaxy-s25-ultra-vs-apple-iphone-16-pro-max",
    badge: "Most Popular",
    names: "Galaxy S25 Ultra vs iPhone 16 Pro Max",
  },
  {
    title: "Mobile Photography Titans",
    slugs: "google-pixel-9-pro-xl-vs-vivo-x200-pro",
    badge: "Camera Shootout",
    names: "Pixel 9 Pro XL vs Vivo X200 Pro",
  },
  {
    title: "Flagship Value Disruptors",
    slugs: "oneplus-13-vs-xiaomi-15-pro",
    badge: "Silicon Power",
    names: "OnePlus 13 vs Xiaomi 15 Pro",
  },
  {
    title: "Next-Gen Book Foldables",
    slugs: "samsung-galaxy-z-fold6-vs-google-pixel-9-pro-fold",
    badge: "Foldable Canvas",
    names: "Galaxy Z Fold6 vs Pixel 9 Pro Fold",
  },
];

function CompareLauncherContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialIds = useMemo(() => {
    const devParam = searchParams.get("device") || searchParams.get("base");
    if (devParam) {
      const match = FULL_UNIFIED_CATALOG.find(
        (d) => d.slug.toLowerCase() === devParam.toLowerCase() || d.id.toLowerCase() === devParam.toLowerCase()
      );
      if (match) {
        const rival = FULL_UNIFIED_CATALOG.find(
          (d) => d.id !== match.id && (d.brand !== match.brand || d.category === match.category)
        ) || FULL_UNIFIED_CATALOG.find((d) => d.id !== match.id);
        return rival ? [match.id, rival.id] : [match.id];
      }
    }
    return ["dev-s25-ultra", "dev-iphone-16-pro-max"];
  }, [searchParams]);

  const [selectedIds, setSelectedIds] = useState<string[]>(initialIds);

  const contenders = useMemo(() => {
    return selectedIds
      .map((id) => FULL_UNIFIED_CATALOG.find((d) => d.id === id))
      .filter((d): d is SmartphoneDevice => Boolean(d));
  }, [selectedIds]);

  const handleLaunch = () => {
    if (contenders.length >= 2) {
      const slugStr = contenders.map((d) => d.slug).join("-vs-");
      router.push(`/compare/${slugStr}`);
    }
  };

  const handleRemove = (id: string) => {
    setSelectedIds((prev) => prev.filter((item) => item !== id));
  };

  const handleAdd = (id: string) => {
    if (selectedIds.length < 4 && !selectedIds.includes(id)) {
      setSelectedIds((prev) => [...prev, id]);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/60 pb-20 dark:bg-slate-950">
      {/* Breadcrumbs */}
      <nav
        aria-label="Breadcrumbs"
        className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-20 dark:border-slate-800 dark:bg-slate-900/80"
      >
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-3 text-xs font-semibold text-slate-500 sm:px-6 dark:text-slate-400">
          <Link
            href="/"
            className="hover:text-sky-600 dark:hover:text-sky-400 transition flex items-center gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
            <span>Home</span>
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
          <span className="text-slate-900 font-bold dark:text-white">Compare Studio</span>
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-4 py-10 space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 border border-sky-200 px-3 py-1 text-xs font-bold text-sky-700 dark:bg-sky-950/60 dark:border-sky-800 dark:text-sky-300">
            <ArrowLeftRight className="h-3.5 w-3.5" />
            <span>Comparison Studio</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight dark:text-white sm:text-4xl">
            Compare Up to 4 Smartphones Side-by-Side
          </h1>
          <p className="text-sm text-slate-600 max-w-xl mx-auto dark:text-slate-400">
            Select 2 to 4 contenders from our 939-phone catalog to evaluate hardware specs, AI Living Scores, true-scale dimensions, and lab telemetry.
          </p>
        </div>

        {/* Contender Selection Slots (2 to 4) */}
        <section
          aria-label="Contender Selector"
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-6 dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {contenders.map((dev, idx) => (
              <div
                key={dev.id}
                className="relative rounded-xl border border-slate-200 bg-slate-50/70 p-4 flex flex-col justify-between dark:border-slate-700 dark:bg-slate-800/70"
              >
                <button
                  type="button"
                  onClick={() => handleRemove(dev.id)}
                  aria-label={`Remove ${dev.name}`}
                  className="absolute top-2 right-2 rounded-full p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition dark:hover:bg-slate-700 dark:hover:text-slate-200"
                >
                  <X className="h-4 w-4" />
                </button>
                <div>
                  <span className="font-mono text-[11px] font-bold text-sky-600 dark:text-sky-400">
                    Contender {String.fromCharCode(65 + idx)}
                  </span>
                  <div className="font-bold text-slate-900 text-sm mt-1 dark:text-white">
                    {dev.brand} {dev.name}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 dark:text-slate-400">
                    ${dev.currentStreetUsd} • Score {dev.compositeLivingScore.toFixed(1)}
                  </div>
                </div>
              </div>
            ))}

            {Array.from({ length: Math.max(0, 4 - contenders.length) }).map((_, idx) => (
              <div
                key={`empty-${idx}`}
                className="rounded-xl border border-dashed border-slate-300 bg-slate-50/40 p-4 flex flex-col items-center justify-center text-center gap-2 dark:border-slate-700 dark:bg-slate-800/30"
              >
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                  + Add Contender {String.fromCharCode(65 + contenders.length + idx)}
                </span>
                <select
                  aria-label={`Add Contender ${String.fromCharCode(65 + contenders.length + idx)}`}
                  onChange={(e) => {
                    if (e.target.value) handleAdd(e.target.value);
                  }}
                  defaultValue=""
                  className="w-full text-xs font-medium rounded-lg border border-slate-300 bg-white px-2 py-1.5 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  <option value="" disabled>
                    Choose device...
                  </option>
                  {FULL_UNIFIED_CATALOG.filter((d) => !selectedIds.includes(d.id))
                    .slice(0, 50)
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.brand} {d.name} (${d.currentStreetUsd})
                      </option>
                    ))}
                </select>
              </div>
            ))}
          </div>

          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={handleLaunch}
              disabled={contenders.length < 2}
              className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-6 py-3 text-sm font-bold text-white shadow-xs hover:bg-sky-700 disabled:opacity-40 disabled:cursor-not-allowed transition dark:bg-sky-500 dark:hover:bg-sky-600"
            >
              <ArrowLeftRight className="h-4 w-4" />
              <span>Launch {contenders.length}-Way Comparison Matrix</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>

        {/* Featured Battles Section */}
        <section aria-label="Featured Battles" className="space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Curated Flagship Matchups
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {FEATURED_BATTLES.map((battle) => (
              <Link
                key={battle.slugs}
                href={`/compare/${battle.slugs}`}
                className="group rounded-xl border border-slate-200 bg-white p-4 shadow-2xs hover:border-sky-300 hover:shadow-xs transition flex items-center justify-between dark:border-slate-800 dark:bg-slate-900 dark:hover:border-sky-700"
              >
                <div>
                  <span className="inline-block rounded-md bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-700 uppercase dark:bg-sky-950/60 dark:text-sky-300">
                    {battle.badge}
                  </span>
                  <div className="font-bold text-slate-900 text-sm mt-1.5 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 transition">
                    {battle.names}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {battle.title}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-sky-600 transition shrink-0" />
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default function CompareHubPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50/60 dark:bg-slate-950">
          <div className="text-sm font-bold text-slate-500">Loading Compare Studio...</div>
        </div>
      }
    >
      <CompareLauncherContent />
    </Suspense>
  );
}
