import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, fail, requireUser, toError } from "@/lib/api";
import { logAudit } from "@/lib/audit";

const uploadSchema = z.object({
  type: z.string().min(1),
  base64: z.string().min(1),
  applicationId: z.string().optional().nullable(),
  expiresAt: z.string().optional().nullable(),
});

const MAX_BYTES = 4 * 1024 * 1024; // ~4MB

export async function POST(req: NextRequest) {
  try {
    const { error, user } = await requireUser();
    if (error) return error;
    if (user.role !== "STUDENT") return fail("Only students can upload documents", 403);

    const body = await req.json();
    const parsed = uploadSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input", 422);

    const { type, base64, applicationId, expiresAt } = parsed.data;

    if (base64.length > MAX_BYTES) return fail("File is too large (max 4MB)", 413);

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
    return fail(toError(e), 500);
  }
}

export async function GET() {
  try {
    const { error, user } = await requireUser();
    if (error) return error;

    const documents =
      user.role === "STUDENT"
        ? await prisma.document.findMany({ where: { ownerId: user.id }, orderBy: { uploadedAt: "desc" } })
        : await prisma.document.findMany({
            where: user.role === "COUNSELOR" ? { owner: { assignedCounselorId: user.id } } : {},
            orderBy: { uploadedAt: "desc" },
            include: { owner: { select: { firstName: true, lastName: true } } },
          });

    return ok(documents);
  } catch (e) {
    return fail(toError(e), 500);
  }
}