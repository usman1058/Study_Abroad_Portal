"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn, getSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/password-input";
import { Spinner } from "@/components/ui/spinner";

/** Only same-origin, non-API paths may be used as a post-login destination. */
function safeNextPath(value: string | null | undefined): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  if (value.startsWith("/api") || value.startsWith("/_next")) return null;
  return value;
}

export function LoginForm({
  nextPath,
  forgotHref = "/forgot-password",
  notice,
}: {
  nextPath?: string;
  forgotHref?: string;
  notice?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const res = await signIn("credentials", { email, password, redirect: false });
      if (res?.error) {
        if (res.code === "pending") {
          setInfo("Your agency request is awaiting approval. We will email you as soon as it is reviewed.");
          return;
        }
        if (res.code === "inactive") {
          setInfo("This account is deactivated. Contact your administrator to restore access.");
          return;
        }
        // NextAuth folds rate limiting and bad credentials into one error.
        setError("Invalid email or password. If you have tried several times, wait 15 minutes before retrying.");
        emailRef.current?.focus();
        return;
      }
      const session = await getSession();
      const role = session?.user?.role;
      const fallback = role === "STUDENT" ? "/my-applications" : "/home";
      router.push(safeNextPath(nextPath) ?? fallback);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {notice && (
        <div role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200">
          {notice}
        </div>
      )}
      {info && (
        <div role="status" className="rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-800 dark:bg-sky-900/30 dark:text-sky-200">
          {info}
        </div>
      )}
      <div aria-live="assertive">
        {error && (
          <div id="login-error" role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200">
            {error}
          </div>
        )}
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          ref={emailRef}
          id="email"
          name="email"
          type="email"
          maxLength={254}
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "login-error" : undefined}
          placeholder="you@example.com"
        />
      </div>
      <div>
        <div className="flex items-baseline justify-between gap-2">
          <Label htmlFor="password">Password</Label>
          <Link href={forgotHref} className="text-xs font-medium text-brand-600 hover:underline">
            Forgot password?
          </Link>
        </div>
        <PasswordInput
          ref={passwordRef}
          id="password"
          name="password"
          autoComplete="current-password"
          maxLength={72}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "login-error" : undefined}
          placeholder="••••••••"
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading} size="lg">
        {loading && <Spinner size={16} className="mr-1" />}
        {loading ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
