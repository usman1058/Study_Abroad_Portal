"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { CURRENCIES } from "@/lib/constants";
import type { Role } from "@/generated/prisma/client";

export function ProfileForm({
  role,
  initial,
}: {
  role: Role;
  initial: Record<string, string>;
}) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  function set(k: string, v: string) {
    setForm((prev) => ({ ...prev, [k]: v }));
    setSaved(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error ?? "Failed to save profile");
        return;
      }
      setSaved(true);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const student = role === "STUDENT";

  return (
    <form onSubmit={submit} className="space-y-4">
      {saved && <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Profile saved.</div>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Title</Label>
          <Select value={form.userTitle ?? ""} onChange={(e) => set("userTitle", e.target.value)}>
            <option value="">None</option>
            <option value="Mr">Mr</option>
            <option value="Mrs">Mrs</option>
            <option value="Ms">Ms</option>
            <option value="Dr">Dr</option>
          </Select>
        </div>
        <div>
          <Label>Gender</Label>
          <Select value={form.gender ?? ""} onChange={(e) => set("gender", e.target.value)}>
            <option value="">Unspecified</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </Select>
        </div>
        <div>
          <Label>Phone</Label>
          <Input value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} />
        </div>
        <div>
          <Label>Country</Label>
          <Input value={form.country ?? ""} onChange={(e) => set("country", e.target.value)} />
        </div>
        <div>
          <Label>Preferred currency</Label>
          <Select value={form.preferredCurrency ?? "MYR"} onChange={(e) => set("preferredCurrency", e.target.value)}>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>
        </div>
        {!student && (
          <>
            <div>
              <Label>Company name</Label>
              <Input value={form.companyName ?? ""} onChange={(e) => set("companyName", e.target.value)} />
            </div>
            <div>
              <Label>License number</Label>
              <Input value={form.licenseNumber ?? ""} onChange={(e) => set("licenseNumber", e.target.value)} />
            </div>
          </>
        )}
        {student && (
          <>
            <div>
              <Label>Passport number</Label>
              <Input value={form.passportNumber ?? ""} onChange={(e) => set("passportNumber", e.target.value)} />
            </div>
            <div>
              <Label>Birthday</Label>
              <Input type="date" value={form.birthday ?? ""} onChange={(e) => set("birthday", e.target.value)} />
            </div>
            <div>
              <Label>Nationality</Label>
              <Input value={form.nationality ?? ""} onChange={(e) => set("nationality", e.target.value)} />
            </div>
            <div>
              <Label>Country of residence</Label>
              <Input value={form.countryOfResidence ?? ""} onChange={(e) => set("countryOfResidence", e.target.value)} />
            </div>
            <div>
              <Label>City of residence</Label>
              <Input value={form.cityOfResidence ?? ""} onChange={(e) => set("cityOfResidence", e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label>Address</Label>
              <Input value={form.address ?? ""} onChange={(e) => set("address", e.target.value)} />
            </div>
            <div>
              <Label>Mother's name</Label>
              <Input value={form.motherName ?? ""} onChange={(e) => set("motherName", e.target.value)} />
            </div>
            <div>
              <Label>Father's name</Label>
              <Input value={form.fatherName ?? ""} onChange={(e) => set("fatherName", e.target.value)} />
            </div>
          </>
        )}
      </div>
      <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save profile"}</Button>
    </form>
  );
}