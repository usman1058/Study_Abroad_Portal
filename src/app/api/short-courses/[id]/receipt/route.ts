import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, fail, requireUser, serverError } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { canAccessStudent } from "@/lib/permissions";
import { detectMimeFromBase64, isAllowedMimeType } from "@/lib/utils";

const uploadSchema = z.object({
  fileName: z.string().min(1).max(255),
  base64: z.string().min(1),
});

const MAX_BYTES = 5 * 1024 * 1024;
const MIME_EXTENSIONS: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

/**
 * Inline receipt viewer.
 *
 * Receipts are stored as data URLs on the enrolment, so without this endpoint
 * staff could see "receipt under review" but never open the file. Students may
 * read their own receipt; staff are scoped by canAccessStudent.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { error, user } = await requireUser();
    if (error) return error;

    const requested = req.nextUrl.searchParams.get("studentId");
    const studentId = user.role === "STUDENT" ? user.id : requested;
    if (!studentId) return new Response("studentId is required", { status: 400 });

    const enrollment = await prisma.shortCourseEnrollment.findUnique({
      where: { studentId_shortCourseId: { studentId, shortCourseId: id } },
      include: { student: true },
    });
    if (!enrollment?.receiptUrl) return new Response("Receipt not found", { status: 404 });
    if (user.role !== "STUDENT" && !(await canAccessStudent(user, enrollment.student))) {
      return new Response("Forbidden", { status: 403 });
    }

    const match = /^data:([^;,]+);base64,(.*)$/s.exec(enrollment.receiptUrl);
    if (!match) return new Response("Receipt is not readable", { status: 422 });
    const [, mime, payload] = match;
    if (!isAllowedMimeType(mime)) return new Response("Receipt type is not allowed", { status: 415 });

    const bytes = Buffer.from(payload, "base64");
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": mime,
        "Content-Disposition": `inline; filename="receipt-${id}.${MIME_EXTENSIONS[mime] ?? "bin"}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    console.error("[api] receipt read failed:", e);
    return new Response("Failed to read receipt", { status: 500 });
  }
}


function dataUrlByteLength(value: string): number {
  const payload = value.split(",", 2)[1];
  if (!payload) return 0;
  const padding = payload.endsWith("==") ? 2 : payload.endsWith("=") ? 1 : 0;
  return Math.floor((payload.length * 3) / 4) - padding;
}

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

    if (dataUrlByteLength(base64) > MAX_BYTES) return fail("File is too large (max 5 MB)", 413);

    const mime = detectMimeFromBase64(base64);
    if (!mime || !isAllowedMimeType(mime)) {
      return fail("File type not allowed. Allowed: PDF, JPEG, PNG, DOC, DOCX", 415);
    }

    const updated = await prisma.shortCourseEnrollment.update({
      where: { studentId_shortCourseId: { studentId: user.id, shortCourseId: id } },
      data: {
        receiptUrl: base64,
        status: "pending_approval",
      },
      select: { id: true },
    });

    await logAudit({
      actorId: user.id,
      action: "upload_receipt",
      entityType: "ShortCourseEnrollment",
      entityId: updated.id,
      after: { fileName, bytes: dataUrlByteLength(base64), mime },
    });

    return ok({ id: updated.id }, { status: 201 });
  } catch (e) {
    return serverError(e);
  }
}
