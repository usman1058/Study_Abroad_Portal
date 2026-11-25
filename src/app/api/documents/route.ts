import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, fail, requireUser, serverError } from "@/lib/api";
import { logAudit, createNotification } from "@/lib/audit";
import { getStudentSupportRecipients } from "@/lib/student-notifications";
import { sendStaffDocumentUploadedEmail } from "@/lib/mail";
import { detectMimeFromBase64, isAllowedMimeType } from "@/lib/utils";
import { buildMediaKey, parseDataUrl, putObject, StorageError, deleteObject } from "@/lib/storage";
import { getMaxUploadSizeBytes } from "@/lib/upload-limit-server";
import { formatUploadSizeMB } from "@/lib/upload-limits";
import { parsePaginationParams, buildPaginatedQuery, paginateResults } from "@/lib/pagination";
import { DocumentType } from "@/generated/prisma/client";
import { directDocumentStudentScopeWhere } from "@/lib/permissions";

const uploadSchema = z.object({
  type: z.nativeEnum(DocumentType),
  base64: z.string().min(1),
  applicationId: z.string().optional().nullable(),
  expiresAt: z.string().optional().nullable(),
  replaceDocumentId: z.string().max(64).optional(),
});

function dataUrlByteLength(value: string): number {
  const payload = value.split(",", 2)[1];
  if (!payload) return 0;
  const padding = payload.endsWith("==") ? 2 : payload.endsWith("=") ? 1 : 0;
  return Math.floor((payload.length * 3) / 4) - padding;
}

export async function POST(req: NextRequest) {
  try {
    const maxBytes = await getMaxUploadSizeBytes();
    const contentLength = Number(req.headers.get("content-length") ?? 0);
    if (contentLength > Math.ceil(maxBytes * 4 / 3) + 16_384) return fail(`File is too large (maximum ${formatUploadSizeMB(maxBytes / (1024 * 1024))})`, 413);

    const { error, user } = await requireUser();
    if (error) return error;
    if (user.role !== "STUDENT") return fail("Only students can upload documents", 403);

    const body = await req.json();
    const parsed = uploadSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input", 422);

    const { type, base64, applicationId, expiresAt, replaceDocumentId } = parsed.data;

    if (dataUrlByteLength(base64) > maxBytes) return fail(`File is too large (maximum ${formatUploadSizeMB(maxBytes / (1024 * 1024))})`, 413);

    const mime = detectMimeFromBase64(base64);
    if (!mime || !isAllowedMimeType(mime)) {
      return fail("File type not allowed. Allowed: PDF, JPEG, PNG, WebP, DOC, DOCX", 415);
    }

    // applicationId must belong to this student
    let applicationProgramName: string | undefined;
    if (applicationId) {
      const app = await prisma.application.findUnique({ where: { id: applicationId }, include: { program: { select: { name: true } } } });
      if (!app || app.studentId !== user.id) return fail("Invalid application", 403);
      applicationProgramName = app.program.name;
    }

    const rejectedDocument = replaceDocumentId
      ? await prisma.document.findUnique({ where: { id: replaceDocumentId }, select: { id: true, ownerId: true, type: true, status: true, applicationId: true, fileUrl: true, expiresAt: true } })
      : null;
    if (replaceDocumentId && (!rejectedDocument || rejectedDocument.ownerId !== user.id || rejectedDocument.status !== "REJECTED")) {
      return fail("Only your rejected documents can be replaced", 404);
    }
    if (rejectedDocument && (rejectedDocument.type !== type || rejectedDocument.applicationId !== (applicationId ?? null))) {
      return fail("A replacement must keep the original document type and application", 422);
    }

    const bytes = parseDataUrl(base64);
    if (!bytes) return fail("Invalid file data", 422);

    let fileUrl: string;
    try {
      fileUrl = await putObject(buildMediaKey("documents", user.id, mime), bytes.bytes, mime);
    } catch (error) {
      if (error instanceof StorageError) return fail(error.message, error.status);
      throw error;
    }

    const doc = rejectedDocument
      ? await prisma.document.update({
          where: { id: rejectedDocument.id },
          data: { fileUrl, status: "PENDING", rejectionReason: null, verifiedById: null, uploadedAt: new Date(), expiresAt: expiresAt ? new Date(expiresAt) : rejectedDocument.expiresAt },
          select: { id: true, type: true },
        })
      : await prisma.document.create({
          data: {
            ownerId: user.id,
            applicationId: applicationId ?? null,
            type,
            fileUrl,
            expiresAt: expiresAt ? new Date(expiresAt) : null,
          },
          select: { id: true, type: true },
        });
    if (rejectedDocument) await deleteObject(rejectedDocument.fileUrl).catch(() => {});

    await logAudit({ actorId: user.id, action: rejectedDocument ? "update" : "create", entityType: "Document", entityId: doc.id, after: { type: doc.type, status: "PENDING", replaced: Boolean(rejectedDocument) } });

    const support = await getStudentSupportRecipients(user.id);
    if (support) {
      await Promise.all(support.recipients.map(async (recipient) => {
        await createNotification({
          userId: recipient.id,
          type: "document",
          title: "Student uploaded a document",
          body: `${support.studentName} uploaded ${doc.type} for verification.`,
          data: { documentId: doc.id, studentId: user.id, ...(applicationId ? { applicationId } : {}) },
        });
        return sendStaffDocumentUploadedEmail(recipient.email, {
          studentName: support.studentName,
          documentType: doc.type.replace(/_/g, " ").toLowerCase(),
          documentId: doc.id,
          programName: applicationProgramName,
        });
      }));
    }

    return ok({ id: doc.id }, { status: 201 });
  } catch (e) {
    return serverError(e);
  }
}

export async function GET(req: NextRequest) {
  try {
    const { error, user } = await requireUser();
    if (error) return error;

    const { cursor, limit } = parsePaginationParams(req, 50, 100);

    const where =
      user.role === "STUDENT"
        ? { ownerId: user.id }
        : { owner: directDocumentStudentScopeWhere(user) };

    const baseQuery = {
      where,
      orderBy: { uploadedAt: "desc" as const },
      select: {
        id: true,
        type: true,
        status: true,
        rejectionReason: true,
        expiresAt: true,
        uploadedAt: true,
        applicationId: true,
        owner: { select: { firstName: true, lastName: true } },
      },
    };

    const query = buildPaginatedQuery(baseQuery, { cursor, limit });
    const documents = await prisma.document.findMany(query);

    const { data, nextCursor, hasMore } = paginateResults(documents, limit);

    return ok({ data, nextCursor, hasMore });
  } catch (e) {
    return serverError(e);
  }
}
