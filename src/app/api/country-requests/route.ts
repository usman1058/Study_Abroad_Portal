import { z } from "zod";
import { prisma } from "@/lib/db";
import { createNotification, logAudit, notifyMany } from "@/lib/audit";
import { fail, ok, requireUser, serverError } from "@/lib/api";
import { sendCountryRequestDecisionEmail, sendCountryRequestEmail } from "@/lib/mail";
import { getWorkingCountries, normalizeCountryList } from "@/lib/working-countries";

export async function GET() {
  try {
    const { error, user } = await requireUser();
    if (error) return error;
    if (user.role !== "SUPER_ADMIN" && user.role !== "MANAGER" && user.role !== "COUNSELOR") return fail("Country requests are not available for this account.", 403);
    const requests = await prisma.countryRequest.findMany({
      where: user.role === "SUPER_ADMIN" ? undefined : { requesterId: user.id },
      include: { requester: { select: { id: true, firstName: true, lastName: true, email: true, role: true } } },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 100,
    });
    return ok({ requests }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) { return serverError(error); }
}

export async function POST(request: Request) {
  try {
    const { error, user } = await requireUser();
    if (error) return error;
    if (user.role !== "MANAGER" && user.role !== "COUNSELOR") return fail("Only managers and consultants can request a destination country.", 403);
    const parsed = z.object({ country: z.string().trim().min(2).max(80), reason: z.string().trim().max(500).optional() }).safeParse(await request.json());
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Country request is invalid.", 422);
    const country = parsed.data.country.replace(/\s+/g, " ");
    const configured = await getWorkingCountries();
    if (configured.some((item) => item.toLowerCase() === country.toLowerCase())) return fail("This country is already in the working destinations.", 409);
    const pending = await prisma.countryRequest.findFirst({ where: { status: "PENDING", country: { equals: country, mode: "insensitive" } }, select: { id: true } });
    if (pending) return fail("A request for this country is already awaiting review.", 409);
    const created = await prisma.countryRequest.create({ data: { country, reason: parsed.data.reason || null, requesterId: user.id } });
    const admins = await prisma.user.findMany({ where: { role: "SUPER_ADMIN", status: "active" }, select: { id: true, email: true, firstName: true, lastName: true } });
    await Promise.allSettled([
      notifyMany(admins.map((admin) => ({ userId: admin.id })), { type: "country_request", title: `Country request: ${country}`, body: `${user.name} requested adding ${country}.`, data: { requestId: created.id, href: "/settings#country-requests" } }),
      ...admins.map((admin) => sendCountryRequestEmail(admin.email, { requesterName: user.name, country, reason: parsed.data.reason, requestId: created.id })),
    ]);
    await logAudit({ actorId: user.id, action: "create", entityType: "CountryRequest", entityId: created.id, after: { country } });
    return ok({ id: created.id, status: created.status }, { status: 201 });
  } catch (error) { return serverError(error); }
}

export async function PATCH(request: Request) {
  try {
    const { error, user } = await requireUser();
    if (error) return error;
    if (user.role !== "SUPER_ADMIN") return fail("Only an administrator can review country requests.", 403);
    const parsed = z.object({ id: z.string().min(1).max(64), status: z.enum(["APPROVED", "REJECTED"]), decisionNote: z.string().trim().max(500).optional() }).safeParse(await request.json());
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Review details are invalid.", 422);
    const pending = await prisma.countryRequest.findUnique({ where: { id: parsed.data.id }, include: { requester: { select: { id: true, email: true } } } });
    if (!pending) return fail("Country request was not found.", 404);
    if (pending.status !== "PENDING") return fail("This country request has already been reviewed.", 409);
    await prisma.$transaction(async (tx) => {
      if (parsed.data.status === "APPROVED") {
        const setting = await tx.portalSetting.findUnique({ where: { key: "workingCountries" }, select: { value: true } });
        let current: string[] = [];
        try { if (setting) current = normalizeCountryList(JSON.parse(setting.value)); } catch { /* replace malformed value */ }
        if (!setting) {
          const legacyCountries = await tx.university.findMany({ distinct: ["country"], select: { country: true } });
          current = normalizeCountryList(legacyCountries.map((item) => item.country));
        }
        const merged = normalizeCountryList([...current, pending.country]);
        await tx.portalSetting.upsert({ where: { key: "workingCountries" }, create: { key: "workingCountries", value: JSON.stringify(merged) }, update: { value: JSON.stringify(merged) } });
      }
      await tx.countryRequest.update({ where: { id: pending.id }, data: { status: parsed.data.status, decisionNote: parsed.data.decisionNote || null, reviewedById: user.id } });
    });
    await Promise.allSettled([
      createNotification({ userId: pending.requester.id, type: "country_request_decision", title: `Country request ${parsed.data.status === "APPROVED" ? "approved" : "declined"}`, body: `${pending.country}${parsed.data.decisionNote ? ` — ${parsed.data.decisionNote}` : ""}`, data: { requestId: pending.id, href: "/settings#country-requests" } }),
      sendCountryRequestDecisionEmail(pending.requester.email, { country: pending.country, status: parsed.data.status, note: parsed.data.decisionNote }),
    ]);
    await logAudit({ actorId: user.id, action: "update", entityType: "CountryRequest", entityId: pending.id, after: { status: parsed.data.status } });
    return ok({ id: pending.id, status: parsed.data.status });
  } catch (error) { return serverError(error); }
}
