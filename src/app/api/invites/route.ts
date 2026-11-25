import { NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import type { Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { ok, fail, requireUser, serverError } from "@/lib/api";
import { canAccessStudent, creatableRoles } from "@/lib/permissions";
import { createNotification, logAudit } from "@/lib/audit";
import { emailField, futureExpiry, requiredName } from "@/lib/validation";
import { roleOptionLabel } from "@/lib/constants";
import { sendAccountInvitationEmail, sendStaffNewStudentEmail } from "@/lib/mail";
import { getStudentSupportRecipients } from "@/lib/student-notifications";

const accountInviteSchema = z.object({
  email: emailField(),
  role: z.enum(["MANAGER", "COUNSELOR", "STUDENT"]),
  firstName: requiredName(80),
  lastName: requiredName(80),
  expiresAt: futureExpiry(90),
});

// Retain support for already-issued scoped, view-only links while the new form
// creates role-based accounts instead of asking staff to pick an existing student.
const legacyGuestInviteSchema = z.object({
  studentId: z.string().min(1).max(64),
  sections: z.array(z.enum(["applications", "documents", "shortlist", "payments", "profile"])).default(["applications", "documents"]),
  access: z.record(z.string().max(40), z.literal("view")).optional(),
  expiresAt: futureExpiry(90),
});

function allowedInviteRoles(role: Role): Role[] {
  return creatableRoles(role).filter((candidate) => candidate === "MANAGER" || candidate === "COUNSELOR" || candidate === "STUDENT");
}

function baseUrl(): string {
  return (process.env.NEXT_PUBLIC_BASE_URL ?? process.env.AUTH_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

export async function POST(req: NextRequest) {
  try {
    const { error, user } = await requireUser();
    if (error) return error;
    if (user.role === "STUDENT") return fail("Only staff can invite accounts", 403);

    const body: unknown = await req.json();
    if (body && typeof body === "object" && "email" in body) {
      const parsed = accountInviteSchema.safeParse(body);
      if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid invitation", 422);
      const data = parsed.data;
      if (!allowedInviteRoles(user.role).includes(data.role)) return fail("You cannot invite someone with that role", 403);

      const email = data.email.toLowerCase().trim();
      if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) {
        return fail("An account with this email already exists. Use account creation for a new account or choose a different email.", 409);
      }

      const temporaryPassword = randomBytes(12).toString("base64url");
      const passwordHash = await bcrypt.hash(temporaryPassword, 12);
      const token = randomBytes(24).toString("hex");
      const expiresAt = new Date(data.expiresAt);
      const assignedCounselorId = data.role === "STUDENT"
        ? user.role === "COUNSELOR"
          ? user.id
          : (await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" }, select: { id: true }, orderBy: { createdAt: "asc" } }))?.id ?? null
        : null;

      const created = await prisma.$transaction(async (tx) => {
        const account = await tx.user.create({
          data: {
            role: data.role,
            email,
            passwordHash,
            mustChangePassword: true,
            firstName: data.firstName,
            lastName: data.lastName,
            status: "active",
            createdById: user.id,
            assignedCounselorId,
          },
          select: { id: true, role: true, email: true },
        });
        const invite = await tx.inviteLink.create({
          data: {
            token,
            createdById: user.id,
            permissionSet: { kind: "account_invitation", email, role: data.role },
            expiresAt,
          },
          select: { id: true, token: true, expiresAt: true },
        });
        return { account, invite };
      });

      if (data.role === "STUDENT") {
        const support = await getStudentSupportRecipients(created.account.id);
        if (support) {
          await Promise.all(support.recipients.map(async (recipient) => {
            await createNotification({
              userId: recipient.id,
              type: "student",
              title: "New student account invited",
              body: `${support.studentName} was invited by ${user.name}.`,
              data: { studentId: created.account.id },
            });
            return sendStaffNewStudentEmail(recipient.email, {
              studentName: support.studentName,
              studentEmail: created.account.email,
              studentId: created.account.id,
            });
          }));
        }
      }
      await logAudit({ actorId: user.id, action: "create", entityType: "User", entityId: created.account.id, after: { role: data.role, email } });
      await logAudit({ actorId: user.id, action: "create", entityType: "InviteLink", entityId: created.invite.id, after: { email, role: data.role } });

      const inviteUrl = `${baseUrl()}/invite/${created.invite.token}`;
      const emailStatus = await sendAccountInvitationEmail(email, {
        name: `${data.firstName} ${data.lastName}`.trim(),
        email,
        password: temporaryPassword,
        roleLabel: roleOptionLabel(data.role).toLowerCase(),
        inviteUrl,
        student: data.role === "STUDENT",
      });

      return ok({
        id: created.invite.id,
        userId: created.account.id,
        url: `/invite/${created.invite.token}`,
        expiresAt,
        emailStatus,
        ...(emailStatus === "logged" ? { fallbackPassword: temporaryPassword } : {}),
      }, { status: 201 });
    }

    const parsed = legacyGuestInviteSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid invitation", 422);
    const data = parsed.data;
    const student = await prisma.user.findUnique({ where: { id: data.studentId } });
    if (!student || student.role !== "STUDENT") return fail("Invalid student", 404);
    if (!(await canAccessStudent(user, student))) return fail("You do not have access to this student", 403);

    const token = randomBytes(24).toString("hex");
    const link = await prisma.inviteLink.create({
      data: {
        token,
        studentId: data.studentId,
        createdById: user.id,
        permissionSet: { sections: data.sections, access: data.access ?? {} } as object,
        expiresAt: new Date(data.expiresAt),
      },
      select: { id: true, token: true, expiresAt: true },
    });
    await logAudit({ actorId: user.id, action: "create", entityType: "InviteLink", entityId: link.id, after: { studentId: data.studentId, sections: data.sections } });
    return ok({ id: link.id, url: `/invite/${link.token}` }, { status: 201 });
  } catch (e) {
    return serverError(e);
  }
}
