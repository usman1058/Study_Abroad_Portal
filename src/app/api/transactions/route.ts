import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, fail, requireUser, toError } from "@/lib/api";
import { canAccessStudent } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { parsePaginationParams, buildPaginatedQuery, paginateResults } from "@/lib/pagination";
import { TransactionType } from "@/generated/prisma/client";

const createSchema = z.object({
  type: z.nativeEnum(TransactionType),
  amount: z.number().positive(),
  currency: z.string().min(1),
  relatedStudentId: z.string().nullable().optional(),
  relatedApplicationId: z.string().nullable().optional(),
  relatedAgencyId: z.string().nullable().optional(),
  method: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  date: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { error, user } = await requireUser();
    if (error) return error;
    if (user.role === "STUDENT") return fail("Only agency staff can record payments", 403);

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input", 422);

    const data = parsed.data;

    // Data-scope: the student must be accessible to the actor.
    if (data.relatedStudentId) {
      const student = await prisma.user.findUnique({ where: { id: data.relatedStudentId } });
      if (!student || student.role !== "STUDENT") return fail("Invalid student", 404);
      if (!(await canAccessStudent(user, student))) return fail("You do not have access to this student", 403);
    }

    // An AGENCY may only attach its own sub-agencies (or itself) as the counterparty.
    if (data.relatedAgencyId && user.role === "AGENCY") {
      const agency = await prisma.user.findUnique({ where: { id: data.relatedAgencyId } });
      if (!agency || agency.role !== "AGENCY") return fail("Invalid agency", 404);
      if (agency.id !== user.id && agency.parentAgencyId !== user.id) {
        return fail("You can only record transactions for your own sub-agencies", 403);
      }
    }

    const tx = await prisma.transaction.create({
      data: {
        type: data.type,
        amount: data.amount,
        currency: data.currency,
        relatedStudentId: data.relatedStudentId ?? null,
        relatedApplicationId: data.relatedApplicationId ?? null,
        relatedAgencyId: data.relatedAgencyId ?? null,
        method: data.method ?? null,
        notes: data.notes ?? null,
        enteredById: user.id,
        date: data.date ? new Date(data.date) : new Date(),
      },
      select: { id: true },
    });

    await logAudit({ actorId: user.id, action: "create", entityType: "Transaction", entityId: tx.id, after: { type: data.type, amount: data.amount, currency: data.currency, studentId: data.relatedStudentId } });
    return ok({ id: tx.id }, { status: 201 });
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
        ? { relatedStudentId: user.id }
        : user.role === "COUNSELOR"
          ? { relatedStudent: { assignedCounselorId: user.id } }
          : user.role === "AGENCY"
            ? { OR: [{ relatedStudent: { createdById: user.id } }, { relatedAgencyId: user.id }, { relatedAgency: { parentAgencyId: user.id } }] }
            : {};

    const baseQuery = {
      where,
      orderBy: { date: "desc" as const },
      include: { relatedStudent: { select: { firstName: true, lastName: true } }, relatedAgency: { select: { firstName: true, lastName: true } } },
    };

    const query = buildPaginatedQuery(baseQuery, { cursor, limit });
    const transactions = await prisma.transaction.findMany(query);

    const { data, nextCursor, hasMore } = paginateResults(transactions, limit);

    return ok({ data, nextCursor, hasMore });
  } catch (e) {
    return fail(toError(e), 500);
  }
}