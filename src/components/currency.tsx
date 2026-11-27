"use client";

import { useId, useState } from "react";
import { CURRENCIES, CURRENCY_RATES_TO_MYR, convertAmount } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import { Select } from "@/components/ui/select";
import { usePortalCurrency } from "@/components/currency-provider";

export function FeeDisplay({ amount, baseCurrency = "MYR" }: { amount: number; baseCurrency?: string }) {
  const { currency } = usePortalCurrency();
  const displayCurrency = CURRENCY_RATES_TO_MYR[baseCurrency] ? currency : baseCurrency;
  const converted = convertAmount(amount, baseCurrency, displayCurrency);
  return (
    <span title={`${displayCurrency === baseCurrency ? "Original amount" : "Approximate display conversion from"} ${baseCurrency}: ${formatCurrency(amount, baseCurrency)}.`}>
      {formatCurrency(converted, displayCurrency)}
    </span>
  );
}

export function CurrencySwitcher({ defaultCurrency = "MYR" }: { defaultCurrency?: string }) {
  const { currency, setCurrency } = usePortalCurrency(defaultCurrency);
  const [error, setError] = useState<string | null>(null);
  const id = useId();

  async function changeCurrency(next: string) {
    setCurrency(next);
    setError(null);
    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferredCurrency: next }),
      });
      if (!response.ok) setError("Currency was changed for this browser but could not be saved to your account.");
    } catch {
      setError("Currency was changed for this browser but could not be saved to your account.");
    }
  }

  return (
    <div className="relative inline-flex h-10 flex-nowrap items-center gap-2 whitespace-nowrap">
      <label htmlFor={id} className="inline-flex h-9 items-center text-xs leading-none text-ink-muted">Currency</label>
      <Select
        id={id}
        value={currency}
        onChange={(e) => changeCurrency(e.target.value)}
        className="h-9 w-28 self-center py-0 text-sm leading-none"
      >
        {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
      </Select>
      {error && <span role="alert" className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-64 rounded-lg border border-red-200 bg-white p-2 text-xs whitespace-normal text-red-700 shadow-lg dark:border-red-900 dark:bg-navy-900 dark:text-red-300">{error}</span>}
    </div>
  );
}
