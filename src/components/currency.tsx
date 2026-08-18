"use client";

import { useEffect, useState } from "react";
import { CURRENCIES, CURRENCY_RATES_TO_MYR, convertAmount } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import { Select } from "@/components/ui/select";

function useCurrency() {
  const [currency, setCurrency] = useState("MYR");
  useEffect(() => {
    const c = localStorage.getItem("currency");
    if (c && CURRENCY_RATES_TO_MYR[c]) setCurrency(c);
  }, []);
  const apply = (c: string) => {
    setCurrency(c);
    localStorage.setItem("currency", c);
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