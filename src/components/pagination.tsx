import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Server-rendered pagination. `query` is the current filter set; the page
 * parameter is added only when it is not the first page, so filtered URLs stay
 * clean and shareable.
 */
export function Pagination({
  page,
  pageCount,
  total,
  pageSize,
  basePath,
  query,
  label = "pagination",
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  basePath: string;
  query: Record<string, string | undefined>;
  label?: string;
}) {
  if (total === 0) return null;

  const href = (target: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value) params.set(key, value);
    }
    if (target > 1) params.set("page", String(target));
    const search = params.toString();
    return search ? `${basePath}?${search}` : basePath;
  };

  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  const linkClass =
    "inline-flex h-9 items-center gap-1 rounded-lg border border-line px-3 text-sm font-medium text-ink transition hover:bg-canvas-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-navy-700 dark:hover:bg-navy-800";
  const disabledClass =
    "inline-flex h-9 items-center gap-1 rounded-lg border border-line px-3 text-sm font-medium text-slate-400 opacity-60 dark:border-navy-700";

  return (
    <nav aria-label={label} className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-ink-muted">
        Showing <span className="font-medium text-ink">{first}–{last}</span> of{" "}
        <span className="font-medium text-ink">{total}</span>
      </p>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link href={href(page - 1)} rel="prev" className={linkClass}>
            <ChevronLeft aria-hidden className="h-4 w-4" /> Previous
          </Link>
        ) : (
          <span className={disabledClass} aria-disabled="true">
            <ChevronLeft aria-hidden className="h-4 w-4" /> Previous
          </span>
        )}
        <span className="px-1 text-sm text-ink-muted">
          Page {page} of {pageCount}
        </span>
        {page < pageCount ? (
          <Link href={href(page + 1)} rel="next" className={linkClass}>
            Next <ChevronRight aria-hidden className="h-4 w-4" />
          </Link>
        ) : (
          <span className={disabledClass} aria-disabled="true">
            Next <ChevronRight aria-hidden className="h-4 w-4" />
          </span>
        )}
      </div>
    </nav>
  );
}
