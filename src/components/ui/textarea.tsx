import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded-lg border border-line-strong bg-surface-white pl-3 py-2 font-body-md text-body-md text-on-surface placeholder:text-slate-400 shadow-sm focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-surface-subtle",
        className
      )}
      {...props}
    />
  );
}
