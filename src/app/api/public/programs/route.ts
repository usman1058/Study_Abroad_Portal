import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { serverError } from "@/lib/api";

const PAGE_SIZE = 12;

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const q = (params.get("q") ?? "").trim().slice(0, 120);
    const country = (params.get("country") ?? "").trim().slice(0, 80);
    const level = (params.get("level") ?? "").trim().slice(0, 80);
    const field = (params.get("field") ?? "").trim().slice(0, 100);
    const page = Math.min(1000, Math.max(1, Number.parseInt(params.get("page") ?? "1", 10) || 1));
    const where = {
      ...(country ? { university: { country: { equals: country, mode: "insensitive" as const } } } : {}),
      ...(level ? { level: { equals: level, mode: "insensitive" as const } } : {}),
      ...(field ? { field: { equals: field, mode: "insensitive" as const } } : {}),
      ...(q ? { OR: [
        { name: { contains: q, mode: "insensitive" as const } },
        { field: { contains: q, mode: "insensitive" as const } },
        { university: { name: { contains: q, mode: "insensitive" as const } } },
        { university: { country: { contains: q, mode: "insensitive" as const } } },
      ] } : {}),
    };

    const total = await prisma.program.count({ where });
    const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const currentPage = Math.min(page, pageCount);
    const [programs, universities, levels, fields] = await Promise.all([
      prisma.program.findMany({
        where,
        orderBy: [{ university: { name: "asc" } }, { name: "asc" }],
        skip: (currentPage - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        select: {
          id: true, slug: true, name: true, level: true, field: true, location: true,
          tuitionFee: true, applicationFee: true, intakeDates: true, minGpa: true,
          courseDurationMonths: true, collegeRank: true,
          university: { select: { name: true, country: true, city: true, logoUrl: true } },
        },
      }),
      prisma.university.findMany({ distinct: ["country"], orderBy: { country: "asc" }, select: { country: true } }),
      prisma.program.findMany({ distinct: ["level"], orderBy: { level: "asc" }, select: { level: true } }),
      prisma.program.findMany({ distinct: ["field"], orderBy: { field: "asc" }, select: { field: true } }),
    ]);

    return Response.json({
      programs,
      pagination: { page: currentPage, pageSize: PAGE_SIZE, total, pageCount },
      filters: { countries: universities.map((item) => item.country), levels: levels.map((item) => item.level), fields: fields.map((item) => item.field) },
    }, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } });
  } catch (error) {
    return serverError(error);
  }
}
