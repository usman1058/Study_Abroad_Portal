import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Tone =
  | "verified"
  | "pending"
  | "rejected"
  | "info"
  | "neutral"
  | "navy"
  | "brand"
  | "amber"
  | "green"
  | "red"
  | "slate";

const tones: Record<Tone, string> = {
  verified: "bg-status-verified-subtle text-status-verified font-label-sm text-label-sm font-semibold",
  pending: "bg-status-pending-subtle text-status-pending font-label-sm text-label-sm font-semibold",
  rejected: "bg-status-rejected-subtle text-status-rejected font-label-sm text-label-sm font-semibold",
  info: "bg-status-info-subtle text-status-info font-label-sm text-label-sm font-semibold",
  neutral: "bg-surface-subtle text-ink-muted font-label-sm text-label-sm font-semibold",
  navy: "bg-navy-surface text-on-primary font-label-sm text-label-sm font-semibold",
  brand: "bg-secondary text-on-secondary font-label-sm text-label-sm font-semibold",
  /* Executive Meridian status aliases kept for compatibility with existing call sites */
  amber: "bg-status-pending-subtle text-status-pending font-label-sm text-label-sm font-semibold",
  green: "bg-status-verified-subtle text-status-verified font-label-sm text-label-sm font-semibold",
  red: "bg-status-rejected-subtle text-status-rejected font-label-sm text-label-sm font-semibold",
  slate: "bg-surface-subtle text-ink-muted font-label-sm text-label-sm font-semibold",
};

const dots: Record<Tone, string> = {
  verified: "bg-status-verified",
  pending: "bg-status-pending",
  rejected: "bg-status-rejected",
  info: "bg-status-info",
  neutral: "bg-outline",
  navy: "bg-secondary",
  brand: "bg-secondary",
  amber: "bg-status-pending",
  green: "bg-status-verified",
  red: "bg-status-rejected",
  slate: "bg-outline",
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
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 shrink-0",
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
