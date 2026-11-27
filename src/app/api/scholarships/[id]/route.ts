import { z } from "zod";
import { prisma } from "@/lib/db";
import { fail, ok, requireUser, serverError } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { slugify } from "@/lib/slug";
import { validateScholarshipLinks, scholarshipSchema } from "@/lib/scholarships";

type Params = { params: Promise<{ id: string }> };

async function uniqueSlug(name: string, currentId: string) {
  const base = slugify(name);
  let slug = base;
  let suffix = 2;
  while (await prisma.scholarship.findFirst({ where: { slug, id: { not: currentId } }, select: { id: true } })) slug = `${base}-${suffix++}`;
  return slug;
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const { error, user } = await requireUser();
    if (error) return error;
    if (user.role !== "SUPER_ADMIN") return fail("Only an administrator can manage scholarships.", 403);
    const { id } = await params;
    const current = await prisma.scholarship.findUnique({ where: { id }, select: { id: true, name: true } });
    if (!current) return fail("Scholarship not found.", 404);
    const parsed = scholarshipSchema.safeParse(await request.json());
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return fail(`${issue?.path.join(".") ? `${issue.path.join(".")}: ` : ""}${issue?.message ?? "Scholarship details are invalid."}`, 422);
    }
    const input = parsed.data;
    const links = await validateScholarshipLinks(input.universityIds, input.programIds);
    if ("error" in links && typeof links.error === "string") return fail(links.error, 422);
    const updated = await prisma.scholarship.update({
      where: { id },
      data: {
        slug: input.name === current.name ? undefined : await uniqueSlug(input.name, id),
        name: input.name, providerName: input.providerName || null, description: input.description,
        category: input.category, awardType: input.awardType, awardValue: input.awardValue ?? null,
        awardCurrency: input.awardCurrency, eligibleCountries: input.eligibleCountries, studyLevels: input.studyLevels,
        subject: input.subject || null, eligibilityCriteria: input.eligibilityCriteria,
        deadline: input.deadline ? new Date(input.deadline) : null, applicationUrl: input.applicationUrl || null,
        isActive: input.isActive,
        universities: { deleteMany: {}, create: links.universityIds.map((universityId) => ({ universityId })) },
        programs: { deleteMany: {}, create: links.programIds.map((programId) => ({ programId })) },
      },
      select: { id: true, slug: true },
    });
    await logAudit({ actorId: user.id, action: "update", entityType: "Scholarship", entityId: id, before: { name: current.name }, after: { name: input.name } });
    return ok(updated);
  } catch (error) { return serverError(error); }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { error, user } = await requireUser();
    if (error) return error;
    if (user.role !== "SUPER_ADMIN") return fail("Only an administrator can manage scholarships.", 403);
    const { id } = await params;
    const current = await prisma.scholarship.findUnique({ where: { id }, select: { id: true, name: true } });
    if (!current) return fail("Scholarship not found.", 404);
    await prisma.scholarship.delete({ where: { id } });
    await logAudit({ actorId: user.id, action: "delete", entityType: "Scholarship", entityId: id, before: { name: current.name } });
    return ok({ id });
  } catch (error) { return serverError(error); }
}
