import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FULL_UNIFIED_CATALOG } from "@/lib/brands/catalog-loader";
import { FullSpecSheet } from "@/components/FullSpecSheet";
import { DeviceLabTelemetryCard } from "@/components/DeviceLabTelemetryCard";
import { getDeviceLabTelemetry } from "@/lib/lab-measurements";
import {
  ChevronRight,
  Sparkles,
  ArrowLeftRight,
  Cpu,
  Camera,
  Battery,
  Layers,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

interface PageProps {
  params: Promise<{ slug: string }>;
}

/**
 * SSG Static Generation: Pre-renders all catalog devices at build time.
 */
export function generateStaticParams() {
  return FULL_UNIFIED_CATALOG.map((device) => ({
    slug: device.slug,
  }));
}

/**
 * Dynamic SEO & OpenGraph Metadata
 */
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const device = FULL_UNIFIED_CATALOG.find((d) => d.slug === slug);

  if (!device) {
    return {
      title: "Device Not Found | PhoneIndex",
      description: "The requested smartphone could not be found in the catalog.",
    };
  }

  const title = `${device.brand} ${device.name} Specs & Living Score | PhoneIndex`;
  const description = `${device.brand} ${device.name} comprehensive specifications, Living Score (${device.compositeLivingScore}/10), price, camera, and display details. ${device.tagline}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      url: `https://phoneindex.com/devices/${device.slug}`,
      siteName: "PhoneIndex",
      images: [
        {
          url: `https://phoneindex.com/api/og?device=${device.slug}`,
          width: 1200,
          height: 630,
          alt: `${device.brand} ${device.name}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function DeviceDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const device = FULL_UNIFIED_CATALOG.find((d) => d.slug === slug);

  if (!device) {
    notFound();
  }

  // Schema.org Product JSON-LD structured data
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${device.brand} ${device.name}`,
    image: `https://phoneindex.com/images/devices/${device.slug}.png`,
    description: device.tagline,
    brand: {
      "@type": "Brand",
      name: device.brand,
    },
    category: device.category,
    offers: {
      "@type": "Offer",
      price: device.launchMsrpUsd || device.currentStreetUsd,
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: `https://phoneindex.com/devices/${device.slug}`,
    },
  };

  // Find relevant contenders for comparison
  const contenders = FULL_UNIFIED_CATALOG.filter(
    (d) =>
      d.slug !== device.slug &&
      (d.category === device.category ||
        d.brand === device.brand ||
        Math.abs(d.currentStreetUsd - device.currentStreetUsd) < 250)
  ).slice(0, 4);

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 pb-20">
      {/* Product JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />

      {/* Top Breadcrumb Navigation */}
      <nav
        aria-label="Breadcrumbs"
        className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-20"
      >
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 sm:px-6">
          <Link
            href="/"
            className="hover:text-sky-600 dark:hover:text-sky-400 transition flex items-center gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
            <span>Home</span>
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
          <Link
            href={`/?brand=${encodeURIComponent(device.brand)}`}
            className="hover:text-sky-600 dark:hover:text-sky-400 transition"
          >
            {device.brand}
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
          <span className="text-slate-900 dark:text-slate-100 font-bold truncate">
            {device.name}
          </span>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-6">
        {/* Device Hero / Overview Header */}
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 px-2.5 py-1 text-xs font-bold text-sky-700 dark:text-sky-300 uppercase tracking-wide">
                  {device.brand}
                </span>
                <span className="rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {device.category}
                </span>
                <span className="rounded-md bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  {device.buyRecommendation}
                </span>
                <span className="text-xs text-slate-600 dark:text-slate-400">
                  Released: {device.releaseDate}
                </span>
              </div>

              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                  {device.brand} {device.name}
                </h1>
                <p className="mt-1 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                  {device.tagline}
                </p>
              </div>

              {/* Price Badges */}
              <div className="flex flex-wrap items-baseline gap-4 pt-1">
                <div>
                  <span className="text-xs text-slate-600 dark:text-slate-400 uppercase font-semibold block">
                    Street Price
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-slate-900 dark:text-slate-100">
                      ${device.currentStreetUsd}
                    </span>
                  </div>
                </div>
                {device.launchMsrpUsd && device.launchMsrpUsd !== device.currentStreetUsd && (
                  <div>
                    <span className="text-xs text-slate-600 dark:text-slate-400 uppercase font-semibold block">
                      Launch MSRP
                    </span>
                    <span className="text-sm font-bold text-slate-600 dark:text-slate-400 line-through">
                      ${device.launchMsrpUsd}
                    </span>
                  </div>
                )}
                <div>
                  <span className="text-xs text-slate-600 dark:text-slate-400 uppercase font-semibold block">
                    OS Support
                  </span>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                    {device.osSupportYears} Years Guaranteed
                  </span>
                </div>
              </div>
            </div>

            {/* Living Score Bento Card */}
            <div className="shrink-0 rounded-2xl border border-sky-100 dark:border-sky-900/50 bg-gradient-to-br from-sky-50/60 to-indigo-50/40 dark:from-sky-950/40 dark:to-indigo-950/40 p-5 text-center min-w-[220px]">
              <span className="text-xs font-extrabold uppercase tracking-wider text-sky-700 dark:text-sky-300">
                PhoneIndex Living Score
              </span>
              <div className="mt-2 text-5xl font-black tracking-tight text-sky-700 dark:text-sky-300">
                {device.compositeLivingScore.toFixed(1)}
                <span className="text-xl font-bold text-sky-400 dark:text-sky-500">/10</span>
              </div>
              <p className="mt-1 text-xs font-bold text-slate-600 dark:text-slate-400">
                Calibrated against {FULL_UNIFIED_CATALOG.length} smartphones
              </p>

              {/* Persona Breakdown */}
              <div className="mt-4 grid grid-cols-2 gap-1.5 text-left text-xs font-medium">
                <div className="rounded bg-white/80 dark:bg-slate-800/80 p-1.5 border border-sky-100/60 dark:border-sky-900/40">
                  <span className="text-slate-600 dark:text-slate-400 block text-[11px]">Silicon</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {device.verdicts.SILICON_GEEK.score.toFixed(1)}
                  </span>
                </div>
                <div className="rounded bg-white/80 dark:bg-slate-800/80 p-1.5 border border-sky-100/60 dark:border-sky-900/40">
                  <span className="text-slate-600 dark:text-slate-400 block text-[11px]">Camera</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {device.verdicts.CAMERA_PURIST.score.toFixed(1)}
                  </span>
                </div>
                <div className="rounded bg-white/80 dark:bg-slate-800/80 p-1.5 border border-sky-100/60 dark:border-sky-900/40">
                  <span className="text-slate-600 dark:text-slate-400 block text-[11px]">Value</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {device.verdicts.PRAGMATIST.score.toFixed(1)}
                  </span>
                </div>
                <div className="rounded bg-white/80 dark:bg-slate-800/80 p-1.5 border border-sky-100/60 dark:border-sky-900/40">
                  <span className="text-slate-600 dark:text-slate-400 block text-[11px]">Daily</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {device.verdicts.DAILY_DRIVER.score.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Hardware Snapshot Chips */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">
            <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 p-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-sky-700 dark:text-sky-400">
                <Cpu className="h-4 w-4" />
                <span>Processor</span>
              </div>
              <div className="mt-1 text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                {device.specs.socName}
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-400">
                {device.specs.socNodeNm}nm • {device.specs.ramOptions}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 p-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-sky-700 dark:text-sky-400">
                <Layers className="h-4 w-4" />
                <span>Display</span>
              </div>
              <div className="mt-1 text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                {device.specs.displaySizeInch}&quot; {device.specs.displayPanelType}
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-400">
                {device.specs.refreshRateHz} • {device.specs.peakBrightnessNits} nits
              </div>
            </div>

            <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 p-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-sky-700 dark:text-sky-400">
                <Camera className="h-4 w-4" />
                <span>Camera</span>
              </div>
              <div className="mt-1 text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                {device.specs.mainSensorMp}MP {device.specs.mainSensorSize}
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-400 truncate">
                {device.specs.mainAperture}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 p-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-sky-700 dark:text-sky-400">
                <Battery className="h-4 w-4" />
                <span>Battery &amp; Active Run</span>
              </div>
              <div className="mt-1 text-xs font-bold text-slate-900 dark:text-slate-100">
                {device.specs.batteryCapacityMah} mAh • {getDeviceLabTelemetry(device).battery.activeUseScoreHours.toFixed(1)}h
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-400">
                {device.specs.wiredChargingW}W Wired • {device.specs.fullChargeMins} min
              </div>
            </div>
          </div>
        </section>

        {/* Attached Evidence Records & Hardware Citations */}
        <section
          aria-label="Attached Evidence Records and Hardware Citations"
          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0" />
                  <span>Attached Evidence Records &amp; Hardware Citations</span>
                </h2>
                <span className="inline-flex items-center rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-300">
                  {device.evidence.length} Verified {device.evidence.length === 1 ? "Source" : "Sources"}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                Multi-pillar verification across 3DMark thermal stress loops, optical &amp; PWM lab measurements, OpenLab™ battery endurance, and long-term owner TCO consensus.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {device.evidence.map((ev) => (
              <div
                key={ev.id}
                className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 flex flex-col justify-between dark:border-slate-800 dark:bg-slate-800/70"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="shrink-0 whitespace-nowrap rounded-md bg-sky-50 border border-sky-200 px-2 py-0.5 font-mono text-xs font-bold text-sky-700 dark:bg-sky-950/60 dark:border-sky-800 dark:text-sky-300">
                        {ev.sourceType.replace(/_/g, " ")}
                      </span>
                      <span className="text-xs font-semibold text-slate-600 truncate dark:text-slate-300">
                        {ev.sourceAuthor}
                      </span>
                    </div>
                    <span
                      className={`shrink-0 whitespace-nowrap rounded-md px-2 py-0.5 font-mono text-xs font-bold ${
                        ev.sentiment === "POSITIVE"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
                          : ev.sentiment === "CRITICAL"
                          ? "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800"
                          : "bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
                      }`}
                    >
                      {ev.sentiment}
                    </span>
                  </div>

                  <h3 className="mt-2 text-xs font-bold text-slate-900 dark:text-white">
                    {ev.sourceTitle}
                  </h3>

                  <p className="mt-1.5 text-xs text-slate-600 leading-relaxed dark:text-slate-300">
                    &ldquo;{ev.excerpt}&rdquo;
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-200/70 flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <div className="flex items-center gap-3">
                    <span>Topic: {ev.topic}</span>
                    <span>Verified: {ev.verifiedAt}</span>
                  </div>
                  {ev.sourceUrl && ev.sourceUrl.startsWith("http") && (
                    <a
                      href={ev.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 font-sans font-bold inline-flex items-center gap-1 hover:underline"
                    >
                      <span>Verify Source &nearr;</span>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* PhoneIndex OpenLab Telemetry & Standardized Measurements */}
        <DeviceLabTelemetryCard device={device} />

        {/* Encyclopedic Specifications Sheet via FullSpecSheet */}
        <section aria-label="Device Specifications">
          <FullSpecSheet device={device} defaultExpanded={true} />
        </section>

        {/* Compare with Contenders CTA Section */}
        {contenders.length > 0 && (
          <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <ArrowLeftRight className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                  <span>Compare with Contenders</span>
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Direct head-to-head comparison with market rivals and category peers.
                </p>
              </div>
              <Link
                href={
                  contenders.length > 0
                    ? `/compare/${device.slug}-vs-${contenders[0].slug}`
                    : `/compare?device=${device.slug}`
                }
                className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition flex items-center gap-1"
              >
                <span>Open Full Compare Studio</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
              {contenders.map((contender) => (
                <div
                  key={contender.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/60 p-4 flex flex-col justify-between hover:border-sky-300 dark:hover:border-sky-600 hover:shadow-xs transition"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase text-sky-700 dark:text-sky-400">
                        {contender.brand}
                      </span>
                      <span className="rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 font-mono text-[11px] font-bold text-slate-800 dark:text-slate-200">
                        ★ {contender.compositeLivingScore.toFixed(1)}
                      </span>
                    </div>
                    <div className="mt-1 font-bold text-slate-900 dark:text-slate-100 text-sm">
                      {contender.name}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                      ${contender.currentStreetUsd} • {contender.specs.socName}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-slate-700/80 flex items-center gap-2">
                    <Link
                      href={`/compare/${device.slug}-vs-${contender.slug}`}
                      className="h-9 flex-1 shrink-0 whitespace-nowrap inline-flex items-center justify-center rounded-lg bg-sky-600 px-3 text-center text-xs font-bold text-white hover:bg-sky-700 transition shadow-2xs"
                    >
                      Compare
                    </Link>
                    <Link
                      href={`/devices/${contender.slug}`}
                      className="h-9 w-9 shrink-0 inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 transition"
                      title={`View ${contender.name}`}
                    >
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
