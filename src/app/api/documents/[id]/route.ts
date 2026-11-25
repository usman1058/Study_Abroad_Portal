import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, fail, requireUser, serverError } from "@/lib/api";
import { canAccessStudentDocuments } from "@/lib/permissions";
import { logAudit, createNotification } from "@/lib/audit";
import { deleteObject, readStoredFile, StorageError } from "@/lib/storage";
import { sendDocumentRejectedEmail } from "@/lib/mail";

type Params = { params: Promise<{ id: string }> };

const verifySchema = z.object({
  status: z.enum(["VERIFIED", "REJECTED"]),
  reason: z.string().optional().nullable(),
});

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const { error, user } = await requireUser();
    if (error) return error;

    const doc = await prisma.document.findUnique({ where: { id }, include: { owner: true } });
    if (!doc) return fail("Document not found", 404);
    if (user.role === "STUDENT") {
      if (doc.ownerId !== user.id) return fail("Forbidden", 403);
    } else if (!(await canAccessStudentDocuments(user, doc.owner))) {
      return fail("Forbidden", 403);
    }

    const file = await readStoredFile(doc.fileUrl);
    const extension = file.contentType === "application/pdf" ? "pdf" : file.contentType.split("/")[1]?.replace("jpeg", "jpg") ?? "bin";
    return new Response(new Uint8Array(file.bytes), {
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": `inline; filename="${doc.type.toLowerCase()}-document.${extension}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    if (e instanceof StorageError) return new Response(e.message, { status: e.status });
    return serverError(e);
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const { error, user } = await requireUser();
    if (error) return error;
    if (user.role === "STUDENT") return fail("Only agency staff can verify documents", 403);

    const doc = await prisma.document.findUnique({ where: { id }, include: { owner: true, application: { include: { program: { select: { name: true } } } } } });
    if (!doc) return fail("Document not found", 404);

    if (!(await canAccessStudentDocuments(user, doc.owner))) return fail("Forbidden", 403);

    const body = await req.json();
    const parsed = verifySchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input", 422);

    const { status, reason } = parsed.data;
    const updated = await prisma.document.update({
      where: { id },
      data: {
        status,
        rejectionReason: reason ?? null,
        verifiedById: status === "VERIFIED" ? user.id : null,
      },
      select: { id: true },
    });

    await logAudit({ actorId: user.id, action: "update", entityType: "Document", entityId: id, after: { status, reason } });

    createNotification({
      userId: doc.ownerId,
      type: "document",
      title: status === "VERIFIED" ? "Document verified" : "Document rejected",
      body: `${doc.type} was ${status.toLowerCase()}${reason ? ` — ${reason}` : ""}.`,
      data: { documentId: id },
    }).catch(() => {});

    if (status === "REJECTED" && reason?.trim()) {
      await sendDocumentRejectedEmail(doc.owner.email, {
        studentName: `${doc.owner.firstName} ${doc.owner.lastName}`.trim(),
        documentType: doc.type.replace(/_/g, " ").toLowerCase(),
        reason: reason.trim(),
        documentId: doc.id,
        programName: doc.application?.program.name,
      });
    }

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

    const doc = await prisma.document.findUnique({ where: { id } });
    if (!doc) return fail("Document not found", 404);

    if (user.role === "STUDENT") {
      if (doc.ownerId !== user.id) return fail("Forbidden", 403);
    } else {
      const owner = await prisma.user.findUnique({ where: { id: doc.ownerId } });
      if (!owner || !(await canAccessStudentDocuments(user, owner))) return fail("Forbidden", 403);
    }

    await prisma.document.delete({ where: { id } });
    await deleteObject(doc.fileUrl);
    await logAudit({ actorId: user.id, action: "delete", entityType: "Document", entityId: id });
    return ok({ id });
  } catch (e) {
    return serverError(e);
  }
}
