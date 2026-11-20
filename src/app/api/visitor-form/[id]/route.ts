import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, fail, requireUser, serverError } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const { error, user } = await requireUser();
    if (error) return error;
    if (user.role !== "SUPER_ADMIN" && user.role !== "MANAGER") return fail("Forbidden", 403);
    const body = await req.json();
    const parsed = z.object({ status: z.enum(["NEW", "CONTACTED", "CONVERTED", "CLOSED"]) }).safeParse(body);
    if (!parsed.success) return fail("Choose a valid lead status", 422);
    const lead = await prisma.visitorLead.findUnique({ where: { id }, select: { id: true, status: true } });
    if (!lead) return fail("Lead not found", 404);
    await prisma.visitorLead.update({ where: { id }, data: { status: parsed.data.status } });
    await logAudit({ actorId: user.id, action: "update", entityType: "VisitorLead", entityId: id, before: { status: lead.status }, after: { status: parsed.data.status } });
    return ok({ id });
  } catch (e) {
    return serverError(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const { error, user } = await requireUser();
    if (error) return error;
    if (user.role !== "SUPER_ADMIN" && user.role !== "MANAGER") return fail("Forbidden", 403);

    const lead = await prisma.visitorLead.findUnique({ where: { id } });
    if (!lead) return fail("Lead not found", 404);

    await prisma.visitorLead.delete({ where: { id } });
    await logAudit({ actorId: user.id, action: "delete", entityType: "VisitorLead", entityId: id });
    return ok({ id });
  } catch (e) {
    return serverError(e);
  }
}
