import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { fail, ok, requireUser, serverError } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { emptyToNull, httpUrl, requiredName } from "@/lib/validation";

const sessionSchema = z.object({
  title: requiredName(120),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  timeZone: requiredName(80).refine((value) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: value });
      return true;
    } catch {
      return false;
    }
  }, "Enter a valid time zone, such as Asia/Kuala_Lumpur"),
  meetingLink: emptyToNull(httpUrl()),
}).superRefine((session, context) => {
  const start = Date.parse(session.startsAt);
  const end = Date.parse(session.endsAt);
  if (end <= start) context.addIssue({ code: "custom", path: ["endsAt"], message: "End time must be after start time" });
  if (end - start > 12 * 60 * 60 * 1000) context.addIssue({ code: "custom", path: ["endsAt"], message: "A class session cannot be longer than 12 hours" });
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { error, user } = await requireUser();
    if (error) return error;
    if (user.role !== "SUPER_ADMIN") return fail("Only the portal owner can schedule short-course sessions", 403);

    const body = await req.json();
    const parsed = sessionSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid session", 422);
    if (!(await prisma.shortCourse.findUnique({ where: { id }, select: { id: true } }))) return fail("Course not found", 404);

    const session = await prisma.shortCourseSession.create({
      data: {
        shortCourseId: id,
        ...parsed.data,
        startsAt: new Date(parsed.data.startsAt),
        endsAt: new Date(parsed.data.endsAt),
      },
      select: { id: true, title: true, startsAt: true, endsAt: true, timeZone: true },
    });
    await logAudit({ actorId: user.id, action: "create", entityType: "ShortCourseSession", entityId: session.id, after: { shortCourseId: id, title: session.title, startsAt: session.startsAt, endsAt: session.endsAt, timeZone: session.timeZone } });
    return ok(session, { status: 201 });
  } catch (error) {
    return serverError(error);
  }
}
