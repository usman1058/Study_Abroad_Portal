import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, fail, requireUser, serverError } from "@/lib/api";
import { logAudit } from "@/lib/audit";

const permSchema = z.object({
  receiverId: z.string().min(1),
  canViewCommission: z.boolean(),
  canViewFullChain: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { error, user } = await requireUser();
    if (error) return error;

    const body = await req.json();
    const parsed = permSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input", 422);

    const { receiverId, canViewCommission, canViewFullChain } = parsed.data;

    if (user.role === "STUDENT") return fail("Forbidden", 403);
    if (receiverId === user.id) return fail("Cannot set permissions on yourself", 422);

    const target = await prisma.user.findUnique({ where: { id: receiverId } });
    if (!target) return fail("User not found", 404);
    if (target.role !== "AGENCY") return fail("Permissions only apply to sub-agencies", 422);

    // Agencies grant permissions only to sub-agencies they created.
    if (user.role === "AGENCY" && target.parentAgencyId !== user.id) {
      return fail("You can only configure sub-agencies you created", 403);
    }

    const permission = await prisma.agencyPermission.upsert({
      where: { grantorId_receiverId: { grantorId: user.id, receiverId } },
      create: {
        grantorId: user.id,
        receiverId,
        canViewCommission,
        canViewFullChain: canViewFullChain ?? false,
      },
      update: {
        canViewCommission,
        ...(canViewFullChain !== undefined ? { canViewFullChain } : {}),
      },
    });

    await logAudit({ actorId: user.id, action: "update", entityType: "AgencyPermission", entityId: permission.id, after: { receiverId, canViewCommission } });
    return ok({ id: permission.id });
  } catch (e) {
    return serverError(e);
  }
}