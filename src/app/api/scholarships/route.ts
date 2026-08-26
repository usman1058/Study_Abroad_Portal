import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, fail, requireUser, serverError } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { makeProgramSlug } from "@/lib/slug";
import { requiredName, optionalText, money, intRange, dateStringArray } from "@/lib/validation";

const idFieldMax = z.string().trim().min(1).max(64);
const tagList = z.array(z.string().trim().min(1).max(40)).max(10).default([]);

const programSchema = z.object({
  universityId: idFieldMax.optional(),
  newUniversity: z.boolean().optional(),
  newUniversityName: optionalText(160),
  newUniversityCountry: optionalText(80),
  name: requiredName(200),
  level: requiredName(50),
  field: z.string().trim().max(120).default(""),
  location: optionalText(160),
  tuitionFee: money(),
  applicationFee: money().optional().nullable(),
  intakeDates: dateStringArray(24).default([]),
  requiredDocuments: z.array(z.string().trim().min(1).max(80)).max(15).default([]),
  minGpa: z.number().min(0).max(100).optional().nullable(),
  visaRequired: z.boolean().optional().default(false),
  commissionRate: z.number().min(0).max(100).optional().default(0),
  tags: tagList,
  eligibilityCriteria: z.array(z.string().trim().min(1).max(300)).max(15).default([]),
  offerTurnaroundDays: intRange(0, 365).optional().nullable(),
  collegeRank: optionalText(160),
  courseDurationMonths: intRange(0, 240).optional().nullable(),
  universityLogoUrl: optionalText(500),
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
        universityLogoUrl: data.universityLogoUrl ?? null,
      },
      select: { id: true, name: true },
    });

    await logAudit({ actorId: user.id, action: "create", entityType: "Program", entityId: program.id, after: { name: program.name } });
    return ok({ id: program.id }, { status: 201 });
  } catch (e) {
    return serverError(e);
  }
}