import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-brand-600 text-white hover:bg-brand-700 disabled:bg-brand-300 dark:disabled:bg-brand-900",
  secondary:
    "border border-line bg-white text-navy-900 hover:border-line-strong hover:bg-canvas dark:border-navy-700 dark:bg-navy-800 dark:text-navy-50 dark:hover:bg-navy-700",
  outline:
    "border border-line-strong bg-white text-navy-900 hover:border-navy-300 hover:bg-canvas dark:border-navy-600 dark:bg-transparent dark:text-navy-100 dark:hover:bg-navy-800",
  ghost: "text-ink-muted hover:bg-canvas-subtle hover:text-navy-900 dark:text-slate-300 dark:hover:bg-navy-800 dark:hover:text-white",
  danger: "bg-red-600 text-white hover:bg-red-700",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-5 text-sm",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  )
);
Button.displayName = "Button";
