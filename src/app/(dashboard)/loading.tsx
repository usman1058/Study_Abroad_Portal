export default function DashboardLoading() {
  return (
    <div className="pl-60 min-h-svh">
      <header className="sticky top-0 z-30 h-14 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80" />
      <main className="mx-auto max-w-7xl p-6 space-y-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-8 bg-slate-200 rounded w-3/4 dark:bg-slate-700" />
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((j) => (
                <div key={j} className="h-24 bg-slate-200 rounded dark:bg-slate-700" />
              ))}
            </div>
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              {[1, 2].map((j) => (
                <div key={j} className="space-y-4">
                  <div className="h-6 bg-slate-200 rounded w-1/4 dark:bg-slate-700" />
                  <div className="space-y-3">
                    {[1, 2, 3].map((k) => (
                      <div key={k} className="h-12 bg-slate-200 rounded dark:bg-slate-700" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}