import { NextRequest } from "next/server";
import { Prisma } from "@/generated/prisma/client";

export interface PaginationParams {
  cursor?: string | null;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export function parsePaginationParams(req: NextRequest, defaultLimit = 50, maxLimit = 100): PaginationParams {
  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? String(defaultLimit), 10), maxLimit);
  return { cursor: cursor ?? null, limit: isNaN(limit) ? defaultLimit : limit };
}

export function buildPaginatedQuery<T extends { select?: unknown; where?: unknown; orderBy?: unknown }>(
  baseQuery: T,
  params: PaginationParams,
  cursorField = "id"
): T {
  const { cursor, limit } = params;
  return {
    ...baseQuery,
    take: limit + 1,
    ...(cursor ? { cursor: { [cursorField]: cursor }, skip: 1 } : {}),
  } as T;
}

export function paginateResults<T>(items: T[], limit: number, cursorField = "id"): PaginatedResult<T> {
  const hasMore = items.length > limit;
  const data = hasMore ? items.slice(0, limit) : items;
  const nextCursor = hasMore ? String(data[data.length - 1][cursorField as keyof T]) : null;
  return { data, nextCursor, hasMore };
}

export function okPaginated<T>(result: PaginatedResult<T>) {
  const { NextResponse } = require("next/server");
  return NextResponse.json({ success: true, ...result });
}