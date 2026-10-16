import { Loader2 } from "lucide-react";

export default function RootLoading() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-canvas dark:bg-navy-950">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 font-display text-2xl font-bold text-white shadow-lg shadow-brand-600/30">
        SA
      </div>
      <div className="flex items-center gap-2 text-sm font-medium text-ink-muted">
        <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
        Loading workspace…
      </div>
    </main>
  );
}
