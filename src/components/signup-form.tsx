"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, getSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/password-input";
import { PasswordChecklist, isStrongPassword } from "@/components/password-checklist";
import { Spinner } from "@/components/ui/spinner";

export function SignupForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const firstInvalid = useRef<HTMLInputElement | null>(null);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isStrongPassword(form.password)) {
      setError("Choose a password with at least 8 characters, one letter and one number.");
      document.getElementById("password")?.focus();
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("The two passwords do not match.");
      document.getElementById("confirmPassword")?.focus();
      return;
    }
    if (!consent) {
      setError("Please confirm that you agree to the terms of service and privacy policy.");
      firstInvalid.current?.focus();
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          phone: form.phone,
          email: form.email,
          password: form.password,
        }),
      });
      const json = await res.json().catch(() => ({}));
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
      router.push(session?.user?.role === "STUDENT" ? "/student-home" : "/home");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div aria-live="assertive">
        {error && (
          <div id="signup-error" role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200">
            {error}
          </div>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="firstName">First name</Label>
          <Input
            id="firstName"
            name="firstName"
            autoComplete="given-name"
            required
            maxLength={80}
            value={form.firstName}
            onChange={(e) => set("firstName", e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "signup-error" : undefined}
          />
        </div>
        <div>
          <Label htmlFor="lastName">Last name</Label>
          <Input
            id="lastName"
            name="lastName"
            autoComplete="family-name"
            required
            maxLength={80}
            value={form.lastName}
            onChange={(e) => set("lastName", e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "signup-error" : undefined}
          />
        </div>
      </div>
      <div>
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          required
          maxLength={30}
          value={form.phone}
          onChange={(e) => set("phone", e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "signup-error" : undefined}
          placeholder="+60 12 345 6789"
        />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          value={form.email}
          onChange={(e) => set("email", e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "signup-error" : undefined}
          placeholder="you@example.com"
        />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={72}
          value={form.password}
          onChange={(e) => set("password", e.target.value)}
          aria-describedby="password-rules"
          placeholder="At least 8 characters"
        />
        <PasswordChecklist value={form.password} id="password-rules" />
      </div>
      <div>
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <PasswordInput
          id="confirmPassword"
          name="confirmPassword"
          autoComplete="new-password"
          required
          maxLength={72}
          value={form.confirmPassword}
          onChange={(e) => set("confirmPassword", e.target.value)}
          placeholder="Re-enter your password"
        />
      </div>
      <div className="flex items-start gap-2">
        <input
          ref={firstInvalid}
          id="consent"
          name="consent"
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-line-strong text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          aria-describedby="consent-hint"
        />
        <div>
          <Label htmlFor="consent" className="font-normal">
            I agree to the terms of service and privacy policy.
          </Label>
          <p id="consent-hint" className="text-xs text-ink-muted">
            We use your details only to manage your applications.
          </p>
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={loading} size="lg">
        {loading && <Spinner size={16} className="mr-1" />}
        {loading ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
