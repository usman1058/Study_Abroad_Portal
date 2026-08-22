import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api";
import { canAccessStudent } from "@/lib/permissions";
import { shortlistPdfBuffer } from "@/lib/pdf";
import { toNum, fullName } from "@/lib/utils";

type Params = { params: Promise<{ studentId: string }> };

export const revalidate = 0;

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { studentId } = await params;

    const { error, user } = await requireUser();
    if (error) return error;

    const student = await prisma.user.findUnique({ where: { id: studentId } });
    if (!student || student.role !== "STUDENT") return new Response("Student not found", { status: 404 });

    if (user.role === "STUDENT") {
      if (user.id !== studentId) return new Response("Forbidden", { status: 403 });
    } else if (!(await canAccessStudent(user, student))) {
      return new Response("Forbidden", { status: 403 });
    }

    const shortlist = await prisma.shortlist.findUnique({
      where: { studentId },
      include: {
        items: {
          include: { program: { include: { university: true } } },
          orderBy: { position: "asc" },
        },
      },
    });

    const items = (shortlist?.items ?? []).map((it) => ({
      name: it.program.name,
      level: it.program.level,
      field: it.program.field,
      universityName: it.program.university?.name ?? "—",
      universityCountry: it.program.university?.country ?? "—",
      tuitionFee: toNum(it.program.tuitionFee),
      tuitionCurrency: "MYR",
      applicationFee: it.program.applicationFee != null ? toNum(it.program.applicationFee) : null,
      intakeDates: it.program.intakeDates.map((d) => d.toISOString()),
      visaRequired: it.program.visaRequired,
      courseDurationMonths: it.program.courseDurationMonths,
      collegeRank: it.program.collegeRank,
      offerTurnaroundDays: it.program.offerTurnaroundDays,
      eligibilityCriteria: it.program.eligibilityCriteria ?? [],
    }));

    const buffer = await shortlistPdfBuffer({
      studentName: fullName(student),
      generatedAt: new Date().toLocaleDateString("en-MY", { dateStyle: "medium" }),
      items,
    });

    return new Response(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="shortlist-${studentId}.pdf"`,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (e) {
    console.error("[api] shortlist pdf failed:", e);
    return new Response("Failed to generate PDF", { status: 500 });
  }
}