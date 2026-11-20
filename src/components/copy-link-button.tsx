"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CopyLinkButton({ path, label = "Copy link" }: { path: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`);
      setCopied(true); setError(false);
    } catch { setCopied(false); setError(true); }
  }
  return <span className="inline-flex flex-col items-end"><Button type="button" size="sm" variant="outline" onClick={copy}>{copied ? "Copied" : label}</Button>{error && <span role="alert" className="text-xs text-red-700">Could not copy. Open the invite and copy its URL.</span>}</span>;
}
