"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { CURRENCIES } from "@/lib/constants";

type CurrencyContextValue = { currency: string; setCurrency: (currency: string) => void };
const CurrencyContext = createContext<CurrencyContextValue | null>(null);
const supported = (value: string | null | undefined): value is string => Boolean(value && CURRENCIES.includes(value));

export function PortalCurrencyProvider({ initialCurrency, children }: { initialCurrency: string; children: ReactNode }) {
  const safeInitial = supported(initialCurrency) ? initialCurrency : "MYR";
  const [currency, setCurrencyState] = useState(safeInitial);

  useEffect(() => {
    const stored = localStorage.getItem("currency");
    const source = localStorage.getItem("currency-source");
    if (supported(stored) && (source === "manual" || source === null)) {
      // Existing local selections predate the source marker; continue honoring them.
      localStorage.setItem("currency-source", "manual");
      setCurrencyState(stored);
    } else {
      setCurrencyState(safeInitial);
      localStorage.setItem("currency", safeInitial);
      localStorage.setItem("currency-source", "auto");
    }

    const sync = (event: StorageEvent) => {
      if (event.key !== "currency" && event.key !== null) return;
      const next = localStorage.getItem("currency");
      if (supported(next)) setCurrencyState(next);
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [safeInitial]);

  const setCurrency = (next: string) => {
    if (!supported(next)) return;
    localStorage.setItem("currency", next);
    localStorage.setItem("currency-source", "manual");
    setCurrencyState(next);
  };

  return <CurrencyContext.Provider value={{ currency, setCurrency }}>{children}</CurrencyContext.Provider>;
}

export function usePortalCurrency(fallback = "MYR") {
  const context = useContext(CurrencyContext);
  return context ?? { currency: supported(fallback) ? fallback : "MYR", setCurrency: () => {} };
}
