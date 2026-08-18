import { NextRequest } from "next/server";
import { randomBytes } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, fail, requireUser, toError } from "@/lib/api";
import { canAccessStudent } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

const createSchema = z.object({
  studentId: z.string().min(1),
  sections: z.array(z.enum(["applications", "documents", "shortlist", "payments", "profile"])).default(["applications", "documents"]),
  access: z.record(z.string(), z.enum(["view", "edit"])).optional(),
  expiresAt: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const { error, user } = await requireUser();
    if (error) return error;
    if (user.role === "STUDENT") return fail("Only agency staff can create guest links", 403);

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input", 422);

    const data = parsed.data;
    const student = await prisma.user.findUnique({ where: { id: data.studentId } });
    if (!student || student.role !== "STUDENT") return fail("Invalid student", 404);
    if (!(await canAccessStudent(user, student))) return fail("You do not have access to this student", 403);

    const token = randomBytes(24).toString("hex");
    const link = await prisma.inviteLink.create({
      data: {
        token,
        studentId: data.studentId,
        createdById: user.id,
        permissionSet: { sections: data.sections, access: data.access ?? {} } as object,
        expiresAt: new Date(data.expiresAt),
      },
      select: { id: true, token: true, expiresAt: true },
    });

    await logAudit({ actorId: user.id, action: "create", entityType: "InviteLink", entityId: link.id, after: { studentId: data.studentId, sections: data.sections } });

    return ok({ id: link.id, url: `/invite/${link.token}` }, { status: 201 });
  } catch (e) {
    return fail(toError(e), 500);
  }
}