const COUNTRY_CURRENCY: Record<string, string> = {
  MY: "MYR",
  US: "USD",
  GB: "GBP",
  AU: "AUD",
  SG: "SGD",
  CN: "CNY",
  IN: "INR",
  BD: "BDT",
  NP: "NPR",
  PK: "PKR",
  LK: "LKR",
  AT: "EUR", BE: "EUR", CY: "EUR", DE: "EUR", EE: "EUR", ES: "EUR",
  FI: "EUR", FR: "EUR", GR: "EUR", HR: "EUR", IE: "EUR", IT: "EUR",
  LT: "EUR", LU: "EUR", LV: "EUR", MT: "EUR", NL: "EUR", PT: "EUR",
  SI: "EUR", SK: "EUR",
};

export function detectPortalCurrency(countryHeader: string | null, acceptLanguage: string | null): string | null {
  const country = countryHeader?.trim().toUpperCase();
  if (country && COUNTRY_CURRENCY[country]) return COUNTRY_CURRENCY[country];

  // Local development and non-Vercel hosts may not provide a country header.
  for (const part of acceptLanguage?.split(",") ?? []) {
    const match = part.trim().match(/^[a-z]{2,3}-([a-z]{2})(?:-|;|$)/i);
    const currency = match ? COUNTRY_CURRENCY[match[1].toUpperCase()] : undefined;
    if (currency) return currency;
  }
  return null;
}
