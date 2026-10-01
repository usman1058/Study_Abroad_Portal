import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { fail, ok, requireUser, serverError } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { dashboardAdSchema } from "@/lib/validation";

export async function GET() {
  try {
    const { error, user } = await requireUser();
    if (error) return error;
    const now = new Date();
    const ads = await prisma.dashboardAdvertisement.findMany({
      where: user.role === "SUPER_ADMIN" ? {} : {
        active: true,
        AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
      },
      select: { id: true, title: true, body: true, imageUrl: true, linkUrl: true, ctaLabel: true, active: true, sortOrder: true, startsAt: true, endsAt: true, createdAt: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
    return ok(ads);
  } catch (e) {
    return serverError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { error, user } = await requireUser();
    if (error) return error;
    if (user.role !== "SUPER_ADMIN") return fail("Only the portal owner can manage dashboard advertisements", 403);
    const parsed = dashboardAdSchema.safeParse(await req.json());
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid advertisement", 422);
    const data = parsed.data;
    const ad = await prisma.dashboardAdvertisement.create({
      data: {
        title: data.title, body: data.body ?? null, imageUrl: data.imageUrl ?? null, linkUrl: data.linkUrl ?? null,
        ctaLabel: data.ctaLabel ?? "Learn more", active: data.active ?? true, sortOrder: data.sortOrder ?? 0,
        startsAt: data.startsAt ? new Date(data.startsAt) : null, endsAt: data.endsAt ? new Date(data.endsAt) : null,
        createdById: user.id,
      },
      select: { id: true, title: true },
    });
    await logAudit({ actorId: user.id, action: "create", entityType: "DashboardAdvertisement", entityId: ad.id, after: { title: ad.title } });
    return ok(ad, { status: 201 });
  } catch (e) {
    return serverError(e);
  }
}
