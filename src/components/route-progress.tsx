"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

export function RouteProgress() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // show on any internal link click
    function onClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("http") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      show();
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    // complete when route resolves
    complete();
  }, [pathname]);

  function show() {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (hideRef.current) clearTimeout(hideRef.current);
    setVisible(true);
    setWidth(15);
    timerRef.current = setTimeout(() => setWidth(60), 120);
  }

  function complete() {
    if (!visible) return;
    setWidth(100);
    hideRef.current = setTimeout(() => {
      setVisible(false);
      setWidth(0);
    }, 250);
  }

  if (!visible) return null;
  return (
    <div className="pointer-events-none fixed left-0 top-0 z-[100] h-0.5 w-full">
      <div
        className="h-full bg-brand-600 shadow-[0_0_8px_rgba(37,99,235,0.6)] transition-[width] duration-200 ease-out"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
