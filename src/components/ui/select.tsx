import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "h-10 w-full rounded-lg border border-line-strong bg-surface-white pl-3 pr-8 py-2 font-body-md text-body-md text-on-surface shadow-sm focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary focus:ring-offset-2 appearance-none cursor-pointer disabled:cursor-not-allowed disabled:bg-surface-subtle",
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
);
Select.displayName = "Select";
