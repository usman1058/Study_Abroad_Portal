import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/audit";
import { daysUntil } from "@/lib/utils";

// Vercel Cron guard — both Vercel's `x-vercel-cron` header and a manual Bearer
// token (CRON_SECRET) are accepted so the route can also be triggered locally.
function isCronRequest(req: NextRequest): boolean {
  if (req.headers.get("x-vercel-cron") === "1") return true;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${process.env.CRON_SECRET ?? ""}`;
}

export async function GET(req: NextRequest) {
  if (!isCronRequest(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  let sent = 0;

  // Daily dedupe guard — skip candidates already reminded within the last 24h
  // so repeated cron runs don't stack identical notifications.
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  async function alreadyReminded(userId: string, type: string, title: string): Promise<boolean> {
    const existing = await prisma.notification.findFirst({
      where: { userId, type, title, createdAt: { gte: dayAgo } },
      select: { id: true },
    });
    return Boolean(existing);
  }

  // 1. Applications with no activity for 14+ days → remind the responsible staff.
  const staleApps = await prisma.application.findMany({
    where: {
      stage: { notIn: ["ENROLLED", "REJECTED", "WITHDRAWN"] },
      updatedAt: { lt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
    },
    include: { program: true },
    take: 50,
  });
  for (const app of staleApps) {
    const student = await prisma.user.findUnique({ where: { id: app.studentId } });
    const targetId = student?.assignedCounselorId ?? student?.createdById;
    if (!targetId) continue;
    try {
      if (await alreadyReminded(targetId, "system", "Application needs attention")) continue;
      await createNotification({
        userId: targetId,
        type: "system",
        title: "Application needs attention",
        body: `No update on "${app.program.name}" for 14+ days (stage: ${app.stage}).`,
        data: { applicationId: app.id },
      });
      sent++;
    } catch {
      // per-item failures are non-fatal
    }
  }

  // 2. Visa-stage reminders for students.
  const visaApps = await prisma.application.findMany({ where: { stage: "VISA" }, include: { program: true } });
  for (const app of visaApps) {
    try {
      if (await alreadyReminded(app.studentId, "visa", "Visa stage reminder")) continue;
      await createNotification({
        userId: app.studentId,
        type: "visa",
        title: "Visa stage reminder",
        body: `Your application for "${app.program.name}" is in the visa stage. Keep your documents ready.`,
        data: { applicationId: app.id },
      });
      sent++;
    } catch {
      // ignore
    }
  }

  // 3. Documents expiring within 7 days or already expired.
  const cutoff = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const expiring = await prisma.document.findMany({
    where: { expiresAt: { lte: cutoff }, status: "VERIFIED" },
    take: 100,
  });
  for (const doc of expiring) {
    const days = daysUntil(doc.expiresAt);
    try {
      const title = days != null && days >= 0 ? "Document expiring soon" : "Document expired";
      if (await alreadyReminded(doc.ownerId, "document", title)) continue;
      await createNotification({
        userId: doc.ownerId,
        type: "document",
        title,
        body: `Your ${doc.type} document${days != null && days >= 0 ? ` expires in ${days} day(s)` : " has expired"}. Please upload a new copy.`,
        data: { documentId: doc.id },
      });
      sent++;
    } catch {
      // ignore
    }
  }

  return NextResponse.json({ success: true, sent });
}