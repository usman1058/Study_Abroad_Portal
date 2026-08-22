import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function humanize(value: string): string {
  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
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

const MIME_SIGNATURES: Record<string, number[][]> = {
  "application/pdf": [[0x25, 0x50, 0x44, 0x46]],
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  "image/png": [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  "application/msword": [[0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    [0x50, 0x4b, 0x03, 0x04],
    [0x50, 0x4b, 0x05, 0x06],
    [0x50, 0x4b, 0x07, 0x08],
  ],
};

const ALLOWED_MIME_TYPES = Object.keys(MIME_SIGNATURES);

export function detectMimeFromBase64(base64: string): string | null {
  try {
    const binary = atob(base64.split(",")[1] ?? base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    for (const [mime, sigs] of Object.entries(MIME_SIGNATURES)) {
      for (const sig of sigs) {
        if (sig.every((b, i) => bytes[i] === b)) return mime;
      }
    }
  } catch {
    return null;
  }
  return null;
}

export function isAllowedMimeType(mime: string): boolean {
  return ALLOWED_MIME_TYPES.includes(mime);
}