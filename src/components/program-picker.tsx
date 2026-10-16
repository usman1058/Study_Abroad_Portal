"use client";

import { useMemo, useState } from "react";
import { Search, Filter, X, ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { FeeDisplay } from "@/components/currency";

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

export function ProgramPicker({
  programs,
  value,
  onChange,
  emptyLabel = "Search and select a program…",
}: {
  programs: ProgramOption[];
  value: string;
  onChange: (id: string) => void;
  emptyLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({ q: "", country: "", city: "", level: "", field: "", minFee: "", maxFee: "" });

  const displayName = (p: ProgramOption) => p.name || p.label.split(" — ").slice(1).join(" — ") || p.label;
  const displayUni = (p: ProgramOption) => p.university || p.label.split(" — ")[0] || "";

  const countries = useMemo(() => [...new Set(programs.map((p) => p.country).filter(Boolean) as string[])].sort(), [programs]);
  const cities = useMemo(() => [...new Set(programs.map((p) => p.city).filter(Boolean) as string[])].sort(), [programs]);
  const levels = useMemo(() => [...new Set(programs.map((p) => p.level).filter(Boolean) as string[])].sort(), [programs]);
  const fields = useMemo(() => [...new Set(programs.map((p) => p.field).filter(Boolean) as string[])].sort(), [programs]);

  const filtered = useMemo(() => {
    return programs.filter((p) => {
      if (filters.q) {
        const hay = (p.label + " " + (p.name ?? "") + " " + (p.university ?? "") + " " + (p.field ?? "")).toLowerCase();
        if (!hay.includes(filters.q.toLowerCase())) return false;
      }
      if (filters.country && p.country !== filters.country) return false;
      if (filters.city && p.city !== filters.city) return false;
      if (filters.level && p.level !== filters.level) return false;
      if (filters.field && p.field !== filters.field) return false;
      if (filters.minFee && (p.fee ?? 0) < parseFloat(filters.minFee)) return false;
      if (filters.maxFee && (p.fee ?? 0) > parseFloat(filters.maxFee)) return false;
      return true;
    });
  }, [programs, filters]);

  const hasActiveFilters = Object.entries(filters).some(([k, v]) => k !== "q" && v !== "") || filters.q !== "";
  const selected = programs.find((p) => p.id === value);

  function clearFilters() {
    setFilters({ q: "", country: "", city: "", level: "", field: "", minFee: "", maxFee: "" });
  }

  return (
    <div className="space-y-3">
      {/* Trigger / selected summary */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 rounded-lg border border-line-strong bg-white px-3 py-2.5 text-left text-sm shadow-sm transition hover:border-brand-400 dark:border-navy-700 dark:bg-navy-900"
      >
        {selected ? (
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold text-ink">{displayName(selected)}</span>
            <span className="block truncate text-xs text-ink-muted">{displayUni(selected)}{selected.country ? ` · ${selected.city ? selected.city + ", " : ""}${selected.country}` : ""}</span>
          </span>
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
                placeholder="Search program, university, field…"
                value={filters.q}
                onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
              />
            </div>
            <Button type="button" variant={showFilters || hasActiveFilters ? "primary" : "outline"} size="sm" onClick={() => setShowFilters((v) => !v)}>
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
              <div>
                <Label className="text-xs">Country</Label>
                <Select value={filters.country} onChange={(e) => setFilters((f) => ({ ...f, country: e.target.value }))}>
                  <option value="">All countries</option>
                  {countries.map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
              </div>
              <div>
                <Label className="text-xs">City</Label>
                <Select value={filters.city} onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value }))}>
                  <option value="">All cities</option>
                  {cities.map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
              </div>
              <div>
                <Label className="text-xs">Level</Label>
                <Select value={filters.level} onChange={(e) => setFilters((f) => ({ ...f, level: e.target.value }))}>
                  <option value="">All levels</option>
                  {levels.map((l) => <option key={l} value={l}>{l}</option>)}
                </Select>
              </div>
              <div>
                <Label className="text-xs">Field</Label>
                <Select value={filters.field} onChange={(e) => setFilters((f) => ({ ...f, field: e.target.value }))}>
                  <option value="">All fields</option>
                  {fields.map((f) => <option key={f} value={f}>{f}</option>)}
                </Select>
              </div>
              <div>
                <Label className="text-xs">Min tuition</Label>
                <Input type="number" placeholder="Min" value={filters.minFee} onChange={(e) => setFilters((f) => ({ ...f, minFee: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Max tuition</Label>
                <Input type="number" placeholder="Max" value={filters.maxFee} onChange={(e) => setFilters((f) => ({ ...f, maxFee: e.target.value }))} />
              </div>
            </div>
          )}

          {/* Results list */}
          <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
            {filtered.length === 0 ? (
              <p className="py-6 text-center text-sm text-ink-muted">No programs match your filters.</p>
            ) : (
              filtered.map((p) => {
                const active = p.id === value;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => { onChange(p.id); setOpen(false); }}
                    className={"flex w-full items-start justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition " + (active ? "border-brand-500 bg-brand-50 dark:bg-brand-900/30" : "border-line bg-white hover:border-brand-300 hover:bg-brand-50/40 dark:border-navy-700 dark:bg-navy-900")}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-ink">{displayName(p)}</span>
                      <span className="block truncate text-xs text-ink-muted">{displayUni(p)}</span>
                      <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">
                        {p.country && <span>{p.city ? p.city + ", " : ""}{p.country}</span>}
                        {p.level && <Badge tone="slate" className="text-[10px]">{p.level}</Badge>}
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
          <p className="text-xs text-ink-muted">{filtered.length} of {programs.length} programs</p>
        </div>
      )}
    </div>
  );
}
