"use client";

import { useEffect, useState } from "react";
import { CURRENCIES, CURRENCY_RATES_TO_MYR, convertAmount } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import { Select } from "@/components/ui/select";

// Module-level pub-sub so every FeeDisplay re-renders when CurrencySwitcher changes.
const currencyListeners = new Set<() => void>();

function useCurrency() {
  const [currency, setCurrency] = useState("MYR");
  useEffect(() => {
    const stored = localStorage.getItem("currency");
    if (stored && CURRENCY_RATES_TO_MYR[stored]) setCurrency(stored);

    const sync = () => {
      const next = localStorage.getItem("currency") ?? "MYR";
      setCurrency(next);
    };
    currencyListeners.add(sync);
    window.addEventListener("storage", sync);
    return () => {
      currencyListeners.delete(sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  const apply = (c: string) => {
    localStorage.setItem("currency", c);
    setCurrency(c);
    currencyListeners.forEach((fn) => fn());
  };
  return { currency, apply };
}

export function FeeDisplay({ amount, baseCurrency = "MYR" }: { amount: number; baseCurrency?: string }) {
  const { currency } = useCurrency();
  const converted = convertAmount(amount, baseCurrency, currency);
  return (
    <span title={formatCurrency(amount, baseCurrency)}>
      {formatCurrency(converted, currency)}
    </span>
  );
}

export function CurrencySwitcher() {
  const { currency, apply } = useCurrency();
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-500">Currency</span>
      <Select value={currency} onChange={(e) => apply(e.target.value)} className="h-8 w-28 text-xs">
        {CURRENCIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </Select>
    </div>
  );
}