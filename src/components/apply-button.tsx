"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function ApplyButton({
  programId,
  profileReady,
  programName,
  className = "",
}: {
  programId: string;
  profileReady: boolean;
  /** Names the action when several apply buttons share a page. */
  programName?: string;
  className?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  if (!profileReady) {
    return (
      <Link
        href="/profile"
        title="Complete your profile (personal details) to unlock one-click apply"
        className={"inline-flex items-center rounded-lg border border-line-strong px-2.5 py-1.5 text-xs font-medium text-ink-muted hover:bg-canvas dark:border-navy-700 dark:text-slate-400 dark:hover:bg-navy-800 " + className}
      >
        Complete profile to apply
      </Link>
    );
  }

  async function apply() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programId, submit: true }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg({ tone: "err", text: json.error ?? "Could not apply." });
        return;
      }
      setMsg({ tone: "ok", text: "Applied ✓" });
      router.refresh();
    } catch {
      setMsg({ tone: "err", text: "Network error." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className={"inline-flex items-center gap-1.5 " + className}>
      <Button
        size="sm"
        onClick={apply}
        disabled={busy}
        title="Apply to this course now"
        aria-label={programName ? `Apply to ${programName}` : undefined}
      >
        {busy ? "Applying…" : "Apply"}
      </Button>
      {msg && msg.tone === "ok" && (
        <span role="status" className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
          Applied —{" "}
          <Link href="/my-applications" className="underline underline-offset-2 hover:no-underline">
            view application
          </Link>
        </span>
      )}
      {msg && msg.tone === "err" && (
        <span role="alert" className="text-xs font-medium text-red-700 dark:text-red-300">
          {msg.text}
        </span>
      )}
    </span>
  );
}
