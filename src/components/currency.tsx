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
    <div className="flex flex-wrap items-center gap-2">
      <label htmlFor={id} className="text-xs text-ink-muted">Currency</label>
      <Select
        id={id}
        value={currency}
        onChange={(e) => changeCurrency(e.target.value)}
        className="h-8 w-28 text-xs"
      >
        {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
      </Select>
      {error && <span role="alert" className="text-xs text-red-700">{error}</span>}
    </div>
  );
}
