import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, fail, requireUser, serverError } from "@/lib/api";
import { canManageUser } from "@/lib/permissions";
import { logAudit, createNotification } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

const statusSchema = z.object({
  status: z.enum(["active", "inactive"]),
});

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const { error, user } = await requireUser();
    if (error) return error;

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return fail("User not found", 404);
    if (user.role !== "SUPER_ADMIN" && user.role !== "MANAGER") return fail("Forbidden", 403);
    if (!canManageUser(user, target)) return fail("Forbidden", 403);

    const body = await req.json();
    const parsed = statusSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Invalid status", 422);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { status: parsed.data.status },
      select: { id: true, email: true, status: true },
    });

    await logAudit({
      actorId: user.id,
      action: "update",
      entityType: "User",
      entityId: id,
      before: { status: target.status },
      after: { status: updated.status },
    });

    if (target.status !== "active" && parsed.data.status === "active") {
      await createNotification({
        userId: target.id,
        type: "account_approved",
        title: "Account approved",
        body: "Your agency account has been approved. You can now sign in.",
      });
    }

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

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return fail("User not found", 404);
    if (target.role === "SUPER_ADMIN") return fail("Cannot delete super admin", 403);
    if (!canManageUser(user, target)) return fail("Forbidden", 403);

    await prisma.user.delete({ where: { id } });
    await logAudit({ actorId: user.id, action: "delete", entityType: "User", entityId: id, before: { email: target.email, role: target.role } });
    return ok({ id });
  } catch (e) {
    return serverError(e);
  }
}