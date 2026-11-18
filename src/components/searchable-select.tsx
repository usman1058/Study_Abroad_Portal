"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

type Option = { id: string; label: string };

/**
 * A native `<select>` with a search box above it.
 *
 * The select stays collapsed (an exposed listbox earlier dumped every option
 * onto the page, which also failed at 390 px), so the filter narrows a normal
 * dropdown and the current choice is never hidden by the filter.
 */
export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Search…",
  allLabel,
  ariaLabel = "Options",
  id,
  required = false,
}: {
  options: Option[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  allLabel?: string;
  ariaLabel?: string;
  id?: string;
  required?: boolean;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    if (!q.trim()) return options;
    const term = q.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(term));
  }, [options, q]);

  // Keep the chosen option in the list even when the filter would hide it,
  // otherwise the select would visually fall back to the placeholder.
  const chosen = value ? options.find((o) => o.id === value) : undefined;
  const chosenHidden = Boolean(chosen && !filtered.some((o) => o.id === chosen.id));

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
        <Input
          aria-label={`Search ${ariaLabel.toLowerCase()}`}
          className="pl-9"
          placeholder={placeholder}
          value={q}
          onChange={(event) => setQ(event.target.value)}
        />
      </div>
      <select
        id={id}
        aria-label={ariaLabel}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-lg border border-line-strong bg-white px-3 text-sm text-ink shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 dark:border-navy-700 dark:bg-navy-900 dark:text-slate-100"
      >
        {allLabel && <option value="">{allLabel}</option>}
        {chosenHidden && chosen && <option value={chosen.id}>{chosen.label}</option>}
        {filtered.length === 0 && (
          <option value="" disabled>
            No matches
          </option>
        )}
        {filtered.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      <p className="text-xs text-ink-muted">
        {q.trim()
          ? `${filtered.length} of ${options.length} match “${q.trim()}”`
          : `${options.length} option${options.length === 1 ? "" : "s"}`}
      </p>
    </div>
  );
}
