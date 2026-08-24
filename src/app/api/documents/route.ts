import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, fail, requireUser, serverError } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { detectMimeFromBase64, isAllowedMimeType } from "@/lib/utils";
import { parsePaginationParams, buildPaginatedQuery, paginateResults } from "@/lib/pagination";
import { DocumentType } from "@/generated/prisma/client";

const uploadSchema = z.object({
  type: z.nativeEnum(DocumentType),
  base64: z.string().min(1),
  applicationId: z.string().optional().nullable(),
  expiresAt: z.string().optional().nullable(),
});

const MAX_BYTES = 4 * 1024 * 1024; // ~4MB

export async function POST(req: NextRequest) {
  try {
    const contentLength = Number(req.headers.get("content-length") ?? 0);
    if (contentLength > 5_500_000) return fail("File is too large (max 3 MB)", 413);

    const { error, user } = await requireUser();
    if (error) return error;
    if (user.role !== "STUDENT") return fail("Only students can upload documents", 403);

    const body = await req.json();
    const parsed = uploadSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input", 422);

    const { type, base64, applicationId, expiresAt } = parsed.data;

    if (base64.length > MAX_BYTES) return fail("File is too large (max 4MB)", 413);

    const mime = detectMimeFromBase64(base64);
    if (!mime || !isAllowedMimeType(mime)) {
      return fail("File type not allowed. Allowed: PDF, JPEG, PNG, DOC, DOCX", 415);
    }

    // applicationId must belong to this student
    if (applicationId) {
      const app = await prisma.application.findUnique({ where: { id: applicationId } });
      if (!app || app.studentId !== user.id) return fail("Invalid application", 403);
    }

    // v1 stores files as data URLs in the DB — no external storage needed.
    // Swap this for object storage later without a migration.
    const fileUrl = base64;

    const doc = await prisma.document.create({
      data: {
        ownerId: user.id,
        applicationId: applicationId ?? null,
        type,
        fileUrl,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
      select: { id: true, type: true },
    });

    await logAudit({ actorId: user.id, action: "create", entityType: "Document", entityId: doc.id, after: { type: doc.type } });

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
        : user.role === "COUNSELOR"
          ? { owner: { assignedCounselorId: user.id } }
          : {};

    const baseQuery = {
      where,
      orderBy: { uploadedAt: "desc" as const },
      include: { owner: { select: { firstName: true, lastName: true } } },
    };

    const query = buildPaginatedQuery(baseQuery, { cursor, limit });
    const documents = await prisma.document.findMany(query);

    const { data, nextCursor, hasMore } = paginateResults(documents, limit);

    return ok({ data, nextCursor, hasMore });
  } catch (e) {
    return serverError(e);
  }
}