"use client";

import { Camera, Cpu, DollarSign, MessageSquare, RefreshCw, Smartphone } from "lucide-react";
import { AI_EDITORS, EditorPersonaId } from "@/lib/editors";
import { DebateResponse } from "@/lib/debate-engine";
import { MAX_DEBATE_QUERY_LENGTH } from "@/lib/debate-request";
import { SmartphoneDevice } from "@/lib/seed-data";
import { ExpandedEditorialCard } from "@/features/editorial/types";

export const DEBATE_SCENARIOS = [
  "I shoot indoor photos of moving toddlers and want zero shutter lag",
  "Heavy Genshin Impact gaming on 5G + sensitive to OLED PWM eye strain",
  "Best value flagship to keep for 5 years with lowest cost-per-year",
  "Concert zoom video + two-day battery life for travel",
] as const;

interface DebateArenaProps {
  selectedDevice: SmartphoneDevice;
  compareDevice: SmartphoneDevice;
  debatePrompt: string;
  debate: DebateResponse;
  isDebating: boolean;
  onPromptChange: (value: string) => void;
  onRunDebate: (prompt?: string) => void;
  onOpenCard: (card: ExpandedEditorialCard) => void;
  onInspectWinner: (deviceId: string) => void;
}

const EDITOR_ICONS: Record<EditorPersonaId, React.ReactNode> = {
  SILICON_GEEK: <Cpu className="h-4 w-4 text-sky-600" />,
  CAMERA_PURIST: <Camera className="h-4 w-4 text-pink-600" />,
  PRAGMATIST: <DollarSign className="h-4 w-4 text-emerald-600" />,
  DAILY_DRIVER: <Smartphone className="h-4 w-4 text-amber-600" />,
};

export function DebateArena({
  selectedDevice,
  compareDevice,
  debatePrompt,
  debate,
  isDebating,
  onPromptChange,
  onRunDebate,
  onOpenCard,
  onInspectWinner,
}: DebateArenaProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-sky-200 bg-white dark:border-sky-900/60 dark:bg-slate-900 p-5 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-sky-600 dark:text-sky-400" />
              <span>Ask the Editorial Panel: Scenario Crossfire</span>
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Describe how you actually use your phone. All 4 AI Editors will debate{" "}
              <strong className="text-sky-700 dark:text-sky-400">{selectedDevice.name}</strong> vs{" "}
              <strong className="text-pink-700 dark:text-pink-400">{compareDevice.name}</strong> using the
              local deterministic scoring model and attached catalog data.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-md border border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/60 px-2 py-1 font-mono text-xs font-bold text-amber-800 dark:text-amber-300">
              {debate.intelligence.label}
            </span>
            <span className="rounded-md border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800 px-2 py-1 font-mono text-xs font-semibold text-slate-600 dark:text-slate-300">
              {debate.intelligence.scoringModelVersion}
            </span>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap gap-1.5">
          {DEBATE_SCENARIOS.map((scenario) => (
            <button
              key={scenario}
              type="button"
              onClick={() => onRunDebate(scenario)}
              className={`h-8 shrink-0 whitespace-nowrap inline-flex items-center rounded-lg border px-3 text-xs font-semibold transition ${
                debatePrompt === scenario
                  ? "border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-700 dark:bg-sky-950/60 dark:text-sky-300 font-bold"
                  : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-slate-100"
              }`}
            >
              &ldquo;{scenario}&rdquo;
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={debatePrompt}
            onChange={(event) => onPromptChange(event.target.value)}
            maxLength={MAX_DEBATE_QUERY_LENGTH}
            placeholder="Ask anything (e.g., 'I shoot 4K60 concert videos, hate heavy phones, and want 5 years of updates')..."
            className="flex-1 rounded-xl border border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-800 px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-sky-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => onRunDebate()}
            disabled={isDebating}
            className="h-10 shrink-0 whitespace-nowrap inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-5 text-xs sm:text-sm font-bold text-white hover:bg-sky-700 transition disabled:opacity-50 shadow-2xs cursor-pointer"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isDebating ? "animate-spin" : ""}`}
            />
            <span>{isDebating ? "Synthesizing Debate..." : "Run 4-Editor Debate"}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {debate.turns.map((turn) => {
          const editor = AI_EDITORS[turn.editorId];
          return (
            <div
              key={turn.editorId}
              role="button"
              tabIndex={0}
              onClick={() =>
                onOpenCard({
                  editorId: turn.editorId,
                  title: `Scenario Verdict: "${debate.scenarioTitle}"`,
                  subtitle: editor.roleTitle,
                  badgeText: turn.stanceBadge,
                  body: turn.message,
                  footerCitation: turn.citedMetric,
                })
              }
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  event.currentTarget.click();
                }
              }}
              className={`group cursor-pointer rounded-2xl border bg-white dark:bg-slate-900 dark:border-slate-800 p-5 shadow-2xs flex flex-col md:h-[235px] transition hover:shadow-md hover:border-sky-400 dark:hover:border-sky-500 ${editor.borderAccent}`}
            >
              <div className="flex h-[42px] shrink-0 items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    {EDITOR_ICONS[turn.editorId]}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 group-hover:text-sky-700 dark:text-slate-100 dark:group-hover:text-sky-400 transition whitespace-nowrap">
                      {turn.editorName}
                    </div>
                    <div className={`text-xs font-bold truncate ${editor.textAccent}`}>
                      {turn.roleTitle}
                    </div>
                  </div>
                </div>
                <span
                  className={`shrink-0 whitespace-nowrap rounded-lg border px-2.5 py-1 font-mono text-xs font-bold ${editor.badgeBg}`}
                >
                  {turn.stanceBadge}
                </span>
              </div>

              <div className="mt-3 h-[102px] shrink-0 overflow-y-auto no-scrollbar">
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-[19px]">
                  &ldquo;{turn.message}&rdquo;
                </p>
              </div>

              <div className="mt-auto pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-xs font-mono text-slate-500 dark:text-slate-400">
                <span className="shrink-0">Supporting Metric:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200 overflow-x-auto no-scrollbar whitespace-nowrap">
                  {turn.citedMetric}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-emerald-300 bg-emerald-50/70 dark:border-emerald-800/80 dark:bg-emerald-950/40 p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 px-2 py-0.5 font-mono text-xs font-bold text-emerald-700 dark:text-emerald-300">
                PANEL CONSENSUS ({debate.confidencePct}% RULE CONFIDENCE)
              </span>
            </div>
            <h3 className="mt-1.5 text-lg font-extrabold text-slate-900 dark:text-slate-100">
              Recommended Pick: {debate.consensusWinnerName}
            </h3>
            <p className="mt-1 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              {debate.consensusSummary}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onInspectWinner(debate.consensusWinnerId)}
            className="h-10 shrink-0 whitespace-nowrap inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 text-xs sm:text-sm font-bold text-white hover:bg-emerald-700 transition shadow-2xs cursor-pointer"
          >
            Inspect Winner Spec Bento →
          </button>
        </div>
      </div>
    </div>
  );
}
