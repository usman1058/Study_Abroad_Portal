"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Search, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FeeDisplay } from "@/components/currency";

export type CourseFilters = {
  q?: string;
  country?: string;
  level?: string;
  field?: string;
  minFee?: string;
  maxFee?: string;
};

export function CourseFilter({
  programs,
  onSelect,
  initialFilters = {},
}: {
  programs: { id: string; label: string; country?: string; level?: string; field?: string; fee?: number }[];
  onSelect: (programId: string) => void;
  initialFilters?: CourseFilters;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<CourseFilters>({
    q: initialFilters.q || "",
    country: initialFilters.country || "",
    level: initialFilters.level || "",
    field: initialFilters.field || "",
    minFee: initialFilters.minFee || "",
    maxFee: initialFilters.maxFee || "",
  });

  // Derive unique filter options from programs
  const countries = [...new Set(programs.map(p => p.country).filter(Boolean))].sort();
  const levels = [...new Set(programs.map(p => p.level).filter(Boolean))].sort();
  const fields = [...new Set(programs.map(p => p.field).filter(Boolean))].sort();

  const filteredPrograms = programs.filter(p => {
    if (filters.q && !p.label.toLowerCase().includes(filters.q.toLowerCase())) return false;
    if (filters.country && p.country !== filters.country) return false;
    if (filters.level && p.level !== filters.level) return false;
    if (filters.field && p.field !== filters.field) return false;
    if (filters.minFee && (p.fee || 0) < parseFloat(filters.minFee)) return false;
    if (filters.maxFee && (p.fee || 0) > parseFloat(filters.maxFee)) return false;
    return true;
  });

  const handleFilterChange = (key: keyof CourseFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({ q: "", country: "", level: "", field: "", minFee: "", maxFee: "" });
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== "");

  return (
    <div className="space-y-4">
      {/* Filter Toggle */}
      <Button
        variant={hasActiveFilters ? "primary" : "outline"}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full sm:w-auto"
      >
        <Filter className="h-4 w-4 mr-2" />
        Filters {hasActiveFilters && <span className="ml-1 bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded text-xs">Active</span>}
      </Button>

      {/* Filter Panel */}
      {isOpen && (
        <div className="absolute z-10 w-full max-w-md animate-in fade-in slide-in-from-top-2">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-lg dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Filter Courses</h3>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-3 w-3 mr-1" /> Clear all
                </Button>
              )}
            </div>

            <div className="space-y-3 mt-4">
              {/* Search */}
              <div>
                <Label className="text-xs">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Search program, university, field…"
                    value={filters.q}
                    onChange={(e) => handleFilterChange("q", e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Country</Label>
                  <Select value={filters.country} onChange={(e) => handleFilterChange("country", e.target.value)} className="sm:col-span-2" aria-label="Filter by country">
                    <option value="">All countries</option>
                    {countries.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Level</Label>
                  <Select value={filters.level} onChange={(e) => handleFilterChange("level", e.target.value)} className="sm:col-span-1" aria-label="Filter by level">
                    <option value="">All levels</option>
                    {levels.map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Field</Label>
                  <Select value={filters.field} onChange={(e) => handleFilterChange("field", e.target.value)} className="sm:col-span-1" aria-label="Filter by field">
                    <option value="">All fields</option>
                    {fields.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Min Fee (MYR)</Label>
                  <Input type="number" placeholder="Min" value={filters.minFee} onChange={(e) => handleFilterChange("minFee", e.target.value)} />
                </div>
                <div>
                  <Label>Max Fee (MYR)</Label>
                  <Input type="number" placeholder="Max" value={filters.maxFee} onChange={(e) => handleFilterChange("maxFee", e.target.value)} />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={clearFilters}>Clear</Button>
              <Button className="flex-1" onClick={() => setIsOpen(false)}>Apply</Button>
            </div>
          </div>
        </div>
      )}

      {/* Results List */}
      <div className="space-y-2 max-h-96 overflow-y-auto mt-4">
        {filteredPrograms.length === 0 ? (
          <p className="text-center text-sm text-slate-500 py-4">No courses match your filters.</p>
        ) : (
          filteredPrograms.map(p => (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              className="w-full text-left p-3 rounded-lg border border-slate-200 hover:bg-brand-50 hover:border-brand-300 dark:hover:bg-slate-800/30 dark:border-slate-700 transition text-left"
            >
              <p className="font-medium">{p.label.split(" — ")[1] || p.label}</p>
              <p className="text-xs text-slate-500 truncate">{p.label.split(" — ")[0]}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                {p.country && <span className="flex items-center gap-1"><span>📍</span>{p.country}</span>}
                {p.level && <Badge tone="slate" className="text-xs">{p.level}</Badge>}
                {p.field && <Badge tone="slate" className="text-xs">{p.field}</Badge>}
                <FeeDisplay amount={p.fee ?? 0} />
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}