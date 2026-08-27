import { prisma } from "@/lib/db";

type AuditInput = {
  actorId: string;
  actorType?: "staff" | "guest" | "system";
  action: "create" | "update" | "delete" | "login" | "logout" | "read" | "download" | "invite_used" | "revoke" | "password_change" | "upload_receipt" | "other";
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
};

export async function logAudit(input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId,
        actorType: input.actorType,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        before: input.before !== undefined ? (input.before as object) : undefined,
        after: input.after !== undefined ? (input.after as object) : undefined,
      },
    });
  } catch (err) {
    // Audit logging must never break the primary operation.
    console.error("[audit] failed to write audit log", err);
  }
}

export function createNotification(params: {
  userId: string;
  type: string;
  title: string;
  body?: string;
  data?: object;
}) {
  return prisma.notification.create({ data: params });
}

export async function notifyMany(users: { userId: string }[], params: Omit<{ userId: string; type: string; title: string; body?: string; data?: object }, "userId">) {
  await prisma.notification.createMany({
    data: users.map((u) => ({ ...params, userId: u.userId })),
  });
}