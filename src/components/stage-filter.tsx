"use client";

import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/select";
import { APPLICATION_STAGES } from "@/lib/constants";

export function StageFilter({ current }: { current: string }) {
  const router = useRouter();
  return (
    <Select
      name="stage"
      className="w-48"
      value={current}
      onChange={(e) => {
        router.push(e.target.value ? `/application?stage=${e.target.value}` : "/application");
        router.refresh();
      }}
    >
      <option value="">All stages</option>
      {APPLICATION_STAGES.map((s) => (
        <option key={s.value} value={s.value}>{s.label}</option>
      ))}
    </Select>
  );
}