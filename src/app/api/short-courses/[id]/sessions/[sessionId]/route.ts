import { prisma } from "@/lib/db";
import { fail, ok, requireUser, serverError } from "@/lib/api";
import { logAudit } from "@/lib/audit";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; sessionId: string }> }) {
  try {
    const { id, sessionId } = await params;
    const { error, user } = await requireUser();
    if (error) return error;
    if (user.role !== "SUPER_ADMIN") return fail("Only the portal owner can manage short-course sessions", 403);

    const session = await prisma.shortCourseSession.findFirst({ where: { id: sessionId, shortCourseId: id }, select: { id: true, title: true } });
    if (!session) return fail("Session not found", 404);
    await prisma.shortCourseSession.delete({ where: { id: sessionId } });
    await logAudit({ actorId: user.id, action: "delete", entityType: "ShortCourseSession", entityId: sessionId, after: { shortCourseId: id, title: session.title } });
    return ok({ id: sessionId });
  } catch (error) {
    return serverError(error);
  }
}
