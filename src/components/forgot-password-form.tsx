"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Could not send the reset link. Please try again.");
        emailRef.current?.focus();
        return;
      }
      setMessage(json?.data?.message ?? "If an account exists for that email, a reset link is on its way.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div
        aria-live="polite"
        role={message ? "status" : undefined}
        className={message ? "rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200" : "sr-only"}
      >
        {message}
      </div>
      {error && (
        <div role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200">
          {error}
        </div>
      )}
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          ref={emailRef}
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby="forgot-hint"
          placeholder="you@example.com"
        />
        <p id="forgot-hint" className="mt-1 text-xs text-ink-muted">
          Enter the email you signed up with. The link expires in 30 minutes.
        </p>
      </div>
      <Button type="submit" className="w-full" disabled={loading} size="lg">
        {loading && <Spinner size={16} className="mr-1" />}
        {loading ? "Sending…" : "Send reset link"}
      </Button>
      <p className="text-center text-sm text-ink-muted">
        <Link href="/student/login" className="font-medium text-brand-600 hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
