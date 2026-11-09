"use client";

import { useEffect, useRef } from "react";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Cpu,
  DollarSign,
  Smartphone,
  X,
} from "lucide-react";
import { AI_EDITORS, EditorPersonaId } from "@/lib/editors";
import { ExpandedEditorialCard } from "./types";

interface EditorialModalProps {
  card: ExpandedEditorialCard;
  onClose: () => void;
}

const EDITOR_ICONS: Record<EditorPersonaId, React.ReactNode> = {
  SILICON_GEEK: <Cpu className="h-4 w-4 text-sky-600" />,
  CAMERA_PURIST: <Camera className="h-4 w-4 text-pink-600" />,
  PRAGMATIST: <DollarSign className="h-4 w-4 text-emerald-600" />,
  DAILY_DRIVER: <Smartphone className="h-4 w-4 text-amber-600" />,
};

export function EditorialModal({ card, onClose }: EditorialModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const editor = AI_EDITORS[card.editorId];

  useEffect(() => {
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((element) => !element.hasAttribute("disabled"));
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocusedRef.current?.focus();
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="editorial-dialog-title"
        aria-describedby="editorial-dialog-description"
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 border border-transparent dark:border-slate-800 p-5 shadow-2xl sm:p-6"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700">
              {EDITOR_ICONS[card.editorId]}
            </div>
            <div>
              <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">{editor.name}</div>
              <div className={`text-xs font-bold ${editor.textAccent}`}>
                {card.subtitle}
              </div>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close editorial detail"
            className="h-8 w-8 shrink-0 inline-flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 transition hover:bg-slate-200 dark:hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3
              id="editorial-dialog-title"
              className="text-base font-extrabold leading-snug text-slate-900 dark:text-slate-100"
            >
              &ldquo;{card.title}&rdquo;
            </h3>
            <p
              id="editorial-dialog-description"
              className="mt-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300"
            >
              {card.body}
            </p>
          </div>
          <span className={`rounded-lg px-2.5 py-1 font-mono text-xs font-bold ${editor.badgeBg}`}>
            {card.badgeText}
          </span>
        </div>

        {card.pros && card.cons && (
          <div className="mt-5 grid grid-cols-1 gap-4 border-t border-slate-100 dark:border-slate-800 pt-4 sm:grid-cols-2">
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Highlighted strengths
              </span>
              {card.pros.map((pro) => (
                <div key={pro} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>{pro}</span>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
                Called-out weaknesses
              </span>
              {card.cons.map((con) => (
                <div key={con} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
                  <span>{con}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {card.footerCitation && (
          <div className="mt-5 rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 font-mono text-xs text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
            <strong className="text-slate-900 dark:text-slate-100">Supporting reference: </strong>
            {card.footerCitation}
          </div>
        )}
      </div>
    </div>
  );
}
