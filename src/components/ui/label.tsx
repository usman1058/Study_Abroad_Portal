import { forwardRef, type LabelHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export const Label = forwardRef<HTMLLabelElement, LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn("mb-1.5 block text-sm font-medium text-navy-900 dark:text-slate-300", className)}
      {...props}
    />
  )
);
Label.displayName = "Label";

/**
 * Label + control pair. Wrapping the control in the <label> element gives it an
 * implicit accessible name without ids, which also works for repeated rows.
 */
export function Field({
  label,
  hint,
  error,
  className,
  children,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-sm font-medium text-navy-900 dark:text-slate-300">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-muted">{hint}</span>}
      {error && <span className="mt-1 block text-xs font-medium text-red-700 dark:text-red-300">{error}</span>}
    </label>
  );
}
