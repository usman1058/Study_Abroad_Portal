"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/password-input";
import { PasswordChecklist, isStrongPassword } from "@/components/password-checklist";
import { Spinner } from "@/components/ui/spinner";

export function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isStrongPassword(password)) {
      setError("Use at least 8 characters with one letter and one number.");
      passwordRef.current?.focus();
      return;
    }
    if (password !== confirm) {
      setError("The two passwords do not match.");
      confirmRef.current?.focus();
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Could not reset the password. Please request a new link.");
        return;
      }
      setDone(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="space-y-4">
        <div role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200">
          Password updated. You can now sign in with your new password.
        </div>
        <Link
          href="/student/login?reset=1"
          className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-brand-600 px-5 text-sm font-semibold text-white transition hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
        >
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {error && (
        <div role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200">
          {error}
        </div>
      )}
      <div>
        <Label htmlFor="password">New password</Label>
        <PasswordInput
          ref={passwordRef}
          id="password"
          name="password"
          autoComplete="new-password"
          required
          maxLength={72}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby="password-rules"
        />
        <PasswordChecklist value={password} id="password-rules" />
      </div>
      <div>
        <Label htmlFor="confirmPassword">Confirm new password</Label>
        <PasswordInput
          ref={confirmRef}
          id="confirmPassword"
          name="confirmPassword"
          autoComplete="new-password"
          required
          maxLength={72}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          aria-invalid={error && password !== confirm ? true : undefined}
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading} size="lg">
        {loading && <Spinner size={16} className="mr-1" />}
        {loading ? "Updating…" : "Set new password"}
      </Button>
      <p className="text-center text-sm text-ink-muted">
        <Link href="/forgot-password" className="font-medium text-brand-600 hover:underline">
          Request a new link
        </Link>
      </p>
    </form>
  );
}
