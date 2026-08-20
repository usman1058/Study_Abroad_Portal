import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, fail, requireUser, toError } from "@/lib/api";
import { canAccessStudent } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

async function getOrCreateShortlist(studentId: string) {
  const existing = await prisma.shortlist.findUnique({ where: { studentId } });
  if (existing) return existing;
  return prisma.shortlist.create({ data: { studentId } });
}

const addSchema = z.object({
  programId: z.string().min(1),
  studentId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { error, user } = await requireUser();
    if (error) return error;

    const body = await req.json();
    const parsed = addSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input", 422);

    const { programId } = parsed.data;
    const program = await prisma.program.findUnique({ where: { id: programId } });
    if (!program) return fail("Program not found", 404);

    let studentId: string;
    if (user.role === "STUDENT") {
      studentId = user.id;
    } else {
      studentId = parsed.data.studentId ?? user.id;
      if (!studentId) return fail("studentId is required", 422);
      const student = await prisma.user.findUnique({ where: { id: studentId } });
      if (!student || student.role !== "STUDENT") return fail("Invalid student", 404);
      if (!(await canAccessStudent(user, student))) return fail("You do not have access to this student", 403);
    }

    const shortlist = await getOrCreateShortlist(studentId);

    const existing = await prisma.shortlistItem.findUnique({
      where: { shortlistId_programId: { shortlistId: shortlist.id, programId } },
    });
    if (existing) return ok({ id: existing.id });

    const nextPosition = await prisma.shortlistItem.count({ where: { shortlistId: shortlist.id } });

    const item = await prisma.shortlistItem.create({
      data: { shortlistId: shortlist.id, programId, position: nextPosition },
      select: { id: true },
    });

    if (user.role !== "STUDENT") {
      await logAudit({ actorId: user.id, action: "create", entityType: "ShortlistItem", entityId: item.id, after: { studentId, programId } });
    }

    return ok({ id: item.id }, { status: 201 });
  } catch (e) {
    return fail(toError(e), 500);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { error, user } = await requireUser();
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const programId = searchParams.get("programId");
    const studentIdParam = searchParams.get("studentId");

    if (!programId) return fail("programId is required", 422);

    let studentId: string;
    if (user.role === "STUDENT") {
      studentId = user.id;
    } else {
      studentId = studentIdParam ?? user.id;
      if (!studentId) return fail("studentId is required", 422);
      const student = await prisma.user.findUnique({ where: { id: studentId } });
      if (!student || student.role !== "STUDENT") return fail("Invalid student", 404);
      if (!(await canAccessStudent(user, student))) return fail("You do not have access to this student", 403);
    }

    const shortlist = await prisma.shortlist.findUnique({ where: { studentId } });
    if (!shortlist) return ok({ id: programId });

    await prisma.shortlistItem
      .delete({ where: { shortlistId_programId: { shortlistId: shortlist.id, programId } } })
      .catch(() => {});

    // Re-normalize positions atomically to avoid race conditions on concurrent deletes.
    await prisma.$executeRaw`
      UPDATE "ShortlistItem"
      SET position = sub.new_pos
      FROM (
        SELECT id, ROW_NUMBER() OVER (ORDER BY position) - 1 AS new_pos
        FROM "ShortlistItem"
        WHERE "shortlistId" = ${shortlist.id}
      ) sub
      WHERE "ShortlistItem".id = sub.id
    `;

    return ok({ id: programId });
  } catch (e) {
    return fail(toError(e), 500);
  }
}