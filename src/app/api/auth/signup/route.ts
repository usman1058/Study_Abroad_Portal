import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, fail, serverError } from "@/lib/api";
import { signupRateLimit } from "@/lib/rate-limit";
import { createNotification } from "@/lib/audit";
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
    const admin = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" }, select: { id: true }, orderBy: { createdAt: "asc" } });

    const user = await prisma.user.create({
      data: {
        role: "STUDENT",
        email: normalizedEmail,
        passwordHash,
        firstName,
        lastName,
        phone,
        status: "active",
        assignedCounselorId: admin?.id ?? null,
      },
      select: { id: true, email: true },
    });

    if (admin) {
      await createNotification({
        userId: admin.id,
        type: "student",
        title: "New student arrived",
        body: firstName + " " + lastName + " created a student account and is awaiting admissions support.",
        data: { studentId: user.id },
      });
    }
    return ok({ id: user.id, email: user.email }, { status: 201 });
  } catch (e) {
    return serverError(e);
  }
}