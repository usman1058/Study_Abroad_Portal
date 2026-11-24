import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { fail, ok, requireUser, serverError } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { detectMimeFromBase64 } from "@/lib/utils";
import { buildMediaKey, deleteObject, parseDataUrl, putObject, StorageError } from "@/lib/storage";
import { optionalText, requiredName } from "@/lib/validation";
import { getMaxUploadSizeBytes } from "@/lib/upload-limit-server";
import { formatUploadSizeMB } from "@/lib/upload-limits";

const materialSchema = z.object({
  title: requiredName(160),
  description: optionalText(1000),
  fileName: requiredName(255),
  base64: z.string().min(1).max(4_300_000),
  published: z.boolean().default(true),
});
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
    if (user.role !== "SUPER_ADMIN") return fail("Only the portal owner can publish course materials", 403);

    const parsed = materialSchema.safeParse(await req.json());
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid material", 422);
    const course = await prisma.shortCourse.findUnique({ where: { id }, select: { id: true } });
    if (!course) return fail("Course not found", 404);

    const { base64, fileName, ...metadata } = parsed.data;
    const maxBytes = await getMaxUploadSizeBytes();
    if (dataUrlByteLength(base64) > maxBytes) return fail(`File is too large (maximum ${formatUploadSizeMB(maxBytes / (1024 * 1024))})`, 413);
    const mime = detectMimeFromBase64(base64);
    const file = parseDataUrl(base64);
    if (!file || !mime || file.contentType !== mime) {
      return fail("File type not allowed. Use PDF, JPEG, PNG, DOC, or DOCX.", 415);
    }

    let objectRef: string;
    try {
      objectRef = await putObject(buildMediaKey("course-materials", user.id, mime), file.bytes, mime);
    } catch (storageError) {
      if (storageError instanceof StorageError) return fail(storageError.message, storageError.status);
      throw storageError;
    }

    try {
      const material = await prisma.shortCourseMaterial.create({
        data: {
          shortCourseId: id,
          uploadedById: user.id,
          ...metadata,
          description: metadata.description ?? null,
          fileName,
          contentType: mime,
          fileSize: file.bytes.byteLength,
          objectRef,
        },
        select: { id: true, title: true, description: true, fileName: true, contentType: true, fileSize: true, published: true, createdAt: true },
      });
      await logAudit({ actorId: user.id, action: "create", entityType: "ShortCourseMaterial", entityId: material.id, after: { shortCourseId: id, title: material.title, contentType: mime, fileSize: material.fileSize, published: material.published } });
      return ok(material, { status: 201 });
    } catch (dbError) {
      await deleteObject(objectRef);
      throw dbError;
    }
  } catch (error) {
    return serverError(error);
  }
}
