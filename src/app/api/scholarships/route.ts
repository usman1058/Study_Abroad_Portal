import { prisma } from "@/lib/db";
import { fail, ok, requireUser, serverError } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { slugify } from "@/lib/slug";
import { scholarshipSchema, validateScholarshipLinks } from "@/lib/scholarships";

async function makeScholarshipSlug(name: string) {
  const base = slugify(name);
  let slug = base;
  let suffix = 2;
  while (await prisma.scholarship.findUnique({ where: { slug }, select: { id: true } })) slug = `${base}-${suffix++}`;
  return slug;
}

export async function POST(request: Request) {
  try {
    const { error, user } = await requireUser();
    if (error) return error;
    if (user.role !== "SUPER_ADMIN") return fail("Only an administrator can manage scholarships.", 403);
    const parsed = scholarshipSchema.safeParse(await request.json());
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return fail(`${issue?.path.join(".") ? `${issue.path.join(".")}: ` : ""}${issue?.message ?? "Scholarship details are invalid."}`, 422);
    }
    const input = parsed.data;
    const links = await validateScholarshipLinks(input.universityIds, input.programIds);
    if ("error" in links && typeof links.error === "string") return fail(links.error, 422);
    const scholarship = await prisma.scholarship.create({
      data: {
        slug: await makeScholarshipSlug(input.name), name: input.name, providerName: input.providerName || null,
        description: input.description, category: input.category, awardType: input.awardType,
        awardValue: input.awardValue ?? null, awardCurrency: input.awardCurrency,
        eligibleCountries: input.eligibleCountries, studyLevels: input.studyLevels, subject: input.subject || null,
        eligibilityCriteria: input.eligibilityCriteria, deadline: input.deadline ? new Date(input.deadline) : null,
        applicationUrl: input.applicationUrl || null, isActive: input.isActive,
        universities: { create: links.universityIds.map((universityId) => ({ universityId })) },
        programs: { create: links.programIds.map((programId) => ({ programId })) },
      },
      select: { id: true, name: true, slug: true },
    });
    await logAudit({ actorId: user.id, action: "create", entityType: "Scholarship", entityId: scholarship.id, after: { name: scholarship.name } });
    return ok(scholarship, { status: 201 });
  } catch (error) { return serverError(error); }
}
