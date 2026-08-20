import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, fail, requireUser, toError } from "@/lib/api";
import { canAccessStudent } from "@/lib/permissions";
import { parsePaginationParams, buildPaginatedQuery, paginateResults } from "@/lib/pagination";

const createSchema = z.object({
  recipientId: z.string().min(1),
  body: z.string().min(1).max(5000),
});

export async function POST(req: NextRequest) {
  try {
    const { error, user } = await requireUser();
    if (error) return error;

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input", 422);

    const { recipientId } = parsed.data;
    const recipient = await prisma.user.findUnique({ where: { id: recipientId }, select: { id: true, role: true } });
    if (!recipient) return fail("Recipient not found", 404);

    // Student -> staff message
    if (user.role === "STUDENT") {
      if (recipient.role === "STUDENT") return fail("Students can only message agency staff", 403);
    } else {
      // staff -> student (must have access); staff -> staff allowed for collaboration
      if (recipient.role === "STUDENT") {
        const student = await prisma.user.findUnique({ where: { id: recipientId } });
        if (!student || !(await canAccessStudent(user, student))) return fail("You do not have access to this student", 403);
      }
    }

    const message = await prisma.message.create({
      data: { senderId: user.id, recipientId, body: parsed.data.body },
      select: { id: true },
    });

    return ok({ id: message.id }, { status: 201 });
  } catch (e) {
    return fail(toError(e), 500);
  }
}

export async function GET(req: NextRequest) {
  try {
    const { error, user } = await requireUser();
    if (error) return error;

    const { cursor, limit } = parsePaginationParams(req, 50, 100);

    const baseQuery = {
      where: { OR: [{ senderId: user.id }, { recipientId: user.id }] },
      orderBy: { createdAt: "desc" as const },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, role: true } },
        recipient: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
    };

    const query = buildPaginatedQuery(baseQuery, { cursor, limit });
    const messages = await prisma.message.findMany(query);

    // Mark only the fetched messages addressed to this user as read.
    const fetchedIds = messages.map((m) => m.id);
    await prisma.message.updateMany({
      where: { id: { in: fetchedIds }, recipientId: user.id, readAt: null },
      data: { readAt: new Date() },
    });

    const { data, nextCursor, hasMore } = paginateResults(messages, limit);

    return ok({ data, nextCursor, hasMore });
  } catch (e) {
    return fail(toError(e), 500);
  }
}