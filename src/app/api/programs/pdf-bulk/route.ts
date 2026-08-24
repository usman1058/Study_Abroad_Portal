import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, fail, serverError } from "@/lib/api";
import { bulkProgramsPdfBuffer } from "@/lib/pdf";
import { toNum, fullName } from "@/lib/utils";

const bulkSchema = z.object({
  programIds: z.array(z.string().min(1)).min(1).max(50),
});

// Consolidated course-list PDF for students/consultants to share (10–50 picks).
export async function POST(req: NextRequest) {
  try {
    const { error, user } = await requireUser();
    if (error) return error;

    const body = await req.json().catch(() => null);
    const parsed = bulkSchema.safeParse(body);
    if (!parsed.success) return fail("Select between 1 and 50 courses", 422);

    const uniqueIds = [...new Set(parsed.data.programIds)];
    const programs = await prisma.program.findMany({
      where: { id: { in: uniqueIds } },
      include: { university: true },
      orderBy: [{ university: { name: "asc" } }, { name: "asc" }],
    });

    const requester = await prisma.user.findUnique({
      where: { id: user.id },
      select: { firstName: true, lastName: true, phone: true, email: true },
    });

    const buffer = await bulkProgramsPdfBuffer({
      studentName: fullName(requester),
      studentPhone: requester?.phone ?? "",
      studentEmail: requester?.email ?? user.email,
      consultantName: fullName(requester),
      generatedAt: new Date().toLocaleDateString("en-MY", { dateStyle: "medium" }),
      items: programs.map((p) => ({
        universityName: p.university?.name ?? "—",
        universityCountry: p.university?.country ?? "—",
        name: p.name,
        tuitionFee: toNum(p.tuitionFee),
        tuitionCurrency: "MYR",
        courseLanguage: "English",
        durationMonths: p.courseDurationMonths,
      })),
    });

    return new Response(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="course-selection-${Date.now()}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return serverError(e);
  }
}
