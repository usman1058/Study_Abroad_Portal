"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, getSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/password-input";

export function SignupForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Signup failed. Please try again.");
        return;
      }
      const login = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });
      if (login?.error) {
        router.push("/student/login");
        return;
      }
      const session = await getSession();
      router.push(session?.user?.role === "STUDENT" ? "/my-applications" : "/home");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200">
          {error}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="firstName">First name</Label>
          <Input id="firstName" required maxLength={80} value={form.firstName} onChange={(e) => set("firstName", e.target.value)} />
        </div>
        <div>
          <Label htmlFor="lastName">Last name</Label>
          <Input id="lastName" required maxLength={80} value={form.lastName} onChange={(e) => set("lastName", e.target.value)} />
        </div>
      </div>
      <div>
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" type="tel" required maxLength={30} value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+60 12 345 6789" />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" required maxLength={254} value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="you@example.com" />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <PasswordInput id="password" required minLength={8} maxLength={72} value={form.password} onChange={(e) => set("password", e.target.value)} placeholder="At least 8 characters" />
      </div>
      <Button type="submit" className="w-full" disabled={loading} size="lg">
        {loading ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}