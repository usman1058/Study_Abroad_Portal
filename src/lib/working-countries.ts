import { prisma } from "@/lib/db";

export function normalizeCountryList(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of input) {
    if (typeof item !== "string") continue;
    const country = item.trim().replace(/\s+/g, " ");
    const key = country.toLocaleLowerCase();
    if (country.length < 2 || country.length > 80 || key === "unknown" || seen.has(key)) continue;
    seen.add(key);
    result.push(country);
  }
  return result.sort((a, b) => a.localeCompare(b));
}

export async function getWorkingCountries(): Promise<string[]> {
  const setting = await prisma.portalSetting.findUnique({ where: { key: "workingCountries" }, select: { value: true } });
  if (setting) {
    try { return normalizeCountryList(JSON.parse(setting.value)); } catch { return []; }
  }
  // First-run fallback keeps existing catalogs usable until an admin configures destinations.
  const existing = await prisma.university.findMany({ distinct: ["country"], select: { country: true } });
  return normalizeCountryList(existing.map((item) => item.country));
}
