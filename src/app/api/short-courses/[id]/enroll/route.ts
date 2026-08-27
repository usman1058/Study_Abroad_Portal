import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, fail, requireUser, serverError } from "@/lib/api";
import { logAudit } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { error, user } = await requireUser();
    if (error) return error;

    const course = await prisma.shortCourse.findUnique({
      where: { id },
      select: { id: true, title: true, fee: true, paymentType: true },
    });

    if (!course) return fail("Course not found", 404);

    const existing = await prisma.shortCourseEnrollment.findUnique({
      where: { studentId_shortCourseId: { studentId: user.id, shortCourseId: id } },
    });

    if (existing) return fail("Already enrolled in this course", 409);

    const status = course.paymentType === "FREE" ? "enrolled" : "pending_payment";

    const enrollment = await prisma.shortCourseEnrollment.create({
      data: {
        studentId: user.id,
        shortCourseId: id,
        status,
      },
      select: { id: true, status: true },
    });

    await logAudit({ actorId: user.id, action: "create", entityType: "ShortCourseEnrollment", entityId: enrollment.id, after: { shortCourseId: id, status: enrollment.status } });

    return ok(enrollment, { status: 201 });
  } catch (e) {
    return serverError(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { error, user } = await requireUser();
    if (error) return error;

    const enrollment = await prisma.shortCourseEnrollment.findUnique({
      where: { studentId_shortCourseId: { studentId: user.id, shortCourseId: id } },
    });

    if (!enrollment) return fail("Enrollment not found", 404);

    await prisma.shortCourseEnrollment.delete({
      where: { studentId_shortCourseId: { studentId: user.id, shortCourseId: id } },
    });

    await logAudit({ actorId: user.id, action: "delete", entityType: "ShortCourseEnrollment", entityId: enrollment.id });
    return ok({ id });
  } catch (e) {
    return serverError(e);
  }
}