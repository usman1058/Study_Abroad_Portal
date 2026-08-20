import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, fail, requireUser, toError } from "@/lib/api";
import { canAccessStudent } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { parsePaginationParams, buildPaginatedQuery, paginateResults } from "@/lib/pagination";

const createSchema = z.object({
  programId: z.string().min(1),
  studentId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { error, user } = await requireUser();
    if (error) return error;

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
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

    // Don't create duplicate applications for the same program.
    const existing = await prisma.application.findFirst({ where: { studentId, programId } });
    if (existing) return fail("An application for this program already exists", 409);

    const application = await prisma.application.create({
      data: { studentId, programId, stage: "DRAFT" },
      select: { id: true },
    });

    await logAudit({ actorId: user.id, action: "create", entityType: "Application", entityId: application.id, after: { studentId, programId } });

    return ok({ id: application.id }, { status: 201 });
  } catch (e) {
    return fail(toError(e), 500);
  }
}

export async function GET(req: NextRequest) {
  try {
    const { error, user } = await requireUser();
    if (error) return error;

    const { cursor, limit } = parsePaginationParams(req, 50, 100);

    const where =
      user.role === "STUDENT"
        ? { studentId: user.id }
        : user.role === "COUNSELOR"
          ? { student: { assignedCounselorId: user.id } }
          : user.role === "AGENCY"
            ? { student: { createdById: user.id } }
            : {};

    const baseQuery = {
      where,
      orderBy: { updatedAt: "desc" as const },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        program: { select: { id: true, name: true, visaRequired: true, university: { select: { name: true } } } },
      },
    };

    const query = buildPaginatedQuery(baseQuery, { cursor, limit });
    const applications = await prisma.application.findMany(query);

    const { data, nextCursor, hasMore } = paginateResults(applications, limit);

    return ok({ data, nextCursor, hasMore });
  } catch (e) {
    return fail(toError(e), 500);
  }
}