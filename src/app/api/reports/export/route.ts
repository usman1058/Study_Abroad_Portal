import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api";

// CSV export of student + application data for agency managers.
export async function GET(req: NextRequest) {
  try {
    const { error, user } = await requireUser();
    if (error) return error;
    if (user.role === "STUDENT") return new Response("Forbidden", { status: 403 });

    const where =
      user.role === "COUNSELOR"
        ? { student: { assignedCounselorId: user.id } }
        : user.role === "AGENCY"
          ? { student: { createdById: user.id } }
          : {};

    const applications = await prisma.application.findMany({
      where,
      include: {
        student: { select: { firstName: true, lastName: true, email: true, phone: true, country: true, createdAt: true } },
        program: { select: { name: true, level: true, university: { select: { name: true } } } },
      },
      orderBy: { createdAt: "asc" },
    });

    const header = ["Student", "Email", "Phone", "Country", "Registered", "University", "Program", "Level", "Stage"];
    const rows = applications.map((a) => [
      `${a.student.firstName} ${a.student.lastName}`,
      a.student.email,
      a.student.phone ?? "",
      a.student.country ?? "",
      a.student.createdAt.toISOString().slice(0, 10),
      a.program.university.name,
      a.program.name,
      a.program.level,
      a.stage,
    ]);

    const esc = (v: string) => {
      let s = v.replace(/"/g, '""');
      if (/^[=+\-@]/.test(s)) s = "'" + s;
      return `"${s}"`;
    };
    const csv = [header.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))].join("\r\n");

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="applications-export-${Date.now()}.csv"`,
      },
    });
  } catch (e) {
    console.error("[api] csv export failed:", e);
    return new Response("Internal server error", { status: 500 });
  }
}