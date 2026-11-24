"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/password-input";
import { PasswordChecklist, isStrongPassword } from "@/components/password-checklist";
import { Spinner } from "@/components/ui/spinner";
import { useUploadLimit } from "@/hooks/use-upload-limit";
import { formatUploadSizeMB } from "@/lib/upload-limits";
import { canConvertImageToWebP, prepareUploadFile } from "@/lib/upload-image";

export function PartnerSignupForm() {
  const { maxUploadSizeMB, maxUploadSizeBytes } = useUploadLimit();
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
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [preparingFiles, setPreparingFiles] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const consentRef = useRef<HTMLInputElement>(null);
  const registrationFileRef = useRef<HTMLInputElement>(null);
  const supportingFilesRef = useRef<HTMLInputElement>(null);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validateSelectedFiles() {
    const files = [
      registrationFileRef.current?.files?.[0],
      ...Array.from(supportingFilesRef.current?.files ?? []),
    ].filter((file): file is File => Boolean(file));
    setUploadNotice(null);
    if (files.some((file) => file.size > maxUploadSizeBytes && !canConvertImageToWebP(file))) {
      setError(`This file exceeds ${formatUploadSizeMB(maxUploadSizeMB)}. PDF and Word files cannot be automatically compressed.`);
    } else if (files.reduce((total, file) => total + file.size, 0) > maxUploadSizeBytes && files.some(canConvertImageToWebP)) {
      setError(null);
      setUploadNotice(`JPG/PNG files will be optimized to WebP before upload. The ${formatUploadSizeMB(maxUploadSizeMB)} combined limit is checked after optimization.`);
    } else if (files.reduce((total, file) => total + file.size, 0) > maxUploadSizeBytes) {
      setError(`The combined document size must be ${formatUploadSizeMB(maxUploadSizeMB)} or smaller.`);
    } else {
      setError(null);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (form.licenseNumber.trim().length < 3) {
      setError("Enter your business registration or agency licence number.");
      document.getElementById("licenseNumber")?.focus();
      return;
    }
    const registrationFile = registrationFileRef.current?.files?.[0];
    const supportingFiles = Array.from(supportingFilesRef.current?.files ?? []);
    if (!registrationFile) {
      setError("Upload your business registration document to submit the partner application.");
      registrationFileRef.current?.focus();
      return;
    }
    if (supportingFiles.length > 5) {
      setError("Upload no more than five additional supporting documents.");
      supportingFilesRef.current?.focus();
      return;
    }
    const files = [registrationFile, ...supportingFiles];
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
    setPreparingFiles(true);
    try {
      const preparedFiles = await Promise.all(files.map((file) => prepareUploadFile(file, maxUploadSizeBytes)));
      setPreparingFiles(false);
      if (preparedFiles.some(({ file }) => file.size > maxUploadSizeBytes)) {
        setError(`Each document must be ${formatUploadSizeMB(maxUploadSizeMB)} or smaller. Oversized PDF and Word files cannot be automatically compressed.`);
        return;
      }
      if (preparedFiles.reduce((total, item) => total + item.file.size, 0) > maxUploadSizeBytes) {
        setError(`The combined document size must be ${formatUploadSizeMB(maxUploadSizeMB)} or smaller after image optimization.`);
        return;
      }
      const [preparedRegistration, ...preparedSupporting] = preparedFiles.map((item) => item.file);
      if (preparedFiles.some((item) => item.convertedToWebP)) setUploadNotice("JPG/PNG documents were converted to WebP and optimized before upload.");
      const body = new FormData();
      for (const [key, value] of Object.entries(form)) {
        if (key !== "confirmPassword") body.append(key, value);
      }
      body.append("businessRegistration", preparedRegistration);
      preparedSupporting.forEach((file) => body.append("supportingDocuments", file));
      const res = await fetch("/api/auth/partner-signup", { method: "POST", body });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Signup failed. Please try again.");
        return;
      }
      setSubmitted(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Network error. Please try again.");
    } finally {
      setPreparingFiles(false);
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="space-y-4">
        <div role="status" className="rounded-lg bg-emerald-50 px-3 py-3 text-sm text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200">
          Your application for <strong>{form.companyName}</strong> and its documents have been submitted for review.
          We’ll email you when they’re verified and the account is approved. Portal access is available after approval.
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
      <section aria-labelledby="partner-documents-heading" className="space-y-3 rounded-xl border border-line bg-canvas-subtle/50 p-4 dark:border-navy-700 dark:bg-navy-900/50">
        <div>
          <h2 id="partner-documents-heading" className="text-sm font-semibold">Final step · verification documents</h2>
          <p className="text-xs text-ink-muted">Business registration is required. Add any other supporting documents that help verify your institute.</p>
        </div>
        <div>
          <Label htmlFor="business-registration-file">Business registration document *</Label>
          <Input ref={registrationFileRef} id="business-registration-file" name="businessRegistration" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" required aria-describedby="partner-upload-limit-hint" onChange={validateSelectedFiles} />
        </div>
        <div>
          <Label htmlFor="partner-supporting-files">Other supporting documents</Label>
          <Input ref={supportingFilesRef} id="partner-supporting-files" name="supportingDocuments" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" multiple aria-describedby="partner-upload-limit-hint" onChange={validateSelectedFiles} />
          <p id="partner-upload-limit-hint" className="mt-1 text-xs text-ink-muted">PDF, JPG, PNG, WebP, DOC or DOCX · up to {formatUploadSizeMB(maxUploadSizeMB)} per file and combined · maximum 5 additional files. JPG/PNG images are optimized to WebP.</p>
          {uploadNotice && <p role="status" className="mt-1 text-xs text-blue-700 dark:text-blue-300">{uploadNotice}</p>}
        </div>
      </section>
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
      <Button type="submit" className="w-full" disabled={loading || preparingFiles} size="lg">
        {loading && <Spinner size={16} className="mr-1" />}
        {preparingFiles ? "Optimizing documents…" : loading ? "Submitting request…" : "Request account"}
      </Button>
    </form>
  );
}
