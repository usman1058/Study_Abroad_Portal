import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function toNum(value: unknown): number {
  if (typeof value === "number") return value;
  if (value && typeof value === "object" && "toNumber" in value) {
    return (value as { toNumber: () => number }).toNumber();
  }
  const n = parseFloat(String(value ?? "0"));
  return Number.isFinite(n) ? n : 0;
}

export function toIso(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return null;
}

export function formatCurrency(
  amount: unknown,
  currency = "MYR"
): string {
  const n = toNum(amount);
  const safe = currency || "MYR";
  try {
    return new Intl.NumberFormat("en-MY", {
      style: "currency",
      currency: safe,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${safe} ${n.toFixed(2)}`;
  }
}

export function formatDate(
  value: unknown,
  opts: Intl.DateTimeFormatOptions = { dateStyle: "medium" }
): string {
  const d = toDate(value);
  if (!d) return "—";
  try {
    return new Intl.DateTimeFormat("en-MY", opts).format(d);
  } catch {
    return d.toLocaleDateString();
  }
}

export function toDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export function daysUntil(value: unknown): number | null {
  const d = toDate(value);
  if (!d) return null;
  return Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export function initials(firstName?: string | null, lastName?: string | null): string {
  return `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase() || "?";
}

export function fullName(u?: { firstName?: string | null; lastName?: string | null } | null): string {
  if (!u) return "Unknown";
  return `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || "Unknown";
}