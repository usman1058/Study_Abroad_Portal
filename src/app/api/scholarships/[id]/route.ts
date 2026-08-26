import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, fail, requireUser, serverError } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { makeProgramSlug } from "@/lib/slug";
import { optionalText, money, intRange, dateStringArray } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  level: z.string().trim().min(1).max(50).optional(),
  field: z.string().trim().max(120).optional(),
  location: optionalText(160),
  tuitionFee: money().optional(),
  applicationFee: money().optional().nullable(),
  intakeDates: dateStringArray(24).optional(),
  requiredDocuments: z.array(z.string().trim().min(1).max(80)).max(15).optional(),
  minGpa: z.number().min(0).max(100).optional().nullable(),
  visaRequired: z.boolean().optional(),
  commissionRate: z.number().min(0).max(100).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(10).optional(),
  eligibilityCriteria: z.array(z.string().trim().min(1).max(300)).max(15).optional(),
  offerTurnaroundDays: intRange(0, 365).optional().nullable(),
  collegeRank: optionalText(160),
  courseDurationMonths: intRange(0, 240).optional().nullable(),
  universityLogoUrl: optionalText(500),
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
        ...(data.universityLogoUrl !== undefined ? { universityLogoUrl: data.universityLogoUrl } : {}),
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