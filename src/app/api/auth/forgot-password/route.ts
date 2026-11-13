import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, fail, serverError } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { emailField } from "@/lib/validation";
import { createPasswordResetToken } from "@/lib/password-reset";
import { sendPasswordResetEmail } from "@/lib/mail";

const forgotPasswordRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
  keyPrefix: "forgot-password",
});

const schema = z.object({ email: emailField() });

export async function POST(req: NextRequest) {
  const limited = await forgotPasswordRateLimit(req);
  if (limited) return limited;

  try {
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Valid email required", 422);

    const email = parsed.data.email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, passwordHash: true, status: true },
    });

    if (user && user.status === "active") {
      const token = createPasswordResetToken(user);
      const origin = new URL(req.url).origin;
      const resetUrl = `${origin}/reset-password?token=${encodeURIComponent(token)}`;
      await sendPasswordResetEmail(user.email, resetUrl);
    }

    // Always identical, so the endpoint cannot be used to enumerate accounts.
    return ok({
      message: "If an account exists for that email, a reset link is on its way. It expires in 30 minutes.",
    });
  } catch (e) {
    return serverError(e);
  }
}
