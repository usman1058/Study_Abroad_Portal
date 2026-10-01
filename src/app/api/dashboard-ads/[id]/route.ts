import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { fail, ok, requireUser, serverError } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { dashboardAdSchema } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const { error, user } = await requireUser();
    if (error) return error;
    if (user.role !== "SUPER_ADMIN") return fail("Only the portal owner can manage dashboard advertisements", 403);
    const parsed = dashboardAdSchema.partial().safeParse(await req.json());
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid advertisement", 422);
    if (Object.keys(parsed.data).length === 0) return fail("No changes supplied", 422);
    const before = await prisma.dashboardAdvertisement.findUnique({ where: { id }, select: { id: true, title: true, active: true } });
    if (!before) return fail("Advertisement not found", 404);
    const data = parsed.data;
    const updated = await prisma.dashboardAdvertisement.update({
      where: { id },
      data: {
        ...data,
        ...(data.startsAt !== undefined ? { startsAt: data.startsAt ? new Date(data.startsAt) : null } : {}),
        ...(data.endsAt !== undefined ? { endsAt: data.endsAt ? new Date(data.endsAt) : null } : {}),
      },
      select: { id: true, title: true, active: true },
    });
    await logAudit({ actorId: user.id, action: "update", entityType: "DashboardAdvertisement", entityId: id, before, after: updated });
    return ok(updated);
  } catch (e) {
    return serverError(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const { error, user } = await requireUser();
    if (error) return error;
    if (user.role !== "SUPER_ADMIN") return fail("Only the portal owner can manage dashboard advertisements", 403);
    const ad = await prisma.dashboardAdvertisement.findUnique({ where: { id }, select: { id: true, title: true } });
    if (!ad) return fail("Advertisement not found", 404);
    await prisma.dashboardAdvertisement.delete({ where: { id } });
    await logAudit({ actorId: user.id, action: "delete", entityType: "DashboardAdvertisement", entityId: id, before: ad });
    return ok({ id });
  } catch (e) {
    return serverError(e);
  }
}
