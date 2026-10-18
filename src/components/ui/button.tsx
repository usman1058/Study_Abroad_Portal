import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-secondary text-on-secondary font-label-md text-label-md shadow-sm hover:bg-secondary-container transition-colors disabled:opacity-60 disabled:cursor-not-allowed",
  secondary:
    "border border-line-strong bg-surface-white text-navy-surface font-label-md text-label-md shadow-sm hover:bg-surface-white hover:border-navy-surface/50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed",
  outline:
    "border border-line bg-surface-white text-navy-surface font-label-md text-label-md shadow-sm hover:border-secondary hover:bg-surface-subtle transition-colors disabled:opacity-60 disabled:cursor-not-allowed",
  ghost:
    "bg-transparent text-ink-muted font-label-md text-label-md shadow-sm hover:bg-surface-subtle hover:text-navy-surface transition-colors disabled:opacity-60 disabled:cursor-not-allowed",
  danger:
    "bg-status-rejected text-on-error font-label-md text-label-md shadow-sm hover:bg-status-rejected/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3",
  md: "h-10 px-4",
  lg: "h-11 px-5",
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
        "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  )
);
Button.displayName = "Button";
