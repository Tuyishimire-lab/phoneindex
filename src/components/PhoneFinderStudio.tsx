"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import { SmartphoneDevice } from "@/lib/seed-data";
import { EditorPersonaId } from "@/lib/editors";
import { useDebounce } from "@/hooks/useDebounce";
import { usePersistentState } from "@/hooks/usePersistentState";
import {
  SlidersHorizontal,
  RotateCcw,
  Search,
  SearchX,
  ArrowUpRight,
  ArrowLeftRight,
  Check,
  X,
} from "lucide-react";

interface PhoneFinderStudioProps {
  devices: SmartphoneDevice[];
  selectedDeviceId: string;
  compareDeviceId: string;
  stagedCompareIds?: string[];
  onSelectPrimary: (deviceId: string, switchToBento?: boolean) => void;
  onSelectCompare: (deviceId: string, switchToCompare?: boolean) => void;
}

type SortOption =
  | "LIVING_SCORE"
  | "NEWEST"
  | "PRICE_ASC"
  | "PRICE_DESC"
  | "BATTERY_DESC"
  | "WEIGHT_ASC"
  | "GEEKBENCH_DESC"
  | "PWM_DESC"
  | EditorPersonaId;

interface FinderFilters {
  searchText: string;
  brand: string;
  category: string;
  minYear: number;
  maxYear: number;
  maxPriceUsd: number;
  minBatteryMah: number;
  minWiredW: number;
  requireWirelessCharging: boolean;
  requireSiliconCarbon: boolean;
  minScreenInch: number;
  maxScreenInch: number;
  maxWeightGrams: number;
  maxWidthMm: number;
  minPwmHz: number;
  minGeekbenchMulti: number;
  minStabilityPct: number;
  socFamily: string;
  requireTelephoto: boolean;
  requireZeroLag: boolean;
  requireLargeSensor: boolean;
  requireIp68: boolean;
  requireUltrasonicOrFaceId: boolean;
  minRamGb: number;
  storageTier: string;
  minRefreshRateHz: number;
}

const DEFAULT_FILTERS: FinderFilters = {
  searchText: "",
  brand: "ALL",
  category: "ALL",
  minYear: 2020,
  maxYear: 2026,
  maxPriceUsd: 2800,
  minBatteryMah: 1800,
  minWiredW: 0,
  requireWirelessCharging: false,
  requireSiliconCarbon: false,
  minScreenInch: 4.5,
  maxScreenInch: 10.5,
  maxWeightGrams: 650,
  maxWidthMm: 225,
  minPwmHz: 0,
  minGeekbenchMulti: 0,
  minStabilityPct: 0,
  socFamily: "ALL",
  requireTelephoto: false,
  requireZeroLag: false,
  requireLargeSensor: false,
  requireIp68: false,
  requireUltrasonicOrFaceId: false,
  minRamGb: 0,
  storageTier: "ALL",
  minRefreshRateHz: 0,
};

function parseMaxRamGb(ramStr: string): number {
  if (!ramStr) return 0;
  const matches = ramStr.match(/(\d+)\s*GB/gi);
  if (!matches) {
    const numMatch = ramStr.match(/\d+/);
    return numMatch ? parseInt(numMatch[0], 10) : 0;
  }
  const nums = matches.map((m) => parseInt(m.replace(/[^0-9]/g, ""), 10));
  return Math.max(...nums);
}

function parseRefreshRateHz(hzStr: string): number {
  if (!hzStr) return 60;
  const matches = hzStr.match(/\d+/g);
  if (!matches) return 60;
  return Math.max(...matches.map(Number));
}

function matchesStorageFilter(storageType: string, filter: string): boolean {
  if (!filter || filter === "ALL") return true;
  if (!storageType) return false;
  const sLower = storageType.toLowerCase();
  const fLower = filter.toLowerCase();
  if (sLower.includes(fLower)) return true;
  const hasExplicitCapacity = /(128gb|256gb|512gb|1tb)/i.test(storageType);
  if (!hasExplicitCapacity) {
    if (filter === "128GB") {
      return (
        sLower.includes("ufs 3.1") ||
        sLower.includes("ufs 2.2") ||
        sLower.includes("ufs 2.1") ||
        sLower.includes("emmc") ||
        sLower.includes("nvme")
      );
    }
    if (filter === "256GB" || filter === "512GB") {
      return (
        sLower.includes("ufs 4.0") ||
        sLower.includes("ufs 4.1") ||
        sLower.includes("ufs 3.1") ||
        sLower.includes("nvme")
      );
    }
    if (filter === "1TB") {
      return (
        sLower.includes("ufs 4.0") ||
        sLower.includes("ufs 4.1") ||
        sLower.includes("nvme")
      );
    }
  }
  return false;
}

const CATEGORIES: Array<SmartphoneDevice["category"] | "ALL"> = [
  "ALL",
  "Ultra Flagship",
  "Camera Flagship",
  "Foldable",
  "Performance Flagship",
  "Battery King",
  "Value Disruptor",
];

export function PhoneFinderStudio({
  devices,
  selectedDeviceId,
  compareDeviceId,
  stagedCompareIds,
  onSelectPrimary,
  onSelectCompare,
}: PhoneFinderStudioProps) {
  const [filters, setFilters] = usePersistentState<FinderFilters>(
    "phoneindex_finder_filters",
    DEFAULT_FILTERS
  );
  const [localSearchText, setLocalSearchText] = useState(filters.searchText);
  const debouncedSearchText = useDebounce(localSearchText, 180);
  const [sortBy, setSortBy] = usePersistentState<SortOption>(
    "phoneindex_finder_sort",
    "LIVING_SCORE"
  );
  const [displayLimit, setDisplayLimit] = useState<number>(36);
  const [activePresetName, setActivePresetName] = usePersistentState<string | null>(
    "phoneindex_finder_preset",
    null
  );

  // Sync debounced search text into persistent filters
  useEffect(() => {
    if (debouncedSearchText !== filters.searchText) {
      setFilters((prev) => ({ ...prev, searchText: debouncedSearchText }));
    }
  }, [debouncedSearchText, filters.searchText, setFilters]);

  // Sync external filter changes (presets, reset, hydration) into local search input
  const prevSearchRef = useRef(filters.searchText);
  useEffect(() => {
    if (filters.searchText !== prevSearchRef.current) {
      prevSearchRef.current = filters.searchText;
      setLocalSearchText(filters.searchText);
    }
  }, [filters.searchText]);

  const brands = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const d of devices) {
      counts[d.brand] = (counts[d.brand] || 0) + 1;
    }
    return Object.keys(counts).sort(
      (a, b) => (counts[b] || 0) - (counts[a] || 0) || a.localeCompare(b)
    );
  }, [devices]);

  const applyPreset = (name: string, patch: Partial<FinderFilters>) => {
    setActivePresetName(name);
    setFilters({ ...DEFAULT_FILTERS, ...patch });
    setLocalSearchText(patch.searchText ?? "");
    setDisplayLimit(36);
  };

  const resetFilters = () => {
    setActivePresetName(null);
    setFilters(DEFAULT_FILTERS);
    setLocalSearchText("");
    setDisplayLimit(36);
  };

  const matchedDevices = useMemo(() => {
    return devices
      .filter((d) => {
        const s = d.specs;
        const yr = parseInt(d.releaseDate.slice(0, 4), 10) || 2024;

        if (filters.brand !== "ALL" && d.brand !== filters.brand) return false;
        if (filters.category !== "ALL" && d.category !== filters.category) return false;
        if (yr < filters.minYear || yr > filters.maxYear) return false;
        if (d.currentStreetUsd > filters.maxPriceUsd) return false;
        if (filters.minRamGb > 0 && parseMaxRamGb(s.ramOptions) < filters.minRamGb) return false;
        if (filters.storageTier !== "ALL" && !matchesStorageFilter(s.storageType, filters.storageTier)) return false;
        if (filters.minRefreshRateHz > 0 && parseRefreshRateHz(s.refreshRateHz) < filters.minRefreshRateHz) return false;
        if (s.batteryCapacityMah < filters.minBatteryMah) return false;
        if (s.wiredChargingW < filters.minWiredW) return false;
        if (filters.requireWirelessCharging && s.wirelessChargingW <= 0)
          return false;
        if (
          filters.requireSiliconCarbon &&
          !s.batteryChemistry.toLowerCase().includes("silicon") &&
          !s.batteryChemistry.toLowerCase().includes("si/c") &&
          !s.batteryChemistry.toLowerCase().includes("si-c")
        ) {
          return false;
        }
        if (
          s.displaySizeInch < filters.minScreenInch ||
          s.displaySizeInch > filters.maxScreenInch
        ) {
          return false;
        }
        if (s.weightGrams > filters.maxWeightGrams) return false;
        if (s.widthMm > filters.maxWidthMm) return false;
        if (s.pwmDimmingHz < filters.minPwmHz) return false;
        if (s.geekbenchMulti < filters.minGeekbenchMulti) return false;
        if (s.wildlifeStabilityPct < filters.minStabilityPct) return false;

        if (filters.socFamily !== "ALL") {
          const socLower = s.socName.toLowerCase();
          if (
            filters.socFamily === "SD8" &&
            !socLower.includes("snapdragon 8")
          )
            return false;
          if (
            filters.socFamily === "SD7_6" &&
            !socLower.includes("snapdragon 7") &&
            !socLower.includes("snapdragon 6")
          )
            return false;
          if (filters.socFamily === "APPLE" && !socLower.includes("apple a"))
            return false;
          if (
            filters.socFamily === "DIMENSITY_9000_8000" &&
            !socLower.includes("dimensity 9") &&
            !socLower.includes("dimensity 8")
          )
            return false;
          if (filters.socFamily === "TENSOR" && !socLower.includes("tensor"))
            return false;
          if (
            filters.socFamily === "EXYNOS_KIRIN" &&
            !socLower.includes("exynos") &&
            !socLower.includes("kirin")
          )
            return false;
        }

        if (
          filters.requireTelephoto &&
          s.telephotoSpecs.toLowerCase().includes("none")
        ) {
          return false;
        }
        if (
          filters.requireZeroLag &&
          !s.shutterLagRating.toLowerCase().includes("zero-lag")
        ) {
          return false;
        }
        if (filters.requireLargeSensor) {
          const sz = s.mainSensorSize;
          const isLarge =
            sz.includes('1.0"') ||
            sz.includes("1/0.98") ||
            sz.includes("1/1.1") ||
            sz.includes("1/1.28") ||
            sz.includes("1/1.3");
          if (!isLarge) return false;
        }
        if (
          filters.requireIp68 &&
          !s.ipRating.includes("IP68") &&
          !s.ipRating.includes("IP69")
        ) {
          return false;
        }
        if (filters.requireUltrasonicOrFaceId) {
          const fp = s.fingerprintType.toLowerCase();
          if (!fp.includes("ultrasonic") && !fp.includes("face id")) {
            return false;
          }
        }

        if (debouncedSearchText.trim()) {
          const q = debouncedSearchText.toLowerCase();
          const hit =
            d.name.toLowerCase().includes(q) ||
            d.brand.toLowerCase().includes(q) ||
            d.category.toLowerCase().includes(q) ||
            d.tagline.toLowerCase().includes(q) ||
            s.socName.toLowerCase().includes(q) ||
            s.mainSensorSize.toLowerCase().includes(q) ||
            s.displayPanelType.toLowerCase().includes(q) ||
            s.ramOptions.toLowerCase().includes(q) ||
            s.storageType.toLowerCase().includes(q) ||
            s.telephotoSpecs.toLowerCase().includes(q) ||
            s.frameMaterial.toLowerCase().includes(q);
          if (!hit) return false;
        }

        return true;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "LIVING_SCORE":
            return b.compositeLivingScore - a.compositeLivingScore;
          case "NEWEST":
            return b.releaseDate.localeCompare(a.releaseDate);
          case "PRICE_ASC":
            return a.currentStreetUsd - b.currentStreetUsd;
          case "PRICE_DESC":
            return b.currentStreetUsd - a.currentStreetUsd;
          case "BATTERY_DESC":
            return b.specs.batteryCapacityMah - a.specs.batteryCapacityMah;
          case "WEIGHT_ASC":
            return a.specs.weightGrams - b.specs.weightGrams;
          case "GEEKBENCH_DESC":
            return b.specs.geekbenchMulti - a.specs.geekbenchMulti;
          case "PWM_DESC":
            return b.specs.pwmDimmingHz - a.specs.pwmDimmingHz;
          default:
            return b.verdicts[sortBy].score - a.verdicts[sortBy].score;
        }
      });
  }, [devices, filters, debouncedSearchText, sortBy]);

  const activeFilters = useMemo(() => {
    interface ActiveFilterPill {
      id: string;
      label: string;
      onRemove: () => void;
    }
    const pills: ActiveFilterPill[] = [];

    if (filters.searchText.trim()) {
      pills.push({
        id: "search",
        label: `Search: "${filters.searchText.trim()}"`,
        onRemove: () => {
          setLocalSearchText("");
          setFilters((f) => ({ ...f, searchText: "" }));
        },
      });
    }

    if (filters.brand !== "ALL") {
      pills.push({
        id: "brand",
        label: `Brand: ${filters.brand}`,
        onRemove: () => setFilters((f) => ({ ...f, brand: "ALL" })),
      });
    }

    if (filters.category !== "ALL") {
      pills.push({
        id: "category",
        label: `Category: ${filters.category}`,
        onRemove: () => setFilters((f) => ({ ...f, category: "ALL" })),
      });
    }

    if (filters.minYear > 2020) {
      pills.push({
        id: "minYear",
        label: `Year: ≥${filters.minYear}`,
        onRemove: () => setFilters((f) => ({ ...f, minYear: 2020 })),
      });
    }

    if (filters.maxPriceUsd < 2800) {
      pills.push({
        id: "maxPriceUsd",
        label: `Price: ≤$${filters.maxPriceUsd}`,
        onRemove: () => setFilters((f) => ({ ...f, maxPriceUsd: 2800 })),
      });
    }

    if (filters.minRamGb > 0) {
      pills.push({
        id: "minRamGb",
        label: `RAM: ≥${filters.minRamGb}GB`,
        onRemove: () => setFilters((f) => ({ ...f, minRamGb: 0 })),
      });
    }

    if (filters.storageTier !== "ALL") {
      pills.push({
        id: "storageTier",
        label: `Storage: ${filters.storageTier}`,
        onRemove: () => setFilters((f) => ({ ...f, storageTier: "ALL" })),
      });
    }

    if (filters.minRefreshRateHz > 0) {
      pills.push({
        id: "minRefreshRateHz",
        label: `Refresh: ≥${filters.minRefreshRateHz}Hz`,
        onRemove: () => setFilters((f) => ({ ...f, minRefreshRateHz: 0 })),
      });
    }

    if (filters.socFamily !== "ALL") {
      const socMap: Record<string, string> = {
        SD8: "Snapdragon 8 Series",
        DIMENSITY_9000_8000: "Dimensity 9000/8000",
        APPLE: "Apple A-Series",
        TENSOR: "Google Tensor",
        SD7_6: "Snapdragon 7/6",
        EXYNOS_KIRIN: "Exynos/Kirin",
      };
      pills.push({
        id: "socFamily",
        label: `SoC: ${socMap[filters.socFamily] || filters.socFamily}`,
        onRemove: () => setFilters((f) => ({ ...f, socFamily: "ALL" })),
      });
    }

    if (filters.minGeekbenchMulti > 0) {
      pills.push({
        id: "minGeekbenchMulti",
        label: `GB6: ≥${filters.minGeekbenchMulti}`,
        onRemove: () => setFilters((f) => ({ ...f, minGeekbenchMulti: 0 })),
      });
    }

    if (filters.minBatteryMah > 1800) {
      pills.push({
        id: "minBatteryMah",
        label: `Battery: ≥${filters.minBatteryMah}mAh`,
        onRemove: () => setFilters((f) => ({ ...f, minBatteryMah: 1800 })),
      });
    }

    if (filters.minWiredW > 0) {
      pills.push({
        id: "minWiredW",
        label: `Wired: ≥${filters.minWiredW}W`,
        onRemove: () => setFilters((f) => ({ ...f, minWiredW: 0 })),
      });
    }

    if (filters.requireSiliconCarbon) {
      pills.push({
        id: "requireSiliconCarbon",
        label: "Si/C Battery Only",
        onRemove: () => setFilters((f) => ({ ...f, requireSiliconCarbon: false })),
      });
    }

    if (filters.requireWirelessCharging) {
      pills.push({
        id: "requireWirelessCharging",
        label: "Wireless Charging",
        onRemove: () => setFilters((f) => ({ ...f, requireWirelessCharging: false })),
      });
    }

    if (filters.minPwmHz > 0) {
      pills.push({
        id: "minPwmHz",
        label: `PWM: ≥${filters.minPwmHz}Hz`,
        onRemove: () => setFilters((f) => ({ ...f, minPwmHz: 0 })),
      });
    }

    if (filters.requireTelephoto) {
      pills.push({
        id: "requireTelephoto",
        label: "Telephoto / Periscope",
        onRemove: () => setFilters((f) => ({ ...f, requireTelephoto: false })),
      });
    }

    if (filters.requireLargeSensor) {
      pills.push({
        id: "requireLargeSensor",
        label: "Large Sensor (≥1/1.3\")",
        onRemove: () => setFilters((f) => ({ ...f, requireLargeSensor: false })),
      });
    }

    if (filters.requireZeroLag) {
      pills.push({
        id: "requireZeroLag",
        label: "Zero-Lag Shutter",
        onRemove: () => setFilters((f) => ({ ...f, requireZeroLag: false })),
      });
    }

    if (filters.maxScreenInch < 10.5) {
      pills.push({
        id: "maxScreenInch",
        label: `Screen: ≤${filters.maxScreenInch.toFixed(1)}"`,
        onRemove: () => setFilters((f) => ({ ...f, maxScreenInch: 10.5 })),
      });
    }

    if (filters.maxWidthMm < 225) {
      pills.push({
        id: "maxWidthMm",
        label: `Width: ≤${filters.maxWidthMm}mm`,
        onRemove: () => setFilters((f) => ({ ...f, maxWidthMm: 225 })),
      });
    }

    if (filters.maxWeightGrams < 650) {
      pills.push({
        id: "maxWeightGrams",
        label: `Weight: ≤${filters.maxWeightGrams}g`,
        onRemove: () => setFilters((f) => ({ ...f, maxWeightGrams: 650 })),
      });
    }

    if (filters.requireIp68) {
      pills.push({
        id: "requireIp68",
        label: "IP68/IP69 Submersible",
        onRemove: () => setFilters((f) => ({ ...f, requireIp68: false })),
      });
    }

    if (filters.requireUltrasonicOrFaceId) {
      pills.push({
        id: "requireUltrasonicOrFaceId",
        label: "Ultrasonic / Face ID",
        onRemove: () => setFilters((f) => ({ ...f, requireUltrasonicOrFaceId: false })),
      });
    }

    return pills;
  }, [filters, setFilters]);

  const relaxationOptions = useMemo(() => {
    if (matchedDevices.length > 0 || activeFilters.length === 0) return [];

    interface RelaxationOption {
      id: string;
      label: string;
      count: number;
      apply: () => void;
    }

    const testMatchCount = (testFilters: FinderFilters, testSearch: string) => {
      const q = testSearch.trim().toLowerCase();
      return devices.filter((d) => {
        const s = d.specs;
        const yr = parseInt(d.releaseDate.slice(0, 4), 10) || 2024;
        if (testFilters.brand !== "ALL" && d.brand !== testFilters.brand) return false;
        if (testFilters.category !== "ALL" && d.category !== testFilters.category) return false;
        if (yr < testFilters.minYear || yr > testFilters.maxYear) return false;
        if (d.currentStreetUsd > testFilters.maxPriceUsd) return false;
        if (testFilters.minRamGb > 0 && parseMaxRamGb(s.ramOptions) < testFilters.minRamGb) return false;
        if (testFilters.storageTier !== "ALL" && !matchesStorageFilter(s.storageType, testFilters.storageTier)) return false;
        if (testFilters.minRefreshRateHz > 0 && parseRefreshRateHz(s.refreshRateHz) < testFilters.minRefreshRateHz) return false;
        if (s.batteryCapacityMah < testFilters.minBatteryMah) return false;
        if (s.wiredChargingW < testFilters.minWiredW) return false;
        if (testFilters.requireWirelessCharging && s.wirelessChargingW <= 0) return false;
        if (
          testFilters.requireSiliconCarbon &&
          !s.batteryChemistry.toLowerCase().includes("silicon") &&
          !s.batteryChemistry.toLowerCase().includes("si/c") &&
          !s.batteryChemistry.toLowerCase().includes("si-c")
        ) return false;
        if (s.displaySizeInch < testFilters.minScreenInch || s.displaySizeInch > testFilters.maxScreenInch) return false;
        if (s.weightGrams > testFilters.maxWeightGrams) return false;
        if (s.widthMm > testFilters.maxWidthMm) return false;
        if (s.pwmDimmingHz < testFilters.minPwmHz) return false;
        if (s.geekbenchMulti < testFilters.minGeekbenchMulti) return false;
        if (s.wildlifeStabilityPct < testFilters.minStabilityPct) return false;
        if (testFilters.socFamily !== "ALL") {
          const socLower = s.socName.toLowerCase();
          if (testFilters.socFamily === "SD8" && !socLower.includes("snapdragon 8")) return false;
          if (testFilters.socFamily === "SD7_6" && !socLower.includes("snapdragon 7") && !socLower.includes("snapdragon 6")) return false;
          if (testFilters.socFamily === "APPLE" && !socLower.includes("apple a")) return false;
          if (testFilters.socFamily === "DIMENSITY_9000_8000" && !socLower.includes("dimensity 9") && !socLower.includes("dimensity 8")) return false;
          if (testFilters.socFamily === "TENSOR" && !socLower.includes("tensor")) return false;
          if (testFilters.socFamily === "EXYNOS_KIRIN" && !socLower.includes("exynos") && !socLower.includes("kirin")) return false;
        }
        if (testFilters.requireTelephoto && s.telephotoSpecs.toLowerCase().includes("none")) return false;
        if (testFilters.requireZeroLag && !s.shutterLagRating.toLowerCase().includes("zero-lag")) return false;
        if (testFilters.requireLargeSensor) {
          const sz = s.mainSensorSize;
          const isLarge = sz.includes('1.0"') || sz.includes("1/0.98") || sz.includes("1/1.1") || sz.includes("1/1.28") || sz.includes("1/1.3");
          if (!isLarge) return false;
        }
        if (testFilters.requireIp68 && !s.ipRating.includes("IP68") && !s.ipRating.includes("IP69")) return false;
        if (testFilters.requireUltrasonicOrFaceId) {
          const fp = s.fingerprintType.toLowerCase();
          if (!fp.includes("ultrasonic") && !fp.includes("face id")) return false;
        }
        if (q) {
          const hit =
            d.name.toLowerCase().includes(q) ||
            d.brand.toLowerCase().includes(q) ||
            d.category.toLowerCase().includes(q) ||
            d.tagline.toLowerCase().includes(q) ||
            s.socName.toLowerCase().includes(q) ||
            s.mainSensorSize.toLowerCase().includes(q) ||
            s.displayPanelType.toLowerCase().includes(q) ||
            s.ramOptions.toLowerCase().includes(q) ||
            s.storageType.toLowerCase().includes(q) ||
            s.telephotoSpecs.toLowerCase().includes(q) ||
            s.frameMaterial.toLowerCase().includes(q);
          if (!hit) return false;
        }
        return true;
      }).length;
    };

    const options: RelaxationOption[] = [];

    if (filters.maxPriceUsd < 2800) {
      const c = testMatchCount({ ...filters, maxPriceUsd: 2800 }, localSearchText);
      if (c > 0) {
        options.push({
          id: "relax_price",
          label: "Remove price ceiling",
          count: c,
          apply: () => setFilters((f) => ({ ...f, maxPriceUsd: 2800 })),
        });
      }
    }

    if (filters.minRamGb > 0) {
      const c = testMatchCount({ ...filters, minRamGb: 0 }, localSearchText);
      if (c > 0) {
        options.push({
          id: "relax_ram",
          label: "Clear RAM filter",
          count: c,
          apply: () => setFilters((f) => ({ ...f, minRamGb: 0 })),
        });
      }
    }

    if (filters.storageTier !== "ALL") {
      const c = testMatchCount({ ...filters, storageTier: "ALL" }, localSearchText);
      if (c > 0) {
        options.push({
          id: "relax_storage",
          label: "Clear storage filter",
          count: c,
          apply: () => setFilters((f) => ({ ...f, storageTier: "ALL" })),
        });
      }
    }

    if (filters.minRefreshRateHz > 0) {
      const c = testMatchCount({ ...filters, minRefreshRateHz: 0 }, localSearchText);
      if (c > 0) {
        options.push({
          id: "relax_refresh",
          label: "Clear refresh rate filter",
          count: c,
          apply: () => setFilters((f) => ({ ...f, minRefreshRateHz: 0 })),
        });
      }
    }

    if (filters.brand !== "ALL") {
      const c = testMatchCount({ ...filters, brand: "ALL" }, localSearchText);
      if (c > 0) {
        options.push({
          id: "relax_brand",
          label: "Search all brands",
          count: c,
          apply: () => setFilters((f) => ({ ...f, brand: "ALL" })),
        });
      }
    }

    if (filters.category !== "ALL") {
      const c = testMatchCount({ ...filters, category: "ALL" }, localSearchText);
      if (c > 0) {
        options.push({
          id: "relax_category",
          label: "Search all categories",
          count: c,
          apply: () => setFilters((f) => ({ ...f, category: "ALL" })),
        });
      }
    }

    if (filters.minYear > 2020) {
      const c = testMatchCount({ ...filters, minYear: 2020 }, localSearchText);
      if (c > 0) {
        options.push({
          id: "relax_year",
          label: "Include older release years",
          count: c,
          apply: () => setFilters((f) => ({ ...f, minYear: 2020 })),
        });
      }
    }

    if (filters.minPwmHz > 0) {
      const c = testMatchCount({ ...filters, minPwmHz: 0 }, localSearchText);
      if (c > 0) {
        options.push({
          id: "relax_pwm",
          label: "Remove PWM flicker constraint",
          count: c,
          apply: () => setFilters((f) => ({ ...f, minPwmHz: 0 })),
        });
      }
    }

    if (filters.minBatteryMah > 1800) {
      const c = testMatchCount({ ...filters, minBatteryMah: 1800 }, localSearchText);
      if (c > 0) {
        options.push({
          id: "relax_battery",
          label: "Lower battery threshold",
          count: c,
          apply: () => setFilters((f) => ({ ...f, minBatteryMah: 1800 })),
        });
      }
    }

    if (filters.minGeekbenchMulti > 0) {
      const c = testMatchCount({ ...filters, minGeekbenchMulti: 0 }, localSearchText);
      if (c > 0) {
        options.push({
          id: "relax_gb6",
          label: "Remove Geekbench threshold",
          count: c,
          apply: () => setFilters((f) => ({ ...f, minGeekbenchMulti: 0 })),
        });
      }
    }

    if (filters.requireSiliconCarbon) {
      const c = testMatchCount({ ...filters, requireSiliconCarbon: false }, localSearchText);
      if (c > 0) {
        options.push({
          id: "relax_sicarbon",
          label: "Allow standard Li-Ion batteries",
          count: c,
          apply: () => setFilters((f) => ({ ...f, requireSiliconCarbon: false })),
        });
      }
    }

    if (filters.requireTelephoto) {
      const c = testMatchCount({ ...filters, requireTelephoto: false }, localSearchText);
      if (c > 0) {
        options.push({
          id: "relax_tele",
          label: "Remove telephoto requirement",
          count: c,
          apply: () => setFilters((f) => ({ ...f, requireTelephoto: false })),
        });
      }
    }

    if (filters.requireLargeSensor) {
      const c = testMatchCount({ ...filters, requireLargeSensor: false }, localSearchText);
      if (c > 0) {
        options.push({
          id: "relax_sensor",
          label: "Allow all sensor sizes",
          count: c,
          apply: () => setFilters((f) => ({ ...f, requireLargeSensor: false })),
        });
      }
    }

    if (localSearchText.trim()) {
      const c = testMatchCount(filters, "");
      if (c > 0) {
        options.push({
          id: "relax_search",
          label: `Clear search "${localSearchText.trim()}"`,
          count: c,
          apply: () => {
            setLocalSearchText("");
            setFilters((f) => ({ ...f, searchText: "" }));
          },
        });
      }
    }

    return options.slice(0, 4);
  }, [matchedDevices.length, activeFilters.length, devices, filters, localSearchText, setFilters]);

  return (
    <div
      className={`space-y-5 ${
        stagedCompareIds && stagedCompareIds.length > 0 ? "pb-24 sm:pb-20" : ""
      }`}
    >
      {/* Unified Compact Horizontal Filter Console */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs space-y-3">
        {/* Row 1: Compact Header + Primary Search / Brand / Era / SoC Controls + Reset */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 shrink-0">
              <SlidersHorizontal className="h-4 w-4 text-sky-600 dark:text-sky-400" />
            </div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                Phone Finder
              </h2>
              <span className="rounded-md border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 font-mono text-[11px] font-extrabold text-emerald-700 dark:text-emerald-300">
                {matchedDevices.length} / {devices.length} Matched
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 flex-1 justify-end">
            <div className="relative min-w-[180px] sm:w-56">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={localSearchText}
                onChange={(e) => setLocalSearchText(e.target.value)}
                placeholder="Search model, SoC, sensor..."
                className="h-8 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-8 pr-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-sky-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none"
              />
            </div>

            <select
              value={filters.brand}
              aria-label="Filter by smartphone brand"
              onChange={(e) =>
                setFilters((f) => ({ ...f, brand: e.target.value }))
              }
              className="h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:border-sky-500 focus:outline-none"
            >
              <option value="ALL">All Brands ({brands.length})</option>
              {brands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>

            <select
              value={filters.minYear}
              aria-label="Filter by minimum release year"
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  minYear: parseInt(e.target.value, 10),
                }))
              }
              className="h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:border-sky-500 focus:outline-none"
            >
              {[2020, 2021, 2022, 2023, 2024, 2025, 2026].map((yr) => (
                <option key={yr} value={yr}>
                  {yr} & Newer
                </option>
              ))}
            </select>

            <select
              value={filters.socFamily}
              aria-label="Filter by chipset architecture family"
              onChange={(e) =>
                setFilters((f) => ({ ...f, socFamily: e.target.value }))
              }
              className="h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:border-sky-500 focus:outline-none"
            >
              <option value="ALL">All SoC Families</option>
              <option value="SD8">Snapdragon 8 Series</option>
              <option value="DIMENSITY_9000_8000">Dimensity 9000 / 8000</option>
              <option value="APPLE">Apple A-Series</option>
              <option value="TENSOR">Google Tensor G1–G5</option>
              <option value="SD7_6">Snapdragon 7 & 6 Series</option>
              <option value="EXYNOS_KIRIN">Exynos & Kirin</option>
            </select>

            <button
              type="button"
              onClick={resetFilters}
              className="h-8 shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 dark:hover:border-rose-800 dark:hover:bg-rose-950/40 dark:hover:text-rose-300 transition cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset All Filters</span>
            </button>
          </div>
        </div>

        {/* Row 2: Single-Line Quick Hardware Presets (No Star Icons) */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mr-1 shrink-0">
            Quick Presets:
          </span>
          {[
            {
              label: "PWM Eye-Care (≥1920Hz)",
              patch: { minPwmHz: 1920, minGeekbenchMulti: 6500 },
            },
            {
              label: "Compact One-Handed (≤6.36\")",
              patch: { maxScreenInch: 6.36, maxWidthMm: 72.5 },
            },
            {
              label: "Si/C Battery (≥5800mAh)",
              patch: {
                minBatteryMah: 5800,
                minWiredW: 80,
                requireSiliconCarbon: true,
              },
            },
            {
              label: "Large-Sensor + Telephoto",
              patch: {
                requireLargeSensor: true,
                requireTelephoto: true,
                requireZeroLag: true,
              },
            },
            {
              label: "Under $400 Value",
              patch: { maxPriceUsd: 400, minYear: 2024 },
            },
            {
              label: "IP68/69 + Ultrasonic",
              patch: {
                requireIp68: true,
                requireUltrasonicOrFaceId: true,
              },
            },
          ].map((p) => {
            const active = activePresetName === p.label;
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => applyPreset(p.label, p.patch)}
                className={`h-7 shrink-0 whitespace-nowrap inline-flex items-center rounded-lg border px-2.5 text-[11px] font-semibold transition cursor-pointer ${
                  active
                    ? "border-sky-500 bg-sky-600 text-white shadow-2xs"
                    : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-sky-300 hover:bg-sky-50 dark:hover:border-sky-700 dark:hover:bg-slate-700"
                }`}
              >
                <span>{p.label}</span>
              </button>
            );
          })}
        </div>

        {/* Row 3: Compact 4-Column Pill Facets Strip (Category, RAM, Storage, Refresh Rate) */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-2.5">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Device Category
            </label>
            <div className="flex flex-wrap gap-1">
              {CATEGORIES.map((cat) => {
                const active = filters.category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() =>
                      setFilters((f) => ({
                        ...f,
                        category: f.category === cat ? "ALL" : cat,
                      }))
                    }
                    className={`h-6 shrink-0 whitespace-nowrap inline-flex items-center rounded-md border px-2 text-[11px] font-semibold transition cursor-pointer ${
                      active
                        ? "border-emerald-500 bg-emerald-600 text-white"
                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                    }`}
                  >
                    <span>{cat === "ALL" ? "All Types" : cat}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Min RAM Capacity
            </label>
            <div className="flex flex-wrap gap-1">
              {[
                { val: 0, label: "Any RAM" },
                { val: 6, label: "≥6GB" },
                { val: 8, label: "≥8GB" },
                { val: 12, label: "≥12GB" },
                { val: 16, label: "≥16GB" },
              ].map((tier) => {
                const active = filters.minRamGb === tier.val;
                return (
                  <button
                    key={tier.val}
                    type="button"
                    onClick={() =>
                      setFilters((f) => ({
                        ...f,
                        minRamGb: f.minRamGb === tier.val ? 0 : tier.val,
                      }))
                    }
                    className={`h-6 shrink-0 whitespace-nowrap inline-flex items-center rounded-md border px-2 text-[11px] font-semibold transition cursor-pointer ${
                      active
                        ? "border-sky-500 bg-sky-600 text-white"
                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                    }`}
                  >
                    <span>{tier.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Storage Tier
            </label>
            <div className="flex flex-wrap gap-1">
              {[
                { val: "ALL", label: "Any Storage" },
                { val: "128GB", label: "128GB" },
                { val: "256GB", label: "256GB" },
                { val: "512GB", label: "512GB" },
                { val: "1TB", label: "1TB" },
              ].map((tier) => {
                const active = filters.storageTier === tier.val;
                return (
                  <button
                    key={tier.val}
                    type="button"
                    onClick={() =>
                      setFilters((f) => ({
                        ...f,
                        storageTier: f.storageTier === tier.val ? "ALL" : tier.val,
                      }))
                    }
                    className={`h-6 shrink-0 whitespace-nowrap inline-flex items-center rounded-md border px-2 text-[11px] font-semibold transition cursor-pointer ${
                      active
                        ? "border-sky-500 bg-sky-600 text-white"
                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                    }`}
                  >
                    <span>{tier.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Display Refresh Rate
            </label>
            <div className="flex flex-wrap gap-1">
              {[
                { val: 0, label: "Any Hz" },
                { val: 60, label: "≥60Hz" },
                { val: 90, label: "≥90Hz" },
                { val: 120, label: "≥120Hz" },
                { val: 144, label: "≥144Hz" },
              ].map((tier) => {
                const active = filters.minRefreshRateHz === tier.val;
                return (
                  <button
                    key={tier.val}
                    type="button"
                    onClick={() =>
                      setFilters((f) => ({
                        ...f,
                        minRefreshRateHz: f.minRefreshRateHz === tier.val ? 0 : tier.val,
                      }))
                    }
                    className={`h-6 shrink-0 whitespace-nowrap inline-flex items-center rounded-md border px-2 text-[11px] font-semibold transition cursor-pointer ${
                      active
                        ? "border-pink-500 bg-pink-600 text-white"
                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                    }`}
                  >
                    <span>{tier.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Row 4: High-Density 4x2 Range Sliders Grid (All 8 Sliders in 2 Compact Horizontal Rows) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-2.5 pt-0.5">
          {/* 1. Max Street Price */}
          <div>
            <div className="flex items-center justify-between gap-2 text-[11px] font-bold">
              <span className="text-slate-700 dark:text-slate-300 truncate">Max Street Price</span>
              <span className="shrink-0 whitespace-nowrap font-mono text-emerald-700 dark:text-emerald-400">
                {filters.maxPriceUsd >= 2800 ? "Any Price" : `≤ $${filters.maxPriceUsd}`}
              </span>
            </div>
            <input
              type="range"
              min={150}
              max={2800}
              step={50}
              value={filters.maxPriceUsd}
              aria-label="Maximum street price in USD"
              aria-valuemin={150}
              aria-valuemax={2800}
              aria-valuenow={filters.maxPriceUsd}
              aria-valuetext={filters.maxPriceUsd >= 2800 ? "Any price" : `Up to $${filters.maxPriceUsd} dollars`}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  maxPriceUsd: parseInt(e.target.value, 10),
                }))
              }
              className="mt-1 h-1.5 w-full cursor-pointer accent-emerald-600"
            />
          </div>

          {/* 2. Min Geekbench 6 Multi */}
          <div>
            <div className="flex items-center justify-between gap-2 text-[11px] font-bold">
              <span className="text-slate-700 dark:text-slate-300 truncate">Min Geekbench 6 Multi</span>
              <span className="shrink-0 whitespace-nowrap font-mono text-sky-700 dark:text-sky-400">
                {filters.minGeekbenchMulti === 0 ? "Any" : `≥ ${filters.minGeekbenchMulti}`}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={10000}
              step={500}
              value={filters.minGeekbenchMulti}
              aria-label="Minimum Geekbench 6 multi-core score"
              aria-valuemin={0}
              aria-valuemax={10000}
              aria-valuenow={filters.minGeekbenchMulti}
              aria-valuetext={filters.minGeekbenchMulti === 0 ? "Any score" : `At least ${filters.minGeekbenchMulti} points`}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  minGeekbenchMulti: parseInt(e.target.value, 10),
                }))
              }
              className="mt-1 h-1.5 w-full cursor-pointer accent-sky-600"
            />
          </div>

          {/* 3. Min Battery Capacity */}
          <div>
            <div className="flex items-center justify-between gap-2 text-[11px] font-bold">
              <span className="text-slate-700 dark:text-slate-300 truncate">Min Battery Capacity</span>
              <span className="shrink-0 whitespace-nowrap font-mono text-sky-700 dark:text-sky-400">
                ≥ {filters.minBatteryMah} mAh
              </span>
            </div>
            <input
              type="range"
              min={1800}
              max={10000}
              step={200}
              value={filters.minBatteryMah}
              aria-label="Minimum battery capacity in milliamp hours"
              aria-valuemin={1800}
              aria-valuemax={10000}
              aria-valuenow={filters.minBatteryMah}
              aria-valuetext={`At least ${filters.minBatteryMah} milliamp hours`}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  minBatteryMah: parseInt(e.target.value, 10),
                }))
              }
              className="mt-1 h-1.5 w-full cursor-pointer accent-sky-600"
            />
          </div>

          {/* 4. Min Wired Charging */}
          <div>
            <div className="flex items-center justify-between gap-2 text-[11px] font-bold">
              <span className="text-slate-700 dark:text-slate-300 truncate">Min Wired Charging</span>
              <span className="shrink-0 whitespace-nowrap font-mono text-sky-700 dark:text-sky-400">
                {filters.minWiredW === 0 ? "Any" : `≥ ${filters.minWiredW}W`}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={150}
              step={15}
              value={filters.minWiredW}
              aria-label="Minimum wired charging wattage"
              aria-valuemin={0}
              aria-valuemax={150}
              aria-valuenow={filters.minWiredW}
              aria-valuetext={filters.minWiredW === 0 ? "Any wattage" : `At least ${filters.minWiredW} watts`}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  minWiredW: parseInt(e.target.value, 10),
                }))
              }
              className="mt-1 h-1.5 w-full cursor-pointer accent-sky-600"
            />
          </div>

          {/* 5. Min OLED PWM Dimming */}
          <div>
            <div className="flex items-center justify-between gap-2 text-[11px] font-bold">
              <span className="text-slate-700 dark:text-slate-300 truncate">Min OLED PWM Dimming</span>
              <span className="shrink-0 whitespace-nowrap font-mono text-pink-700 dark:text-pink-400">
                {filters.minPwmHz === 0 ? "Any Hz" : `≥ ${filters.minPwmHz}Hz`}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={3840}
              step={240}
              value={filters.minPwmHz}
              aria-label="Minimum OLED pulse-width modulation dimming frequency"
              aria-valuemin={0}
              aria-valuemax={3840}
              aria-valuenow={filters.minPwmHz}
              aria-valuetext={filters.minPwmHz === 0 ? "Any frequency" : `At least ${filters.minPwmHz} Hertz`}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  minPwmHz: parseInt(e.target.value, 10),
                }))
              }
              className="mt-1 h-1.5 w-full cursor-pointer accent-pink-600"
            />
          </div>

          {/* 6. Max Display Diagonal */}
          <div>
            <div className="flex items-center justify-between gap-2 text-[11px] font-bold">
              <span className="text-slate-700 dark:text-slate-300 truncate">Max Display Diagonal</span>
              <span className="shrink-0 whitespace-nowrap font-mono text-amber-700 dark:text-amber-400">
                {filters.maxScreenInch >= 10.5 ? "Any Size" : `≤ ${filters.maxScreenInch.toFixed(1)}"`}
              </span>
            </div>
            <input
              type="range"
              min={5.4}
              max={10.5}
              step={0.1}
              value={filters.maxScreenInch}
              aria-label="Maximum display screen diagonal in inches"
              aria-valuemin={5.4}
              aria-valuemax={10.5}
              aria-valuenow={filters.maxScreenInch}
              aria-valuetext={filters.maxScreenInch >= 10.5 ? "Any screen size" : `Up to ${filters.maxScreenInch.toFixed(1)} inches`}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  maxScreenInch: parseFloat(e.target.value),
                }))
              }
              className="mt-1 h-1.5 w-full cursor-pointer accent-amber-600"
            />
          </div>

          {/* 7. Max Chassis Width */}
          <div>
            <div className="flex items-center justify-between gap-2 text-[11px] font-bold">
              <span className="text-slate-700 dark:text-slate-300 truncate">Max Chassis Width</span>
              <span className="shrink-0 whitespace-nowrap font-mono text-amber-700 dark:text-amber-400">
                {filters.maxWidthMm >= 225 ? "Any Width" : `≤ ${filters.maxWidthMm.toFixed(1)} mm`}
              </span>
            </div>
            <input
              type="range"
              min={65}
              max={225}
              step={1}
              value={filters.maxWidthMm}
              aria-label="Maximum chassis width in millimeters"
              aria-valuemin={65}
              aria-valuemax={225}
              aria-valuenow={filters.maxWidthMm}
              aria-valuetext={filters.maxWidthMm >= 225 ? "Any chassis width" : `Up to ${filters.maxWidthMm.toFixed(1)} millimeters`}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  maxWidthMm: parseFloat(e.target.value),
                }))
              }
              className="mt-1 h-1.5 w-full cursor-pointer accent-amber-600"
            />
          </div>

          {/* 8. Max Weight */}
          <div>
            <div className="flex items-center justify-between gap-2 text-[11px] font-bold">
              <span className="text-slate-700 dark:text-slate-300 truncate">Max Weight</span>
              <span className="shrink-0 whitespace-nowrap font-mono text-amber-700 dark:text-amber-400">
                {filters.maxWeightGrams >= 650 ? "Any Weight" : `≤ ${filters.maxWeightGrams} g`}
              </span>
            </div>
            <input
              type="range"
              min={140}
              max={650}
              step={5}
              value={filters.maxWeightGrams}
              aria-label="Maximum device weight in grams"
              aria-valuemin={140}
              aria-valuemax={650}
              aria-valuenow={filters.maxWeightGrams}
              aria-valuetext={filters.maxWeightGrams >= 650 ? "Any device weight" : `Up to ${filters.maxWeightGrams} grams`}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  maxWeightGrams: parseInt(e.target.value, 10),
                }))
              }
              className="mt-1 h-1.5 w-full cursor-pointer accent-amber-600"
            />
          </div>
        </div>

        {/* Row 5: Single-Line Hardware Feature Toggle Pills */}
        <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 dark:border-slate-800 pt-2.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mr-1 shrink-0">
            Hardware Features:
          </span>
          {[
            {
              key: "requireSiliconCarbon" as const,
              label: "Si/C Anode Battery",
            },
            {
              key: "requireWirelessCharging" as const,
              label: "Wireless Charging",
            },
            {
              key: "requireTelephoto" as const,
              label: "Telephoto / Periscope",
            },
            {
              key: "requireLargeSensor" as const,
              label: 'Large Main Sensor (≥1/1.3")',
            },
            {
              key: "requireZeroLag" as const,
              label: "Zero-Lag Shutter",
            },
            {
              key: "requireIp68" as const,
              label: "IP68 / IP69 Submersible",
            },
            {
              key: "requireUltrasonicOrFaceId" as const,
              label: "3D Ultrasonic / Face ID",
            },
          ].map((item) => {
            const active = filters[item.key];
            return (
              <button
                key={item.key}
                type="button"
                onClick={() =>
                  setFilters((f) => ({ ...f, [item.key]: !f[item.key] }))
                }
                className={`h-7 shrink-0 whitespace-nowrap inline-flex items-center gap-1 rounded-lg border px-2.5 text-[11px] font-semibold transition cursor-pointer ${
                  active
                    ? "border-sky-500 bg-sky-600 text-white shadow-2xs"
                    : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
              >
                {active && <Check className="h-3 w-3 shrink-0" />}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Results Toolbar & Grid */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs space-y-4">
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-sky-200/70 dark:border-sky-900/60 bg-sky-50/50 dark:bg-sky-950/30 p-2.5">
            <span className="text-xs font-bold text-sky-800 dark:text-sky-300 mr-1">
              Active Filters ({activeFilters.length}):
            </span>
            {activeFilters.map((pill) => (
              <button
                key={pill.id}
                type="button"
                onClick={pill.onRemove}
                className="h-7 shrink-0 whitespace-nowrap inline-flex items-center gap-1 rounded-lg border border-sky-300 dark:border-sky-800 bg-white dark:bg-slate-800 px-2 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-2xs hover:bg-rose-50 hover:border-rose-300 hover:text-rose-700 dark:hover:bg-rose-950/40 dark:hover:border-rose-800 dark:hover:text-rose-300 transition cursor-pointer"
              >
                <span>{pill.label}</span>
                <X className="h-3 w-3 text-slate-400 dark:text-slate-500 hover:text-rose-600" />
              </button>
            ))}
            <button
              type="button"
              onClick={resetFilters}
              className="h-7 shrink-0 whitespace-nowrap inline-flex items-center ml-auto text-xs font-bold text-rose-700 dark:text-rose-400 hover:underline cursor-pointer"
            >
              <span>Clear all</span>
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Showing{" "}
            <span className="font-mono text-slate-900 dark:text-slate-100">
              {Math.min(displayLimit, matchedDevices.length)}
            </span>{" "}
            of{" "}
            <span className="font-mono text-sky-700 dark:text-sky-400">
              {matchedDevices.length}
            </span>{" "}
            matching smartphones
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              Sort Results By:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 focus:border-sky-500 focus:outline-none"
            >
              <option value="LIVING_SCORE">Composite Living Score (High → Low)</option>
              <option value="NEWEST">Newest First (2026 → 2020)</option>
              <option value="PRICE_ASC">Price: Low to High</option>
              <option value="PRICE_DESC">Price: High to Low</option>
              <option value="BATTERY_DESC">Battery Capacity (mAh High → Low)</option>
              <option value="GEEKBENCH_DESC">Geekbench 6 Multi-Core (High → Low)</option>
              <option value="WEIGHT_ASC">Featherweight Mass (Light → Heavy)</option>
              <option value="PWM_DESC">PWM Dimming Frequency (Hz High → Low)</option>
              <option value="SILICON_GEEK">Alex: Performance &amp; Battery Score</option>
              <option value="CAMERA_PURIST">Elena: Camera &amp; Display Score</option>
              <option value="PRAGMATIST">Marcus: Value &amp; Price Score</option>
              <option value="DAILY_DRIVER">Maya: Comfort &amp; Everyday Score</option>
            </select>
          </div>
        </div>

        {matchedDevices.length === 0 ? (
          <div
            role="status"
            aria-live="polite"
            className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-8 sm:p-12 text-center"
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 shadow-2xs">
              <SearchX className="h-7 w-7" aria-hidden="true" />
            </div>

            <h3 className="mt-4 text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
              No matching smartphones found
            </h3>

            <p className="mt-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
              We couldn&apos;t find any devices matching all your active filter criteria. Try relaxing some constraints to expand your results.
            </p>

            <div className="mt-5 inline-flex flex-col sm:flex-row items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 max-w-lg mx-auto">
              <span className="font-bold text-slate-700 dark:text-slate-300">Suggestions:</span>
              <span className="text-slate-600 dark:text-slate-400">
                Widen release years • Increase price ceiling • Lower battery or PWM thresholds
              </span>
            </div>

            {relaxationOptions.length > 0 && (
              <div className="mt-5 max-w-xl mx-auto space-y-2">
                <span className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  1-Click Filter Relaxation Suggestions:
                </span>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {relaxationOptions.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={opt.apply}
                      className="h-8 shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 rounded-xl border border-sky-300 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/60 px-3 text-xs font-bold text-sky-800 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900 transition cursor-pointer shadow-2xs"
                    >
                      <span className="rounded bg-sky-200 dark:bg-sky-800 px-1 py-0.2 font-mono text-[10px] text-sky-900 dark:text-sky-100">
                        +{opt.count}
                      </span>
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={resetFilters}
                className="h-10 shrink-0 whitespace-nowrap inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-sky-700 transition cursor-pointer"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                <span>Reset All Filters</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
            {matchedDevices.slice(0, displayLimit).map((dev) => {
              const isPrimary = dev.id === selectedDeviceId;
              const isCompare = stagedCompareIds
                ? stagedCompareIds.includes(dev.id)
                : dev.id === compareDeviceId;

              return (
                <div
                  key={dev.id}
                  className={`rounded-2xl border p-4 transition flex flex-col justify-between gap-3 overflow-hidden min-w-0 ${
                    isPrimary
                      ? "border-sky-500 bg-sky-50/40 dark:bg-sky-950/40 shadow-xs"
                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs font-extrabold text-sky-700 dark:text-sky-400">
                            {dev.brand}
                          </span>
                          <span className="rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1.5 py-0.2 font-mono text-xs font-bold text-slate-600 dark:text-slate-300">
                            {dev.releaseDate.slice(0, 4)}
                          </span>
                          <span className="rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1.5 py-0.2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                            {dev.category}
                          </span>
                        </div>
                        <h4 className="mt-0.5 text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate">
                          {dev.name}
                        </h4>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="inline-flex items-center rounded-lg border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/60 px-2 py-0.5 font-mono text-xs font-extrabold text-sky-700 dark:text-sky-300">
                          {dev.compositeLivingScore.toFixed(1)}
                        </span>
                        <div className="mt-0.5 font-mono text-xs font-extrabold text-emerald-700 dark:text-emerald-400">
                          ${dev.currentStreetUsd}{" "}
                          <span className="text-xs font-normal text-slate-500 dark:text-slate-400 line-through">
                            ${dev.launchMsrpUsd}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Key Hardware Telemetry Chips */}
                    <div className="mt-3 grid grid-cols-2 gap-1.5 text-[11px]">
                      <div className="rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 px-2 py-1 truncate">
                        <span className="font-bold text-slate-800 dark:text-slate-200">SoC:</span>{" "}
                        <span className="text-slate-600 dark:text-slate-400">{dev.specs.socName}</span>
                      </div>
                      <div className="rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 px-2 py-1 truncate">
                        <span className="font-bold text-slate-800 dark:text-slate-200">GB6:</span>{" "}
                        <span className="font-mono text-slate-700 dark:text-slate-300">
                          {dev.specs.geekbenchSingle}/{dev.specs.geekbenchMulti}
                        </span>
                      </div>
                      <div className="rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 px-2 py-1 truncate">
                        <span className="font-bold text-slate-800 dark:text-slate-200">Battery:</span>{" "}
                        <span className="font-mono text-slate-700 dark:text-slate-300">
                          {dev.specs.batteryCapacityMah}mAh • {dev.specs.wiredChargingW}W
                        </span>
                      </div>
                      <div className="rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 px-2 py-1 truncate">
                        <span className="font-bold text-slate-800 dark:text-slate-200">Screen:</span>{" "}
                        <span className="font-mono text-slate-700 dark:text-slate-300">
                          {dev.specs.displaySizeInch}&quot; • {dev.specs.pwmDimmingHz}Hz PWM
                        </span>
                      </div>
                      <div className="rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 px-2 py-1 truncate">
                        <span className="font-bold text-slate-800 dark:text-slate-200">Main Cam:</span>{" "}
                        <span className="text-slate-600 dark:text-slate-400">
                          {dev.specs.mainSensorSize}
                        </span>
                      </div>
                      <div className="rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 px-2 py-1 truncate">
                        <span className="font-bold text-slate-800 dark:text-slate-200">Body:</span>{" "}
                        <span className="font-mono text-slate-700 dark:text-slate-300">
                          {dev.specs.weightGrams}g • {dev.specs.widthMm}mm • {dev.specs.ipRating}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-[1fr_auto] items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => onSelectPrimary(dev.id, true)}
                      className="h-9 min-w-0 inline-flex items-center justify-center gap-1.5 rounded-xl bg-sky-600 px-3 text-xs font-bold text-white hover:bg-sky-700 transition cursor-pointer shadow-xs"
                    >
                      <span className="truncate">Review & Specs</span>
                      <ArrowUpRight className="h-3.5 w-3.5 shrink-0" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectCompare(dev.id, false)}
                      className={`h-9 shrink-0 whitespace-nowrap inline-flex items-center justify-center gap-1 rounded-xl border px-3 text-xs font-bold transition cursor-pointer ${
                        isCompare
                          ? "border-emerald-400 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300"
                          : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-sky-300 hover:text-sky-700 dark:hover:border-sky-600 dark:hover:text-sky-300"
                      }`}
                    >
                      <ArrowLeftRight className="h-3.5 w-3.5 shrink-0" />
                      <span>{isCompare ? "✓ Staged" : "Vs Compare"}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {matchedDevices.length > displayLimit && (
          <div className="pt-2 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => setDisplayLimit((prev) => prev + 48)}
              className="h-9 shrink-0 whitespace-nowrap inline-flex items-center rounded-xl border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/60 px-5 text-xs font-bold text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/60 transition cursor-pointer"
            >
              Load 48 More ({matchedDevices.length - displayLimit} remaining)
            </button>
            <button
              type="button"
              onClick={() => setDisplayLimit(matchedDevices.length)}
              className="h-9 shrink-0 whitespace-nowrap inline-flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
            >
              Show All ({matchedDevices.length})
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

