"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function ApplyButton({
  programId,
  profileReady,
  className = "",
}: {
  programId: string;
  profileReady: boolean;
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
        className={"inline-flex items-center rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 " + className}
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
      <Button size="sm" onClick={apply} disabled={busy} title="Apply to this course now">
        {busy ? "Applying…" : "Apply"}
      </Button>
      {msg && (
        <Link href="/my-applications?tab=all" className={msg.tone === "ok" ? "text-xs font-medium text-green-600 hover:underline" : "text-xs text-red-600"}>
          {msg.text}
        </Link>
      )}
    </span>
  );
}
