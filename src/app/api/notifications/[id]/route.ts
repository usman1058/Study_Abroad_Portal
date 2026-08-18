import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, fail, requireUser, toError } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

export async function PUT(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const { error, user } = await requireUser();
    if (error) return error;

    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification) return fail("Notification not found", 404);
    if (notification.userId !== user.id) return fail("Forbidden", 403);

    await prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
    return ok({ id });
  } catch (e) {
    return fail(toError(e), 500);
  }
}