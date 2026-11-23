import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, fail, requireUser, serverError } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { readStoredFile, StorageError } from "@/lib/storage";

type Params = { params: Promise<{ id: string }> };

function canReview(role: string): boolean {
  return role === "SUPER_ADMIN" || role === "MANAGER";
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const { error, user } = await requireUser();
    if (error) return error;
    if (!canReview(user.role)) return fail("Forbidden", 403);

    const document = await prisma.partnerDocument.findUnique({ where: { id } });
    if (!document) return fail("Partner document not found", 404);

    const file = await readStoredFile(document.fileUrl);
    const extension = file.contentType === "application/pdf"
      ? "pdf"
      : file.contentType.split("/")[1]?.replace("jpeg", "jpg") ?? "bin";
    const safeName = document.originalName.replace(/[\r\n"\\/]/g, "_");
    return new Response(new Uint8Array(file.bytes), {
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": `inline; filename="${safeName || `partner-document.${extension}`}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof StorageError) return new Response(error.message, { status: error.status });
    return serverError(error);
  }
}

export async function PUT(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const { error, user } = await requireUser();
    if (error) return error;
    if (!canReview(user.role)) return fail("Only administrators can verify partner documents", 403);

    const document = await prisma.partnerDocument.findUnique({ where: { id } });
    if (!document) return fail("Partner document not found", 404);
    if (document.status === "VERIFIED") return ok({ id, status: "VERIFIED" });

    const updated = await prisma.partnerDocument.update({
      where: { id },
      data: { status: "VERIFIED", verifiedById: user.id },
      select: { id: true, status: true },
    });
    await logAudit({
      actorId: user.id,
      action: "update",
      entityType: "PartnerDocument",
      entityId: id,
      after: { status: updated.status },
    });

    return ok(updated);
  } catch (error) {
    return serverError(error);
  }
}
