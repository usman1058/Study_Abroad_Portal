import { NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, fail, requireUser, serverError } from "@/lib/api";
import { canManageExistingUser, creatableRoles } from "@/lib/permissions";
import { logAudit, createNotification } from "@/lib/audit";
import { sendCredentialsEmail, sendOnboardingEmail } from "@/lib/mail";

type Params = { params: Promise<{ id: string }> };

const statusSchema = z.object({
  status: z.enum(["active", "inactive"]).optional(),
  role: z.enum(["SUPER_ADMIN", "MANAGER", "COUNSELOR", "AGENCY", "STUDENT"]).optional(),
});

/** Readable but unguessable temporary password for a freshly approved account. */
function temporaryPassword(): string {
  return randomBytes(12).toString("base64url");
}

function accountRoleLabel(role: string): string {
  if (role === "STUDENT") return "student";
  if (role === "AGENCY") return "partner agency";
  return "team";
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const { error, user } = await requireUser();
    if (error) return error;

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return fail("User not found", 404);
    // Agencies manage their own staff and students; the ownership check below
    // keeps that limited to accounts they created.
    if (!["SUPER_ADMIN", "MANAGER", "AGENCY"].includes(user.role)) return fail("Forbidden", 403);
    if (!(await canManageExistingUser(user, target))) return fail("Forbidden", 403);

    const body = await req.json();
    const parsed = statusSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Invalid status", 422);
    }

    if (!parsed.data.status && !parsed.data.role) return fail("No changes supplied", 422);
    // A manager may edit users, but may never grant a role they could not create
    // (this is what let a MANAGER promote a STUDENT to MANAGER).
    if (parsed.data.role && !creatableRoles(user.role).includes(parsed.data.role)) {
      return fail("You cannot assign that role", 403);
    }
    if (parsed.data.role === "SUPER_ADMIN" && user.role !== "SUPER_ADMIN") return fail("Only a super admin can promote users", 403);
    if (target.role === "SUPER_ADMIN" && parsed.data.role && parsed.data.role !== "SUPER_ADMIN") return fail("Cannot demote a super admin", 403);

    const activating = target.status !== "active" && parsed.data.status === "active";
    if (activating && target.role === "AGENCY") {
      const partnerDocuments = await prisma.partnerDocument.findMany({
        where: { agencyId: target.id },
        select: { type: true, status: true },
      });
      if (!partnerDocuments.some((document) => document.type === "BUSINESS_REGISTRATION")) {
        return fail("The partner must upload a business registration document before approval", 422);
      }
      if (partnerDocuments.some((document) => document.status !== "VERIFIED")) {
        return fail("Verify all submitted partner documents before approving portal access", 422);
      }
    }

    // Approving a pending account issues a fresh temporary password so the
    // separate credentials email always has something valid to send.
    const issuedPassword = activating ? temporaryPassword() : null;
    const passwordHash = issuedPassword ? await bcrypt.hash(issuedPassword, 12) : undefined;

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(parsed.data.status ? { status: parsed.data.status } : {}),
        ...(parsed.data.role ? { role: parsed.data.role } : {}),
        ...(passwordHash ? { passwordHash } : {}),
      },
      select: { id: true, email: true, status: true, role: true },
    });

    await logAudit({
      actorId: user.id,
      action: "update",
      entityType: "User",
      entityId: id,
      before: { status: target.status, role: target.role },
      after: { status: updated.status, role: updated.role },
    });

    if (activating) {
      const name = `${target.firstName} ${target.lastName}`.trim();
      const roleLabel = accountRoleLabel(updated.role);
      await createNotification({
        userId: target.id,
        type: "account_approved",
        title: "Account approved",
        body: `Your ${roleLabel} account has been approved. You can now sign in.`,
      });
      if (issuedPassword) {
        // Two separate messages: the welcome/onboarding note, then credentials.
        await Promise.all([
          sendOnboardingEmail(target.email, { name, roleLabel }),
          sendCredentialsEmail(target.email, { name, email: target.email, password: issuedPassword, student: updated.role === "STUDENT" }),
        ]);
      }
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
    if (!(await canManageExistingUser(user, target))) return fail("Forbidden", 403);

    await prisma.user.delete({ where: { id } });
    await logAudit({ actorId: user.id, action: "delete", entityType: "User", entityId: id, before: { email: target.email, role: target.role } });
    return ok({ id });
  } catch (e) {
    return serverError(e);
  }
}
