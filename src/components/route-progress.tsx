"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { LoaderCircle } from "lucide-react";

export function RouteProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams.toString()}`;
  const [visible, setVisible] = useState(false);
  const [overlay, setOverlay] = useState(false);
  const [message, setMessage] = useState("Loading page");
  const [width, setWidth] = useState(12);
  const lastRoute = useRef(routeKey);
  const actionCount = useRef(0);
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const safetyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = useCallback(() => {
    if (showTimer.current) clearTimeout(showTimer.current);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (safetyTimer.current) clearTimeout(safetyTimer.current);
    setVisible(false);
    setOverlay(false);
    setWidth(12);
  }, []);

  const begin = useCallback((label: string) => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setMessage(label);
    setVisible(true);
    setWidth(38);
    if (showTimer.current) clearTimeout(showTimer.current);
    showTimer.current = setTimeout(() => setOverlay(true), 220);
    if (safetyTimer.current) clearTimeout(safetyTimer.current);
    safetyTimer.current = setTimeout(clear, 20000);
  }, [clear]);

  const finishSoon = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(clear, 450);
  }, [clear]);

  useEffect(() => {
    if (lastRoute.current !== routeKey) {
      lastRoute.current = routeKey;
      clear();
    }
  }, [routeKey, clear]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const rawHref = anchor.getAttribute("href");
      if (!rawHref || rawHref.startsWith("#") || rawHref.startsWith("mailto:") || rawHref.startsWith("tel:")) return;
      let destination: URL;
      try { destination = new URL(rawHref, window.location.href); } catch { return; }
      if (destination.origin !== window.location.origin) return;
      if (destination.pathname === window.location.pathname && destination.search === window.location.search) return;
      begin("Loading page");
    };
    const onSubmit = (event: Event) => {
      const form = event.target as HTMLFormElement | null;
      if (!form || form.method.toLowerCase() === "dialog") return;
      begin("Loading your results");
    };

    // Cover client actions (uploads, saves, approvals, sends) without requiring
    // each individual button to implement its own screen-level wait state.
    const originalFetch = window.fetch.bind(window);
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
      const isAction = ["POST", "PUT", "PATCH", "DELETE"].includes(method);
      const headers = input instanceof Request ? new Headers(input.headers) : new Headers();
      if (init?.headers) new Headers(init.headers).forEach((value, key) => headers.set(key, value));
      const isRouteRequest = method === "GET" && headers.get("rsc") === "1" && !headers.has("next-router-prefetch");
      if (isAction || isRouteRequest) {
        actionCount.current += 1;
        begin(isAction ? "Saving your changes" : "Loading page");
      }
      return originalFetch(input, init).finally(() => {
        if (!isAction && !isRouteRequest) return;
        actionCount.current = Math.max(0, actionCount.current - 1);
        if (actionCount.current === 0) finishSoon();
      });
    };
    document.addEventListener("click", onClick);
    document.addEventListener("submit", onSubmit, true);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("submit", onSubmit, true);
      window.fetch = originalFetch;
    };
  }, [begin, finishSoon]);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => setWidth(82), 180);
    return () => clearTimeout(timer);
  }, [visible, message]);

  if (!visible && !overlay) return null;
  return <>
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[120] h-1" aria-hidden="true">
      <div className="h-full bg-gradient-to-r from-brand-500 via-sky-400 to-indigo-500 shadow-[0_0_12px_rgba(37,99,235,.55)] transition-[width] duration-300 ease-out" style={{ width: visible ? `${width}%` : "0%" }} />
    </div>
    {overlay && <div role="status" aria-live="polite" aria-label={message} className="pointer-events-none fixed inset-0 z-[110] flex items-center justify-center bg-navy-950/20 p-4 backdrop-blur-[2px]">
      <div className="flex min-w-64 items-center gap-4 rounded-2xl border border-white/70 bg-white/95 px-5 py-4 shadow-2xl shadow-navy-950/15 dark:border-navy-700 dark:bg-navy-900/95">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200"><LoaderCircle className="h-6 w-6 animate-spin" /></span>
        <span><span className="block text-sm font-semibold text-navy-900 dark:text-white">{message}…</span><span className="mt-0.5 block text-xs text-ink-muted">This should only take a moment.</span></span>
      </div>
    </div>}
  </>;
}
