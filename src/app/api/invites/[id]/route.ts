import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, fail, requireUser, serverError } from "@/lib/api";
import { logAudit } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

export async function PUT(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const { error, user } = await requireUser();
    if (error) return error;
    if (user.role === "STUDENT") return fail("Forbidden", 403);

    const link = await prisma.inviteLink.findUnique({ where: { id } });
    if (!link) return fail("Link not found", 404);
    if (link.createdById !== user.id && user.role !== "SUPER_ADMIN") return fail("Forbidden", 403);

    const updated = await prisma.inviteLink.update({ where: { id }, data: { revoked: true } });
    await logAudit({ actorId: user.id, action: "revoke", entityType: "InviteLink", entityId: id });
    return ok({ id: updated.id });
  } catch (e) {
    return serverError(e);
  }
}