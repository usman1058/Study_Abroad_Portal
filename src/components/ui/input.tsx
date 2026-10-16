import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-10 w-full rounded-lg border border-line-strong bg-white px-3 text-sm text-ink shadow-sm outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 disabled:cursor-not-allowed disabled:bg-canvas-subtle dark:border-navy-700 dark:bg-navy-900 dark:text-slate-100 dark:placeholder:text-navy-400 dark:disabled:bg-navy-800",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
