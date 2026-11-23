import { Card, CardContent } from "@/components/ui/card";

export default function DashboardLoading() {
  return <div role="status" aria-live="polite" aria-label="Loading dashboard" className="space-y-6">
    <span className="sr-only">Loading page…</span>
    <div className="h-24 animate-pulse rounded-2xl bg-canvas-subtle dark:bg-navy-800" />
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <Card key={i}><CardContent className="space-y-3 p-5"><div className="h-3 w-1/2 animate-pulse rounded bg-canvas-subtle dark:bg-navy-800" /><div className="h-8 w-1/3 animate-pulse rounded bg-canvas-subtle dark:bg-navy-800" /><div className="h-3 w-2/3 animate-pulse rounded bg-canvas-subtle dark:bg-navy-800" /></CardContent></Card>)}</div>
    <div className="grid gap-5 lg:grid-cols-2"><Card><CardContent className="h-64 animate-pulse bg-canvas-subtle/50 dark:bg-navy-800/50" /></Card><Card><CardContent className="h-64 animate-pulse bg-canvas-subtle/50 dark:bg-navy-800/50" /></Card></div>
    <p className="text-center text-sm text-ink-muted">Loading your workspace…</p>
  </div>;
}
