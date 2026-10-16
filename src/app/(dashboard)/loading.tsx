import { Loader2 } from "lucide-react";

export default function DashboardLoading() {
  return (
    <div className="min-h-svh bg-canvas dark:bg-navy-950">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 border-r border-navy-800 bg-navy-900 lg:block" />
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-line bg-white/90 px-4 backdrop-blur dark:border-navy-800 dark:bg-navy-900/90 lg:pl-64">
        <div className="h-6 w-40 animate-pulse rounded bg-line dark:bg-navy-700" />
        <div className="flex gap-2">
          <div className="h-9 w-9 animate-pulse rounded-full bg-line dark:bg-navy-700" />
          <div className="h-9 w-24 animate-pulse rounded bg-line dark:bg-navy-700" />
        </div>
      </header>
      <main className="mx-auto max-w-7xl space-y-6 p-6 lg:pl-64">
        <div className="flex items-center gap-2 text-sm font-medium text-ink-muted">
          <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
          Loading…
        </div>
        <div className="h-10 w-1/3 animate-pulse rounded bg-line dark:bg-navy-700" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl border border-line bg-white dark:border-navy-700 dark:bg-navy-900" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="space-y-3 rounded-xl border border-line bg-white p-5 dark:border-navy-700 dark:bg-navy-900">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="h-4 animate-pulse rounded bg-line dark:bg-navy-700" />
              ))}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
