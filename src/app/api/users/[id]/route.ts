import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, fail, requireUser, toError } from "@/lib/api";
import { canManageUser } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const { error, user } = await requireUser();
    if (error) return error;

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return fail("User not found", 404);
    if (target.role === "SUPER_ADMIN") return fail("Cannot delete super admin", 403);
    if (!canManageUser(user, target)) return fail("Forbidden", 403);

    await prisma.user.delete({ where: { id } });
    await logAudit({ actorId: user.id, action: "delete", entityType: "User", entityId: id, before: { email: target.email, role: target.role } });
    return ok({ id });
  } catch (e) {
    return fail(toError(e), 500);
  }
}