import type { Role } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export type SessionUser = {
  id: string;
  role: Role;
  email: string;
  name: string;
};

/**
 * Current authenticated user, re-validated against the database.
 * The JWT alone is not trusted: a demoted, deleted or deactivated user must
 * lose access immediately instead of keeping their role for the token lifetime.
 */
export async function currentUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, email: true, firstName: true, lastName: true, status: true },
  });
  if (!user || user.status !== "active") return null;

  return {
    id: user.id,
    role: user.role,
    email: user.email,
    name: `${user.firstName} ${user.lastName}`,
  };
}