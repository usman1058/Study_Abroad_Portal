import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, fail, requireUser, serverError } from "@/lib/api";
import { creatableRoles, canManageUser } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { parsePaginationParams, buildPaginatedQuery, paginateResults } from "@/lib/pagination";
import type { Role } from "@/generated/prisma/client";

const createSchema = z.object({
  role: z.enum(["MANAGER", "COUNSELOR", "AGENCY", "STUDENT"]),
  email: z.string().email(),
  password: z.string().min(8),
  userTitle: z.string().optional().nullable(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  gender: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  companyName: z.string().optional().nullable(),
  assignedCounselorId: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const { error, user } = await requireUser();
    if (error) return error;
    if (user.role === "STUDENT") return fail("Forbidden", 403);

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input", 422);

    const data = parsed.data;
    const allowed = creatableRoles(user.role);
    if (!allowed.includes(data.role)) return fail("You cannot create users with this role", 403);

    const email = data.email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return fail("An account with this email already exists", 409);

    const actor = await prisma.user.findUnique({ where: { id: user.id } });
    if (!actor) return fail("Unauthorized", 401);

    // Target must be below the actor in the hierarchy.
    if (!canManageUser(actor, { id: "placeholder", role: data.role })) {
      return fail("You cannot create this role", 403);
    }

    // Agencies always create sub-agencies beneath themselves.
    const parentAgencyId = data.role === "AGENCY" && actor.role === "AGENCY" ? actor.id : undefined;

    const passwordHash = await bcrypt.hash(data.password, 12);
    const created = await prisma.user.create({
      data: {
        role: data.role,
        email,
        passwordHash,
        userTitle: data.userTitle || null,
        firstName: data.firstName,
        lastName: data.lastName,
        gender: data.gender || null,
        phone: data.phone || null,
        country: data.country || null,
        companyName: data.companyName || null,
        assignedCounselorId: data.assignedCounselorId || null,
        createdById: actor.id,
        parentAgencyId,
        status: "active",
      },
      select: { id: true, email: true, role: true },
    });

    await logAudit({
      actorId: actor.id,
      action: "create",
      entityType: "User",
      entityId: created.id,
      after: { role: created.role, email: created.email },
    });

    return ok({ id: created.id }, { status: 201 });
  } catch (e) {
    return serverError(e);
  }
}

export async function GET(req: NextRequest) {
  try {
    const { error, user } = await requireUser();
    if (error) return error;
    if (user.role === "STUDENT") return fail("Forbidden", 403);

    const { cursor, limit } = parsePaginationParams(req, 50, 100);

    const where =
      user.role === "SUPER_ADMIN"
        ? {}
        : user.role === "MANAGER"
          ? { role: { not: "SUPER_ADMIN" as const } }
          : user.role === "AGENCY"
            ? { OR: [{ role: "STUDENT" as const, createdById: user.id }, { role: "AGENCY" as const, parentAgencyId: user.id }] }
            : { role: "STUDENT" as const, assignedCounselorId: user.id };

    const baseQuery = {
      where,
      orderBy: { createdAt: "desc" as const },
      select: {
        id: true,
        role: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        country: true,
        status: true,
        createdAt: true,
      },
    };

    const query = buildPaginatedQuery(baseQuery, { cursor, limit });
    const users = await prisma.user.findMany(query);

    const { data, nextCursor, hasMore } = paginateResults(users, limit);

    return ok({ data, nextCursor, hasMore });
  } catch (e) {
    return serverError(e);
  }
}