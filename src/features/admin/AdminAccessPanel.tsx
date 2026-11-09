"use client";

import { FormEvent, useState } from "react";
import { LockKeyhole, ShieldCheck } from "lucide-react";

export type AdminAccessStatus =
  | "CHECKING"
  | "LOCKED"
  | "AUTHENTICATED"
  | "NOT_CONFIGURED";

interface AdminAccessPanelProps {
  status: AdminAccessStatus;
  onAuthenticated: () => void;
}

export function AdminAccessPanel({ status, onAuthenticated }: AdminAccessPanelProps) {
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      if (!response.ok) {
        setError(response.status === 503 ? "Admin access is not configured." : "Invalid admin key.");
        return;
      }
      setKey("");
      onAuthenticated();
    } catch {
      setError("Admin authentication is unavailable.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-sky-50 dark:bg-sky-950/60 p-3 text-sky-700 dark:text-sky-300 dark:border dark:border-sky-800/60">
          <LockKeyhole className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">Admin access</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">Editorial and catalog mutation tools require authorization.</p>
        </div>
      </div>

      {status === "NOT_CONFIGURED" ? (
        <div className="mt-5 rounded-xl bg-amber-50 dark:bg-amber-950/50 p-4 text-sm text-amber-900 dark:text-amber-300 dark:border dark:border-amber-800/60">
          Configure PHONEINDEX_ADMIN_KEY and PHONEINDEX_ADMIN_SECRET on the server to enable this workspace.
        </div>
      ) : (
        <form onSubmit={submit} className="mt-5 space-y-3">
          <label className="block text-sm font-bold text-slate-800 dark:text-slate-200" htmlFor="admin-key">
            Admin key
          </label>
          <input
            id="admin-key"
            type="password"
            autoComplete="current-password"
            value={key}
            onChange={(event) => setKey(event.target.value)}
            disabled={status === "CHECKING" || submitting}
            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-sky-500 focus:outline-none"
          />
          {error && <p className="text-sm font-semibold text-rose-700 dark:text-rose-400">{error}</p>}
          <button
            type="submit"
            disabled={!key || status === "CHECKING" || submitting}
            className="h-10 w-full shrink-0 whitespace-nowrap inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 text-sm font-bold text-white hover:bg-sky-700 disabled:opacity-50 transition cursor-pointer"
          >
            <ShieldCheck className="h-4 w-4" />
            {submitting ? "Checking access..." : "Unlock admin workspace"}
          </button>
        </form>
      )}
    </div>
  );
}
