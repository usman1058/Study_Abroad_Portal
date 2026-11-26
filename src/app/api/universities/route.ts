import { z } from "zod";
import { prisma } from "@/lib/db";
import { fail, ok, requireUser, serverError } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { getWorkingCountries } from "@/lib/working-countries";

const schema = z.object({
  name: z.string().trim().min(2).max(160),
  country: z.string().trim().min(2).max(80),
  city: z.string().trim().max(120).optional().nullable(),
  website: z.string().trim().url().max(300).optional().or(z.literal("")),
  logoUrl: z.string().trim().url().max(500).optional().or(z.literal("")),
});

export async function POST(request: Request) {
  try {
    const { error, user } = await requireUser();
    if (error) return error;
    if (user.role !== "SUPER_ADMIN") return fail("Only an administrator can manage universities.", 403);
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return fail(`${issue?.path.join(".") ? `${issue.path.join(".")}: ` : ""}${issue?.message ?? "University details are invalid."}`, 422);
    }
    const input = parsed.data;
    const countries = await getWorkingCountries();
    if (!countries.some((country) => country.toLocaleLowerCase() === input.country.toLocaleLowerCase())) return fail("Choose a country from the configured working destinations.", 422);
    const duplicate = await prisma.university.findFirst({ where: { name: { equals: input.name, mode: "insensitive" }, country: { equals: input.country, mode: "insensitive" } }, select: { id: true } });
    if (duplicate) return fail("That university already exists in this country.", 409);
    const university = await prisma.university.create({ data: { name: input.name, country: input.country, city: input.city || null, website: input.website || null, logoUrl: input.logoUrl || null }, select: { id: true, name: true } });
    await logAudit({ actorId: user.id, action: "create", entityType: "University", entityId: university.id, after: { name: university.name } });
    return ok(university, { status: 201 });
  } catch (error) { return serverError(error); }
}
