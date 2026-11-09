import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FULL_UNIFIED_CATALOG } from "@/lib/brands/catalog-loader";
import { SmartphoneDevice } from "@/lib/seed-data";
import { PhoneSizeComparator } from "@/components/PhoneSizeComparator";
import { CompareMatrixTable } from "@/components/CompareMatrixTable";
import {
  Sparkles,
  ChevronRight,
  ArrowLeftRight,
  Scale,
  AlertCircle,
  ExternalLink,
  Award,
} from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slugs: string }>;
}

/**
 * Parses comparison slug parameter supporting 2, 3, or 4 slugs separated by:
 * - `-vs-` (e.g. `galaxy-s24-vs-iphone-15-pro`)
 * - `,` (e.g. `slug1,slug2,slug3`)
 * - `_vs_` or `vs` (e.g. `slug1-vs-slug2`)
 */
export function parseComparisonSlugs(rawSlugs: string): string[] {
  if (!rawSlugs) return [];
  const decoded = decodeURIComponent(rawSlugs).trim();

  let tokens: string[] = [];
  if (decoded.includes(",")) {
    tokens = decoded.split(",");
  } else if (decoded.includes("-vs-")) {
    tokens = decoded.split("-vs-");
  } else if (decoded.includes("_vs_")) {
    tokens = decoded.split("_vs_");
  } else if (/\bvs\b/i.test(decoded)) {
    tokens = decoded.split(/\s*vs\s*/i);
  } else {
    tokens = [decoded];
  }

  return tokens
    .map((s) => s.trim().toLowerCase().replace(/^-+|-+$/g, ""))
    .filter((s) => s.length > 0);
}

/**
 * Matches a slug or device id to a catalog device.
 */
function resolveCatalogDevice(slugOrId: string): SmartphoneDevice | undefined {
  const target = slugOrId.toLowerCase().trim();
  if (!target) return undefined;

  // 1. Direct exact slug match
  const exactSlug = FULL_UNIFIED_CATALOG.find(
    (d) => d.slug.toLowerCase() === target
  );
  if (exactSlug) return exactSlug;

  // 2. Direct exact ID match
  const exactId = FULL_UNIFIED_CATALOG.find(
    (d) => d.id.toLowerCase() === target
  );
  if (exactId) return exactId;

  // 3. Fallback: match without brand prefix (e.g. `galaxy-s25-ultra` matches `samsung-galaxy-s25-ultra`)
  return FULL_UNIFIED_CATALOG.find((d) => {
    const slugWithoutBrand = d.slug.toLowerCase().replace(/^[a-z0-9]+-/, "");
    return (
      slugWithoutBrand === target ||
      d.slug.toLowerCase().endsWith(`-${target}`) ||
      d.slug.toLowerCase().includes(target)
    );
  });
}

/**
 * Dynamic SEO & OpenGraph Metadata
 */
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slugs: rawSlugs } = await params;
  const parsedSlugs = parseComparisonSlugs(rawSlugs);
  const resolvedDevices: SmartphoneDevice[] = [];
  const seenIds = new Set<string>();

  for (const s of parsedSlugs) {
    const dev = resolveCatalogDevice(s);
    if (dev && !seenIds.has(dev.id)) {
      seenIds.add(dev.id);
      resolvedDevices.push(dev);
    }
  }

  if (resolvedDevices.length < 2) {
    return {
      title: "Smartphone Comparison | PhoneIndex",
      description:
        "Side-by-side smartphone specification comparison matrix and physical size comparator.",
    };
  }

  const deviceNames = resolvedDevices
    .map((d) => `${d.brand} ${d.name}`)
    .join(" vs ");
  const title = `${deviceNames} - Side-by-Side Spec Comparison | PhoneIndex`;
  const description = `Compare ${deviceNames} specs side by side: cameras, battery capacity, display benchmarks, Living Scores, and true-scale dimensions.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      url: `https://phoneindex.com/compare/${rawSlugs}`,
      siteName: "PhoneIndex",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function ComparePage({ params }: PageProps) {
  const { slugs: rawSlugs } = await params;
  const parsedSlugs = parseComparisonSlugs(rawSlugs);

  // If no slugs parsed at all, 404
  if (parsedSlugs.length === 0) {
    notFound();
  }

  // Resolve devices and deduplicate
  const resolvedDevices: SmartphoneDevice[] = [];
  const seenIds = new Set<string>();

  for (const s of parsedSlugs) {
    const dev = resolveCatalogDevice(s);
    if (dev && !seenIds.has(dev.id)) {
      seenIds.add(dev.id);
      resolvedDevices.push(dev);
    }
  }

  // Cap comparison at 4 contenders
  const contenders = resolvedDevices.slice(0, 4);

  // If fewer than 2 valid devices matched, render a friendly error state
  if (contenders.length < 2) {
    const suggestedPairs = [
      {
        slug: "samsung-galaxy-s25-ultra-vs-apple-iphone-16-pro-max",
        title: "Samsung Galaxy S25 Ultra vs Apple iPhone 16 Pro Max",
      },
      {
        slug: "google-pixel-9-pro-xl-vs-vivo-x200-pro",
        title: "Google Pixel 9 Pro XL vs Vivo X200 Pro",
      },
      {
        slug: "oneplus-13-vs-nothing-phone-3a-pro",
        title: "OnePlus 13 vs Nothing Phone (3a) Pro",
      },
    ];

    return (
      <div className="min-h-screen bg-slate-50/60 pb-20 dark:bg-slate-950">
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
            <span className="text-slate-900 font-bold dark:text-white">Compare</span>
          </div>
        </nav>

        <main className="mx-auto max-w-3xl px-4 py-12 text-center space-y-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
            <AlertCircle className="h-7 w-7" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
              Comparison Needs At Least 2 Valid Devices
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
              We could only identify{" "}
              <strong>{contenders.length}</strong> matching device from:{" "}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                {rawSlugs}
              </code>
            </p>
          </div>

          {contenders.length === 1 && (
            <div className="rounded-xl border border-sky-100 bg-sky-50/60 p-4 text-left max-w-md mx-auto dark:border-sky-900/60 dark:bg-sky-950/40">
              <span className="text-xs font-bold text-sky-700 uppercase dark:text-sky-300">
                Matched 1 Device:
              </span>
              <div className="mt-1 font-bold text-slate-900 dark:text-white">
                {contenders[0].brand} {contenders[0].name}
              </div>
              <div className="mt-2">
                <Link
                  href={`/devices/${contenders[0].slug}`}
                  className="text-xs font-semibold text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 flex items-center gap-1"
                >
                  <span>View Single Device Specs</span>
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs text-left max-w-md mx-auto space-y-3 dark:border-slate-800 dark:bg-slate-900">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wide block dark:text-slate-300">
              Suggested Flagship Comparisons:
            </span>
            <div className="space-y-2">
              {suggestedPairs.map((pair) => (
                <Link
                  key={pair.slug}
                  href={`/compare/${pair.slug}`}
                  className="block rounded-lg border border-slate-100 bg-slate-50/60 p-2.5 text-xs font-semibold text-slate-800 hover:border-sky-300 hover:bg-sky-50/50 hover:text-sky-700 transition dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:border-sky-700 dark:hover:bg-slate-800 dark:hover:text-sky-300"
                >
                  {pair.title}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-sky-700 transition shadow-2xs dark:bg-sky-500 dark:hover:bg-sky-600"
            >
              <ArrowLeftRight className="h-4 w-4" />
              <span>Browse Catalog & Pick Contenders</span>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // Calculate editorial winners for bento highlights
  const editors = [
    {
      id: "SILICON_GEEK" as const,
      title: "Silicon Geek",
      description: "Raw Chipset & Compute Power",
    },
    {
      id: "CAMERA_PURIST" as const,
      title: "Camera Purist",
      description: "Optics, Sensor Size & Zoom",
    },
    {
      id: "PRAGMATIST" as const,
      title: "Pragmatist",
      description: "Price-to-Longevity Value",
    },
    {
      id: "DAILY_DRIVER" as const,
      title: "Daily Driver",
      description: "Ergonomics, Battery & Display",
    },
  ];

  // Helper to find the winning device for an editor persona
  function getPersonaWinner(
    personaKey: "SILICON_GEEK" | "CAMERA_PURIST" | "PRAGMATIST" | "DAILY_DRIVER"
  ): { winner: SmartphoneDevice; score: number; isTie: boolean } {
    let topScore = -1;
    let topDev = contenders[0];
    let isTie = false;

    for (const d of contenders) {
      const s = d.verdicts[personaKey].score;
      if (s > topScore) {
        topScore = s;
        topDev = d;
        isTie = false;
      } else if (s === topScore) {
        isTie = true;
      }
    }

    return { winner: topDev, score: topScore, isTie };
  }



  return (
    <div className="min-h-screen bg-slate-50/60 pb-20 dark:bg-slate-950">
      {/* Breadcrumbs Navigation */}
      <nav
        aria-label="Breadcrumbs"
        className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-30 dark:border-slate-800 dark:bg-slate-900/80"
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
          <span className="text-slate-500 dark:text-slate-400">Compare Matrix</span>
          <ChevronRight className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
          <span className="text-slate-900 font-bold truncate dark:text-white">
            {contenders.map((d) => `${d.brand} ${d.name}`).join(" vs ")}
          </span>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-6">
        {/* Contender Showcase Header Cards */}
        <section className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2.5 dark:text-white">
                <ArrowLeftRight className="h-6 w-6 text-sky-600" />
                <span>Smart Spec Diff & Contender Comparison</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                Comparing {contenders.length} smartphones side-by-side across engineering telemetry and dynamic Living Scores.
              </p>
            </div>
            <Link
              href="/"
              className="text-xs font-bold text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 transition flex items-center gap-1 self-start sm:self-auto"
            >
              <span>Explore All Catalog Devices</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Side-by-Side Contender Summary Cards */}
          <div
            className={`grid gap-4 ${
              contenders.length === 2
                ? "grid-cols-1 sm:grid-cols-2"
                : contenders.length === 3
                ? "grid-cols-1 sm:grid-cols-3"
                : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
            }`}
          >
            {contenders.map((dev, idx) => (
              <div
                key={dev.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="rounded bg-sky-50 px-2 py-0.5 text-xs font-bold text-sky-700 uppercase dark:bg-sky-950/60 dark:text-sky-300">
                      Contender {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                      {dev.buyRecommendation}
                    </span>
                  </div>

                  <div>
                    <span className="text-xs text-slate-600 uppercase font-bold tracking-wide dark:text-slate-400">
                      {dev.brand}
                    </span>
                    <h2 className="text-lg font-black text-slate-900 leading-tight dark:text-white">
                      {dev.name}
                    </h2>
                  </div>

                  {/* Living Score Badge */}
                  <div className="flex items-baseline gap-2 pt-1">
                    <span className="text-3xl font-black text-sky-700 dark:text-sky-400">
                      {dev.compositeLivingScore.toFixed(1)}
                    </span>
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                      / 10 Living Score
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-extrabold text-slate-900 dark:text-white">
                      ${dev.currentStreetUsd}
                    </span>
                    <span className="text-xs text-slate-600 dark:text-slate-400">Street Price</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between dark:border-slate-800">
                  <span className="text-xs text-slate-600 dark:text-slate-400">
                    {dev.specs.displaySizeInch}&quot; • {dev.specs.batteryCapacityMah} mAh
                  </span>
                  <Link
                    href={`/devices/${dev.slug}`}
                    className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1 transition dark:text-sky-400 dark:hover:text-sky-300"
                  >
                    <span>Full Specs</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* True-Scale Physical CAD Size & Silhouette Comparator */}
        <section aria-label="Physical Phone Size Comparator" className="overflow-x-auto pb-2">
          <PhoneSizeComparator devices={contenders} />
        </section>

        {/* Quick Ergonomics Data Comparison */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-100 pb-3 dark:border-slate-800">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 dark:text-white">
              <Scale className="h-5 w-5 text-sky-600" />
              <span>Chassis Dimensions &amp; Ergonomics</span>
            </h2>
          </div>

          <div
            className={`grid gap-3 ${
              contenders.length === 2
                ? "grid-cols-1 sm:grid-cols-2"
                : contenders.length === 3
                ? "grid-cols-1 sm:grid-cols-3"
                : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
            }`}
          >
            {contenders.map((dev) => (
              <div
                key={dev.id}
                className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-1.5 text-xs dark:border-slate-800 dark:bg-slate-800/60"
              >
                <div className="font-bold text-slate-900 truncate dark:text-white">
                  {dev.brand} {dev.name}
                </div>
                <div className="text-slate-600 flex justify-between dark:text-slate-400">
                  <span>Frame Material:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {dev.specs.frameMaterial}
                  </span>
                </div>
                <div className="text-slate-600 flex justify-between dark:text-slate-400">
                  <span>Water Ingress:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {dev.specs.ipRating}
                  </span>
                </div>
                <div className="text-slate-600 flex justify-between dark:text-slate-400">
                  <span>Biometrics:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {dev.specs.fingerprintType}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* AI Editorial Verdicts & Category Winners */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-100 pb-3 dark:border-slate-800">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 dark:text-white">
              <Award className="h-5 w-5 text-amber-500" />
              <span>Editorial Persona Breakdown & Winners</span>
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Each editorial perspective scores contenders objectively against real hardware capabilities.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {editors.map((ed) => {
              const { winner, score, isTie } = getPersonaWinner(ed.id);

              return (
                <div
                  key={ed.id}
                  className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3 dark:border-slate-800 dark:bg-slate-800/60"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wide text-sky-700 dark:text-sky-400">
                      {ed.title}
                    </span>
                    <span className="rounded bg-white border border-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-700 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300">
                      {isTie ? "Tie" : `Winner: ${winner.name}`}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 dark:text-slate-400">{ed.description}</p>

                  <div className="space-y-1.5 pt-2 border-t border-slate-200/80 font-mono text-xs dark:border-slate-700">
                    {contenders.map((dev) => {
                      const s = dev.verdicts[ed.id].score;
                      const isTop = s === score;

                      return (
                        <div
                          key={dev.id}
                          className={`flex items-center justify-between rounded px-2 py-1 ${
                            isTop
                              ? "bg-sky-100/70 text-sky-900 font-bold dark:bg-sky-950/70 dark:text-sky-300"
                              : "text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          <span className="truncate pr-2">{dev.name}</span>
                          <span>{s.toFixed(1)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Side-by-Side Comprehensive Spec Diff Matrix */}
        <CompareMatrixTable
          initialContenders={contenders}
          allCatalogDevices={FULL_UNIFIED_CATALOG}
        />

        {/* Back to Home CTA */}
        <div className="pt-4 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:border-sky-300 hover:text-sky-700 transition shadow-2xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-sky-500 dark:hover:text-sky-300"
          >
            <Sparkles className="h-4 w-4 text-sky-600" />
            <span>Return to PhoneIndex Catalog</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
