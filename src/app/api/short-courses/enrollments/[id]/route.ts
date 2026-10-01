import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, fail, requireUser, serverError } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { canAccessStudent } from "@/lib/permissions";

const approveSchema = z.object({
  status: z.enum(["enrolled", "rejected"]),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { error, user } = await requireUser();
    if (error) return error;
    if (user.role === "STUDENT") return fail("Forbidden", 403);

    const body = await req.json();
    const parsed = z.object({ status: z.enum(["enrolled", "rejected"]) }).safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input", 422);

    const enrollment = await prisma.shortCourseEnrollment.findUnique({
      where: { id },
      include: { student: true },
    });

    if (!enrollment) return fail("Enrollment not found", 404);
    if (!(await canAccessStudent(user, enrollment.student))) return fail("Forbidden", 403);
    if (enrollment.status !== "pending_approval") return fail("Only receipts awaiting approval can be reviewed", 409);

    const newStatus = parsed.data.status;
    const updated = await prisma.shortCourseEnrollment.update({
      where: { id },
      data: {
        status: newStatus,
        approvedAt: new Date(),
        approvedById: user.id,
      },
      select: { id: true, status: true, shortCourseId: true, studentId: true },
    });

    await logAudit({ actorId: user.id, action: "update", entityType: "ShortCourseEnrollment", entityId: id, after: { status: newStatus } });

    return ok({ id: updated.id, status: updated.status });
  } catch (e) {
    return serverError(e);
  }
}
