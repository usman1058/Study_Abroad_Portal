import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, fail, requireUser, serverError } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { requiredName, optionalText, money, dateStringArray, httpUrl, emptyToNull } from "@/lib/validation";
import { z as zod } from "zod";
import { ShortCourseCategory } from "@/generated/prisma/client";

const courseSchema = zod.object({
  title: requiredName(200),
  provider: requiredName(120),
  category: zod.nativeEnum(ShortCourseCategory),
  duration: requiredName(80),
  startDates: dateStringArray(24).default([]),
  fee: money(10_000_000, "Fee"),
  deliveryMode: requiredName(40),
  classSchedule: optionalText(160),
  meetingLink: httpUrl(),
  prerequisites: optionalText(300),
  description: optionalText(2000),
  linkedProgramId: emptyToNull(zod.string().trim().min(1).max(64)).optional().nullable(),
  paymentType: zod.enum(["FREE", "PAID", "OTHER"]).default("FREE"),
  bankDetails: optionalText(2000),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const course = await prisma.shortCourse.findUnique({
      where: { id },
      include: {
        linkedProgram: { include: { university: true } },
        enrollments: { include: { student: true } },
      },
    });
    if (!course) return fail("Course not found", 404);
    return ok(course);
  } catch (e) {
    return serverError(e);
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const { error, user } = await requireUser();
    if (error) return error;
    if (user.role !== "SUPER_ADMIN") return fail("Only the portal owner can manage short courses", 403);

    const body = await req.json();
    const parsed = courseSchema.partial().safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input", 422);

    const data = parsed.data;
    if (data.linkedProgramId) {
      const linked = await prisma.program.findUnique({ where: { id: data.linkedProgramId }, select: { id: true } });
      if (!linked) return fail("Linked program not found", 422);
    }

    const course = await prisma.shortCourse.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.provider !== undefined ? { provider: data.provider } : {}),
        ...(data.category !== undefined ? { category: data.category } : {}),
        ...(data.duration !== undefined ? { duration: data.duration } : {}),
        ...(data.startDates !== undefined ? { startDates: data.startDates.map((d) => new Date(d)) } : {}),
        ...(data.fee !== undefined ? { fee: data.fee } : {}),
        ...(data.deliveryMode !== undefined ? { deliveryMode: data.deliveryMode } : {}),
        ...(data.classSchedule !== undefined ? { classSchedule: data.classSchedule } : {}),
        ...(data.meetingLink !== undefined ? { meetingLink: data.meetingLink } : {}),
        ...(data.prerequisites !== undefined ? { prerequisites: data.prerequisites } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.linkedProgramId !== undefined ? { linkedProgramId: data.linkedProgramId } : {}),
        ...(data.paymentType !== undefined ? { paymentType: data.paymentType } : {}),
        ...(data.bankDetails !== undefined ? { bankDetails: data.bankDetails } : {}),
      },
      select: { id: true, title: true },
    });

    await logAudit({ actorId: user.id, action: "update", entityType: "ShortCourse", entityId: id, after: parsed.data });
    return ok(course);
  } catch (e) {
    return serverError(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const { error, user } = await requireUser();
    if (error) return error;
    if (user.role !== "SUPER_ADMIN") return fail("Only the portal owner can manage short courses", 403);

    await prisma.shortCourse.delete({ where: { id } });
    await logAudit({ actorId: user.id, action: "delete", entityType: "ShortCourse", entityId: id });
    return ok({ id });
  } catch (e) {
    return serverError(e);
  }
}