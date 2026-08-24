import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, fail, requireUser, serverError } from "@/lib/api";
import { logAudit } from "@/lib/audit";

const passwordSchema = z.object({
  currentPassword: z.string().min(1).max(72),
  newPassword: z.string().min(8, "New password must be at least 8 characters").max(72),
});

export async function PUT(req: NextRequest) {
  try {
    const { error, user } = await requireUser();
    if (error) return error;

    const body = await req.json();
    const parsed = passwordSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input", 422);

    const existing = await prisma.user.findUnique({ where: { id: user.id } });
    if (!existing) return fail("Unauthorized", 401);

    const valid = await bcrypt.compare(parsed.data.currentPassword, existing.passwordHash);
    if (!valid) return fail("Current password is incorrect", 401);

    const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

    await logAudit({ actorId: user.id, action: "password_change", entityType: "User", entityId: user.id });
    return ok({ changed: true });
  } catch (e) {
    return serverError(e);
  }
}