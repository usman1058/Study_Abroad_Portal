import { forwardRef, type LabelHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Label = forwardRef<HTMLLabelElement, LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        "font-label-sm text-label-sm uppercase tracking-wider text-on-surface font-semibold",
        className
      )}
      {...props}
    />
  )
);
Label.displayName = "Label";
