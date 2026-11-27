import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { currentUser } from "@/lib/session";
import { getShortCourse } from "@/lib/queries";
import { ShortCourseForm } from "@/components/short-course-form";

export const metadata = { title: "Edit short course" };

export default async function EditShortCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/");
  if (user.role !== "SUPER_ADMIN") redirect("/short-courses");
  const { id } = await params;
  const course = await getShortCourse(id);
  if (!course) notFound();
  return <div className="mx-auto max-w-4xl space-y-5">
    <nav aria-label="Breadcrumb" className="text-sm text-ink-muted"><Link href="/short-courses" className="hover:text-brand-700 hover:underline">Short courses</Link><span aria-hidden="true"> / </span><Link href={`/short-courses/${course.id}`} className="hover:text-brand-700 hover:underline">{course.title}</Link><span aria-hidden="true"> / Edit</span></nav>
    <ShortCourseForm standalone initial={{
      id: course.id, title: course.title, provider: course.provider, category: course.category,
      duration: course.duration, startDates: course.startDates, fee: String(course.fee),
      deliveryMode: course.deliveryMode, classSchedule: course.classSchedule, meetingLink: course.meetingLink,
      prerequisites: course.prerequisites, description: course.description, linkedProgramId: course.linkedProgram?.id,
      linkedProgramLabel: course.linkedProgram ? `${course.linkedProgram.university?.name ?? ""} — ${course.linkedProgram.name}` : undefined,
      paymentType: course.paymentType as "FREE" | "PAID" | "OTHER", bankDetails: course.bankDetails ?? "",
      status: course.status as "draft" | "active",
    }} />
  </div>;
}
