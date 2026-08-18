import type { Role } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";

export type SessionUser = {
  id: string;
  role: Role;
  email: string;
  name: string;
};

/**
 * Current authenticated user from the JWT session.
 * Returns null when unauthenticated. Never hits the DB.
 */
export async function currentUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    role: session.user.role,
    email: session.user.email ?? "",
    name: session.user.name ?? "",
  };
}