"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DeviceLabTelemetryCard } from "@/components/DeviceLabTelemetryCard";
import { getDeviceLabTelemetry } from "@/lib/lab-measurements";
import { synthesizeDeviceEvidence } from "@/lib/evidence-generator";
import {
  Cpu,
  Camera,
  Share2,
  DollarSign,
  Smartphone,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  ArrowLeftRight,
  ShieldCheck,
  MessageSquare,
  FileCheck2,
  TrendingDown,
  Zap,
  Eye,
  BatteryCharging,
  Scale,
  Check,
  PanelLeft,
  LockKeyhole,
  LogOut,
  Sun,
  Moon,
} from "lucide-react";
import {
  AI_EDITORS,
  EDITOR_LIST,
  EditorPersonaId,
  BuyRecommendation,
  calculateLivingScores,
  DEFAULT_PERSONA_WEIGHTS,
} from "@/lib/editors";
import { usePersistentState } from "@/hooks/usePersistentState";
import {
  INITIAL_DEVICES,
  SmartphoneDevice,
  EditorialDraftItem,
} from "@/lib/seed-data";
import { FULL_UNIFIED_CATALOG } from "@/lib/brands/catalog-loader";
import {
  computeSmartSpecDiff,
  DebateResponse,
  generateGroundedDebate,
} from "@/lib/debate-engine";
import { RadarChart } from "@/components/RadarChart";
import {
  PhoneSizeComparator,
  formatDeviceLabel,
  getFoldableKinematics,
} from "@/components/PhoneSizeComparator";
import { FullSpecSheet } from "@/components/FullSpecSheet";
import { ManualSpecEntryStudio } from "@/components/ManualSpecEntryStudio";
import { PhoneFinderStudio } from "@/components/PhoneFinderStudio";
import { ComparisonDock } from "@/components/ComparisonDock";
import {
  CatalogCategoryFilter,
  CatalogSidebar,
  CatalogSortMode,
  CatalogYearFilter,
} from "@/features/catalog/CatalogSidebar";
import {
  DEBATE_SCENARIOS,
  DebateArena,
} from "@/features/debate/DebateArena";
import { ExpandedEditorialCard } from "@/features/editorial/types";
import { EditorialModal } from "@/features/editorial/EditorialModal";
import {
  AdminAccessPanel,
  AdminAccessStatus,
} from "@/features/admin/AdminAccessPanel";

type ActiveTab =
  | "DEVICE_BENTO"
  | "PHONE_FINDER"
  | "COMPARE_STUDIO"
  | "DEBATE_ARENA"
  | "ADMIN_DESK";

interface DebateSnapshot {
  debate: DebateResponse;
  deviceAId: string;
  deviceBId: string;
}

const EDITOR_ICONS: Record<EditorPersonaId, React.ReactNode> = {
  SILICON_GEEK: <Cpu className="h-4 w-4 text-sky-600" />,
  CAMERA_PURIST: <Camera className="h-4 w-4 text-pink-600" />,
  PRAGMATIST: <DollarSign className="h-4 w-4 text-emerald-600" />,
  DAILY_DRIVER: <Smartphone className="h-4 w-4 text-amber-600" />,
};

const BUY_BADGE_STYLES: Record<
  BuyRecommendation,
  { label: string; className: string }
> = {
  STRONG_BUY: {
    label: "STRONG BUY",
    className: "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
  },
  BUY_ON_SALE: {
    label: "BUY AT REFERENCE PRICE",
    className: "bg-sky-50 text-sky-700 border-sky-300 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800",
  },
  WAIT_FOR_DROP: {
    label: "WAIT FOR DROP",
    className: "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
  },
  SKIP: {
    label: "OVERPRICED / SKIP",
    className: "bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800",
  },
};

const FULL_INITIAL_CATALOG: SmartphoneDevice[] = FULL_UNIFIED_CATALOG;

export default function PhoneIndexPlatform() {
  const router = useRouter();
  const [devices, setDevices] =
    useState<SmartphoneDevice[]>(FULL_INITIAL_CATALOG);
  const [drafts, setDrafts] = useState<EditorialDraftItem[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>("DEVICE_BENTO");
  const [catalogOpen, setCatalogOpen] = useState(false);

  // Selected primary & comparison devices
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(
    INITIAL_DEVICES[0].id
  );
  const [compareDeviceId, setCompareDeviceId] = useState<string>(
    INITIAL_DEVICES[1].id
  );
  const [stagedCompareIds, setStagedCompareIds] = usePersistentState<string[]>(
    "phoneindex_staged_compare_ids",
    [INITIAL_DEVICES[0].id, INITIAL_DEVICES[1].id]
  );

  const handleToggleCompareStaging = (deviceId: string) => {
    setStagedCompareIds((prev) => {
      if (prev.includes(deviceId)) {
        return prev.filter((id) => id !== deviceId);
      }
      if (prev.length >= 4) {
        triggerToast("Comparison dock full (max 4 devices). Remove one first.");
        return prev;
      }
      const next = [...prev, deviceId];
      triggerToast(`Added to comparison dock (${next.length} of 4).`);
      return next;
    });
  };

  // Catalog filter & sort
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] =
    useState<CatalogCategoryFilter>("ALL");
  const [brandFilter, setBrandFilter] = useState<string>("ALL");
  const [yearFilter, setYearFilter] = useState<CatalogYearFilter>("ALL");
  const [sortByEditor, setSortByEditor] =
    useState<CatalogSortMode>("COMPOSITE");

  // Interactive Living Score Price Simulator per device
  const [simulatedPrices, setSimulatedPrices] = useState<Record<string, number>>(
    {}
  );

  // Custom user priority weights (0.1 to 1.0)
  const [userWeights, setUserWeights] = usePersistentState<Record<EditorPersonaId, number>>(
    "phoneindex_user_weights",
    DEFAULT_PERSONA_WEIGHTS
  );
  const [showWeightTuner, setShowWeightTuner] = useState(false);
  const [showEvidence, setShowEvidence] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("phoneindex_theme") as "light" | "dark" | null;
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const initial = stored ?? (prefersDark ? "dark" : "light");
      document.documentElement.classList.toggle("dark", initial === "dark");
      if (initial !== "light") {
        queueMicrotask(() => {
          setTheme(initial);
        });
      }
    } catch {
      // LocalStorage unavailable in sandboxes
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    try {
      localStorage.setItem("phoneindex_theme", nextTheme);
    } catch {
      // Ignore
    }
  };

  // URL Query Parameter Synchronization (?device=...&tab=...)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const deviceParam = params.get("device");
    const tabParam = params.get("tab") as ActiveTab | null;
    queueMicrotask(() => {
      if (deviceParam) {
        const match = devices.find(
          (d) =>
            d.slug.toLowerCase() === deviceParam.toLowerCase() ||
            d.id.toLowerCase() === deviceParam.toLowerCase()
        );
        if (match) setSelectedDeviceId(match.id);
      }
      if (
        tabParam &&
        [
          "DEVICE_BENTO",
          "PHONE_FINDER",
          "COMPARE_STUDIO",
          "DEBATE_ARENA",
          "ADMIN_DESK",
        ].includes(tabParam)
      ) {
        setActiveTab(tabParam);
      }
    });
  }, [devices]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const currentDev = devices.find((d) => d.id === selectedDeviceId);
    if (currentDev) {
      params.set("device", currentDev.slug);
    }
    params.set("tab", activeTab);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, "", newUrl);
  }, [selectedDeviceId, activeTab, devices]);

  // Compare Studio Smart Diff toggle
  const [onlyShowDifferences, setOnlyShowDifferences] = useState(false);

  // Debate Arena state
  const [debatePrompt, setDebatePrompt] = useState<string>(
    DEBATE_SCENARIOS[0]
  );
  const [activeDebate, setActiveDebate] = useState<DebateSnapshot | null>(null);
  const [isDebating, setIsDebating] = useState(false);

  // Admin Governance state (Approval-Only Intervention + Auto-Pilot + Manual Spec Support)
  const [adminAccess, setAdminAccess] =
    useState<AdminAccessStatus>("CHECKING");
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [stagedManualDevices, setStagedManualDevices] = useState<
    Record<string, SmartphoneDevice>
  >({});

  // Full-Text Editorial Modal state when user clicks any card
  const [expandedCardModal, setExpandedCardModal] =
    useState<ExpandedEditorialCard | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/admin/session")
      .then((response) => response.json())
      .then((data: { configured?: boolean; authenticated?: boolean }) => {
        if (!active) return;
        setAdminAccess(
          data.authenticated
            ? "AUTHENTICATED"
            : data.configured
            ? "LOCKED"
            : "NOT_CONFIGURED"
        );
      })
      .catch(() => {
        if (active) setAdminAccess("LOCKED");
      });
    return () => {
      active = false;
    };
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4200);
  };

  const selectedDevice = useMemo(
    () => devices.find((d) => d.id === selectedDeviceId) || devices[0],
    [devices, selectedDeviceId]
  );

  const compareDevice = useMemo(
    () =>
      devices.find((d) => d.id === compareDeviceId) ||
      devices.find((d) => d.id !== selectedDevice.id) ||
      devices[0],
    [devices, compareDeviceId, selectedDevice]
  );

  // Calculate dynamic Living Score for the selected device
  const activeSimulatedPrice =
    simulatedPrices[selectedDevice.id] ?? selectedDevice.currentStreetUsd;

  const livingMetrics = useMemo(() => {
    return calculateLivingScores({
      launchMsrpUsd: selectedDevice.launchMsrpUsd,
      simulatedStreetUsd: activeSimulatedPrice,
      osSupportYears: selectedDevice.osSupportYears,
      basePragmatistScore: selectedDevice.verdicts.PRAGMATIST.score,
      baseStreetUsd: selectedDevice.currentStreetUsd,
      siliconScore: selectedDevice.verdicts.SILICON_GEEK.score,
      cameraScore: selectedDevice.verdicts.CAMERA_PURIST.score,
      dailyDriverScore: selectedDevice.verdicts.DAILY_DRIVER.score,
      customWeights: userWeights,
    });
  }, [selectedDevice, activeSimulatedPrice, userWeights]);

  // Filtered and sorted device list
  const sortedDevices = useMemo(() => {
    return [...devices]
      .filter((d) => {
        if (categoryFilter !== "ALL" && d.category !== categoryFilter) {
          return false;
        }
        if (brandFilter !== "ALL" && d.brand !== brandFilter) {
          return false;
        }
        if (yearFilter !== "ALL" && !d.releaseDate.includes(yearFilter)) {
          return false;
        }
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          d.name.toLowerCase().includes(q) ||
          d.brand.toLowerCase().includes(q) ||
          d.specs.socName.toLowerCase().includes(q) ||
          d.category.toLowerCase().includes(q) ||
          d.releaseDate.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (sortByEditor === "COMPOSITE") {
          return b.compositeLivingScore - a.compositeLivingScore;
        }
        return (
          b.verdicts[sortByEditor].score - a.verdicts[sortByEditor].score
        );
      });
  }, [devices, searchQuery, categoryFilter, brandFilter, yearFilter, sortByEditor]);

  // Smart Spec Diff rows for Compare Studio
  const specDiffRows = useMemo(() => {
    const rows = computeSmartSpecDiff(selectedDevice, compareDevice);
    return onlyShowDifferences ? rows.filter((r) => r.isDifferent) : rows;
  }, [selectedDevice, compareDevice, onlyShowDifferences]);

  // Default or active debate
  const displayedDebate = useMemo(() => {
    if (
      activeDebate?.deviceAId === selectedDevice.id &&
      activeDebate.deviceBId === compareDevice.id
    ) {
      return activeDebate.debate;
    }
    return generateGroundedDebate({
      query: debatePrompt,
      deviceA: selectedDevice,
      deviceB: compareDevice,
    });
  }, [activeDebate, debatePrompt, selectedDevice, compareDevice]);

  // Run deterministic debate via API
  const handleRunDebate = async (customPrompt?: string) => {
    const q =
      (customPrompt ?? debatePrompt).trim() ||
      "Best overall flagship for 3+ years of ownership";
    setDebatePrompt(q);
    setIsDebating(true);
    try {
      const res = await fetch("/api/debate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: q,
          deviceAId: selectedDevice.id,
          deviceBId: compareDevice.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Debate request failed.");
      }
      if (data.ok && data.debate) {
        setActiveDebate({
          debate: data.debate,
          deviceAId: selectedDevice.id,
          deviceBId: compareDevice.id,
        });
      }
    } catch {
      setActiveDebate({
        debate: generateGroundedDebate({
          query: q,
          deviceA: selectedDevice,
          deviceB: compareDevice,
        }),
        deviceAId: selectedDevice.id,
        deviceBId: compareDevice.id,
      });
    } finally {
      setIsDebating(false);
    }
  };

  // Approve a staged editorial draft for the current browser session
  const handleApproveDraft = async (draft: EditorialDraftItem) => {
    setApprovingId(draft.id);
    try {
      if (stagedManualDevices[draft.deviceId]) {
        const manualDev = stagedManualDevices[draft.deviceId];
        setDevices((prev) => [
          manualDev,
          ...prev.filter((d) => d.id !== manualDev.id),
        ]);
        setDrafts((prev) =>
          prev.map((d) =>
            d.id === draft.id ? { ...d, status: "APPROVED_PUBLISHED" } : d
          )
        );
      } else if (draft.presetKey) {
        const res = await fetch("/api/ingest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ presetKey: draft.presetKey }),
        });
        const data = await res.json();
        if (data.ok && data.device) {
          setDevices((prev) => {
            if (prev.some((d) => d.slug === data.device.slug)) return prev;
            return [data.device, ...prev];
          });
          setDrafts((prev) =>
            prev.map((d) =>
              d.id === draft.id
                ? {
                    ...d,
                    deviceId: data.device.id,
                    status: "APPROVED_PUBLISHED",
                  }
                : d
            )
          );
        }
      } else {
        setDrafts((prev) =>
          prev.map((d) =>
            d.id === draft.id ? { ...d, status: "APPROVED_PUBLISHED" } : d
          )
        );

        if (
          draft.deviceId === "dev-pixel-9-pro-xl" &&
          draft.proposedNewPriceUsd
        ) {
          setDevices((prev) =>
            prev.map((dev) =>
              dev.id === "dev-pixel-9-pro-xl"
                ? {
                    ...dev,
                    currentStreetUsd: 749,
                    compositeLivingScore: 8.6,
                    buyRecommendation: "STRONG_BUY",
                    verdicts: {
                      ...dev.verdicts,
                      PRAGMATIST: {
                        ...dev.verdicts.PRAGMATIST,
                        score: 8.9,
                        headline:
                          "Flash promo to $749 ($107/yr across 7 OS years) triggers an automatic STRONG BUY upgrade.",
                      },
                    },
                  }
                : dev
            )
          );
        } else if (draft.deviceId === "dev-s25-ultra") {
          setDevices((prev) =>
            prev.map((dev) =>
              dev.id === "dev-s25-ultra"
                ? {
                    ...dev,
                    compositeLivingScore: 8.9,
                    specs: {
                      ...dev.specs,
                      shutterLagRating:
                        "Fast (One UI 7.1 firmware raised indoor face shutter floor to 1/60s)",
                    },
                    verdicts: {
                      ...dev.verdicts,
                      CAMERA_PURIST: {
                        ...dev.verdicts.CAMERA_PURIST,
                        score: 9.0,
                        headline:
                          "One UI 7.1 patch cuts indoor motion blur by ~35%, elevating its hybrid camera score to 9.0.",
                      },
                    },
                  }
                : dev
            )
          );
        }
      }

      triggerToast(
        `Approved "${draft.deviceName}" for this browser session.`
      );
    } finally {
      setApprovingId(null);
    }
  };

  const handleDismissDraft = (draftId: string) => {
    setDrafts((prev) =>
      prev.map((d) => (d.id === draftId ? { ...d, status: "DISMISSED" } : d))
    );
    triggerToast("Editorial draft dismissed.");
  };

  const visibleDrafts = drafts.filter((d) => d.status !== "DISMISSED");
  const pendingDraftCount = visibleDrafts.filter(
    (d) => d.status === "PENDING_REVIEW"
  ).length;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 rounded-xl border border-emerald-300 bg-white px-4 py-3 text-sm font-semibold text-emerald-900 shadow-xl">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {expandedCardModal && (
        <EditorialModal
          card={expandedCardModal}
          onClose={() => setExpandedCardModal(null)}
        />
      )}

      {activeTab !== "COMPARE_STUDIO" && (
        <ComparisonDock
          devices={devices}
          stagedDeviceIds={stagedCompareIds}
          onRemoveDevice={(id) =>
            setStagedCompareIds((prev) => prev.filter((dId) => dId !== id))
          }
          onClearAll={() => setStagedCompareIds([])}
          onLaunchCompare={() => {
            const stagedDevs = stagedCompareIds
              .map((id) => devices.find((d) => d.id === id))
              .filter((d): d is SmartphoneDevice => Boolean(d));

            // When 3 or 4 devices staged: route directly to dedicated SSR 4-way comparison matrix!
            if (stagedDevs.length > 2) {
              const slugsParam = stagedDevs.map((d) => d.slug).join("-vs-");
              router.push(`/compare/${slugsParam}`);
              return;
            }

            // When 2 devices staged: sync primary & challenger and switch to COMPARE_STUDIO
            if (stagedDevs.length === 2) {
              setSelectedDeviceId(stagedDevs[0].id);
              setCompareDeviceId(stagedDevs[1].id);
              setActiveTab("COMPARE_STUDIO");
              return;
            }

            if (stagedDevs.length === 1) {
              setSelectedDeviceId(stagedDevs[0].id);
              setActiveTab("DEVICE_BENTO");
            }
          }}
        />
      )}

      {/* Top Navigation & Brand Header: Pure Crisp White / Dark Mode Ready */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 dark:border-slate-800 dark:bg-slate-950/95 backdrop-blur-md shadow-xs">
        <div className="mx-auto grid max-w-[1600px] grid-cols-[1fr_auto] items-center gap-2 px-3 py-2 lg:flex lg:justify-between lg:px-6">
          {/* Brand Logo Home Reset Link */}
          <Link
            href="/"
            onClick={() => {
              setActiveTab("DEVICE_BENTO");
              setSearchQuery("");
              setCategoryFilter("ALL");
              setBrandFilter("ALL");
              setYearFilter("ALL");
            }}
            className="hover:opacity-90 transition group cursor-pointer"
            title="Reset to PhoneIndex Home"
          >
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 dark:bg-sky-950/60 shadow-2xs sm:h-9 sm:w-9 sm:rounded-xl group-hover:scale-105 transition-transform">
                <Sparkles className="h-5 w-5 text-sky-600 dark:text-sky-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
                    PHONE<span className="text-sky-600 dark:text-sky-400">INDEX</span>
                  </span>
                  <span className="hidden rounded-md bg-sky-50 px-1.5 py-0.5 font-mono text-xs font-bold text-sky-700 dark:bg-sky-950/70 dark:text-sky-300 sm:inline">
                    v2.6
                  </span>
                </div>
                <p className="hidden text-[11px] leading-tight max-w-[240px] 2xl:max-w-md line-clamp-2 text-slate-500 dark:text-slate-400 xl:block">
                  Compare smarter. Choose confidently. Structured specs and dynamic Living Scores.
                </p>
              </div>
            </div>
          </Link>

          {/* Primary Mode Switcher */}
          <div className="relative order-3 col-span-2 w-full lg:order-none lg:col-span-1 lg:w-auto lg:shrink-0">
            <nav className="flex w-full items-center gap-1 overflow-x-auto rounded-lg bg-slate-100/80 dark:bg-slate-900/80 p-1 lg:w-auto lg:rounded-xl lg:shrink-0">
              <button
                onClick={() => setActiveTab("DEVICE_BENTO")}
                className={`flex shrink-0 items-center gap-1.5 rounded-md px-2 xl:px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  activeTab === "DEVICE_BENTO"
                    ? "bg-white text-sky-700 shadow-xs border border-slate-200/80 dark:bg-slate-800 dark:text-white dark:shadow-none dark:border-slate-700"
                    : "text-slate-600 hover:bg-white/60 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/60"
                }`}
              >
                <Smartphone className="h-3.5 w-3.5" />
                <span>Device Bento<span className="hidden xl:inline"> & Review</span></span>
              </button>

              <button
                onClick={() => setActiveTab("PHONE_FINDER")}
                className={`flex shrink-0 items-center gap-1.5 rounded-md px-2 xl:px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  activeTab === "PHONE_FINDER"
                    ? "bg-white text-sky-700 shadow-xs border border-slate-200/80 dark:bg-slate-800 dark:text-white dark:shadow-none dark:border-slate-700"
                    : "text-slate-600 hover:bg-white/60 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/60"
                }`}
              >
                <Sliders className="h-3.5 w-3.5" />
                <span>Phone Finder</span>
              </button>

              <button
                onClick={() => setActiveTab("COMPARE_STUDIO")}
                className={`flex shrink-0 items-center gap-1.5 rounded-md px-2 xl:px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  activeTab === "COMPARE_STUDIO"
                    ? "bg-white text-sky-700 shadow-xs border border-slate-200/80 dark:bg-slate-800 dark:text-white dark:shadow-none dark:border-slate-700"
                    : "text-slate-600 hover:bg-white/60 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/60"
                }`}
              >
                <ArrowLeftRight className="h-3.5 w-3.5" />
                <span>Smart Spec Diff</span>
              </button>

              <button
                onClick={() => setActiveTab("DEBATE_ARENA")}
                className={`flex shrink-0 items-center gap-1.5 rounded-md px-2 xl:px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  activeTab === "DEBATE_ARENA"
                    ? "bg-white text-sky-700 shadow-xs border border-slate-200/80 dark:bg-slate-800 dark:text-white dark:shadow-none dark:border-slate-700"
                    : "text-slate-600 hover:bg-white/60 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/60"
                }`}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span>Ask the Editors</span>
              </button>

              <button
                onClick={() => setActiveTab("ADMIN_DESK")}
                className={`flex shrink-0 items-center gap-1.5 rounded-md px-2 xl:px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  activeTab === "ADMIN_DESK"
                    ? "bg-white text-emerald-700 shadow-xs border border-slate-200/80 dark:bg-slate-800 dark:text-white dark:shadow-none dark:border-slate-700"
                    : "text-slate-600 hover:bg-white/60 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/60"
                }`}
              >
                {adminAccess === "AUTHENTICATED" ? (
                  <FileCheck2 className="h-3.5 w-3.5" />
                ) : (
                  <LockKeyhole className="h-3.5 w-3.5" />
                )}
                <span>{adminAccess === "AUTHENTICATED" ? "Editorial Desk" : "Admin"}</span>
                {adminAccess === "AUTHENTICATED" && pendingDraftCount > 0 && (
                  <span className="ml-0.5 rounded-full bg-amber-100 border border-amber-300 px-1.5 py-0.2 text-xs font-bold text-amber-800 dark:bg-amber-950 dark:border-amber-700 dark:text-amber-200">
                    {pendingDraftCount}
                  </span>
                )}
              </button>
            </nav>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 rounded-r-lg bg-gradient-to-l from-slate-200/90 via-slate-100/60 to-transparent dark:from-slate-900 dark:via-slate-900/60 lg:hidden"
            />
          </div>

          {/* Priority Weight Tuner Button & Theme Toggle */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
              className="whitespace-nowrap shrink-0 h-8 px-2.5 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              {theme === "dark" ? (
                <Sun className="h-3.5 w-3.5 text-amber-500" />
              ) : (
                <Moon className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300" />
              )}
              <span className="hidden sm:inline whitespace-nowrap">{theme === "dark" ? "Light" : "Dark"}</span>
            </button>
            <button
              type="button"
              onClick={() => setCatalogOpen(true)}
              aria-label="Open device catalog"
              className="whitespace-nowrap shrink-0 h-8 px-2.5 inline-flex items-center gap-1.5 rounded-lg bg-sky-50 text-xs font-bold text-sky-700 dark:bg-sky-950/70 dark:text-sky-300 lg:hidden cursor-pointer"
            >
              <PanelLeft className="h-4 w-4" />
              <span>Catalog</span>
            </button>
            <button
              type="button"
              onClick={() => setShowWeightTuner((v) => !v)}
              className={`whitespace-nowrap shrink-0 h-8 px-2.5 inline-flex items-center gap-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                showWeightTuner
                  ? "border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-500 dark:bg-sky-950/60 dark:text-sky-300"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              }`}
            >
              <Sliders className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
              <span className="hidden sm:inline whitespace-nowrap shrink-0">Tune Buyer Priorities</span>
            </button>
          </div>
        </div>

        {/* Collapsible Buyer Priority Sliders */}
        {showWeightTuner && (
          <div className="border-t border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/90 px-4 py-3 sm:px-6">
            <div className="mx-auto max-w-[1600px] flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Personalize Composite Living Score Weights
                </span>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Drag how much you care about each AI Editor&apos;s domain to dynamically re-weight the Living Score.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {EDITOR_LIST.map((ed) => (
                  <div
                    key={ed.id}
                    className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-800 px-3 py-2 shadow-2xs"
                  >
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className={ed.textAccent}>{ed.roleTitle.replace("The ", "")}</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300">
                        {Math.round(userWeights[ed.id] * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={userWeights[ed.id]}
                      aria-label={`${ed.roleTitle.replace("The ", "")} persona weight`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(userWeights[ed.id] * 100)}
                      aria-valuetext={`${Math.round(userWeights[ed.id] * 100)} percent`}
                      onChange={(e) =>
                        setUserWeights((prev) => ({
                          ...prev,
                          [ed.id]: parseFloat(e.target.value),
                        }))
                      }
                      className="mt-1.5 h-1.5 w-full cursor-pointer accent-sky-600"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Layout: Left Device Catalog Sidebar + Right Workspace */}
      <div className={`mx-auto flex w-full max-w-[1600px] flex-1 flex-col lg:flex-row gap-5 p-4 sm:p-6 ${stagedCompareIds.length > 0 ? "pb-40" : ""}`}>
        {/* Left Sidebar: Grounded Smartphone Leaderboard */}
        <CatalogSidebar
          isOpen={catalogOpen}
          onClose={() => setCatalogOpen(false)}
          devices={devices}
          sortedDevices={sortedDevices}
          selectedDeviceId={selectedDevice.id}
          selectedCompositeScore={livingMetrics.compositeLivingScore}
          simulatedPrices={simulatedPrices}
          searchQuery={searchQuery}
          categoryFilter={categoryFilter}
          brandFilter={brandFilter}
          yearFilter={yearFilter}
          sortByEditor={sortByEditor}
          onSearchQueryChange={setSearchQuery}
          onCategoryFilterChange={setCategoryFilter}
          onBrandFilterChange={setBrandFilter}
          onYearFilterChange={setYearFilter}
          onSortByEditorChange={setSortByEditor}
          onSelectDevice={setSelectedDeviceId}
          onCompareDevice={(deviceId) => {
            setCompareDeviceId(deviceId);
            handleToggleCompareStaging(deviceId);
            if (activeTab === "DEVICE_BENTO") {
              setActiveTab("COMPARE_STUDIO");
            }
          }}
        />

        {/* Right Main Workspace */}
        <main className="flex-1 min-w-0 space-y-5">
          {/* =========================================================
              TAB 0: GSMARENA-SCALE PARAMETRIC PHONE FINDER STUDIO
             ========================================================= */}
          {activeTab === "PHONE_FINDER" && (
            <PhoneFinderStudio
              devices={devices}
              selectedDeviceId={selectedDevice.id}
              compareDeviceId={compareDevice.id}
              stagedCompareIds={stagedCompareIds}
              onSelectPrimary={(id, switchToBento) => {
                setSelectedDeviceId(id);
                if (switchToBento) setActiveTab("DEVICE_BENTO");
              }}
              onSelectCompare={(id, switchToCompare) => {
                handleToggleCompareStaging(id);
                if (switchToCompare) setActiveTab("COMPARE_STUDIO");
              }}
            />
          )}

          {/* =========================================================
              TAB 1: HIGH-DENSITY DEVICE BENTO & LIVING REVIEW
             ========================================================= */}
          {activeTab === "DEVICE_BENTO" && (
            <>
              {/* Top Hero Bento Card */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                {/* Device Identity + Key Highlights (7 cols) */}
                <div className="xl:col-span-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs flex flex-col justify-between dark:border-slate-800 dark:bg-slate-900">
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-sky-50 border border-sky-200 px-2 py-0.5 text-xs font-bold text-sky-700 dark:bg-sky-950/60 dark:border-sky-800 dark:text-sky-300">
                          {selectedDevice.brand}
                        </span>
                        <span className="rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300">
                          {selectedDevice.category}
                        </span>
                        <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                          Released {selectedDevice.releaseDate}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (typeof window !== "undefined") {
                              const url = `${window.location.origin}/devices/${selectedDevice.slug}`;
                              navigator.clipboard.writeText(url).then(
                                () => triggerToast(`Copied shareable link for ${selectedDevice.brand} ${selectedDevice.name}!`),
                                () => triggerToast("Failed to copy link to clipboard.")
                              );
                            }
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-sky-50 hover:border-sky-300 hover:text-sky-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                          title="Copy shareable link"
                        >
                          <Share2 className="h-3.5 w-3.5" />
                          <span>Copy Shareable Link</span>
                        </button>

                        <span
                          className={`rounded-lg border px-2.5 py-1 font-mono text-xs font-bold ${
                            BUY_BADGE_STYLES[livingMetrics.buyRecommendation]
                              .className
                          }`}
                        >
                          {
                            BUY_BADGE_STYLES[livingMetrics.buyRecommendation]
                              .label
                          }
                        </span>
                      </div>
                    </div>

                    <h1 className="mt-2.5 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                      {formatDeviceLabel(selectedDevice)}
                    </h1>
                    <p className="mt-1.5 text-sm text-slate-600 leading-relaxed dark:text-slate-300">
                      {selectedDevice.tagline}
                    </p>

                    {/* 6 High-Density Hardware Pills */}
                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 dark:border-slate-800 dark:bg-slate-800/70">
                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase text-sky-700 dark:text-sky-400">
                          <Cpu className="h-3.5 w-3.5" />
                          <span>Silicon & Node</span>
                        </div>
                        <div className="mt-1 text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                          {selectedDevice.specs.socName}
                        </div>
                        <div className="font-mono text-xs text-slate-500 dark:text-slate-400">
                          {selectedDevice.specs.socNodeNm}nm •{" "}
                          {selectedDevice.specs.wildlifeStabilityPct}% Stability
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 dark:border-slate-800 dark:bg-slate-800/70">
                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase text-pink-700 dark:text-pink-400">
                          <Camera className="h-3.5 w-3.5" />
                          <span>Primary & Periscope</span>
                        </div>
                        <div className="mt-1 text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                          {selectedDevice.specs.mainSensorSize} Main
                        </div>
                        <div className="font-mono text-xs text-slate-500 dark:text-slate-400 truncate">
                          {selectedDevice.specs.telephotoSpecs.split("(")[0]}
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 dark:border-slate-800 dark:bg-slate-800/70">
                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase text-emerald-700 dark:text-emerald-400">
                          <BatteryCharging className="h-3.5 w-3.5" />
                          <span>Battery &amp; Endurance</span>
                        </div>
                        <div className="mt-1 text-xs font-bold text-slate-900 dark:text-slate-100">
                          {selectedDevice.specs.batteryCapacityMah}mAh ({selectedDevice.specs.wiredChargingW}W)
                        </div>
                        <div className="font-mono text-xs text-slate-500 dark:text-slate-400 truncate">
                          Active: {getDeviceLabTelemetry(selectedDevice).battery.activeUseScoreHours.toFixed(1)}h • 0-100% {selectedDevice.specs.fullChargeMins}m
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 dark:border-slate-800 dark:bg-slate-800/70">
                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase text-indigo-700 dark:text-indigo-400">
                          <Eye className="h-3.5 w-3.5" />
                          <span>Display & Eye Care</span>
                        </div>
                        <div className="mt-1 text-xs font-bold text-slate-900 dark:text-slate-100">
                          {selectedDevice.specs.displaySizeInch}&quot;{" "}
                          {selectedDevice.specs.peakBrightnessNits} nits
                        </div>
                        <div className="font-mono text-xs text-slate-500 dark:text-slate-400">
                          {selectedDevice.specs.pwmDimmingHz}Hz PWM Dimming
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 dark:border-slate-800 dark:bg-slate-800/70">
                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase text-amber-700 dark:text-amber-400">
                          <Scale className="h-3.5 w-3.5" />
                          <span>Pocket Ergonomics</span>
                        </div>
                        <div className="mt-1 text-xs font-bold text-slate-900 dark:text-slate-100">
                          {selectedDevice.specs.weightGrams}g •{" "}
                          {selectedDevice.specs.widthMm}mm wide
                        </div>
                        <div className="font-mono text-xs text-slate-500 dark:text-slate-400 truncate">
                          {selectedDevice.specs.fingerprintType}
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 dark:border-slate-800 dark:bg-slate-800/70">
                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase text-emerald-700 dark:text-emerald-400">
                          <DollarSign className="h-3.5 w-3.5" />
                          <span>True Ownership Cost</span>
                        </div>
                        <div className="mt-1 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                          ${livingMetrics.costPerYearUsd}/yr ({selectedDevice.osSupportYears}{" "}
                          yrs OS)
                        </div>
                        <div className="font-mono text-xs text-slate-500 dark:text-slate-400">
                          ${activeSimulatedPrice} street ({livingMetrics.discountPct}% off)
                        </div>
                      </div>
                    </div>

                    {/* Dedicated Foldable Dual-State Architecture & Hinge Strip (Only for Foldables) */}
                    {(() => {
                      const fk = getFoldableKinematics(selectedDevice);
                      if (!fk) return null;
                      return (
                        <div className="mt-3.5 rounded-xl border border-indigo-200 bg-indigo-50/50 p-3 space-y-2 dark:border-indigo-900/60 dark:bg-indigo-950/40">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="rounded bg-indigo-600 px-2 py-0.5 font-mono text-xs font-extrabold uppercase tracking-wider text-white">
                                {fk.foldType === "BOOK_FOLD"
                                   ? "Book-Style Foldable"
                                   : "Clamshell Flip Foldable"}
                              </span>
                              <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
                                Dual-State Dimensions, Hinge & Display Architecture
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setActiveTab("COMPARE_STUDIO")}
                              className="rounded-md border border-indigo-300 bg-white px-2.5 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition dark:border-indigo-800 dark:bg-slate-900 dark:text-indigo-300 dark:hover:bg-indigo-900/40"
                            >
                              Inspect Open vs Folded in Visualizer →
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-xs">
                            <div className="rounded-lg border border-indigo-200/80 bg-white p-2 dark:border-indigo-900/80 dark:bg-slate-900">
                              <div className="text-xs font-bold uppercase text-indigo-700 dark:text-indigo-400">
                                Unfolded Open Canvas
                              </div>
                              <div className="font-extrabold text-slate-900 dark:text-slate-100 mt-0.5">
                                {fk.unfoldedHeightMm} × {fk.unfoldedWidthMm} ×{" "}
                                {fk.unfoldedThicknessMm}mm
                              </div>
                              <div className="text-xs text-slate-600 dark:text-slate-400 truncate">
                                {fk.innerDisplayLabel}
                              </div>
                            </div>

                            <div className="rounded-lg border border-indigo-200/80 bg-white p-2 dark:border-indigo-900/80 dark:bg-slate-900">
                              <div className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400">
                                Folded Pocket Footprint
                              </div>
                              <div className="font-extrabold text-slate-900 dark:text-slate-100 mt-0.5">
                                {fk.foldedHeightMm} × {fk.foldedWidthMm} ×{" "}
                                {fk.foldedThicknessMm}mm
                              </div>
                              <div className="text-xs text-slate-600 dark:text-slate-400 truncate">
                                {fk.coverDisplayLabel}
                              </div>
                            </div>

                            <div className="rounded-lg border border-indigo-200/80 bg-white p-2 dark:border-indigo-900/80 dark:bg-slate-900">
                              <div className="text-xs font-bold uppercase text-emerald-700 dark:text-emerald-400">
                                Hinge & Crease Telemetry
                              </div>
                              <div className="font-extrabold text-slate-900 dark:text-slate-100 mt-0.5 truncate">
                                {fk.hingeArchitecture}
                              </div>
                              <div className="text-xs text-slate-600 dark:text-slate-400">
                                Crease Depth: {fk.creaseDepthMm} •{" "}
                                {selectedDevice.specs.weightGrams}g
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Interactive Living Score price scenario */}
                  <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 dark:border-emerald-900/60 dark:bg-emerald-950/40">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <TrendingDown className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-xs font-bold text-emerald-950 dark:text-emerald-300">
                          Interactive Living Score Price Scenario
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-slate-700 dark:text-slate-300">
                          Scenario Price:{" "}
                          <strong className="text-emerald-700 dark:text-emerald-400">
                            ${activeSimulatedPrice}
                          </strong>{" "}
                          <span className="text-slate-500 dark:text-slate-400">
                            (MSRP ${selectedDevice.launchMsrpUsd})
                          </span>
                        </span>
                        {activeSimulatedPrice !==
                          selectedDevice.currentStreetUsd && (
                          <button
                            onClick={() =>
                              setSimulatedPrices((prev) => {
                                const next = { ...prev };
                                delete next[selectedDevice.id];
                                return next;
                              })
                            }
                            className="rounded border border-emerald-300 bg-white px-2 py-0.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-slate-900 dark:text-emerald-300 dark:hover:bg-emerald-900/40"
                          >
                            Reset to Catalog Price (${selectedDevice.currentStreetUsd})
                          </button>
                        )}
                      </div>
                    </div>

                    <input
                      type="range"
                      min={Math.round(selectedDevice.launchMsrpUsd * 0.45)}
                      max={selectedDevice.launchMsrpUsd}
                      step={10}
                      value={activeSimulatedPrice}
                      aria-label={`Simulated street price for ${selectedDevice.name}`}
                      aria-valuemin={Math.round(selectedDevice.launchMsrpUsd * 0.45)}
                      aria-valuemax={selectedDevice.launchMsrpUsd}
                      aria-valuenow={activeSimulatedPrice}
                      aria-valuetext={`$${activeSimulatedPrice} dollars`}
                      onChange={(e) =>
                        setSimulatedPrices((prev) => ({
                          ...prev,
                          [selectedDevice.id]: parseInt(e.target.value, 10),
                        }))
                      }
                      className="mt-2 h-1.5 w-full cursor-pointer accent-emerald-600"
                    />
                    <p className="mt-1.5 text-xs text-emerald-900 dark:text-emerald-200/90">
                      <strong className="text-emerald-800 dark:text-emerald-300">
                        Marcus Sterling (Value &amp; Price Advisor):
                      </strong>{" "}
                      &ldquo;{livingMetrics.pragmatistNote}&rdquo;
                    </p>
                  </div>
                </div>

                {/* Right Radar + Living Score Breakdown Card (5 cols) */}
                <div className="xl:col-span-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs flex flex-col justify-between dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Composite Living Score
                      </span>
                      <div className="flex items-baseline gap-2">
                        <span className="font-mono text-4xl font-black text-sky-600 dark:text-sky-400">
                          {livingMetrics.compositeLivingScore}
                        </span>
                        <span className="font-mono text-xs text-slate-400 dark:text-slate-500">
                          / 10.0
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Score Provenance
                      </span>
                      <div className="mt-0.5 flex max-w-52 items-center justify-end gap-1 text-xs font-bold text-slate-600 dark:text-slate-300">
                        <ShieldCheck className="h-4 w-4" />
                        <span>
                          {selectedDevice.scoreMetadata
                            ? `${selectedDevice.scoreMetadata.status} • ${selectedDevice.scoreMetadata.modelVersion}`
                            : "Curated catalog score • methodology review pending"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="my-2 flex items-center justify-center">
                    <RadarChart
                      primaryName={selectedDevice.name}
                      siliconScore={selectedDevice.verdicts.SILICON_GEEK.score}
                      cameraScore={selectedDevice.verdicts.CAMERA_PURIST.score}
                      pragmatistScore={livingMetrics.pragmatistScore}
                      dailyDriverScore={
                        selectedDevice.verdicts.DAILY_DRIVER.score
                      }
                    />
                  </div>

                  {/* Quick Actions */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => setActiveTab("COMPARE_STUDIO")}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:border-sky-400 hover:bg-sky-50 hover:text-sky-700 transition dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-sky-500 dark:hover:bg-slate-700"
                    >
                      <ArrowLeftRight className="h-3.5 w-3.5" />
                      <span>Diff vs {compareDevice.name}</span>
                    </button>
                    <button
                      onClick={() => setActiveTab("DEBATE_ARENA")}
                      className="flex items-center justify-center gap-1.5 rounded-xl bg-sky-600 px-3 py-2 text-xs font-bold text-white hover:bg-sky-700 transition shadow-2xs dark:bg-sky-500 dark:hover:bg-sky-600"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      <span>Ask the 4 AI Editors</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* =========================================================
                  THE CORE 4 AI EDITOR VERDICT BENTO CARDS
                 ========================================================= */}
              <div>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                      The Core 4 AI Editor Verdicts: {selectedDevice.name}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Each AI Editor evaluates the device strictly through their domain lens. Scroll inside any section or click a card to expand.
                    </p>
                  </div>
                  <span className="rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 font-mono text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300">
                    Click any card for full view
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {EDITOR_LIST.map((editor) => {
                    const verdict = selectedDevice.verdicts[editor.id];
                    const score =
                      editor.id === "PRAGMATIST"
                        ? livingMetrics.pragmatistScore
                        : verdict.score;

                    return (
                      <div
                        key={editor.id}
                        role="button"
                        tabIndex={0}
                        onClick={() =>
                          setExpandedCardModal({
                            editorId: editor.id,
                            title: verdict.headline,
                            subtitle: `${editor.roleTitle} (${selectedDevice.name})`,
                            badgeText: `${score.toFixed(1)} / 10`,
                            body: verdict.analysis,
                            pros: verdict.pros,
                            cons: verdict.cons,
                          })
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            event.currentTarget.click();
                          }
                        }}
                        className={`group cursor-pointer rounded-2xl border bg-white p-5 shadow-2xs flex flex-col md:h-[360px] transition hover:shadow-md hover:border-sky-400 dark:bg-slate-900 dark:border-slate-800 ${editor.borderAccent}`}
                      >
                        {/* Slot 1: Standardized Header (44px) */}
                        <div className="flex h-[44px] shrink-0 items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
                              {EDITOR_ICONS[editor.id]}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-slate-900 group-hover:text-sky-700 transition dark:text-white dark:group-hover:text-sky-400">
                                  {editor.name}
                                </span>
                                <span className="font-mono text-xs text-slate-400 shrink-0 hidden sm:inline dark:text-slate-500">
                                  {editor.handle}
                                </span>
                              </div>
                              <div
                                className={`text-xs font-bold truncate ${editor.textAccent}`}
                              >
                                {editor.roleTitle}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col items-end shrink-0">
                            <span
                              className={`inline-flex h-8 w-12 items-center justify-center rounded-lg border font-mono text-sm font-black ${editor.badgeBg}`}
                            >
                              {score.toFixed(1)}
                            </span>
                            {editor.id === "PRAGMATIST" &&
                              activeSimulatedPrice !==
                                selectedDevice.currentStreetUsd && (
                                <span className="mt-0.5 font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                                  Price Recalculation
                                </span>
                              )}
                          </div>
                        </div>

                        {/* Slot 2: Standardized Headline Quote (40px, scrollable without visible scrollbar) */}
                        <div className="mt-3 h-[40px] shrink-0 overflow-y-auto no-scrollbar">
                          <h3 className="text-xs font-bold text-slate-900 leading-[19px] dark:text-white">
                            &ldquo;{verdict.headline}&rdquo;
                          </h3>
                        </div>

                        {/* Slot 3: Standardized Analysis Body (line-clamp to prevent touch scroll traps) */}
                        <div className="mt-2 h-[74px] shrink-0">
                          <p className="text-xs text-slate-600 leading-[18px] line-clamp-3 dark:text-slate-300">
                            {verdict.analysis}
                          </p>
                          <span className="mt-0.5 inline-block text-[11px] font-bold text-sky-600 hover:underline dark:text-sky-400">
                            Read full critique &rarr;
                          </span>
                        </div>

                        {/* Slot 4: Standardized Divider & Aligned Pros/Cons Grid (scrollable without visible scrollbar) */}
                        <div className="mt-3 pt-3 border-t border-slate-100 flex-1 grid grid-cols-2 gap-3 overflow-hidden dark:border-slate-800">
                          <div className="flex flex-col min-h-0">
                            <span className="h-[16px] shrink-0 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                              Highlighted Strengths
                            </span>
                            <div className="mt-1.5 space-y-2 flex-1 overflow-y-auto no-scrollbar">
                              {verdict.pros.slice(0, 2).map((pro, i) => (
                                <div
                                  key={i}
                                  className="flex h-[34px] items-start gap-1.5 text-xs leading-[16px] text-slate-700 overflow-y-auto no-scrollbar dark:text-slate-300"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                                  <span>{pro}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="flex flex-col min-h-0">
                            <span className="h-[16px] shrink-0 text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
                              Called-Out Weaknesses
                            </span>
                            <div className="mt-1.5 space-y-2 flex-1 overflow-y-auto no-scrollbar">
                              {verdict.cons.slice(0, 2).map((con, i) => (
                                <div
                                  key={i}
                                  className="flex h-[34px] items-start gap-1.5 text-xs leading-[16px] text-slate-700 overflow-y-auto no-scrollbar dark:text-slate-300"
                                >
                                  <AlertTriangle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                                  <span>{con}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* =========================================================
                  FULL-WIDTH HORIZONTAL EVIDENCE RECORDS
                 ========================================================= */}
              <div className="space-y-4">
                {/* Horizontal Grounded Evidence Store Bar (Zero Vertical Stretch) */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 dark:text-white">
                          <ShieldCheck className="h-4 w-4 text-sky-600 shrink-0" />
                          <span>
                            Attached Evidence Records &amp; Hardware Citations
                          </span>
                        </h3>
                        <span className="inline-flex items-center rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-300">
                          {selectedDevice.evidence.length} Verified {selectedDevice.evidence.length === 1 ? "Source" : "Sources"}
                        </span>
                        <div className="hidden sm:flex flex-wrap items-center gap-1.5">
                          {selectedDevice.evidence.map((ev) => (
                            <span
                              key={`pill-${ev.id}`}
                              className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                            >
                              {ev.topic}
                            </span>
                          ))}
                        </div>
                      </div>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Multi-pillar verification across 3DMark thermal stress loops, optical &amp; PWM lab measurements, OpenLab™ battery endurance, and long-term owner TCO consensus.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowEvidence((visible) => !visible)}
                      aria-expanded={showEvidence}
                      className="h-8 shrink-0 whitespace-nowrap inline-flex items-center rounded-lg bg-sky-50 border border-sky-200 px-3 text-xs font-bold text-sky-700 hover:bg-sky-100 dark:bg-sky-950/60 dark:border-sky-800 dark:text-sky-300 dark:hover:bg-sky-900/60 cursor-pointer transition"
                    >
                      {showEvidence ? "Hide" : "Show"} {selectedDevice.evidence.length} {selectedDevice.evidence.length === 1 ? "source" : "sources"}
                    </button>
                  </div>

                  {showEvidence && (
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {selectedDevice.evidence.map((ev) => (
                        <div
                          key={ev.id}
                          className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 flex flex-col justify-between dark:border-slate-800 dark:bg-slate-800/70"
                        >
                          <div>
                            {/* Row 1: Badges + Source Author + Sentiment */}
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

                            {/* Row 2: Full-width Citation Title */}
                            <h4 className="mt-2 text-xs font-bold text-slate-900 dark:text-white">
                              {ev.sourceTitle}
                            </h4>

                            {/* Row 3: Quantitative Evidence Excerpt */}
                            <p className="mt-1.5 text-xs text-slate-600 leading-relaxed dark:text-slate-300">
                              &ldquo;{ev.excerpt}&rdquo;
                            </p>
                          </div>

                          {/* Row 4: Footer */}
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
                  )}
                </div>
              </div>

              {/* =========================================================
                  PHONEINDEX OPENLAB™ STANDARDIZED TELEMETRY & RUNTIME BENCHMARKS
                 ========================================================= */}
              <DeviceLabTelemetryCard device={selectedDevice} variant="bento" />

              {/* =========================================================
                  TRUE-SCALE PHYSICAL SILHOUETTE & CAMERA BUMP COMPARATOR
                 ========================================================= */}
              <PhoneSizeComparator
                deviceA={selectedDevice}
                deviceB={compareDevice}
                onUpdateDeviceProfile={(devId, profile) => {
                  setDevices((prev) =>
                    prev.map((d) =>
                      d.id === devId ? { ...d, customProfile: profile } : d
                    )
                  );
                  triggerToast(
                    profile
                      ? "Saved uploaded model photo & generated physical profile!"
                      : "Reset model physical profile to default vector!"
                  );
                }}
              />

              {/* =========================================================
                  COMPLETE ENCYCLOPEDIC GSMARENA-DEPTH RAW SPEC SHEET
                 ========================================================= */}
              <FullSpecSheet
                device={selectedDevice}
                onOpenManualSpecStudio={() => setActiveTab("ADMIN_DESK")}
                onUpdateDevice={(updatedDev) => {
                  setDevices((prev) =>
                    prev.map((d) => (d.id === updatedDev.id ? updatedDev : d))
                  );
                  triggerToast(
                    `Saved spec & model updates for ${updatedDev.brand} ${updatedDev.name}!`
                  );
                }}
              />
            </>
          )}

          {/* =========================================================
              TAB 2: COMPARE STUDIO & SMART SPEC DIFF ENGINE
             ========================================================= */}
          {activeTab === "COMPARE_STUDIO" && (
            <div className="space-y-4">
              {/* Top Comparison Selector Bar */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase text-sky-700 dark:text-sky-400 mb-1">
                        Primary Contender (A)
                      </label>
                      <select
                        value={selectedDevice.id}
                        onChange={(e) => setSelectedDeviceId(e.target.value)}
                        className="rounded-xl border border-sky-300 bg-sky-50/40 px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none dark:border-sky-800 dark:bg-slate-800 dark:text-slate-100"
                      >
                        {devices.map((d) => (
                          <option key={d.id} value={d.id}>
                            {formatDeviceLabel(d)} (${d.currentStreetUsd} • Score{" "}
                            {d.compositeLivingScore})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="mt-4 font-mono text-xs font-bold text-slate-400 dark:text-slate-500">
                      VS
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-pink-700 dark:text-pink-400 mb-1">
                        Challenger Contender (B)
                      </label>
                      <select
                        value={compareDevice.id}
                        onChange={(e) => setCompareDeviceId(e.target.value)}
                        className="rounded-xl border border-pink-300 bg-pink-50/40 px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none dark:border-pink-800 dark:bg-slate-800 dark:text-slate-100"
                      >
                        {devices.map((d) => (
                          <option key={d.id} value={d.id}>
                            {formatDeviceLabel(d)} (${d.currentStreetUsd} • Score{" "}
                            {d.compositeLivingScore})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Smart Diff Filter Toggle */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setOnlyShowDifferences((v) => !v)}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold shrink-0 whitespace-nowrap cursor-pointer transition ${
                        onlyShowDifferences
                          ? "border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-700 dark:bg-sky-950/60 dark:text-sky-300"
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                      }`}
                    >
                      <Zap className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                      <span>Highlight Hardware Differences Only</span>
                    </button>
                  </div>
                </div>

                {/* Head-to-Head Radar + 4-Editor Winner Summary */}
                <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800 items-center">
                  <div className="lg:col-span-4 flex justify-center">
                    <RadarChart
                      primaryName={selectedDevice.name}
                      siliconScore={selectedDevice.verdicts.SILICON_GEEK.score}
                      cameraScore={selectedDevice.verdicts.CAMERA_PURIST.score}
                      pragmatistScore={selectedDevice.verdicts.PRAGMATIST.score}
                      dailyDriverScore={
                        selectedDevice.verdicts.DAILY_DRIVER.score
                      }
                      compareScores={{
                        name: compareDevice.name,
                        siliconScore: compareDevice.verdicts.SILICON_GEEK.score,
                        cameraScore: compareDevice.verdicts.CAMERA_PURIST.score,
                        pragmatistScore:
                          compareDevice.verdicts.PRAGMATIST.score,
                        dailyDriverScore:
                          compareDevice.verdicts.DAILY_DRIVER.score,
                      }}
                    />
                  </div>

                  <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {EDITOR_LIST.map((ed) => {
                      const sA = selectedDevice.verdicts[ed.id].score;
                      const sB = compareDevice.verdicts[ed.id].score;
                      const winName =
                        sA > sB
                          ? selectedDevice.name
                          : sB > sA
                          ? compareDevice.name
                          : "Tie";

                      return (
                        <div
                          key={ed.id}
                          className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/70"
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-xs font-bold ${ed.textAccent}`}
                            >
                              {ed.roleTitle}
                            </span>
                            <span className="rounded bg-white border border-slate-200 px-2 py-0.5 font-mono text-xs font-bold text-slate-800 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200">
                              Winner: {winName}
                            </span>
                          </div>
                          <div className="mt-2 flex items-center justify-between font-mono text-xs">
                            <span className="text-sky-700 dark:text-sky-400">
                              {selectedDevice.name}: <strong>{sA}</strong>
                            </span>
                            <span className="text-pink-700 dark:text-pink-400">
                              {compareDevice.name}: <strong>{sB}</strong>
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* True-Scale Physical Size & Camera Island Overlay in Compare Studio */}
              <PhoneSizeComparator
                deviceA={selectedDevice}
                deviceB={compareDevice}
                devices={
                  stagedCompareIds.length >= 2
                    ? stagedCompareIds
                        .map((id) => devices.find((d) => d.id === id))
                        .filter((d): d is SmartphoneDevice => Boolean(d))
                    : [selectedDevice, compareDevice]
                }
              />

              {/* Smart Spec Diff Table with "Why It Matters" AI Callouts */}
              <div className="rounded-2xl border border-slate-200 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900">
                <div className="rounded-t-2xl border-b border-slate-200 bg-slate-50/60 px-4 py-3 flex items-center justify-between dark:border-slate-800 dark:bg-slate-800/60">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Smart Hardware Spec Diff & Engineering Translation
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Every row is annotated by the relevant AI Editor explaining what the spec difference actually means in real-world use.
                    </p>
                  </div>
                </div>

                {/* Sticky Contender Comparison Header: Pinned at top-14 under the navigation bar */}
                <div className="sticky top-14 z-20 border-b border-slate-200 bg-white/95 backdrop-blur-md px-4 py-3 shadow-xs dark:border-slate-800 dark:bg-slate-900/95">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                    {/* Contender A Column Header (md:col-span-4) */}
                    <div className="md:col-span-4 flex items-center justify-between gap-2 rounded-xl bg-sky-50/80 border border-sky-200 px-3 py-2 dark:bg-sky-950/40 dark:border-sky-900/60">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-600 text-white font-bold text-xs shadow-2xs">
                          A
                        </div>
                        <div className="truncate">
                          <span className="block text-xs font-bold text-slate-900 truncate dark:text-white">
                            {selectedDevice.name}
                          </span>
                          <span className="block text-[11px] text-sky-700 font-semibold truncate dark:text-sky-300">
                            {selectedDevice.brand} • ${selectedDevice.currentStreetUsd}
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0 flex items-center gap-1 rounded-lg bg-white border border-sky-300 px-2 py-0.5 font-mono text-xs font-black text-sky-700 shadow-2xs dark:bg-slate-900 dark:border-sky-700 dark:text-sky-300">
                        <span className="text-xs text-slate-600 font-medium dark:text-slate-400">Score</span>
                        <span className="text-xs">{selectedDevice.compositeLivingScore.toFixed(1)}</span>
                      </div>
                    </div>

                    {/* Contender B Column Header (md:col-span-4) */}
                    <div className="md:col-span-4 flex items-center justify-between gap-2 rounded-xl bg-pink-50/80 border border-pink-200 px-3 py-2 dark:bg-pink-950/40 dark:border-pink-900/60">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-pink-600 text-white font-bold text-xs shadow-2xs">
                          B
                        </div>
                        <div className="truncate">
                          <span className="block text-xs font-bold text-slate-900 truncate dark:text-white">
                            {compareDevice.name}
                          </span>
                          <span className="block text-[11px] text-pink-700 font-semibold truncate dark:text-pink-300">
                            {compareDevice.brand} • ${compareDevice.currentStreetUsd}
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0 flex items-center gap-1 rounded-lg bg-white border border-pink-300 px-2 py-0.5 font-mono text-xs font-black text-pink-700 shadow-2xs dark:bg-slate-900 dark:border-pink-700 dark:text-pink-300">
                        <span className="text-xs text-slate-600 font-medium dark:text-slate-400">Score</span>
                        <span className="text-xs">{compareDevice.compositeLivingScore.toFixed(1)}</span>
                      </div>
                    </div>

                    {/* Engineering Analysis / Diff Count (md:col-span-4) */}
                    <div className="hidden md:flex md:col-span-4 items-center justify-between text-xs text-slate-600 px-2 font-semibold dark:text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                        <span>Engineering Translation</span>
                      </div>
                      <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                        {specDiffRows.length} Differences Analyzed
                      </span>
                    </div>
                  </div>
                </div>

                <div className="divide-y divide-slate-200 dark:divide-slate-800">
                  {specDiffRows.map((row) => {
                    const ed = AI_EDITORS[row.editorId];
                    return (
                      <div
                        key={row.id}
                        className={`p-4 transition ${
                          row.isSignificant
                            ? "bg-white dark:bg-slate-900"
                            : "bg-slate-50/50 opacity-85 hover:opacity-100 dark:bg-slate-900/50"
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              {row.label}
                            </span>
                            <span className="rounded bg-slate-100 border border-slate-200 px-1.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300">
                              {row.category}
                            </span>
                          </div>
                          <span
                            className={`text-xs font-bold ${ed.textAccent}`}
                          >
                            Evaluated by {ed.name} ({ed.roleTitle})
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                          {/* Device A Spec */}
                          <div
                            className={`md:col-span-4 rounded-xl border p-2.5 text-xs ${
                              row.winner === "A"
                                ? "border-sky-300 bg-sky-50/70 text-slate-900 font-semibold dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-100"
                                : "border-slate-200 bg-slate-50/60 text-slate-700 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300"
                            }`}
                          >
                            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-0.5">
                              <span>{selectedDevice.name}</span>
                              {row.winner === "A" && (
                                <span className="text-sky-700 dark:text-sky-300 font-bold">
                                  ★ ADVANTAGE
                                </span>
                              )}
                            </div>
                            <div className="text-slate-900 dark:text-slate-100">{row.valueA}</div>
                          </div>

                          {/* Device B Spec */}
                          <div
                            className={`md:col-span-4 rounded-xl border p-2.5 text-xs ${
                              row.winner === "B"
                                ? "border-pink-300 bg-pink-50/70 text-slate-900 font-semibold dark:border-pink-800 dark:bg-pink-950/50 dark:text-pink-100"
                                : "border-slate-200 bg-slate-50/60 text-slate-700 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300"
                            }`}
                          >
                            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-0.5">
                              <span>{compareDevice.name}</span>
                              {row.winner === "B" && (
                                <span className="text-pink-700 dark:text-pink-300 font-bold">
                                  ★ ADVANTAGE
                                </span>
                              )}
                            </div>
                            <div className="text-slate-900 dark:text-slate-100">{row.valueB}</div>
                          </div>

                          {/* AI Editor "Why It Matters" Translation */}
                          <div className="md:col-span-4 rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-300">
                            <span className="font-bold text-slate-900 dark:text-white">
                              Why it matters:{" "}
                            </span>
                            {row.whyItMatters}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
              TAB 3: INTERACTIVE "ASK THE EDITORS" DEBATE ARENA
             ========================================================= */}
          {activeTab === "DEBATE_ARENA" && (
            <DebateArena
              selectedDevice={selectedDevice}
              compareDevice={compareDevice}
              debatePrompt={debatePrompt}
              debate={displayedDebate}
              isDebating={isDebating}
              onPromptChange={setDebatePrompt}
              onRunDebate={handleRunDebate}
              onOpenCard={setExpandedCardModal}
              onInspectWinner={(deviceId) => {
                setSelectedDeviceId(deviceId);
                setActiveTab("DEVICE_BENTO");
              }}
            />
          )}

          {/* =========================================================
              TAB 4: AUTHORIZED ADMIN WORKSPACE
             ========================================================= */}
          {activeTab === "ADMIN_DESK" && adminAccess !== "AUTHENTICATED" && (
            <AdminAccessPanel
              status={adminAccess}
              onAuthenticated={() => setAdminAccess("AUTHENTICATED")}
            />
          )}

          {activeTab === "ADMIN_DESK" && adminAccess === "AUTHENTICATED" && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-5 shadow-2xs ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">Admin workspace</h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Manual catalog editing and review tools. No automated feeds are connected.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await fetch("/api/admin/session", { method: "DELETE" });
                    setAdminAccess("LOCKED");
                    setActiveTab("DEVICE_BENTO");
                  }}
                  className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 shrink-0 whitespace-nowrap cursor-pointer transition"
                >
                  <LogOut className="h-4 w-4" />
                  Lock admin
                </button>
              </div>

              {/* Manual Spec Entry & Hardware Override Studio */}
              <ManualSpecEntryStudio
                devices={devices}
                selectedDevice={selectedDevice}
                onPublishDevice={(newDev) => {
                  const enrichedDev: SmartphoneDevice = {
                    ...newDev,
                    evidence: synthesizeDeviceEvidence(newDev),
                  };
                  setDevices((prev) => [
                    enrichedDev,
                    ...prev.filter((d) => d.slug !== enrichedDev.slug),
                  ]);
                  setSelectedDeviceId(enrichedDev.id);
                  triggerToast(
                    `Added ${formatDeviceLabel(enrichedDev)} to this browser session (Living Score: ${enrichedDev.compositeLivingScore}).`
                  );
                }}
                onStageDraft={(newDev, draftItem) => {
                  const enrichedDev: SmartphoneDevice = {
                    ...newDev,
                    evidence: synthesizeDeviceEvidence(newDev),
                  };
                  setStagedManualDevices((prev) => ({
                    ...prev,
                    [enrichedDev.id]: enrichedDev,
                  }));
                  setDrafts((prev) => [draftItem, ...prev]);
                  triggerToast(
                    `Staged ${formatDeviceLabel(enrichedDev)} in the editorial review queue.`
                  );
                }}
                onUpdateExistingDevice={(updatedDev) => {
                  const enrichedDev: SmartphoneDevice = {
                    ...updatedDev,
                    evidence: synthesizeDeviceEvidence(updatedDev),
                  };
                  setDevices((prev) =>
                    prev.map((d) => (d.id === enrichedDev.id ? enrichedDev : d))
                  );
                  triggerToast(
                    `Updated ${formatDeviceLabel(enrichedDev)} in this browser session and recalculated its scores (${enrichedDev.compositeLivingScore}).`
                  );
                }}
              />

              {/* Approval-Only Editorial Queue */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                      Editorial Review Queue ({visibleDrafts.length})
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Items appear here only after an authorized editor stages a sourced catalog change.
                    </p>
                  </div>
                </div>

                <div className="space-y-3.5">
                  {visibleDrafts.length === 0 && (
                    <div className="rounded-xl bg-slate-50 p-6 text-center dark:bg-slate-800/60">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">No staged changes</p>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Use the manual editor above to create a reviewed catalog update.
                      </p>
                    </div>
                  )}
                  {visibleDrafts.map((draft) => {
                    const leadEd = AI_EDITORS[draft.leadEditorId];
                    const isApproved = draft.status === "APPROVED_PUBLISHED";
                    const isBusy = approvingId === draft.id;

                    return (
                      <div
                        key={draft.id}
                        className={`rounded-2xl border p-4 transition ${
                          isApproved
                            ? "border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-800/50"
                            : "border-amber-300 bg-amber-50/30 dark:border-amber-700/60 dark:bg-amber-950/20"
                        }`}
                      >
                        {/* Standardized Top Metadata Bar */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`shrink-0 whitespace-nowrap rounded-md px-2.5 py-0.5 font-mono text-xs font-bold ${
                                isApproved
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
                                  : "bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
                              }`}
                            >
                              {isApproved ? "APPROVED IN SESSION" : "AWAITING APPROVAL"}
                            </span>
                            <span className="shrink-0 whitespace-nowrap rounded-md bg-white border border-slate-200 px-2 py-0.5 font-mono text-xs font-semibold text-slate-700 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300">
                              {draft.type.replace(/_/g, " ")}
                            </span>
                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                              Lead Editor: <strong className={leadEd.textAccent}>{leadEd.name}</strong>
                            </span>
                            <span className="font-mono text-xs text-slate-400 dark:text-slate-500">
                              • Crawled {draft.createdAt}
                            </span>
                          </div>

                          <span className="shrink-0 whitespace-nowrap rounded-md bg-white border border-slate-200 px-2.5 py-0.5 font-mono text-xs font-bold text-emerald-700 dark:bg-slate-900 dark:border-slate-700 dark:text-emerald-400">
                            Grounding Confidence: {draft.confidenceScore}% ({draft.citationsCount} citations)
                          </span>
                        </div>

                        {/* Title & Summary */}
                        <h4 className="mt-2.5 text-sm font-bold text-slate-900 dark:text-white">
                          {draft.title}
                        </h4>
                        <p className="mt-1 text-xs text-slate-600 leading-relaxed dark:text-slate-300">
                          {draft.summary}
                        </p>

                        {/* Proposed Database Diff */}
                        <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 font-mono text-xs text-slate-700 space-y-1 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                          {draft.rawDiffSummary.map((line, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <span className="font-bold text-emerald-600 dark:text-emerald-400 shrink-0">+</span>
                              <span className="truncate">{line}</span>
                            </div>
                          ))}
                        </div>

                        {/* Standardized Action Footer: Approve or Dismiss Only */}
                        <div className="mt-3.5 pt-3 border-t border-slate-200/70 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                          <span className="font-mono text-xs font-bold text-sky-700 dark:text-sky-400">
                            {draft.proposedScoreDelta}
                          </span>

                          {!isApproved ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleDismissDraft(draft.id)}
                                disabled={isBusy}
                                className="shrink-0 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 transition dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-rose-700 dark:hover:bg-rose-950/40 dark:hover:text-rose-300 cursor-pointer"
                              >
                                Dismiss
                              </button>
                              <button
                                onClick={() => handleApproveDraft(draft)}
                                disabled={isBusy}
                                className="shrink-0 whitespace-nowrap flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition shadow-2xs disabled:opacity-50 dark:bg-emerald-600 dark:hover:bg-emerald-500 cursor-pointer"
                              >
                                <Check className="h-3.5 w-3.5 shrink-0" />
                                <span>
                                  {isBusy ? "Publishing..." : "Approve & Publish"}
                                </span>
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setSelectedDeviceId(draft.deviceId);
                                setActiveTab("DEVICE_BENTO");
                              }}
                              className="shrink-0 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-sky-400 hover:text-sky-700 transition dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-sky-500 dark:hover:text-sky-300 cursor-pointer"
                            >
                              Inspect Device Page →
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
