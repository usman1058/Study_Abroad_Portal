import { prisma } from "@/lib/db";
import { fail, serverError } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const program = await prisma.program.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      select: {
        id: true, slug: true, name: true, level: true, field: true, location: true,
        tuitionFee: true, applicationFee: true, intakeDates: true, requiredDocuments: true,
        minGpa: true, visaRequired: true, tags: true, whyHighlights: true,
        offerTurnaroundDays: true, collegeRank: true, eligibilityCriteria: true,
        courseDurationMonths: true, universityLogoUrl: true,
        university: { select: { name: true, country: true, city: true, website: true, logoUrl: true } },
      },
    });
    if (!program) return fail("Program not found", 404);
    return Response.json({ program }, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } });
  } catch (error) {
    return serverError(error);
  }
}
