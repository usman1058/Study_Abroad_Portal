"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/password-input";
import { PasswordChecklist, isStrongPassword } from "@/components/password-checklist";
import { Spinner } from "@/components/ui/spinner";

export function PartnerSignupForm() {
  const [form, setForm] = useState({
    companyName: "",
    licenseNumber: "",
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    country: "",
    password: "",
    confirmPassword: "",
  });
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const consentRef = useRef<HTMLInputElement>(null);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (form.licenseNumber.trim().length < 3) {
      setError("Enter your business registration or agency licence number.");
      document.getElementById("licenseNumber")?.focus();
      return;
    }
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
      setError("Please confirm that you are authorised to request an agency account.");
      consentRef.current?.focus();
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/partner-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: form.companyName,
          licenseNumber: form.licenseNumber,
          firstName: form.firstName,
          lastName: form.lastName,
          phone: form.phone,
          email: form.email,
          country: form.country,
          password: form.password,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Signup failed. Please try again.");
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="space-y-4">
        <div role="status" className="rounded-lg bg-emerald-50 px-3 py-3 text-sm text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200">
          Request submitted. We will review <strong>{form.companyName}</strong> and email you once the account is
          approved. You cannot sign in until then.
        </div>
        <Link
          href="/partner/login"
          className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-brand-600 px-5 text-sm font-semibold text-white transition hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
        >
          Back to partner login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div aria-live="assertive">
        {error && (
          <div id="partner-signup-error" role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200">
            {error}
          </div>
        )}
      </div>
      <div>
        <Label htmlFor="companyName">Agency / company name</Label>
        <Input
          id="companyName"
          name="companyName"
          autoComplete="organization"
          required
          maxLength={160}
          value={form.companyName}
          onChange={(e) => set("companyName", e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "partner-signup-error" : undefined}
          placeholder="Acme Study Abroad Sdn Bhd"
        />
      </div>
      <div>
        <Label htmlFor="licenseNumber">Business registration / licence number</Label>
        <Input
          id="licenseNumber"
          name="licenseNumber"
          required
          minLength={3}
          maxLength={60}
          value={form.licenseNumber}
          onChange={(e) => set("licenseNumber", e.target.value)}
          aria-describedby="license-hint"
          placeholder="e.g. 202401234567"
        />
        <p id="license-hint" className="mt-1 text-xs text-ink-muted">
          We check this against your local agency registry during review.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="firstName">First name</Label>
          <Input id="firstName" name="firstName" autoComplete="given-name" required maxLength={80} value={form.firstName} onChange={(e) => set("firstName", e.target.value)} />
        </div>
        <div>
          <Label htmlFor="lastName">Last name</Label>
          <Input id="lastName" name="lastName" autoComplete="family-name" required maxLength={80} value={form.lastName} onChange={(e) => set("lastName", e.target.value)} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" type="tel" autoComplete="tel" required maxLength={30} value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+60 12 345 6789" />
        </div>
        <div>
          <Label htmlFor="country">Country</Label>
          <Input id="country" name="country" autoComplete="country-name" required maxLength={80} value={form.country} onChange={(e) => set("country", e.target.value)} placeholder="Malaysia" />
        </div>
      </div>
      <div>
        <Label htmlFor="email">Work email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required maxLength={254} value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="you@example.com" />
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
          aria-describedby="partner-password-rules"
          placeholder="At least 8 characters"
        />
        <PasswordChecklist value={form.password} id="partner-password-rules" />
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
          ref={consentRef}
          id="partner-consent"
          name="partnerConsent"
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-line-strong text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        />
        <Label htmlFor="partner-consent" className="font-normal">
          I am authorised to request an account for this agency and the details above are accurate.
        </Label>
      </div>
      <Button type="submit" className="w-full" disabled={loading} size="lg">
        {loading && <Spinner size={16} className="mr-1" />}
        {loading ? "Submitting request…" : "Request account"}
      </Button>
    </form>
  );
}
