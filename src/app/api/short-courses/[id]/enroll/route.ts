import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, fail, requireUser, toError } from "@/lib/api";
import { logAudit } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const { error, user } = await requireUser();
    if (error) return error;
    if (user.role !== "STUDENT") return fail("Only students can enroll", 403);

    const course = await prisma.shortCourse.findUnique({ where: { id } });
    if (!course) return fail("Course not found", 404);

    const existing = await prisma.shortCourseEnrollment.findUnique({
      where: { studentId_shortCourseId: { studentId: user.id, shortCourseId: id } },
    });

    let enrollment;
    if (existing) {
      enrollment = await prisma.shortCourseEnrollment.update({
        where: { studentId_shortCourseId: { studentId: user.id, shortCourseId: id } },
        data: { status: "enrolled" },
      });
    } else {
      enrollment = await prisma.shortCourseEnrollment.create({
        data: { studentId: user.id, shortCourseId: id, status: "enrolled" },
      });
    }

    await logAudit({ actorId: user.id, action: "create", entityType: "ShortCourseEnrollment", entityId: enrollment.id });
    return ok({ id: enrollment.id });
  } catch (e) {
    return fail(toError(e), 500);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const { error, user } = await requireUser();
    if (error) return error;
    if (user.role !== "STUDENT") return fail("Forbidden", 403);

    await prisma.shortCourseEnrollment.delete({
      where: { studentId_shortCourseId: { studentId: user.id, shortCourseId: id } },
    }).catch(() => {});
    return ok({ id });
  } catch (e) {
    return fail(toError(e), 500);
  }
}