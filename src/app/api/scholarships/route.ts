import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, fail, requireUser, toError } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { makeProgramSlug } from "@/lib/slug";

const programSchema = z.object({
  universityId: z.string().optional(),
  newUniversity: z.boolean().optional(),
  newUniversityName: z.string().optional(),
  newUniversityCountry: z.string().optional(),
  name: z.string().min(1),
  level: z.string().min(1),
  field: z.string().default(""),
  location: z.string().optional().nullable(),
  tuitionFee: z.number(),
  applicationFee: z.number().optional().nullable(),
  intakeDates: z.array(z.string()).default([]),
  requiredDocuments: z.array(z.string()).default([]),
  minGpa: z.number().optional().nullable(),
  visaRequired: z.boolean().optional().default(false),
  commissionRate: z.number().optional().default(0),
  tags: z.array(z.string()).default([]),
  eligibilityCriteria: z.array(z.string()).default([]),
  offerTurnaroundDays: z.number().optional().nullable(),
  collegeRank: z.string().optional().nullable(),
  courseDurationMonths: z.number().optional().nullable(),
});

async function resolveUniversity(data: z.infer<typeof programSchema>) {
  if (data.newUniversity && data.newUniversityName) {
    const u = await prisma.university.create({
      data: { name: data.newUniversityName, country: data.newUniversityCountry || "Unknown" },
    });
    return u.id;
  }
  if (data.universityId) return data.universityId;
  throw new Error("University is required");
}

export async function POST(req: NextRequest) {
  try {
    const { error, user } = await requireUser();
    if (error) return error;
    if (user.role !== "SUPER_ADMIN") return fail("Only the portal owner can manage the catalog", 403);

    const body = await req.json();
    const parsed = programSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input", 422);

    const data = parsed.data;
    const universityId = await resolveUniversity(data);

    const universityName =
      data.newUniversity && data.newUniversityName
        ? data.newUniversityName
        : ((await prisma.university.findUnique({ where: { id: universityId }, select: { name: true } }))?.name ?? "University");
    const slug = await makeProgramSlug(universityName, data.name);

    const program = await prisma.program.create({
      data: {
        universityId,
        slug,
        name: data.name,
        level: data.level,
        field: data.field,
        location: data.location ?? null,
        tuitionFee: data.tuitionFee,
        applicationFee: data.applicationFee ?? null,
        intakeDates: data.intakeDates.map((d) => new Date(d)),
        requiredDocuments: data.requiredDocuments,
        minGpa: data.minGpa ?? null,
        visaRequired: data.visaRequired,
        commissionRate: data.commissionRate,
        tags: data.tags,
        whyHighlights: [],
        eligibilityCriteria: data.eligibilityCriteria,
        offerTurnaroundDays: data.offerTurnaroundDays ?? null,
        collegeRank: data.collegeRank ?? null,
        courseDurationMonths: data.courseDurationMonths ?? null,
      },
      select: { id: true, name: true },
    });

    await logAudit({ actorId: user.id, action: "create", entityType: "Program", entityId: program.id, after: { name: program.name } });
    return ok({ id: program.id }, { status: 201 });
  } catch (e) {
    return fail(toError(e), 500);
  }
}