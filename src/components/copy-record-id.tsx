"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { shortRecordId } from "@/lib/utils";

export function CopyRecordId({ id, prefix = "ID" }: { id: string; prefix?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }
  return <button type="button" onClick={copy} title={`Copy full ${prefix.toLowerCase()}: ${id}`} aria-label={copied ? `${prefix} copied` : `Copy full ${prefix.toLowerCase()}`} className="inline-flex min-h-7 items-center gap-1 rounded-md border border-line px-2 font-mono text-[11px] text-ink-muted hover:border-brand-400 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
    {prefix} {shortRecordId(id)} {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
  </button>;
}
