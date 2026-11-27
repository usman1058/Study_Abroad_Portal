"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";

/** Keeps dense filter controls out of the mobile reading flow while preserving the desktop layout. */
export function ResponsiveFilterPanel({
  children,
  title = "Filters",
  activeCount = 0,
}: {
  children: ReactNode;
  title?: string;
  activeCount?: number;
}) {
  const [open, setOpen] = useState(false);
  const contentId = useId();

  return (
    <section className="min-w-0">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 text-sm font-semibold shadow-sm transition hover:border-brand-300 hover:bg-canvas-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 md:hidden dark:border-navy-700 dark:bg-navy-900 dark:hover:bg-navy-800"
      >
        <span className="inline-flex items-center gap-2"><SlidersHorizontal aria-hidden className="h-4 w-4 text-brand-600 dark:text-brand-300" />{title}{activeCount > 0 && <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-bold text-brand-800 dark:bg-brand-900/50 dark:text-brand-200">{activeCount} active</span>}</span>
        <ChevronDown aria-hidden className={`h-4 w-4 shrink-0 text-ink-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <div
        id={contentId}
        className={`${open ? "block" : "hidden"} mt-3 rounded-2xl border border-line bg-white p-3 shadow-sm md:mt-0 md:block md:rounded-none md:border-0 md:bg-transparent md:p-0 md:shadow-none dark:border-navy-700 dark:bg-navy-900 md:dark:bg-transparent`}
      >
        {children}
      </div>
    </section>
  );
}
