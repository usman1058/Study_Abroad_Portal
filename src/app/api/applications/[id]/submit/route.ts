import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, fail, requireUser, serverError } from "@/lib/api";
import { logAudit, createNotification } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

// Students may submit their own DRAFT applications; staff use PUT /api/applications/[id].
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const { error, user } = await requireUser();
    if (error) return error;
    if (user.role !== "STUDENT") return fail("Only students can submit their own application here", 403);

    const application = await prisma.application.findUnique({ where: { id } });
    if (!application || application.studentId !== user.id) return fail("Application not found", 404);
    if (application.stage !== "DRAFT") return fail("Only draft applications can be submitted", 422);

    const student = await prisma.user.findUnique({
      where: { id: user.id },
      select: { assignedCounselorId: true, createdById: true },
    });

    const updated = await prisma.application.update({
      where: { id },
      data: { stage: "SUBMITTED", submittedAt: new Date() },
      select: { id: true },
    });

    await logAudit({
      actorId: user.id,
      action: "update",
      entityType: "Application",
      entityId: id,
      before: { stage: "DRAFT" },
      after: { stage: "SUBMITTED" },
    });

    if (application.programId) {
      const program = await prisma.program.findUnique({
        where: { id: application.programId },
        select: { name: true, university: { select: { name: true } } },
      });
      const staffIds = new Set<string>();
      for (const sid of [student?.assignedCounselorId, student?.createdById]) {
        if (sid) staffIds.add(sid);
      }
      for (const staffId of staffIds) {
        createNotification({
          userId: staffId,
          type: "application",
          title: "Student submitted an application",
          body: `${program ? `${program.university.name} — ${program.name}` : "A program"} is awaiting review.`,
          data: { applicationId: id },
        }).catch(() => {});
      }
    }

    return ok({ id: updated.id, stage: "SUBMITTED" });
  } catch (e) {
    return serverError(e);
  }
}
