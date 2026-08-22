import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, fail, requireUser, serverError } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { ShortCourseCategory } from "@/generated/prisma/client";

type Params = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  provider: z.string().min(1).optional(),
  category: z.nativeEnum(ShortCourseCategory).optional(),
  duration: z.string().optional(),
  startDates: z.array(z.string()).optional(),
  fee: z.number().optional(),
  deliveryMode: z.string().optional(),
  classSchedule: z.string().optional().nullable(),
  meetingLink: z.string().optional().nullable(),
  prerequisites: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  linkedProgramId: z.string().optional().nullable(),
});

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const { error, user } = await requireUser();
    if (error) return error;
    if (user.role !== "SUPER_ADMIN") return fail("Only the portal owner can manage short courses", 403);

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input", 422);

    const data = parsed.data;
    const updated = await prisma.shortCourse.update({
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
      },
      select: { id: true },
    });
    await logAudit({ actorId: user.id, action: "update", entityType: "ShortCourse", entityId: id });
    return ok({ id: updated.id });
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