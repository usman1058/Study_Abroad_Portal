import { prisma } from "@/lib/db";
import { ok, fail, requireUser, serverError } from "@/lib/api";

export async function GET() {
  try {
    const { error, user } = await requireUser();
    if (error) return error;

    const count = await prisma.notification.count({ where: { userId: user.id, readAt: null } });
    return ok({ count });
  } catch (e) {
    return serverError(e);
  }
}