import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "brand" | "green" | "amber" | "red" | "slate" | "info" | "navy";

const tones: Record<Tone, string> = {
  neutral: "bg-canvas-subtle text-ink-muted dark:bg-navy-800 dark:text-slate-300",
  brand: "bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200",
  green: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200",
  amber: "bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200",
  red: "bg-red-50 text-red-700 dark:bg-red-900/40 dark:text-red-200",
  slate: "bg-canvas-subtle text-slate-700 dark:bg-navy-800 dark:text-slate-200",
  info: "bg-sky-50 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200",
  navy: "bg-navy-900 text-white dark:bg-navy-700 dark:text-white",
};

const dots: Record<Tone, string> = {
  neutral: "bg-slate-400",
  brand: "bg-brand-500",
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
  slate: "bg-slate-500",
  info: "bg-sky-500",
  navy: "bg-brand-400",
};

export function Badge({
  className,
  tone = "neutral",
  dot = false,
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone; dot?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold",
        tones[tone],
        className
      )}
      {...props}
    >
      {dot && <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dots[tone])} />}
      {children}
    </span>
  );
}
