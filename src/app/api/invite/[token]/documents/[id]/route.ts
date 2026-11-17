import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { isStorageRef, readStoredFile, StorageError } from "@/lib/storage";

type Params = { params: Promise<{ token: string; id: string }> };

type PermissionSet = { sections?: string[] };

/**
 * Guest document download. The invite token is the credential: it must be
 * active, must include the documents section, and the document must belong to
 * the invited student. No session is required (guests have none).
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const { token, id } = await params;

  const link = await prisma.inviteLink.findUnique({
    where: { token },
    select: { studentId: true, revoked: true, expiresAt: true, permissionSet: true },
  });
  if (!link || link.revoked || link.expiresAt < new Date()) {
    return new Response("Not found", { status: 404 });
  }

  const sections = ((link.permissionSet ?? {}) as PermissionSet).sections ?? [];
  if (!sections.includes("documents")) return new Response("Forbidden", { status: 403 });

  const doc = await prisma.document.findUnique({
    where: { id },
    select: { ownerId: true, type: true, fileUrl: true },
  });
  if (!doc || doc.ownerId !== link.studentId) return new Response("Not found", { status: 404 });

  if (!isStorageRef(doc.fileUrl) && !doc.fileUrl.startsWith("data:")) {
    return Response.redirect(doc.fileUrl, 302);
  }

  try {
    const file = await readStoredFile(doc.fileUrl);
    const extension =
      file.contentType === "application/pdf" ? "pdf" : file.contentType.split("/")[1]?.replace("jpeg", "jpg") ?? "bin";
    return new Response(new Uint8Array(file.bytes), {
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": `attachment; filename="${doc.type.toLowerCase()}-document.${extension}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const status = error instanceof StorageError ? error.status : 500;
    return new Response("Document could not be read", { status });
  }
}
