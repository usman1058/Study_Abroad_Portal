"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

type Option = { id: string; label: string };

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Search…",
  allLabel,
}: {
  options: Option[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  allLabel?: string;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    if (!q.trim()) return options;
    const term = q.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(term));
  }, [options, q]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input className="pl-9" placeholder={placeholder} value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        size={Math.min(8, Math.max(3, filtered.length))}
        className="w-full rounded-lg border border-line-strong bg-white text-sm text-ink shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 dark:border-navy-700 dark:bg-navy-900 dark:text-slate-100"
      >
        {allLabel && <option value="">{allLabel}</option>}
        {filtered.length === 0 && <option value="" disabled>No matches</option>}
        {filtered.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
      <p className="text-xs text-ink-muted">{filtered.length} of {options.length}{q ? " matches" : " options"}</p>
    </div>
  );
}
