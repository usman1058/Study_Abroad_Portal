import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, fail, requireUser, serverError } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { makeProgramSlug } from "@/lib/slug";

type Params = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  level: z.string().min(1).optional(),
  field: z.string().optional(),
  location: z.string().optional().nullable(),
  tuitionFee: z.number().optional(),
  applicationFee: z.number().optional().nullable(),
  intakeDates: z.array(z.string()).optional(),
  requiredDocuments: z.array(z.string()).optional(),
  minGpa: z.number().optional().nullable(),
  visaRequired: z.boolean().optional(),
  commissionRate: z.number().optional(),
  tags: z.array(z.string()).optional(),
  eligibilityCriteria: z.array(z.string()).optional(),
  offerTurnaroundDays: z.number().optional().nullable(),
  collegeRank: z.string().optional().nullable(),
  courseDurationMonths: z.number().optional().nullable(),
});

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const { error, user } = await requireUser();
    if (error) return error;
    if (user.role !== "SUPER_ADMIN") return fail("Only the portal owner can manage the catalog", 403);

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input", 422);

    const current = await prisma.program.findUnique({
      where: { id },
      select: { name: true, commissionRate: true, slug: true, university: { select: { name: true } } },
    });
    if (!current) return fail("Program not found", 404);

    const data = parsed.data;
    let slug: string | undefined;
    if (data.name !== undefined || !current.slug) {
      slug = await makeProgramSlug(current.university?.name ?? "University", data.name ?? current.name);
    }
    const updated = await prisma.program.update({
      where: { id },
      data: {
        ...(slug !== undefined ? { slug } : {}),
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.level !== undefined ? { level: data.level } : {}),
        ...(data.field !== undefined ? { field: data.field } : {}),
        ...(data.location !== undefined ? { location: data.location } : {}),
        ...(data.tuitionFee !== undefined ? { tuitionFee: data.tuitionFee } : {}),
        ...(data.applicationFee !== undefined ? { applicationFee: data.applicationFee } : {}),
        ...(data.intakeDates !== undefined ? { intakeDates: data.intakeDates.map((d) => new Date(d)) } : {}),
        ...(data.requiredDocuments !== undefined ? { requiredDocuments: data.requiredDocuments } : {}),
        ...(data.minGpa !== undefined ? { minGpa: data.minGpa } : {}),
        ...(data.visaRequired !== undefined ? { visaRequired: data.visaRequired } : {}),
        ...(data.commissionRate !== undefined ? { commissionRate: data.commissionRate } : {}),
        ...(data.tags !== undefined ? { tags: data.tags } : {}),
        ...(data.eligibilityCriteria !== undefined ? { eligibilityCriteria: data.eligibilityCriteria } : {}),
        ...(data.offerTurnaroundDays !== undefined ? { offerTurnaroundDays: data.offerTurnaroundDays } : {}),
        ...(data.collegeRank !== undefined ? { collegeRank: data.collegeRank } : {}),
        ...(data.courseDurationMonths !== undefined ? { courseDurationMonths: data.courseDurationMonths } : {}),
      },
      select: { id: true },
    });

    await logAudit({ actorId: user.id, action: "update", entityType: "Program", entityId: id, before: { name: current.name, commissionRate: Number(current.commissionRate) }, after: parsed.data });
    return ok({ id: updated.id });
  } catch (e) {
    return serverError(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const { error, user } = await requireUser();
    if (error) return error;
    if (user.role !== "SUPER_ADMIN") return fail("Only the portal owner can manage the catalog", 403);

    await prisma.program.delete({ where: { id } });
    await logAudit({ actorId: user.id, action: "delete", entityType: "Program", entityId: id });
    return ok({ id });
  } catch (e) {
    return serverError(e);
  }
}