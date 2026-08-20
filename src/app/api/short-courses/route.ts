import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, fail, requireUser, toError } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { ShortCourseCategory } from "@/generated/prisma/client";

const courseSchema = z.object({
  title: z.string().min(1),
  provider: z.string().min(1),
  category: z.nativeEnum(ShortCourseCategory),
  duration: z.string().min(1),
  startDates: z.array(z.string()).default([]),
  fee: z.number(),
  deliveryMode: z.string().min(1),
  classSchedule: z.string().optional().nullable(),
  meetingLink: z.string().optional().nullable(),
  prerequisites: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  linkedProgramId: z.string().optional().nullable(),
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
    return fail(toError(e), 500);
  }
}