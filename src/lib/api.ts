import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import type { Role } from "@/generated/prisma/client";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ success: true, data }, init);
}

export function fail(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ success: false, error: message, ...extra }, { status });
}

export async function requireUser() {
  const user = await currentUser();
  if (!user) {
    return { error: fail("Unauthorized", 401) as Response, user: null as null };
  }
  return { error: null, user };
}

export function requireRole(user: { role: Role }, allowed: Role[]): Response | null {
  if (!allowed.includes(user.role)) {
    return fail("Forbidden: insufficient role", 403);
  }
  return null;
}

export function toError(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}