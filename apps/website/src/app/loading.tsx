export default function Loading() {
  return <div aria-label="Loading page" role="status" className="site-container min-h-[50vh] animate-pulse py-16"><span className="sr-only">Loading page…</span><div className="h-3 w-28 rounded bg-slate-200" /><div className="mt-5 h-12 max-w-xl rounded-lg bg-slate-200" /><div className="mt-3 h-5 max-w-2xl rounded bg-slate-100" /><div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="h-72 rounded-2xl bg-slate-100" />)}</div></div>;
}
