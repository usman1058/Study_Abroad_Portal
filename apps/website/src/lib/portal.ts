export type PublicProgram = {
  id: string;
  slug: string | null;
  name: string;
  level: string;
  field: string;
  location: string | null;
  tuitionFee: string | number;
  applicationFee: string | number | null;
  intakeDates: string[];
  requiredDocuments?: string[];
  minGpa: number | null;
  visaRequired?: boolean;
  tags?: string[];
  whyHighlights?: unknown;
  offerTurnaroundDays?: number | null;
  collegeRank?: string | null;
  eligibilityCriteria?: string[];
  courseDurationMonths?: number | null;
  universityLogoUrl?: string | null;
  university: { name: string; country: string; city: string | null; website?: string | null; logoUrl?: string | null };
};

export type ProgramFilters = { q?: string; country?: string; level?: string; field?: string; page?: string | number };
export type ProgramListing = {
  available: boolean;
  programs: PublicProgram[];
  pagination: { page: number; pageSize: number; total: number; pageCount: number };
  filters: { countries: string[]; levels: string[]; fields: string[] };
};

function apiBase() {
  return (process.env.PORTAL_API_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function portalUrl(path = "") {
  return `${(process.env.NEXT_PUBLIC_PORTAL_URL || "http://localhost:3000").replace(/\/$/, "")}${path}`;
}

export async function getPrograms(filters: ProgramFilters = {}): Promise<ProgramListing> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key, String(value));
  try {
    const response = await fetch(`${apiBase()}/api/public/programs?${params}`, { next: { revalidate: 300 } });
    if (!response.ok) throw new Error("Catalog unavailable");
    return { ...await response.json() as Omit<ProgramListing, "available">, available: true };
  } catch {
    return { available: false, programs: [], pagination: { page: 1, pageSize: 12, total: 0, pageCount: 1 }, filters: { countries: [], levels: [], fields: [] } };
  }
}

export async function getProgram(id: string): Promise<PublicProgram | null> {
  try {
    const response = await fetch(`${apiBase()}/api/public/programs/${encodeURIComponent(id)}`, { next: { revalidate: 300 } });
    if (!response.ok) return null;
    const result = await response.json() as { program?: PublicProgram };
    return result.program ?? null;
  } catch {
    return null;
  }
}

export function formatMoney(value: string | number | null | undefined, currency = "MYR") {
  if (value === null || value === undefined || value === "") return "Ask us for current fees";
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "Ask us for current fees";
  return new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

export function formatDuration(months?: number | null) {
  if (!months) return "Duration varies";
  const years = Math.floor(months / 12);
  const remaining = months % 12;
  return [years ? `${years} ${years === 1 ? "year" : "years"}` : "", remaining ? `${remaining} months` : ""].filter(Boolean).join(" ");
}

export function programHref(program: PublicProgram) {
  return `/applications/${encodeURIComponent(program.slug || program.id)}`;
}
