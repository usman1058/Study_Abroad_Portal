import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, fail, requireUser, serverError } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { ShortCourseCategory } from "@/generated/prisma/client";
import { requiredName, optionalText, money, dateStringArray, httpUrl, emptyToNull } from "@/lib/validation";
import { z as zod } from "zod";

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
});

export async function POST(req: NextRequest) {
  try {
    const { error, user } = await requireUser();
    if (error) return error;
    if (user.role !== "SUPER_ADMIN") return fail("Only the portal owner can manage short courses", 403);

    const body = await req.json();
    const parsed = courseSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input", 422);

    const data = parsed.data;
    if (data.linkedProgramId) {
      const linked = await prisma.program.findUnique({ where: { id: data.linkedProgramId }, select: { id: true } });
      if (!linked) return fail("Linked program not found", 422);
    }
    const course = await prisma.shortCourse.create({
      data: {
        title: data.title,
        provider: data.provider,
        category: data.category,
        duration: data.duration,
        startDates: data.startDates.map((d) => new Date(d)),
        fee: data.fee,
        deliveryMode: data.deliveryMode,
        classSchedule: data.classSchedule ?? null,
        meetingLink: data.meetingLink ?? null,
        prerequisites: data.prerequisites ?? null,
        description: data.description ?? null,
        linkedProgramId: data.linkedProgramId ?? null,
      },
      select: { id: true, title: true },
    });

    await logAudit({ actorId: user.id, action: "create", entityType: "ShortCourse", entityId: course.id, after: { title: course.title } });
    return ok({ id: course.id }, { status: 201 });
  } catch (e) {
    return serverError(e);
  }
}