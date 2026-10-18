import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-10 w-full rounded-lg border border-line-strong bg-surface-white pl-3 pr-3 py-2 font-body-md text-body-md text-on-surface placeholder:text-slate-400 shadow-sm focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-surface-subtle",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
