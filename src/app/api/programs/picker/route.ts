import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { fail, ok, requireUser, serverError } from "@/lib/api";

/** Hard render cap. The client states it instead of silently truncating. */
const PICKER_LIMIT = 40;

/**
 * Bounded program search for the application wizard.
 *
 * The wizard used to receive the whole catalogue as a prop, which grows without
 * limit in production. This endpoint returns at most 40 matches plus the true
 * total, and the small facet lists the filter panel needs.
 */
export async function GET(req: NextRequest) {
  try {
    const { error } = await requireUser();
    if (error) return error;

    const params = req.nextUrl.searchParams;
    const q = (params.get("q") ?? "").trim().slice(0, 80);
    const country = (params.get("country") ?? "").trim().slice(0, 80);
    const city = (params.get("city") ?? "").trim().slice(0, 80);
    const level = (params.get("level") ?? "").trim().slice(0, 80);
    const field = (params.get("field") ?? "").trim().slice(0, 80);
    const minFeeRaw = params.get("minFee");
    const maxFeeRaw = params.get("maxFee");
    // Number(null) is 0, which would silently filter out every paid program.
    const minFee = minFeeRaw && minFeeRaw.trim() !== "" ? Number(minFeeRaw) : NaN;
    const maxFee = maxFeeRaw && maxFeeRaw.trim() !== "" ? Number(maxFeeRaw) : NaN;

    const where = {
      ...(level ? { level } : {}),
      ...(field ? { field } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" as const } },
              { field: { contains: q, mode: "insensitive" as const } },
              { university: { name: { contains: q, mode: "insensitive" as const } } },
              { university: { country: { contains: q, mode: "insensitive" as const } } },
            ],
          }
        : {}),
      ...(country || city
        ? { university: { ...(country ? { country } : {}), ...(city ? { city } : {}) } }
        : {}),
      ...(Number.isFinite(minFee) || Number.isFinite(maxFee)
        ? {
            tuitionFee: {
              ...(Number.isFinite(minFee) ? { gte: minFee } : {}),
              ...(Number.isFinite(maxFee) ? { lte: maxFee } : {}),
            },
          }
        : {}),
    };

    const [rows, total, countryRows, cityRows, levelRows, fieldRows] = await Promise.all([
      prisma.program.findMany({
        where,
        take: PICKER_LIMIT + 1,
        orderBy: [{ university: { name: "asc" } }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          level: true,
          field: true,
          tuitionFee: true,
          university: { select: { id: true, name: true, country: true, city: true } },
        },
      }),
      prisma.program.count({ where }),
      prisma.university.findMany({ distinct: ["country"], select: { country: true }, orderBy: { country: "asc" } }),
      prisma.university.findMany({
        where: { city: { not: null } },
        distinct: ["city"],
        select: { city: true },
        orderBy: { city: "asc" },
      }),
      prisma.program.findMany({ distinct: ["level"], select: { level: true }, orderBy: { level: "asc" } }),
      prisma.program.findMany({ distinct: ["field"], select: { field: true }, orderBy: { field: "asc" } }),
    ]);

    return ok({
      programs: rows.slice(0, PICKER_LIMIT).map((row) => ({
        id: row.id,
        name: row.name,
        level: row.level,
        field: row.field,
        fee: Number(row.tuitionFee),
        university: row.university.name,
        universityId: row.university.id,
        country: row.university.country,
        city: row.university.city,
      })),
      total,
      truncated: total > PICKER_LIMIT,
      facets: {
        countries: countryRows.map((row) => row.country).filter(Boolean),
        cities: cityRows.map((row) => row.city).filter(Boolean) as string[],
        levels: levelRows.map((row) => row.level).filter(Boolean),
        fields: fieldRows.map((row) => row.field).filter(Boolean),
      },
    });
  } catch (e) {
    if (e instanceof Error && e.message.includes("Invalid value")) return fail("Invalid filter value", 422);
    return serverError(e);
  }
}
