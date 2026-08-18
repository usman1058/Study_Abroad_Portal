"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";

function dataUrlToBlob(dataUrl: string): Blob | null {
  try {
    const [header, base64] = dataUrl.split(",");
    const mime = /data:([^;]+)/.exec(header)?.[1] ?? "application/octet-stream";
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  } catch {
    return null;
  }
}

export function DocumentViewer({ fileUrl, label = "View" }: { fileUrl: string; label?: string }) {
  const [error, setError] = useState(false);

  function open() {
    if (fileUrl.startsWith("data:")) {
      const blob = dataUrlToBlob(fileUrl);
      if (!blob) {
        setError(true);
        return;
      }
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      return;
    }
    window.open(fileUrl, "_blank");
  }

  return (
    <span>
      <button onClick={open} className="inline-flex items-center gap-1 text-brand-600 hover:underline">
        {label} <ExternalLink className="h-3 w-3" />
      </button>
      {error && <p className="mt-1 text-xs text-red-600">Could not open this file.</p>}
    </span>
  );
}