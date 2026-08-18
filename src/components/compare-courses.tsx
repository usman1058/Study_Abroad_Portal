"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

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

export function CompareCourses({ items }: { items: CompareItem[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 3 ? prev : [...prev, id]
    );
  }

  const chosen = items.filter((i) => selected.includes(i.id));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {items.map((i) => (
          <button
            key={i.id}
            onClick={() => toggle(i.id)}
            className={
              "rounded-full border px-3 py-1 text-xs font-medium transition " +
              (selected.includes(i.id)
                ? "border-brand-400 bg-brand-50 text-brand-700 dark:border-brand-600 dark:bg-brand-900/40 dark:text-brand-200"
                : "border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300")
            }
          >
            {i.university} — {i.name}
          </button>
        ))}
      </div>
      <Button size="sm" variant="outline" disabled={selected.length < 2} onClick={() => setOpen(true)}>
        Compare selected ({selected.length}/3)
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setOpen(false)}>
          <div className="max-h-[80vh] w-full max-w-3xl overflow-auto rounded-xl bg-white p-6 dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold">Compare courses</h3>
              <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-slate-700">✕</button>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800">
                  <th className="p-2 text-left">Course</th>
                  {chosen.map((c) => (
                    <th key={c.id} className="p-2 text-left">
                      {c.university}
                      <div className="text-xs font-normal text-slate-500">{c.name}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                <tr>
                  <td className="p-2 text-slate-500">Tuition</td>
                  {chosen.map((c) => <td key={c.id} className="p-2">{formatCurrency(c.tuition)}</td>)}
                </tr>
                <tr>
                  <td className="p-2 text-slate-500">Application fee</td>
                  {chosen.map((c) => <td key={c.id} className="p-2">{c.applicationFee != null ? formatCurrency(c.applicationFee) : "—"}</td>)}
                </tr>
                <tr>
                  <td className="p-2 text-slate-500">Duration</td>
                  {chosen.map((c) => <td key={c.id} className="p-2">{c.durationMonths ? `${c.durationMonths} months` : "—"}</td>)}
                </tr>
                <tr>
                  <td className="p-2 text-slate-500">Intakes</td>
                  {chosen.map((c) => <td key={c.id} className="p-2">{c.intakeDates.map((d) => new Date(d).toLocaleDateString()).join(", ")}</td>)}
                </tr>
                <tr>
                  <td className="p-2 text-slate-500">Min GPA</td>
                  {chosen.map((c) => <td key={c.id} className="p-2">{c.minGpa ?? "—"}</td>)}
                </tr>
                <tr>
                  <td className="p-2 text-slate-500">Tags</td>
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
      )}
    </div>
  );
}