import { prisma } from "@/lib/db";
import { fail, ok, requireUser, serverError } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { isAllowedMimeType } from "@/lib/utils";
import { deleteObject, readStoredFile, StorageError } from "@/lib/storage";

type Params = { params: Promise<{ id: string; materialId: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { id, materialId } = await params;
    const { error, user } = await requireUser();
    if (error) return error;
    if (user.role !== "SUPER_ADMIN" && user.role !== "STUDENT") return fail("Forbidden", 403);

    const material = await prisma.shortCourseMaterial.findFirst({
      where: { id: materialId, shortCourseId: id },
      select: { title: true, fileName: true, contentType: true, objectRef: true, published: true },
    });
    if (!material) return fail("Material not found", 404);

    if (user.role === "STUDENT") {
      if (!material.published) return fail("Material not found", 404);
      const enrollment = await prisma.shortCourseEnrollment.findUnique({
        where: { studentId_shortCourseId: { studentId: user.id, shortCourseId: id } },
        select: { status: true },
      });
      if (!enrollment || !["enrolled", "completed"].includes(enrollment.status)) return fail("Enroll in this course to access its materials", 403);
    }

    const file = await readStoredFile(material.objectRef);
    if (!isAllowedMimeType(material.contentType) || file.contentType !== material.contentType) return fail("Stored material type is not allowed", 415);
    const fallbackName = material.fileName.replace(/[\r\n"\\]/g, "_");
    const encodedName = encodeURIComponent(material.fileName).replace(/['()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
    return new Response(new Uint8Array(file.bytes), {
      headers: {
        "Content-Type": material.contentType,
        "Content-Disposition": `attachment; filename="${fallbackName}"; filename*=UTF-8''${encodedName}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof StorageError) return fail(error.message, error.status);
    return serverError(error);
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { id, materialId } = await params;
    const { error, user } = await requireUser();
    if (error) return error;
    if (user.role !== "SUPER_ADMIN") return fail("Only the portal owner can remove course materials", 403);

    const material = await prisma.shortCourseMaterial.findFirst({
      where: { id: materialId, shortCourseId: id },
      select: { id: true, title: true, objectRef: true },
    });
    if (!material) return fail("Material not found", 404);
    await prisma.shortCourseMaterial.delete({ where: { id: material.id } });
    await deleteObject(material.objectRef);
    await logAudit({ actorId: user.id, action: "delete", entityType: "ShortCourseMaterial", entityId: material.id, after: { shortCourseId: id, title: material.title } });
    return ok({ id: material.id });
  } catch (error) {
    return serverError(error);
  }
}
