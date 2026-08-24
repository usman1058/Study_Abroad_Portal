import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, fail, serverError } from "@/lib/api";
import { signupRateLimit } from "@/lib/rate-limit";
import { requiredName, emailField, phoneField, passwordField } from "@/lib/validation";

const signupSchema = z.object({
  firstName: requiredName(80),
  lastName: requiredName(80),
  email: emailField(),
  phone: phoneField(),
  password: passwordField(),
});

export async function POST(req: NextRequest) {
  const rl = await signupRateLimit(req);
  if (rl) return rl;

  try {
    const body = await req.json();
    const parsed = signupSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Invalid input", 422);
    }

    const { firstName, lastName, email, phone, password } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return fail("An account with this email already exists", 409);
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        role: "STUDENT",
        email: normalizedEmail,
        passwordHash,
        firstName,
        lastName,
        phone,
        status: "active",
      },
      select: { id: true, email: true },
    });

    return ok({ id: user.id, email: user.email }, { status: 201 });
  } catch (e) {
    return serverError(e);
  }
}