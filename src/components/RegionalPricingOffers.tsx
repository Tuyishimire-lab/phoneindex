"use client";

import React, { useState, useMemo } from "react";
import {
  CurrencyCode,
  CURRENCY_METADATA,
  FX_RATES,
  getDevicePricingOverview,
  RetailerOffer,
} from "@/lib/pricing-service";
import { SmartphoneDevice } from "@/lib/seed-data";
import {
  DollarSign,
  ExternalLink,
  Store,
  Tag,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Globe,
} from "lucide-react";

export const REGIONAL_CURRENCIES: CurrencyCode[] = [
  "USD",
  "EUR",
  "GBP",
  "CAD",
  "INR",
  "JPY",
  "AUD",
  "NGN",
];

export interface RegionalPricingOffersProps {
  device: SmartphoneDevice;
  initialCurrency?: CurrencyCode;
  variant?: "bento" | "detail";
  className?: string;
}

export function RegionalPricingOffers({
  device,
  initialCurrency = "USD",
  variant = "bento",
  className = "",
}: RegionalPricingOffersProps) {
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>(initialCurrency);
  const [showAllCurrencies, setShowAllCurrencies] = useState(false);

  // Derive deterministic pricing and offers
  const overview = useMemo(
    () => getDevicePricingOverview(device, selectedCurrency),
    [device, selectedCurrency]
  );

  const activeMeta = CURRENCY_METADATA[selectedCurrency] || CURRENCY_METADATA.USD;
  const regionalPrices = overview.regionalPrices;
  const offers = overview.offers;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* =====================================================================
          HEADER & CURRENCY SELECTOR
         ===================================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
            <DollarSign className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0" />
            <span>Regional Pricing &amp; Live Offers</span>
          </h3>
          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
            Real-time FX conversion across 8 global markets with verified retailer stock.
          </p>
        </div>

        {/* Ergonomic Currency Dropdown */}
        <div className="flex items-center gap-2 shrink-0">
          <label htmlFor="currency-selector" className="sr-only">
            Select Currency
          </label>
          <div className="relative">
            <select
              id="currency-selector"
              aria-label="Select display currency"
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value as CurrencyCode)}
              className="h-10 sm:h-9 appearance-none rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 pl-3 pr-8 text-xs font-bold text-slate-800 dark:text-slate-100 shadow-2xs hover:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500 min-h-[44px] sm:min-h-[36px]"
            >
              {REGIONAL_CURRENCIES.map((code) => {
                const meta = CURRENCY_METADATA[code];
                return (
                  <option key={code} value={code}>
                    {meta.code} ({meta.symbol}) — {meta.name}
                  </option>
                );
              })}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
          </div>
        </div>
      </div>

      {/* =====================================================================
          8-CURRENCY QUICK SWITCH PILL STRIP
         ===================================================================== */}
      <div
        role="group"
        aria-label="Quick currency selection pills"
        className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs"
      >
        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 shrink-0 flex items-center gap-1 mr-1">
          <Globe className="h-3 w-3 text-sky-600" />
          <span>Currencies:</span>
        </span>
        {REGIONAL_CURRENCIES.map((c) => {
          const isSelected = selectedCurrency === c;
          const meta = CURRENCY_METADATA[c];
          return (
            <button
              key={c}
              type="button"
              aria-pressed={isSelected}
              onClick={() => setSelectedCurrency(c)}
              className={`min-h-[36px] px-2.5 py-1 rounded-md text-xs font-bold shrink-0 whitespace-nowrap transition shadow-2xs ${
                isSelected
                  ? "bg-sky-600 text-white dark:bg-sky-500 shadow-xs ring-1 ring-sky-700"
                  : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
              }`}
            >
              <span>{meta.code}</span>{" "}
              <span className="opacity-80 font-normal">({meta.symbol})</span>
            </button>
          );
        })}
      </div>

      {/* =====================================================================
          SELECTED CURRENCY PRICE CALLOUT & DISCOUNT METRICS
         ===================================================================== */}
      <div className="rounded-xl bg-slate-50 dark:bg-slate-800/80 p-4 border border-slate-200/80 dark:border-slate-700/80">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 block">
              Estimated Street Price ({activeMeta.name})
            </span>
            <div className="flex items-baseline gap-2.5 mt-0.5">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 font-mono">
                {overview.formattedSelectedPrice}
              </span>
              {overview.selectedMsrp > overview.selectedPrice && (
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-400 line-through font-mono">
                  {overview.formattedSelectedMsrp}
                </span>
              )}
              {overview.discountPct > 0 && (
                <span className="rounded-md bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 text-xs font-extrabold text-emerald-800 dark:text-emerald-300">
                  {overview.discountPct}% OFF
                </span>
              )}
            </div>
          </div>

          <div className="text-right">
            <span className="text-[11px] text-slate-600 dark:text-slate-400 block">
              Baseline FX Rate
            </span>
            <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
              1 USD = {FX_RATES[selectedCurrency]} {selectedCurrency}
            </span>
          </div>
        </div>

        {/* Toggle Expandable 8-Currency Comparison Matrix */}
        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
          <button
            type="button"
            aria-expanded={showAllCurrencies}
            onClick={() => setShowAllCurrencies((prev) => !prev)}
            className="font-bold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition flex items-center gap-1.5"
          >
            <span>{showAllCurrencies ? "Hide all 8 currencies" : "View all 8 regional currencies"}</span>
            {showAllCurrencies ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          <span className="text-[11px] text-slate-600 dark:text-slate-400 font-mono">
            {overview.pricingSource === "LOCAL_DETERMINISTIC_FALLBACK"
              ? "Deterministic Offline Fallback"
              : "Live Merchant Feed"}
          </span>
        </div>

        {/* Full 8-Currency Breakdown Grid */}
        {showAllCurrencies && (
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
            {REGIONAL_CURRENCIES.map((code) => {
              const entry = regionalPrices[code];
              const isCurrent = code === selectedCurrency;
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => setSelectedCurrency(code)}
                  className={`text-left rounded-lg p-2 transition border ${
                    isCurrent
                      ? "bg-sky-50/80 border-sky-300 dark:bg-sky-950/40 dark:border-sky-700"
                      : "bg-white/90 dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  <span className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-400">
                    <span>{code}</span>
                    <span className="font-mono text-[10px]">×{entry.exchangeRate}</span>
                  </span>
                  <span className="block mt-1 font-mono font-bold text-xs text-slate-900 dark:text-slate-100">
                    {entry.formatted}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* =====================================================================
          LIVE / DETERMINISTIC RETAILER OFFERS SECTION
         ===================================================================== */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
            <Store className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
            <span>Verified Retailer Offers ({offers.length})</span>
          </span>
          <span className="text-[11px] text-slate-600 dark:text-slate-400">
            In stock &amp; verified
          </span>
        </div>

        {/* Horizontal 3-Column Retailer Offers Grid */}
        <div
          className={`grid gap-3 ${
            variant === "detail" ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1 md:grid-cols-3"
          }`}
        >
          {offers.map((offer) => (
            <RetailerOfferCard key={offer.id} offer={offer} />
          ))}
        </div>
      </div>

      {/* Attribution & Legal Notice */}
      <div className="pt-2 flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400">
        <ShieldCheck className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
        <span>
          Prices converted at reference exchange rates. Direct clean merchant links with 0 tracking anchors.
        </span>
      </div>
    </div>
  );
}

/**
 * Individual Retailer Offer Card
 */
function RetailerOfferCard({ offer }: { offer: RetailerOffer }) {
  const stockBadge = useMemo(() => {
    switch (offer.stockStatus) {
      case "IN_STOCK":
        return {
          label: "In Stock",
          classes:
            "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
          dot: "bg-emerald-500",
          icon: CheckCircle2,
        };
      case "LOW_STOCK":
        return {
          label: "Low Stock",
          classes:
            "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
          dot: "bg-amber-500",
          icon: AlertCircle,
        };
      case "BACKORDER":
      default:
        return {
          label: "Backorder",
          classes:
            "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800",
          dot: "bg-rose-500",
          icon: Clock,
        };
    }
  }, [offer.stockStatus]);

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-3.5 flex flex-col justify-between shadow-2xs hover:border-sky-300 dark:hover:border-sky-700 transition">
      <div>
        {/* Merchant Name & Stock Badge */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
              {offer.merchantName}
            </span>
            <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono font-bold text-slate-600 dark:text-slate-400">
              {offer.merchantRegion}
            </span>
          </div>

          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${stockBadge.classes}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${stockBadge.dot} animate-pulse`} />
            <span>{stockBadge.label}</span>
          </span>
        </div>

        {/* Deal Tag (if available) */}
        {offer.dealTag && (
          <div className="mt-1.5 inline-flex items-center gap-1 rounded bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-2 py-0.5 text-[11px] font-bold text-amber-900 dark:text-amber-200">
            <Tag className="h-3 w-3 shrink-0" />
            <span className="truncate">{offer.dealTag}</span>
          </div>
        )}

        {/* Converted Price & Discount */}
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-lg font-black font-mono text-slate-900 dark:text-slate-100">
            {offer.formattedPrice}
          </span>
          {offer.originalPrice > offer.price && (
            <span className="text-xs font-semibold font-mono text-slate-600 dark:text-slate-400 line-through">
              {offer.formattedOriginalPrice}
            </span>
          )}
          {offer.discountPct > 0 && (
            <span className="text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400">
              -{offer.discountPct}%
            </span>
          )}
        </div>

        {/* Perk Note */}
        <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
          {offer.perkNote}
        </p>
      </div>

      {/* Outbound Direct Button */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
        <span className="text-[10px] font-mono text-slate-600 dark:text-slate-400">
          Checked: {offer.lastChecked}
        </span>
        <a
          href={offer.directUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="min-h-[44px] px-3 inline-flex items-center justify-center gap-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition shadow-2xs shrink-0"
        >
          <span>View Deal</span>
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}
