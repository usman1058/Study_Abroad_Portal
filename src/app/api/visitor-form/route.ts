import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, fail, requireUser, serverError } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { parsePaginationParams, buildPaginatedQuery, paginateResults } from "@/lib/pagination";

const leadSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email().optional().nullable(),
  courseOfInterest: z.string().optional().nullable(),
  countryOfInterest: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  source: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const { error, user } = await requireUser();
    if (error) return error;
    if (user.role === "STUDENT") return fail("Only agency staff can capture leads", 403);

    const body = await req.json();
    const parsed = leadSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input", 422);

    const data = parsed.data;
    const lead = await prisma.visitorLead.create({
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email ?? null,
        courseOfInterest: data.courseOfInterest ?? null,
        countryOfInterest: data.countryOfInterest ?? null,
        notes: data.notes ?? null,
        source: data.source ?? "dashboard",
        createdById: user.id,
      },
      select: { id: true },
    });

    await logAudit({ actorId: user.id, action: "create", entityType: "VisitorLead", entityId: lead.id, after: { name: data.name } });
    return ok({ id: lead.id }, { status: 201 });
  } catch (e) {
    return serverError(e);
  }
}

export async function GET(req: NextRequest) {
  try {
    const { error, user } = await requireUser();
    if (error) return error;
    if (user.role === "STUDENT") return fail("Forbidden", 403);

    const { cursor, limit } = parsePaginationParams(req, 50, 100);

    const where = user.role === "COUNSELOR" ? { createdById: user.id } : {};

    const baseQuery = {
      where,
      orderBy: { createdAt: "desc" as const },
    };

    const query = buildPaginatedQuery(baseQuery, { cursor, limit });
    const leads = await prisma.visitorLead.findMany(query);

    const { data, nextCursor, hasMore } = paginateResults(leads, limit);

    return ok({ data, nextCursor, hasMore });
  } catch (e) {
    return serverError(e);
  }
}