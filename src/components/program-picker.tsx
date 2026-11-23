"use client";

import { useEffect, useState } from "react";
import { Search, Filter, X, ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { FeeDisplay } from "@/components/currency";
import { programLevelLabel } from "@/lib/constants";

export type ProgramOption = {
  id: string;
  label: string;
  name?: string;
  university?: string;
  universityId?: string;
  country?: string;
  city?: string;
  level?: string;
  field?: string;
  fee?: number;
};

type Filters = { q: string; country: string; city: string; level: string; field: string; minFee: string; maxFee: string };

type Facets = { countries: string[]; cities: string[]; levels: string[]; fields: string[] };

const EMPTY_FILTERS: Filters = { q: "", country: "", city: "", level: "", field: "", minFee: "", maxFee: "" };
const EMPTY_FACETS: Facets = { countries: [], cities: [], levels: [], fields: [] };

/**
 * Searchable program picker backed by `/api/programs/picker`.
 *
 * The catalogue is never shipped to the browser: each keystroke (debounced)
 * asks the server for the first 40 matches plus the true total, so the payload
 * stays constant no matter how large the catalogue grows.
 */
export function ProgramPicker({
  value,
  onChange,
  emptyLabel = "Search and select a program…",
  selectedLabel,
}: {
  value: string;
  onChange: (id: string) => void;
  emptyLabel?: string;
  /** Shown when the selected program is known by name but not in the fetched page. */
  selectedLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [options, setOptions] = useState<ProgramOption[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facets, setFacets] = useState<Facets>(EMPTY_FACETS);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      const params = new URLSearchParams();
      for (const key of ["q", "country", "city", "level", "field", "minFee", "maxFee"] as const) {
        if (filters[key]) params.set(key, filters[key]);
      }
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/programs/picker?${params.toString()}`, { signal: controller.signal });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error ?? "Could not load programs.");
        setOptions(json.data.programs as ProgramOption[]);
        setTotal(Number(json.data.total) || 0);
        setFacets(json.data.facets as Facets);
      } catch (e) {
        if (controller.signal.aborted) return;
        setError(e instanceof Error ? e.message : "Could not load programs.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [open, filters]);

  const displayName = (p: ProgramOption) => p.name || p.label.split(" — ").slice(1).join(" — ") || p.label;
  const displayUni = (p: ProgramOption) => p.university || p.label.split(" — ")[0] || "";

  const hasActiveFilters = Object.entries(filters).some(([, v]) => v !== "");
  const selected = options.find((p) => p.id === value);
  const shown = options.length;

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
  }

  return (
    <div className="space-y-3">
      {/* Trigger / selected summary */}
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 rounded-lg border border-line-strong bg-white px-3 py-2.5 text-left text-sm shadow-sm transition hover:border-brand-400 dark:border-navy-700 dark:bg-navy-900"
      >
        {selected ? (
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold text-ink">{displayName(selected)}</span>
            <span className="block truncate text-xs text-ink-muted">
              {displayUni(selected)}
              {selected.country ? ` · ${selected.city ? selected.city + ", " : ""}${selected.country}` : ""}
            </span>
          </span>
        ) : value ? (
          <span className="min-w-0 flex-1 truncate text-ink">{selectedLabel ?? "Program selected"}</span>
        ) : (
          <span className="text-ink-muted">{emptyLabel}</span>
        )}
        <ChevronDown className={"h-4 w-4 shrink-0 text-ink-muted transition " + (open ? "rotate-180" : "")} />
      </button>

      {open && (
        <div className="space-y-3 rounded-xl border border-line bg-canvas-subtle/40 p-3 dark:border-navy-700 dark:bg-navy-900/40">
          {/* Search + filter toggle */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-9"
                aria-label="Search programs"
                placeholder="Search program, university, field…"
                value={filters.q}
                onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
              />
            </div>
            <Button type="button" variant={showFilters || hasActiveFilters ? "primary" : "outline"} size="sm" onClick={() => setShowFilters((v) => !v)} aria-expanded={showFilters}>
              <Filter className="h-4 w-4 mr-1.5" /> Filters {hasActiveFilters && <span className="ml-1 rounded bg-white/20 px-1.5 py-0.5 text-[10px]">•</span>}
            </Button>
            {hasActiveFilters && (
              <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-3.5 w-3.5 mr-1" /> Clear
              </Button>
            )}
          </div>

          {showFilters && (
            <div className="grid gap-3 rounded-lg border border-line bg-white p-3 dark:border-navy-700 dark:bg-navy-900 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Country">
                <Select value={filters.country} onChange={(e) => setFilters((f) => ({ ...f, country: e.target.value }))}>
                  <option value="">All countries</option>
                  {facets.countries.map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
              </Field>
              <Field label="City">
                <Select value={filters.city} onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value }))}>
                  <option value="">All cities</option>
                  {facets.cities.map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
              </Field>
              <Field label="Level">
                <Select value={filters.level} onChange={(e) => setFilters((f) => ({ ...f, level: e.target.value }))}>
                  <option value="">All levels</option>
                  {facets.levels.map((l) => <option key={l} value={l}>{programLevelLabel(l)}</option>)}
                </Select>
              </Field>
              <Field label="Field">
                <Select value={filters.field} onChange={(e) => setFilters((f) => ({ ...f, field: e.target.value }))}>
                  <option value="">All fields</option>
                  {facets.fields.map((f) => <option key={f} value={f}>{f}</option>)}
                </Select>
              </Field>
              <Field label="Min tuition">
                <Input type="number" min={0} placeholder="Min" value={filters.minFee} onChange={(e) => setFilters((f) => ({ ...f, minFee: e.target.value }))} />
              </Field>
              <Field label="Max tuition">
                <Input type="number" min={0} placeholder="Max" value={filters.maxFee} onChange={(e) => setFilters((f) => ({ ...f, maxFee: e.target.value }))} />
              </Field>
            </div>
          )}

          {/* Results list */}
          <div className="max-h-80 overflow-y-auto space-y-2 pr-1" aria-busy={loading}>
            {error ? (
              <p role="alert" className="py-6 text-center text-sm text-red-700 dark:text-red-300">{error}</p>
            ) : loading && shown === 0 ? (
              <p className="py-6 text-center text-sm text-ink-muted">Searching programs…</p>
            ) : shown === 0 ? (
              <p className="py-6 text-center text-sm text-ink-muted">No programs match your filters.</p>
            ) : (
              options.map((p) => {
                const active = p.id === value;
                return (
                  <button
                    key={p.id}
                    type="button"
                    data-picker-option={p.id}
                    aria-pressed={active}
                    onClick={() => { onChange(p.id); setOpen(false); }}
                    className={"flex w-full items-start justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition " + (active ? "border-brand-500 bg-brand-50 dark:bg-brand-900/30" : "border-line bg-white hover:border-brand-300 hover:bg-brand-50/40 dark:border-navy-700 dark:bg-navy-900")}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-ink">{displayName(p)}</span>
                      <span className="block truncate text-xs text-ink-muted">{displayUni(p)}</span>
                      <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">
                        {p.country && <span>{p.city ? p.city + ", " : ""}{p.country}</span>}
                        {p.level && <Badge tone="slate" className="text-[10px]">{programLevelLabel(p.level)}</Badge>}
                        {p.field && <Badge tone="slate" className="text-[10px]">{p.field}</Badge>}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="text-sm font-semibold text-ink"><FeeDisplay amount={p.fee ?? 0} /></span>
                      {active && <Check className="h-4 w-4 text-brand-600" />}
                    </span>
                  </button>
                );
              })
            )}
          </div>
          <p className="text-xs text-ink-muted" aria-live="polite">
            {loading
              ? "Searching programs…"
              : total > shown
                ? `Showing the first ${shown} of ${total} matches — refine your search to narrow it down.`
                : `${total} program${total === 1 ? "" : "s"} available.`}
          </p>
        </div>
      )}
    </div>
  );
}
