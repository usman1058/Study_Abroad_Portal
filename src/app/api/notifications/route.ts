import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, fail, requireUser, serverError } from "@/lib/api";
import { parsePaginationParams, buildPaginatedQuery, paginateResults } from "@/lib/pagination";

export async function GET(req: NextRequest) {
  try {
    const { error, user } = await requireUser();
    if (error) return error;

    const { cursor, limit } = parsePaginationParams(req, 50, 100);

    const baseQuery = {
      where: { userId: user.id },
      orderBy: { createdAt: "desc" as const },
    };

    const query = buildPaginatedQuery(baseQuery, { cursor, limit });
    const notifications = await prisma.notification.findMany(query);

    const { data, nextCursor, hasMore } = paginateResults(notifications, limit);

    return ok({ data, nextCursor, hasMore });
  } catch (e) {
    return serverError(e);
  }
}

export async function PUT() {
  try {
    const { error, user } = await requireUser();
    if (error) return error;

    await prisma.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });
    return ok({ marked: true });
  } catch (e) {
    return serverError(e);
  }
}