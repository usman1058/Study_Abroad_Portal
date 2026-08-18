"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export function ProgramsFilter({
  countries,
  cities,
}: {
  countries: { value: string; label: string }[];
  cities: { value: string; label: string }[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");

  function apply(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`/programs?${next.toString()}`);
    router.refresh();
  }

  return (
    <div className="grid gap-3 sm:grid-cols-4">
      <div className="relative sm:col-span-2">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          className="pl-9"
          placeholder="Search program name, field…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") apply("q", q.trim());
          }}
        />
      </div>
      <Select value={params.get("country") ?? ""} onChange={(e) => apply("country", e.target.value)}>
        <option value="">All countries</option>
        {countries.map((c) => (
          <option key={c.value} value={c.value}>{c.label}</option>
        ))}
      </Select>
      <Select value={params.get("city") ?? ""} onChange={(e) => apply("city", e.target.value)}>
        <option value="">All cities</option>
        {cities.map((c) => (
          <option key={c.value} value={c.value}>{c.label}</option>
        ))}
      </Select>
    </div>
  );
}