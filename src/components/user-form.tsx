"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ROLE_LABELS } from "@/lib/constants";
import type { Role } from "@/generated/prisma/client";

export function UserForm({
  allowedRoles,
  counselors,
}: {
  allowedRoles: Role[];
  counselors: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    role: allowedRoles[0] ?? "STUDENT",
    email: "",
    password: "",
    userTitle: "",
    firstName: "",
    lastName: "",
    gender: "",
    phone: "",
    country: "",
    companyName: "",
    assignedCounselorId: "",
  });

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to create user");
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>+ Create user</Button>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-line bg-white p-5 dark:border-navy-700 dark:bg-navy-900">
      <h3 className="font-semibold">Create a new account</h3>
      {error && <div role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="new-user-role">Role</Label>
          <Select id="new-user-role" value={form.role} onChange={(e) => set("role", e.target.value)}>
            {allowedRoles.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="new-user-title">Title</Label>
          <Select id="new-user-title" value={form.userTitle} onChange={(e) => set("userTitle", e.target.value)}>
            <option value="">None</option>
            <option value="Mr">Mr</option>
            <option value="Mrs">Mrs</option>
            <option value="Ms">Ms</option>
            <option value="Dr">Dr</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="new-user-first-name">First name</Label>
          <Input id="new-user-first-name" autoComplete="given-name" required maxLength={80} value={form.firstName} onChange={(e) => set("firstName", e.target.value)} />
        </div>
        <div>
          <Label htmlFor="new-user-last-name">Last name</Label>
          <Input id="new-user-last-name" autoComplete="family-name" required maxLength={80} value={form.lastName} onChange={(e) => set("lastName", e.target.value)} />
        </div>
        <div>
          <Label htmlFor="new-user-email">Email</Label>
          <Input id="new-user-email" autoComplete="email" type="email" required maxLength={254} value={form.email} onChange={(e) => set("email", e.target.value)} />
        </div>
        <div>
          <Label htmlFor="new-user-password">Password</Label>
          <Input id="new-user-password" autoComplete="new-password" type="password" required minLength={8} maxLength={72} value={form.password} onChange={(e) => set("password", e.target.value)} />
        </div>
        <div>
          <Label htmlFor="new-user-phone">Phone</Label>
          <Input id="new-user-phone" autoComplete="tel" type="tel" maxLength={30} value={form.phone} onChange={(e) => set("phone", e.target.value)} />
        </div>
        <div>
          <Label htmlFor="new-user-gender">Gender</Label>
          <Select id="new-user-gender" value={form.gender} onChange={(e) => set("gender", e.target.value)}>
            <option value="">Unspecified</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="new-user-country">Country</Label>
          <Input id="new-user-country" autoComplete="country-name" maxLength={80} value={form.country} onChange={(e) => set("country", e.target.value)} />
        </div>
        {form.role === "AGENCY" && (
          <div>
            <Label htmlFor="new-user-company">Company name</Label>
            <Input id="new-user-company" autoComplete="organization" maxLength={160} value={form.companyName} onChange={(e) => set("companyName", e.target.value)} />
          </div>
        )}
        {form.role === "STUDENT" && counselors.length > 0 && (
          <div className="sm:col-span-2">
            <Label htmlFor="new-user-counselor">Assign counselor</Label>
            <Select id="new-user-counselor" value={form.assignedCounselorId} onChange={(e) => set("assignedCounselorId", e.target.value)}>
              <option value="">Unassigned</option>
              {counselors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </Select>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Creating…" : "Create account"}
        </Button>
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
