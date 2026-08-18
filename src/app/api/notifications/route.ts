import { prisma } from "@/lib/db";
import { ok, fail, requireUser, toError } from "@/lib/api";

export async function GET() {
  try {
    const { error, user } = await requireUser();
    if (error) return error;

    const notifications = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return ok(notifications);
  } catch (e) {
    return fail(toError(e), 500);
  }
}

export async function PUT() {
  try {
    const { error, user } = await requireUser();
    if (error) return error;

    await prisma.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });
    return ok({ marked: true });
  } catch (e) {
    return fail(toError(e), 500);
  }
}