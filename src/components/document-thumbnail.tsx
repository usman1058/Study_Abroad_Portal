"use client";

import { useState } from "react";
import { FileText } from "lucide-react";

/** Compact preview for protected uploads. Non-image files keep an open-file tile. */
export function DocumentThumbnail({ href, label }: { href: string; label: string }) {
  const [failed, setFailed] = useState(false);

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={`Open ${label}`}
      className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-canvas text-ink-muted transition hover:border-brand-400 hover:ring-2 hover:ring-brand-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-navy-700 dark:bg-navy-800"
    >
      {!failed ? (
        <img
          src={href}
          alt={`Preview of ${label}`}
          loading="lazy"
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="flex flex-col items-center gap-0.5 text-[10px] font-medium">
          <FileText aria-hidden="true" className="h-5 w-5" />
          Open file
        </span>
      )}
    </a>
  );
}
