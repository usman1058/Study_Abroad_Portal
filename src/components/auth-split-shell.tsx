"use client";

import type { ReactNode } from "react";

export function AuthSplitShell({
  left,
  right,
  topBar,
}: {
  left: ReactNode;
  right: ReactNode;
  topBar?: ReactNode;
}) {
  return (
    <main className="relative flex min-h-svh flex-col overflow-hidden bg-canvas">
      {topBar && <div className="sticky top-0 z-40 w-full border-b border-line bg-surface-white/80 backdrop-blur dark:border-navy-800 dark:bg-navy-deep/80">{topBar}</div>}
      <div className="relative z-10 flex-1 w-full max-w-6xl mx-auto py-space-xl flex flex-col items-center justify-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 rounded-xl bg-surface-white shadow-xl overflow-hidden min-h-[720px]">
          {left && <div className="lg:col-span-5 bg-navy-deep relative flex flex-col justify-between p-space-xl text-surface-white overflow-hidden">{left}</div>}
          <div className="lg:col-span-7 p-space-xl lg:p-space-2xl flex flex-col justify-between bg-surface-white">{right}</div>
        </div>
      </div>
    </main>
  );
}
