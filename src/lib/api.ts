import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";

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

export function serverError(e: unknown) {
  console.error("[api] unhandled error:", e);
  return fail("Internal server error", 500);
}