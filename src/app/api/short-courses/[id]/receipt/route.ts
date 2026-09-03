import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, fail, requireUser, serverError } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { detectMimeFromBase64, isAllowedMimeType } from "@/lib/utils";

const uploadSchema = z.object({
  fileName: z.string().min(1).max(255),
  base64: z.string().min(1),
});

const MAX_BYTES = 10 * 1024 * 1024; // 10MB

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { error, user } = await requireUser();
    if (error) return error;

    const enrollment = await prisma.shortCourseEnrollment.findUnique({
      where: { studentId_shortCourseId: { studentId: user.id, shortCourseId: id } },
    });

    if (!enrollment) return fail("Not enrolled in this course", 403);
    if (enrollment.status !== "pending_payment" && enrollment.status !== "rejected") {
      return fail("Cannot upload receipt for this enrollment status", 400);
    }

    const body = await req.json();
    const parsed = uploadSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input", 422);

    const { fileName, base64 } = parsed.data;

    if (base64.length > MAX_BYTES) return fail("File is too large (max 10MB)", 413);

    const mime = detectMimeFromBase64(base64);
    if (!mime || !isAllowedMimeType(mime)) {
      return fail("File type not allowed. Allowed: PDF, JPEG, PNG, DOC, DOCX", 415);
    }

    const updated = await prisma.shortCourseEnrollment.update({
      where: { studentId_shortCourseId: { studentId: user.id, shortCourseId: id } },
      data: {
        fileUrl: base64,
        status: "pending_approval",
      },
      select: { id: true },
    });

    await logAudit({ actorId: user.id, action: "upload_receipt", entityType: "ShortCourseEnrollment", entityId: id, after: { receiptUrl: base64 } });

    return ok({ id: updated.id }, { status: 201 });
  } catch (e) {
    return serverError(e);
  }
}