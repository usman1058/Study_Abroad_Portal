"use client";

import { MessageCircle } from "lucide-react";
import { usePortalCurrency } from "@/components/currency-provider";
import { convertAmount } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";

export function ShortlistShareButton({ items }: { items: { university: string; name: string; tuitionMYR: number }[] }) {
  const { currency } = usePortalCurrency();
  const message = [
    "My study-abroad shortlist",
    ...items.map((item, index) => `${index + 1}. ${item.university} — ${item.name} (${formatCurrency(convertAmount(item.tuitionMYR, "MYR", currency), currency)})`),
  ].join("\n");

  return (
    <a
      href={`https://wa.me/?text=${encodeURIComponent(message)}`}
      target="_blank"
      rel="noreferrer"
      className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-emerald-300 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-300 dark:hover:bg-emerald-900/30"
    >
      <MessageCircle className="h-4 w-4" aria-hidden="true" /> Share on WhatsApp
    </a>
  );
}
