import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api";
import { shortCoursePdfBuffer } from "@/lib/pdf";
import { toNum } from "@/lib/utils";

type Params = { params: Promise<{ id: string }> };

export const revalidate = 0;

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const auth = await requireUser();
    if (auth.error) return auth.error;
    const course = await prisma.shortCourse.findUnique({ where: { id } });
    if (!course) return new Response("Course not found", { status: 404 });
    const buffer = await shortCoursePdfBuffer({
      title: course.title, provider: course.provider, category: course.category, duration: course.duration,
      startDates: course.startDates.map((date) => date.toISOString()), fee: toNum(course.fee),
      deliveryMode: course.deliveryMode, classSchedule: course.classSchedule, prerequisites: course.prerequisites,
      description: course.description, paymentType: course.paymentType,
      generatedAt: new Date().toLocaleDateString("en-MY", { dateStyle: "medium" }),
    });
    return new Response(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${course.title.replace(/[^a-z0-9]+/gi, "-")}.pdf"`,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (error) {
    console.error("[api] short course pdf failed:", error);
    return new Response("Failed to generate PDF", { status: 500 });
  }
}
