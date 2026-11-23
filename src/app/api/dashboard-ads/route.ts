import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { fail, ok, requireUser, serverError } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { dashboardAdSchema } from "@/lib/validation";
import { storeImageUrl } from "@/lib/media";
import { StorageError } from "@/lib/storage";

export async function GET() {
  try {
    const { error, user } = await requireUser();
    if (error) return error;
    const now = new Date();
    const ads = await prisma.dashboardAdvertisement.findMany({
      where: user.role === "SUPER_ADMIN" ? {} : {
        active: true,
        AND: [{ OR: [{ targetRoles: { isEmpty: true } }, { targetRoles: { has: user.role } }] }, { OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
      },
      select: { id: true, title: true, body: true, imageUrl: true, linkUrl: true, ctaLabel: true, active: true, targetRoles: true, sortOrder: true, startsAt: true, endsAt: true, createdAt: true },
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
    // A new advertisement cannot point at an arbitrary stored object; only the
    // upload path (data URL) or an external URL is allowed.
    if (data.imageUrl?.startsWith("s3:")) return fail("Upload the image instead of referencing a stored file", 422);
    try {
      data.imageUrl = await storeImageUrl(data.imageUrl, user.id);
    } catch (error) {
      if (error instanceof StorageError) return fail(error.message, error.status);
      throw error;
    }
    const ad = await prisma.dashboardAdvertisement.create({
      data: {
        title: data.title, body: data.body ?? null, imageUrl: data.imageUrl ?? null, linkUrl: data.linkUrl ?? null,
        ctaLabel: data.ctaLabel ?? "Learn more", active: data.active ?? true, targetRoles: data.targetRoles ?? [], sortOrder: data.sortOrder ?? 0,
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
