"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, UserPlus, User, GraduationCap, Building2, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/password-input";
import { ROLE_LABELS } from "@/lib/constants";
import type { Role } from "@/generated/prisma/client";
import { cn } from "@/lib/utils";

interface SidebarUserCreateProps {
  allowedRoles: Role[];
  counselors: { id: string; label: string }[];
}

const ROLE_ICONS: Record<Role, React.ElementType> = {
  STUDENT: GraduationCap,
  AGENCY: Building2,
  COUNSELOR: UserCheck,
  MANAGER: UserPlus,
  SUPER_ADMIN: UserPlus,
};

export function SidebarUserCreate({ allowedRoles, counselors }: SidebarUserCreateProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
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

  const roleOptions = allowedRoles.map((r) => ({
    value: r,
    label: ROLE_LABELS[r],
    icon: ROLE_ICONS[r],
  }));

  return (
    <div className="relative">
      <Button
        variant="outline"
        className="w-full justify-start gap-2"
        onClick={() => setMenuOpen(!menuOpen)}
      >
        <UserPlus className="h-4 w-4" />
        <span>Add User</span>
        <ChevronDown className={cn("ml-auto h-4 w-4 transition-transform", menuOpen && "rotate-180")} />
      </Button>

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
          <div className="absolute bottom-full left-0 right-0 z-50 mb-1">
            <div className="rounded-xl border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-800 dark:bg-slate-900">
              {roleOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setForm((prev) => ({ ...prev, role: opt.value }));
                    setMenuOpen(false);
                    setOpen(true);
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <opt.icon className="h-4 w-4" />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-0 right-0 z-50 mb-1">
            <form
              onSubmit={submit}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-lg dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold">Create a new account</h3>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-slate-500 hover:text-slate-700"
                >
                  ✕
                </button>
              </div>
              {error && (
                <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200">
                  {error}
                </div>
              )}
              <div className="space-y-4">
                <div>
                  <Label>Role</Label>
                  <Select value={form.role} onChange={(e) => set("role", e.target.value)}>
                    {allowedRoles.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Title</Label>
                    <Select value={form.userTitle} onChange={(e) => set("userTitle", e.target.value)}>
                      <option value="">None</option>
                      <option value="Mr">Mr</option>
                      <option value="Mrs">Mrs</option>
                      <option value="Ms">Ms</option>
                      <option value="Dr">Dr</option>
                    </Select>
                  </div>
                  <div>
                    <Label>First name</Label>
                    <Input required maxLength={80} value={form.firstName} onChange={(e) => set("firstName", e.target.value)} />
                  </div>
                  <div>
                    <Label>Last name</Label>
                    <Input required maxLength={80} value={form.lastName} onChange={(e) => set("lastName", e.target.value)} />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input type="email" required maxLength={254} value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="user@example.com" />
                  </div>
                  <div>
                    <Label>Password</Label>
                    <PasswordInput
                      required
                      minLength={8}
                      maxLength={72}
                      value={form.password}
                      onChange={(e) => set("password", e.target.value)}
                      placeholder="At least 8 characters"
                    />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input type="tel" maxLength={30} value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+60 12 345 6789" />
                  </div>
                  <div>
                    <Label>Country</Label>
                    <Input maxLength={80} value={form.country} onChange={(e) => set("country", e.target.value)} placeholder="Malaysia" />
                  </div>
                  <div>
                    <Label>Gender</Label>
                    <Select value={form.gender} onChange={(e) => set("gender", e.target.value)}>
                      <option value="">Unspecified</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </Select>
                  </div>
                  <div>
                    <Label>Country</Label>
                    <Input maxLength={80} value={form.country} onChange={(e) => set("country", e.target.value)} placeholder="Malaysia" />
                  </div>
                  {form.role === "AGENCY" && (
                    <div className="sm:col-span-2">
                      <Label>Company name</Label>
                      <Input maxLength={160} value={form.companyName} onChange={(e) => set("companyName", e.target.value)} placeholder="Company name" />
                    </div>
                  )}
                  {form.role === "STUDENT" && counselors.length > 0 && (
                    <div className="sm:col-span-2">
                      <Label>Assign counselor</Label>
                      <Select value={form.assignedCounselorId} onChange={(e) => set("assignedCounselorId", e.target.value)}>
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
                {error && <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
                <div className="mt-4 flex gap-2">
                  <Button type="submit" className="flex-1" disabled={loading}>
                    {loading ? "Creating…" : "Create account"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}

function submit(e: React.FormEvent) {
  e.preventDefault();
  // This is handled by the inline submit in the component
}