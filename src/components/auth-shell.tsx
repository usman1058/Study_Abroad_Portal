import Link from "next/link";
import type { ReactNode } from "react";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden bg-canvas p-6 dark:bg-navy-950">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-navy-900/5 to-transparent dark:from-navy-800/20" />
      <div className="relative w-full max-w-md">
        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-ink-muted transition hover:text-navy-900 dark:text-navy-300 dark:hover:text-white">
          ← Back
        </Link>
        <div className="rounded-xl border border-line bg-white p-8 shadow-[0px_20px_25px_-5px_rgba(15,32,66,0.08),0px_10px_10px_-5px_rgba(15,32,66,0.03)] dark:border-navy-700 dark:bg-navy-900">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-navy-900 font-display text-sm font-bold text-white dark:bg-brand-600">SA</span>
          <h1 className="mt-4 font-display text-2xl font-bold tracking-tight text-navy-900 dark:text-white">{title}</h1>
          <p className="mt-1 mb-6 text-sm text-ink-muted dark:text-slate-400">{subtitle}</p>
          {children}
          {footer && <div className="mt-6 border-t border-line pt-4 text-center text-sm dark:border-navy-700">{footer}</div>}
        </div>
      </div>
    </main>
  );
}
