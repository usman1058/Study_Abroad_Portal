import { z } from "zod";
import { prisma } from "@/lib/db";
import { fail, ok, requireUser, serverError } from "@/lib/api";
import { normalizeCountryList, getWorkingCountries } from "@/lib/working-countries";

export async function GET() {
  try {
    const { error } = await requireUser();
    if (error) return error;
    return ok({ countries: await getWorkingCountries() }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) { return serverError(error); }
}

export async function PUT(request: Request) {
  try {
    const { error, user } = await requireUser();
    if (error) return error;
    if (user.role !== "SUPER_ADMIN") return fail("Only an administrator can update working countries.", 403);
    const parsed = z.object({ countries: z.array(z.string().trim().min(2).max(80)).min(1).max(100) }).safeParse(await request.json());
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Country list is invalid.", 422);
    const countries = normalizeCountryList(parsed.data.countries);
    if (!countries.length) return fail("Add at least one valid working country.", 422);
    await prisma.portalSetting.upsert({ where: { key: "workingCountries" }, create: { key: "workingCountries", value: JSON.stringify(countries) }, update: { value: JSON.stringify(countries) } });
    return ok({ countries }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) { return serverError(error); }
}
