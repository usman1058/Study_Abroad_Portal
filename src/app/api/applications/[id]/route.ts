import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, fail, requireUser, toError } from "@/lib/api";
import { canAccessStudent } from "@/lib/permissions";
import { logAudit, createNotification } from "@/lib/audit";
import { APPLICATION_STAGE_ORDER } from "@/lib/constants";
import type { ApplicationStage } from "@/generated/prisma/client";

type Params = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  stage: z.enum(["DRAFT", "SUBMITTED", "UNDER_REVIEW", "OFFER", "DEPOSIT_PAID", "VISA", "ENROLLED", "REJECTED", "WITHDRAWN"]),
  visaStage: z.string().optional().nullable(),
});

// Stages that require all documents to be verified before proceeding.
const DOC_GATED_STAGES: ApplicationStage[] = ["OFFER", "DEPOSIT_PAID", "VISA", "ENROLLED"];

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const { error, user } = await requireUser();
    if (error) return error;
    if (user.role === "STUDENT") return fail("Students cannot change application stages", 403);

    const application = await prisma.application.findUnique({
      where: { id },
      include: { student: true, program: true, documents: true },
    });
    if (!application) return fail("Application not found", 404);

    if (!(await canAccessStudent(user, application.student))) return fail("Forbidden", 403);

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input", 422);

    const { stage, visaStage } = parsed.data;
    const before = application.stage;

    // Document verification gate (§4): cannot progress to offer/deposit/visa/enrolled
    // while any document is pending or rejected.
    if (DOC_GATED_STAGES.includes(stage)) {
      const hasUnverified = application.documents.some((d) => d.status !== "VERIFIED");
      if (hasUnverified) {
        return fail("All documents must be verified before this stage", 422);
      }
    }

    const updated = await prisma.application.update({
      where: { id },
      data: {
        stage,
        visaStage: visaStage ?? null,
        submittedAt: application.submittedAt ?? (APPLICATION_STAGE_ORDER.indexOf(stage) > APPLICATION_STAGE_ORDER.indexOf("DRAFT") ? new Date() : null),
        decisionAt: stage === "ENROLLED" || stage === "REJECTED" || stage === "WITHDRAWN" ? new Date() : null,
      },
      select: { id: true },
    });

    await logAudit({ actorId: user.id, action: "update", entityType: "Application", entityId: id, before: { stage: before }, after: { stage, visaStage } });

    createNotification({
      userId: application.studentId,
      type: "application",
      title: "Application status updated",
      body: `${application.program.name} moved to ${stage.replace(/_/g, " ").toLowerCase()}.`,
      data: { applicationId: id },
    }).catch(() => {});

    return ok({ id: updated.id });
  } catch (e) {
    return fail(toError(e), 500);
  }
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const { error, user } = await requireUser();
    if (error) return error;

    const application = await prisma.application.findUnique({
      where: { id },
      include: { student: true, program: { include: { university: true } }, documents: true },
    });
    if (!application) return fail("Application not found", 404);

    if (user.role === "STUDENT") {
      if (application.studentId !== user.id) return fail("Forbidden", 403);
    } else if (!(await canAccessStudent(user, application.student))) {
      return fail("Forbidden", 403);
    }

    return ok(application);
  } catch (e) {
    return fail(toError(e), 500);
  }
}