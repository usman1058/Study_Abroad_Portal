import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api";
import { programPdfBuffer } from "@/lib/pdf";
import { toNum } from "@/lib/utils";

type Params = { params: Promise<{ programId: string }> };

export const revalidate = 0;

export async function GET(_req: NextRequest, { params }: Params) {
  const { programId } = await params;

  const { error } = await requireUser();
  if (error) return error;

  const program = await prisma.program.findUnique({
    where: { id: programId },
    include: { university: true },
  });
  if (!program) return new Response("Program not found", { status: 404 });

  const whyHighlights = Array.isArray(program.whyHighlights)
    ? (program.whyHighlights as unknown[]).map(String)
    : [];

  const buffer = await programPdfBuffer({
    name: program.name,
    level: program.level,
    field: program.field,
    location: program.location,
    universityName: program.university?.name ?? "—",
    universityCountry: program.university?.country ?? "—",
    tuitionFee: toNum(program.tuitionFee),
    tuitionCurrency: "MYR",
    applicationFee: program.applicationFee != null ? toNum(program.applicationFee) : null,
    intakeDates: program.intakeDates.map((d) => d.toISOString()),
    visaRequired: program.visaRequired,
    courseDurationMonths: program.courseDurationMonths,
    collegeRank: program.collegeRank,
    offerTurnaroundDays: program.offerTurnaroundDays,
    eligibilityCriteria: program.eligibilityCriteria ?? [],
    requiredDocuments: program.requiredDocuments ?? [],
    whyHighlights,
    minGpa: program.minGpa,
    generatedAt: new Date().toLocaleDateString("en-MY", { dateStyle: "medium" }),
  });

  return new Response(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${program.name.replace(/[^a-z0-9]+/gi, "-")}.pdf"`,
      "Cache-Control": "private, max-age=60",
    },
  });
}