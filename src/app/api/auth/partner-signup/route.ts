import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, fail, serverError } from "@/lib/api";
import { signupRateLimit } from "@/lib/rate-limit";
import { notifyMany } from "@/lib/audit";

const partnerSignupSchema = z.object({
  companyName: z.string().min(1, "Company name is required").max(160),
  firstName: z.string().min(1, "First name is required").max(80),
  lastName: z.string().min(1, "Last name is required").max(80),
  email: z.string().email("Valid email required"),
  phone: z.string().min(6, "Valid phone required").max(30),
  country: z.string().min(1, "Country is required").max(80),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(req: NextRequest) {
  const rl = await signupRateLimit(req);
  if (rl) return rl;

  try {
    const body = await req.json();
    const parsed = partnerSignupSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Invalid input", 422);
    }

    const { companyName, firstName, lastName, email, phone, country, password } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return fail("An account with this email already exists", 409);
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        role: "AGENCY",
        email: normalizedEmail,
        passwordHash,
        firstName,
        lastName,
        phone,
        country,
        companyName,
        status: "pending",
      },
      select: { id: true, email: true },
    });

    const admins = await prisma.user.findMany({
      where: { role: { in: ["SUPER_ADMIN", "MANAGER"] } },
      select: { id: true },
    });
    if (admins.length > 0) {
      await notifyMany(
        admins.map((a) => ({ userId: a.id })),
        {
          type: "partner_request",
          title: "New partner signup request",
          body: `${companyName} (${normalizedEmail}) is awaiting approval.`,
          data: { userId: user.id, companyName },
        }
      );
    }

    return ok({ id: user.id, email: user.email, status: "pending" }, { status: 201 });
  } catch (e) {
    return serverError(e);
  }
}