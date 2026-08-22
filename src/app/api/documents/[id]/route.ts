import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, fail, requireUser, serverError } from "@/lib/api";
import { canAccessStudent } from "@/lib/permissions";
import { logAudit, createNotification } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

const verifySchema = z.object({
  status: z.enum(["VERIFIED", "REJECTED"]),
  reason: z.string().optional().nullable(),
});

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const { error, user } = await requireUser();
    if (error) return error;
    if (user.role === "STUDENT") return fail("Only agency staff can verify documents", 403);

    const doc = await prisma.document.findUnique({ where: { id }, include: { owner: true } });
    if (!doc) return fail("Document not found", 404);

    if (!(await canAccessStudent(user, doc.owner))) return fail("Forbidden", 403);

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
      if (!owner || !(await canAccessStudent(user, owner))) return fail("Forbidden", 403);
    }

    await prisma.document.delete({ where: { id } });
    await logAudit({ actorId: user.id, action: "delete", entityType: "Document", entityId: id });
    return ok({ id });
  } catch (e) {
    return serverError(e);
  }
}