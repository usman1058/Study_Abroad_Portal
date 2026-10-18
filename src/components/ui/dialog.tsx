"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import type { ReactNode } from "react";

export function Dialog({ open, onClose, title, children, wide = false }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[80] bg-[rgba(10,25,47,0.55)] backdrop-blur-[4px]" />
        <DialogPrimitive.Content className={`fixed inset-x-4 top-1/2 z-[81] mx-auto max-h-[90vh] w-auto -translate-y-1/2 overflow-y-auto rounded-xl border border-line bg-surface-white shadow-[0px_20px_25px_-5px_rgba(15,32,66,0.12),0px_10px_10px_-5px_rgba(15,32,66,0.04)] outline-none dark:border-navy-800 dark:bg-navy-900 ${wide ? "max-w-4xl" : "max-w-3xl"}`}>
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-surface-white/95 px-space-lg py-space-md backdrop-blur dark:border-navy-800 dark:bg-navy-900/95">
            <DialogPrimitive.Title className="font-headline-sm text-headline-sm text-on-surface font-bold">{title}</DialogPrimitive.Title>
            <DialogPrimitive.Close className="rounded-md p-2 text-ink-muted hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary dark:hover:bg-navy-800" aria-label="Close">
              <span className="material-symbols-outlined text-base">close</span>
            </DialogPrimitive.Close>
          </div>
          <div className="p-space-lg">{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
