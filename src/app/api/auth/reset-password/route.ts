import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, fail, serverError } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { passwordField } from "@/lib/validation";
import { verifyPasswordResetToken } from "@/lib/password-reset";
import { logAudit } from "@/lib/audit";

const resetRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
  keyPrefix: "reset-password",
});

const schema = z.object({
  token: z.string().min(10).max(2048),
  password: passwordField(),
});

export async function POST(req: NextRequest) {
  const limited = await resetRateLimit(req);
  if (limited) return limited;

  try {
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input", 422);

    const payload = verifyPasswordResetToken(parsed.data.token);
    if (!payload) return fail("This reset link is invalid or has expired. Request a new one.", 400);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, passwordHash: true, status: true },
    });

    // The hash suffix in the token makes it single-use: after a successful
    // reset (or any other password change) the stored suffix no longer matches.
    if (!user || user.status !== "active" || user.passwordHash.slice(-10) !== payload.hashSuffix) {
      return fail("This reset link is invalid or has expired. Request a new one.", 400);
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

    await logAudit({
      actorId: user.id,
      actorType: "guest",
      action: "password_change",
      entityType: "User",
      entityId: user.id,
      after: { method: "reset-link" },
    });

    return ok({ message: "Password updated. You can now sign in." });
  } catch (e) {
    return serverError(e);
  }
}
