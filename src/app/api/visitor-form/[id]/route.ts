import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, fail, requireUser, toError } from "@/lib/api";
import { logAudit } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const { error, user } = await requireUser();
    if (error) return error;
    if (user.role === "STUDENT") return fail("Forbidden", 403);

    const lead = await prisma.visitorLead.findUnique({ where: { id } });
    if (!lead) return fail("Lead not found", 404);

    if (lead.createdById !== user.id && !["MANAGER", "SUPER_ADMIN"].includes(user.role)) {
      return fail("Forbidden", 403);
    }

    await prisma.visitorLead.delete({ where: { id } });
    await logAudit({ actorId: user.id, action: "delete", entityType: "VisitorLead", entityId: id });
    return ok({ id });
  } catch (e) {
    return fail(toError(e), 500);
  }
}