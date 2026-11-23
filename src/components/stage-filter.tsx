import Link from "next/link";
import { APPLICATION_STAGES } from "@/lib/constants";

/**
 * Stage tabs for the staff pipeline. Server-rendered links (not a client
 * select) so the counts are real, the current stage is announced, and the
 * control works without JavaScript. The active sort is carried across so
 * filtering never silently resets the reader's ordering.
 */
export function StageFilter({
  current,
  counts,
  total,
  sort,
  query: searchQuery = "",
}: {
  current: string;
  counts: Record<string, number>;
  total: number;
  sort?: string;
  query?: string;
}) {
  const chip = (active: boolean) =>
    "inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 text-xs " +
    (active
      ? "bg-brand-600 font-semibold text-white"
      : "border border-line text-ink-muted hover:bg-canvas dark:border-navy-700 dark:hover:bg-navy-800");

  const href = (stage?: string) => {
    const params = new URLSearchParams();
    if (searchQuery) params.set("q", searchQuery);
    if (stage) params.set("stage", stage);
    if (sort && sort !== "updated_desc") params.set("sort", sort);
    const query = params.toString();
    return query ? `/application?${query}` : "/application";
  };

  return (
    <nav aria-label="Filter applications by stage" className="flex flex-wrap items-center gap-2">
      <Link href={href()} aria-current={current ? undefined : "true"} className={chip(!current)}>
        All
        <span className="text-[11px] font-normal opacity-80">{total}</span>
      </Link>
      {APPLICATION_STAGES.map((stage) => {
        const count = counts[stage.value] ?? 0;
        const active = current === stage.value;
        return (
          <Link
            key={stage.value}
            href={href(stage.value)}
            aria-current={active ? "true" : undefined}
            className={chip(active) + (count === 0 && !active ? " opacity-60" : "")}
          >
            {stage.label}
            <span className="text-[11px] font-normal opacity-80">{count}</span>
          </Link>
        );
      })}
    </nav>
  );
}
