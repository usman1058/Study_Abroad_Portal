"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/ui/label";
import { CURRENCIES } from "@/lib/constants";
import type { Role } from "@/generated/prisma/client";

const ALLOWED = [
  "userTitle",
  "firstName",
  "lastName",
  "gender",
  "phone",
  "country",
  "passportNumber",
  "birthday",
  "countryOfResidence",
  "nationality",
  "cityOfResidence",
  "address",
  "motherName",
  "fatherName",
  "preferredCurrency",
  "companyName",
  "licenseNumber",
] as const;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ProfileForm({ role, initial }: { role: Role; initial: Record<string, string> }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  function set(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
    setServerError(null);
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function validate(): Record<string, string> {
    const next: Record<string, string> = {};
    if (!form.firstName?.trim()) next.firstName = "First name is required.";
    if (!form.lastName?.trim()) next.lastName = "Last name is required.";
    if (form.phone?.trim() && form.phone.trim().length < 6) next.phone = "Enter a valid phone number.";
    if (form.birthday) {
      const date = new Date(form.birthday);
      if (Number.isNaN(date.getTime())) next.birthday = "Enter a valid date.";
      else if (date > new Date()) next.birthday = "Birthday cannot be in the future.";
    }
    if (!CURRENCIES.includes(form.preferredCurrency ?? "MYR")) {
      next.preferredCurrency = "Choose one of the supported currencies.";
    }
    return next;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const validation = validate();
    setErrors(validation);
    setServerError(null);
    const firstInvalid = Object.keys(validation)[0];
    if (firstInvalid) {
      document.getElementById(firstInvalid)?.focus();
      return;
    }

    setBusy(true);
    try {
      const payload: Record<string, string> = {};
      for (const key of ALLOWED) {
        if (form[key] != null) payload[key] = form[key];
      }
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setServerError(json.error ?? "Profile could not be saved. Please try again.");
        return;
      }
      if (payload.preferredCurrency) {
        localStorage.setItem("currency", payload.preferredCurrency);
        window.dispatchEvent(new StorageEvent("storage", { key: "currency" }));
      }
      setSaved(true);
      router.refresh();
    } catch {
      setServerError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const student = role === "STUDENT";
  const errorSummary = Object.values(errors);

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      {errorSummary.length > 0 && (
        <div role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200">
          <p className="font-medium">Please fix {errorSummary.length === 1 ? "this field" : "these fields"}:</p>
          <ul className="mt-1 list-inside list-disc">
            {errorSummary.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      )}
      {serverError && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200">
          {serverError}
        </p>
      )}
      {saved && (
        <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200">
          Profile saved.
        </p>
      )}

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold">Personal details</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title">
            <Select value={form.userTitle ?? ""} onChange={(e) => set("userTitle", e.target.value)} autoComplete="honorific-prefix">
              <option value="">None</option>
              <option value="Mr">Mr</option>
              <option value="Mrs">Mrs</option>
              <option value="Ms">Ms</option>
              <option value="Dr">Dr</option>
            </Select>
          </Field>
          <Field label="Gender">
            <Select value={form.gender ?? ""} onChange={(e) => set("gender", e.target.value)}>
              <option value="">Unspecified</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </Select>
          </Field>
          <Field label="First name" error={errors.firstName}>
            <Input
              id="firstName"
              value={form.firstName ?? ""}
              onChange={(e) => set("firstName", e.target.value)}
              maxLength={80}
              autoComplete="given-name"
              aria-invalid={Boolean(errors.firstName)}
            />
          </Field>
          <Field label="Last name" error={errors.lastName}>
            <Input
              id="lastName"
              value={form.lastName ?? ""}
              onChange={(e) => set("lastName", e.target.value)}
              maxLength={80}
              autoComplete="family-name"
              aria-invalid={Boolean(errors.lastName)}
            />
          </Field>
          {student && (
            <Field label="Birthday" error={errors.birthday} hint="Used to check eligibility; it is not shown publicly.">
              <Input
                id="birthday"
                type="date"
                value={form.birthday ?? ""}
                onChange={(e) => set("birthday", e.target.value)}
                max={todayIso()}
                autoComplete="bday"
                aria-invalid={Boolean(errors.birthday)}
              />
            </Field>
          )}
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold">Contact details</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phone" error={errors.phone} hint="Include the country code, for example +60 12 345 6789.">
            <Input
              id="phone"
              type="tel"
              value={form.phone ?? ""}
              onChange={(e) => set("phone", e.target.value)}
              maxLength={30}
              autoComplete="tel"
              aria-invalid={Boolean(errors.phone)}
            />
          </Field>
          <Field label="Country">
            <Input
              value={form.country ?? ""}
              onChange={(e) => set("country", e.target.value)}
              maxLength={80}
              autoComplete="country-name"
            />
          </Field>
          <Field label="Preferred currency" error={errors.preferredCurrency} hint="Used for fees and payments across the portal.">
            <Select
              id="preferredCurrency"
              value={form.preferredCurrency ?? "MYR"}
              onChange={(e) => set("preferredCurrency", e.target.value)}
              aria-invalid={Boolean(errors.preferredCurrency)}
            >
              {CURRENCIES.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </fieldset>

      {student && (
        <>
          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold">Study documents</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Passport number">
                <Input
                  value={form.passportNumber ?? ""}
                  onChange={(e) => set("passportNumber", e.target.value)}
                  maxLength={20}
                  autoComplete="off"
                />
              </Field>
              <Field label="Nationality">
                <Input
                  value={form.nationality ?? ""}
                  onChange={(e) => set("nationality", e.target.value)}
                  maxLength={80}
                />
              </Field>
              <Field label="Country of residence">
                <Input
                  value={form.countryOfResidence ?? ""}
                  onChange={(e) => set("countryOfResidence", e.target.value)}
                  maxLength={80}
                  autoComplete="country-name"
                />
              </Field>
              <Field label="City of residence">
                <Input
                  value={form.cityOfResidence ?? ""}
                  onChange={(e) => set("cityOfResidence", e.target.value)}
                  maxLength={100}
                  autoComplete="address-level2"
                />
              </Field>
              <Field label="Address" className="sm:col-span-2">
                <Input
                  value={form.address ?? ""}
                  onChange={(e) => set("address", e.target.value)}
                  maxLength={300}
                  autoComplete="street-address"
                />
              </Field>
            </div>
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold">Family</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Mother’s name">
                <Input value={form.motherName ?? ""} onChange={(e) => set("motherName", e.target.value)} maxLength={80} />
              </Field>
              <Field label="Father’s name">
                <Input value={form.fatherName ?? ""} onChange={(e) => set("fatherName", e.target.value)} maxLength={80} />
              </Field>
            </div>
          </fieldset>
        </>
      )}

      {!student && (
        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold">Agency details</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Company name">
              <Input
                value={form.companyName ?? ""}
                onChange={(e) => set("companyName", e.target.value)}
                maxLength={160}
                autoComplete="organization"
              />
            </Field>
            <Field label="Licence number">
              <Input
                value={form.licenseNumber ?? ""}
                onChange={(e) => set("licenseNumber", e.target.value)}
                maxLength={60}
              />
            </Field>
          </div>
        </fieldset>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save profile"}
        </Button>
        {Object.keys(errors).length > 0 && (
          <span className="text-xs text-ink-muted">Nothing is saved until the errors above are fixed.</span>
        )}
      </div>
    </form>
  );
}
