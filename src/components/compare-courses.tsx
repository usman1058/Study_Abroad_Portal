"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FeeDisplay } from "@/components/currency";

type CompareItem = {
  id: string;
  name: string;
  university: string;
  tuition: number;
  applicationFee: number | null;
  durationMonths: number | null;
  intakeDates: string[];
  minGpa: number | null;
  tags: string[];
};

const MAX_COMPARE = 3;

export function CompareCourses({ items }: { items: CompareItem[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  function toggle(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      // The cap is enforced in the UI too: extra chips disable at the limit.
      return prev.length >= MAX_COMPARE ? prev : [...prev, id];
    });
  }

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      triggerRef.current?.focus();
    };
  }, [open]);

  const chosen = items.filter((i) => selected.includes(i.id));
  const atLimit = selected.length >= MAX_COMPARE;

  return (
    <div className="space-y-3">
      <fieldset>
        <legend className="sr-only">Choose up to three courses to compare</legend>
        <div className="flex flex-wrap gap-2">
          {items.map((i) => {
            const active = selected.includes(i.id);
            return (
              <button
                key={i.id}
                type="button"
                aria-pressed={active}
                disabled={!active && atLimit}
                onClick={() => toggle(i.id)}
                className={
                  "min-h-9 rounded-full border px-3 py-1 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50 " +
                  (active
                    ? "border-brand-400 bg-brand-50 text-brand-700 dark:border-brand-600 dark:bg-brand-900/40 dark:text-brand-200"
                    : "border-line-strong text-ink-muted hover:bg-canvas dark:border-navy-700 dark:text-slate-300")
                }
              >
                {i.university} — {i.name}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          ref={triggerRef}
          size="sm"
          variant="outline"
          disabled={selected.length < 2}
          onClick={() => setOpen(true)}
        >
          Compare selected ({selected.length}/{MAX_COMPARE})
        </Button>
        <p className="text-xs text-ink-muted" aria-live="polite">
          {selected.length < 2
            ? `Select at least 2 courses to compare (${selected.length}/${MAX_COMPARE}).`
            : atLimit
              ? "Three courses selected — clear one to swap it."
              : `${selected.length} of ${MAX_COMPARE} selected — you can add ${MAX_COMPARE - selected.length} more.`}
        </p>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="compare-dialog-title"
            className="max-h-[80vh] w-full max-w-3xl overflow-auto rounded-xl bg-white p-6 dark:bg-navy-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 id="compare-dialog-title" className="text-lg font-bold">Compare courses</h3>
                <p className="text-xs text-ink-muted">Press Escape or use Close to return to your shortlist.</p>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close comparison"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted hover:bg-canvas-subtle hover:text-navy-900 dark:hover:bg-navy-800"
              >
                ✕
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="sr-only">Side-by-side comparison of the selected courses</caption>
                <thead>
                  <tr className="border-b border-line dark:border-navy-700">
                    <th scope="col" className="p-2 text-left">Course</th>
                    {chosen.map((c) => (
                      <th key={c.id} scope="col" className="p-2 text-left">
                        {c.university}
                        <div className="text-xs font-normal text-ink-muted">{c.name}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line dark:divide-navy-700">
                  <tr>
                    <th scope="row" className="p-2 text-left font-normal text-ink-muted">Tuition</th>
                    {chosen.map((c) => <td key={c.id} className="p-2"><FeeDisplay amount={c.tuition} /></td>)}
                  </tr>
                  <tr>
                    <th scope="row" className="p-2 text-left font-normal text-ink-muted">Application fee</th>
                    {chosen.map((c) => <td key={c.id} className="p-2">{c.applicationFee != null ? <FeeDisplay amount={c.applicationFee} /> : "—"}</td>)}
                  </tr>
                  <tr>
                    <th scope="row" className="p-2 text-left font-normal text-ink-muted">Duration</th>
                    {chosen.map((c) => <td key={c.id} className="p-2">{c.durationMonths ? `${c.durationMonths} months` : "—"}</td>)}
                  </tr>
                  <tr>
                    <th scope="row" className="p-2 text-left font-normal text-ink-muted">Intakes</th>
                    {chosen.map((c) => <td key={c.id} className="p-2">{c.intakeDates.map((d) => new Date(d).toLocaleDateString()).join(", ") || "—"}</td>)}
                  </tr>
                  <tr>
                    <th scope="row" className="p-2 text-left font-normal text-ink-muted">Min GPA</th>
                    {chosen.map((c) => <td key={c.id} className="p-2">{c.minGpa ?? "—"}</td>)}
                  </tr>
                  <tr>
                    <th scope="row" className="p-2 text-left font-normal text-ink-muted">Tags</th>
                    {chosen.map((c) => (
                      <td key={c.id} className="p-2">
                        <div className="flex flex-wrap gap-1">
                          {c.tags.map((t) => <Badge key={t} tone="brand">{t}</Badge>)}
                        </div>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
