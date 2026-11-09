"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Camera,
  Cpu,
  DollarSign,
  Search,
  SearchX,
  Smartphone,
  X,
} from "lucide-react";
import { EDITOR_LIST, EditorPersonaId } from "@/lib/editors";
import { SmartphoneDevice } from "@/lib/seed-data";
import { useDebounce } from "@/hooks/useDebounce";

export type CatalogCategoryFilter = "ALL" | SmartphoneDevice["category"];
export type CatalogYearFilter =
  | "ALL"
  | "2026"
  | "2025"
  | "2024"
  | "2023"
  | "2022"
  | "2021"
  | "2020";
export type CatalogSortMode = "COMPOSITE" | EditorPersonaId;
export type CommercialSortMode = "DEFAULT" | "NEWEST" | "PRICE_ASC" | "PRICE_DESC";

interface CatalogSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  devices: SmartphoneDevice[];
  sortedDevices: SmartphoneDevice[];
  selectedDeviceId: string;
  selectedCompositeScore: number;
  simulatedPrices: Record<string, number>;
  searchQuery: string;
  categoryFilter: CatalogCategoryFilter;
  brandFilter: string;
  yearFilter: CatalogYearFilter;
  sortByEditor: CatalogSortMode;
  onSearchQueryChange: (value: string) => void;
  onCategoryFilterChange: (value: CatalogCategoryFilter) => void;
  onBrandFilterChange: (value: string) => void;
  onYearFilterChange: (value: CatalogYearFilter) => void;
  onSortByEditorChange: (value: CatalogSortMode) => void;
  onSelectDevice: (deviceId: string) => void;
  onCompareDevice: (deviceId: string) => void;
}

const YEARS: CatalogYearFilter[] = [
  "ALL", "2026", "2025", "2024", "2023", "2022", "2021", "2020",
];

const SORT_OPTIONS: Array<{
  value: CatalogSortMode;
  label: string;
  activeClass: string;
}> = [
  { value: "COMPOSITE", label: "Living Score", activeClass: "bg-sky-50 text-sky-700 border border-sky-300 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800" },
  { value: "SILICON_GEEK", label: "Performance", activeClass: "bg-sky-50 text-sky-700 border border-sky-300 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800" },
  { value: "CAMERA_PURIST", label: "Camera", activeClass: "bg-pink-50 text-pink-700 border border-pink-300 dark:bg-pink-950/60 dark:text-pink-300 dark:border-pink-800" },
  { value: "PRAGMATIST", label: "Best Value", activeClass: "bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800" },
  { value: "DAILY_DRIVER", label: "Comfort", activeClass: "bg-amber-50 text-amber-800 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800" },
];

const EDITOR_ICONS: Record<EditorPersonaId, React.ReactNode> = {
  SILICON_GEEK: <Cpu className="h-4 w-4 text-sky-600" />, CAMERA_PURIST: <Camera className="h-4 w-4 text-pink-600" />, PRAGMATIST: <DollarSign className="h-4 w-4 text-emerald-600" />, DAILY_DRIVER: <Smartphone className="h-4 w-4 text-amber-600" />,
};

export function CatalogSidebar({
  isOpen,
  onClose,
  devices,
  sortedDevices,
  selectedDeviceId,
  selectedCompositeScore,
  simulatedPrices,
  searchQuery,
  categoryFilter,
  brandFilter,
  yearFilter,
  sortByEditor,
  onSearchQueryChange,
  onCategoryFilterChange,
  onBrandFilterChange,
  onYearFilterChange,
  onSortByEditorChange,
  onSelectDevice,
  onCompareDevice,
}: CatalogSidebarProps) {
  const [visibleLimit, setVisibleLimit] = useState(45);
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [commercialSort, setCommercialSort] = useState<CommercialSortMode>("DEFAULT");
  const debouncedSearch = useDebounce(localSearch, 180);

  useEffect(() => {
    if (debouncedSearch !== searchQuery) onSearchQueryChange(debouncedSearch);
  }, [debouncedSearch, onSearchQueryChange, searchQuery]);

  const [prevSearchQuery, setPrevSearchQuery] = useState(searchQuery);
  if (searchQuery !== prevSearchQuery) {
    setPrevSearchQuery(searchQuery);
    if (searchQuery !== localSearch) setLocalSearch(searchQuery);
  }

  const brandCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const device of devices) {
      counts[device.brand] = (counts[device.brand] || 0) + 1;
    }
    return counts;
  }, [devices]);

  const availableBrands = useMemo(
    () => [
      "ALL",
      ...Object.keys(brandCounts).sort(
        (a, b) =>
          (brandCounts[b] || 0) - (brandCounts[a] || 0) || a.localeCompare(b)
      ),
    ],
    [brandCounts]
  );

  const selectBrand = (brand: string) => {
    onBrandFilterChange(brand);
    setVisibleLimit(45);
  };

  const resetFilters = () => {
    onBrandFilterChange("ALL");
    onYearFilterChange("ALL");
    onCategoryFilterChange("ALL");
    setCommercialSort("DEFAULT");
    setLocalSearch("");
    onSearchQueryChange("");
    setVisibleLimit(45);
  };

  const hasActiveFilters =
    brandFilter !== "ALL" ||
    yearFilter !== "ALL" ||
    categoryFilter !== "ALL" ||
    commercialSort !== "DEFAULT" ||
    searchQuery.trim() !== "";

  const displayDevices = useMemo(() => {
    if (commercialSort === "NEWEST") return [...sortedDevices].sort((a, b) => b.releaseDate.localeCompare(a.releaseDate));
    if (commercialSort === "PRICE_ASC") return [...sortedDevices].sort((a, b) => (simulatedPrices[a.id] ?? a.currentStreetUsd) - (simulatedPrices[b.id] ?? b.currentStreetUsd));
    if (commercialSort === "PRICE_DESC") return [...sortedDevices].sort((a, b) => (simulatedPrices[b.id] ?? b.currentStreetUsd) - (simulatedPrices[a.id] ?? a.currentStreetUsd));
    return sortedDevices;
  }, [sortedDevices, commercialSort, simulatedPrices]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  return (
    <>
      {isOpen && (
        <button
          type="button"
          aria-label="Close device catalog"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
        />
      )}
      <aside
        aria-label="Device catalog"
        className={`fixed inset-y-0 left-0 z-50 w-[min(90vw,360px)] shrink-0 flex-col gap-3 overflow-y-auto overscroll-contain bg-slate-50 dark:bg-slate-900 p-3 shadow-2xl lg:static lg:z-auto lg:flex lg:w-80 lg:translate-x-0 lg:overflow-visible lg:bg-transparent dark:lg:bg-transparent lg:p-0 lg:shadow-none ${
          isOpen ? "flex translate-x-0" : "hidden -translate-x-full"
        }`}
      >
        <div className="sticky top-0 z-20 -mx-3 -mt-3 flex items-center justify-between border-b border-slate-200/80 bg-slate-50/95 dark:border-slate-800 dark:bg-slate-900/95 px-4 py-2.5 backdrop-blur-xs lg:hidden">
          <div>
            <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">Device catalog</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Search and refine 939 phones</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close device catalog"
            className="h-8 w-8 inline-flex items-center justify-center shrink-0 rounded-lg bg-white p-1.5 text-slate-600 shadow-xs focus-visible:outline-2 focus-visible:outline-sky-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      <div className="rounded-2xl bg-white dark:bg-slate-900 p-4 shadow-2xs ring-1 ring-slate-200/70 dark:ring-slate-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Catalog ({displayDevices.length}/{devices.length})
            </span>
            <span className="rounded bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 px-1.5 py-0.2 font-mono text-xs font-bold text-sky-700 dark:text-sky-300">
              {availableBrands.length - 1} Brands
            </span>
          </div>
        </div>


        <div className="relative mb-2">
          <Search className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={localSearch}
            onChange={(event) => {
              setLocalSearch(event.target.value);
              setVisibleLimit(45);
            }}
            placeholder={`Search ${devices.length} phones (2020-2026), brand, SoC, or year...`}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800 pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-sky-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none"
          />
        </div>

        {hasActiveFilters && (
          <div className="mb-2.5 flex flex-wrap items-center gap-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 p-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Active:</span>
            {searchQuery.trim() && (
              <button
                type="button"
                onClick={() => {
                  setLocalSearch("");
                  onSearchQueryChange("");
                }}
                className="h-8 inline-flex items-center gap-1 rounded-lg bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-xs dark:bg-slate-800 dark:border dark:border-slate-700 dark:text-slate-200 shrink-0 whitespace-nowrap hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                Search: {searchQuery} ×
              </button>
            )}
            {brandFilter !== "ALL" && (
              <button
                type="button"
                onClick={() => onBrandFilterChange("ALL")}
                className="h-8 inline-flex items-center gap-1 rounded-lg bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-xs dark:bg-slate-800 dark:border dark:border-slate-700 dark:text-slate-200 shrink-0 whitespace-nowrap hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                {brandFilter} ×
              </button>
            )}
            {yearFilter !== "ALL" && (
              <button
                type="button"
                onClick={() => onYearFilterChange("ALL")}
                className="h-8 inline-flex items-center gap-1 rounded-lg bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-xs dark:bg-slate-800 dark:border dark:border-slate-700 dark:text-slate-200 shrink-0 whitespace-nowrap hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                {yearFilter} ×
              </button>
            )}
            {categoryFilter !== "ALL" && (
              <button
                type="button"
                onClick={() => onCategoryFilterChange("ALL")}
                className="h-8 inline-flex items-center gap-1 rounded-lg bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-xs dark:bg-slate-800 dark:border dark:border-slate-700 dark:text-slate-200 shrink-0 whitespace-nowrap hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                {categoryFilter} ×
              </button>
            )}
            {commercialSort !== "DEFAULT" && (
              <button
                type="button"
                onClick={() => setCommercialSort("DEFAULT")}
                className="h-8 inline-flex items-center gap-1 rounded-lg bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-xs dark:bg-slate-800 dark:border dark:border-slate-700 dark:text-slate-200 shrink-0 whitespace-nowrap hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                Sort: {commercialSort === "NEWEST" ? "Newest First" : commercialSort === "PRICE_ASC" ? "Price: Low to High" : "Price: High to Low"} ×
              </button>
            )}
            <button
              type="button"
              onClick={resetFilters}
              className="h-8 inline-flex items-center ml-auto text-xs font-bold text-rose-700 dark:text-rose-400 hover:underline shrink-0 whitespace-nowrap"
            >
              Reset all
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-1.5 mb-2.5">
          <select
            value={brandFilter}
            onChange={(event) => selectBrand(event.target.value)}
            aria-label="Filter by brand"
            className="rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800 px-2 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:border-sky-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none"
          >
            {availableBrands.map((brand) => (
              <option key={brand} value={brand}>
                {brand === "ALL"
                  ? `All Brands (${devices.length})`
                  : `${brand} (${brandCounts[brand] || 0})`}
              </option>
            ))}
          </select>
          <select
            value={yearFilter}
            onChange={(event) => {
              onYearFilterChange(event.target.value as CatalogYearFilter);
              setVisibleLimit(45);
            }}
            aria-label="Filter by release year"
            className="rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800 px-2 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:border-sky-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none"
          >
            <option value="ALL">2020-2026 All</option>
            {YEARS.slice(1).map((year) => (
              <option key={year} value={year}>
                {year} Models
              </option>
            ))}
          </select>
          <select
            value={categoryFilter}
            onChange={(event) => {
              onCategoryFilterChange(event.target.value as CatalogCategoryFilter);
              setVisibleLimit(45);
            }}
            aria-label="Filter by category"
            className="rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800 px-2 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:border-sky-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none"
          >
            <option value="ALL">All Types</option>
            <option value="Ultra Flagship">Ultra Flagship</option>
            <option value="Camera Flagship">Camera Flagship</option>
            <option value="Foldable">Foldable (Book & Flip)</option>
            <option value="Performance Flagship">Performance Flagship</option>
            <option value="Battery King">Battery King</option>
            <option value="Value Disruptor">Value Disruptor</option>
          </select>
          <select
            value={commercialSort}
            onChange={(event) => {
              setCommercialSort(event.target.value as CommercialSortMode);
              setVisibleLimit(45);
            }}
            aria-label="Commercial sort order"
            className="rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800 px-2 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:border-sky-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none"
          >
            <option value="DEFAULT">Editor Rank</option>
            <option value="NEWEST">Newest First</option>
            <option value="PRICE_ASC">Price: Low to High</option>
            <option value="PRICE_DESC">Price: High to Low</option>
          </select>
        </div>

        <div className="mb-3">
          <span className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
            Rank Leaderboard By Editor:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {SORT_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setCommercialSort("DEFAULT");
                  onSortByEditorChange(option.value);
                }}
                className={`h-8 flex-1 min-w-[28%] inline-flex items-center justify-center text-center rounded-lg px-2 text-xs font-semibold transition shrink-0 whitespace-nowrap ${
                  commercialSort === "DEFAULT" && sortByEditor === option.value
                    ? option.activeClass
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2 max-h-none overflow-visible lg:max-h-[640px] lg:overflow-y-auto lg:no-scrollbar">
          {displayDevices.length === 0 && (
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 px-4 py-8 text-center">
              <SearchX className="mx-auto h-6 w-6 text-slate-400 dark:text-slate-500" />
              <h3 className="mt-2 text-sm font-bold text-slate-900 dark:text-slate-100">No matching phones</h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                No devices match the current search and filter combination.
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="h-9 inline-flex items-center justify-center mt-3 rounded-lg bg-sky-600 px-3.5 text-xs font-bold text-white hover:bg-sky-700 shrink-0 whitespace-nowrap shadow-xs"
              >
                Clear all filters
              </button>
            </div>
          )}
          {displayDevices.slice(0, visibleLimit).map((device, index) => {
            const selected = device.id === selectedDeviceId;
            const displayScore =
              sortByEditor === "COMPOSITE"
                ? selected
                  ? selectedCompositeScore
                  : device.compositeLivingScore
                : device.verdicts[sortByEditor].score;
            const effectivePrice =
              simulatedPrices[device.id] ?? device.currentStreetUsd;

            return (
              <div
                key={device.id}
                className={`group rounded-xl p-3 ring-1 transition ${
                  selected
                    ? "bg-sky-50/60 ring-sky-400 shadow-xs dark:bg-sky-950/40 dark:ring-sky-600"
                    : "bg-white ring-slate-200 hover:bg-slate-50/70 hover:ring-slate-300 dark:bg-slate-900 dark:ring-slate-800 dark:hover:bg-slate-800/70 dark:hover:ring-slate-700"
                }`}
              >
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    onSelectDevice(device.id);
                    onClose();
                  }}
                  className="flex w-full items-start justify-between gap-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-xs font-semibold text-slate-500 dark:text-slate-400">
                        #{index + 1}
                      </span>
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {device.brand}
                      </span>
                      <span className="rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1 py-0.2 font-mono text-xs font-bold text-slate-600 dark:text-slate-300">
                        {device.releaseDate.slice(0, 4)}
                      </span>
                      <span className="rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1.5 py-0.2 text-xs font-medium text-slate-600 dark:text-slate-300">
                        {device.category}
                      </span>
                    </div>
                    <span className="block text-sm font-bold text-slate-900 group-hover:text-sky-700 dark:text-slate-100 dark:group-hover:text-sky-400 transition">
                      {device.name}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 dark:border-sky-800 dark:bg-sky-950/60 px-2 py-0.5 font-mono text-xs font-extrabold text-sky-700 dark:text-sky-300">
                      {displayScore.toFixed(1)}
                    </div>
                    <div className="mt-0.5 font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400">
                      ${effectivePrice}{" "}
                      <span className="text-slate-500 font-normal line-through dark:text-slate-400">
                        ${device.launchMsrpUsd}
                      </span>
                    </div>
                  </div>
                </button>
                <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span className="truncate max-w-[175px]">
                    {device.specs.socName} • {device.specs.batteryCapacityMah}mAh
                  </span>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onCompareDevice(device.id);
                      onClose();
                    }}
                    className="h-8 inline-flex items-center justify-center shrink-0 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:border-sky-400 hover:text-sky-700 shadow-2xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-sky-500 transition"
                  >
                    Vs Compare
                  </button>
                </div>
              </div>
            );
          })}

          {sortedDevices.length > visibleLimit && (
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setVisibleLimit((current) => current + 60)}
                className="h-9 flex-1 inline-flex items-center justify-center shrink-0 whitespace-nowrap rounded-xl border border-sky-200 bg-sky-50/80 px-3 text-xs font-bold text-sky-700 hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950/60 dark:text-sky-300 dark:hover:bg-sky-900/60 transition"
              >
                Load 60 More ({sortedDevices.length - visibleLimit} remaining)
              </button>
              <button
                type="button"
                onClick={() => setVisibleLimit(sortedDevices.length)}
                className="h-9 inline-flex items-center justify-center shrink-0 whitespace-nowrap rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition"
              >
                All ({sortedDevices.length})
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5">
          The Core 4 AI Editorial Panel
        </h4>
        <div className="space-y-2">
          {EDITOR_LIST.map((editor) => (
            <div
              key={editor.id}
              className="flex h-[92px] items-start gap-2.5 rounded-xl border border-slate-200/80 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-800/60 p-2.5 overflow-hidden"
            >
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs">
                {EDITOR_ICONS[editor.id]}
              </div>
              <div className="min-w-0 flex-1 flex flex-col justify-between h-full">
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate block">
                    {editor.name}
                  </span>
                  <div className={`text-xs font-bold truncate ${editor.textAccent}`}>
                    {editor.roleTitle}
                  </div>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-[14px] h-[28px] overflow-y-auto no-scrollbar">
                  {editor.tagline}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
      </aside>
    </>
  );
}
