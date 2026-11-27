import { redirect } from "next/navigation";
import Link from "next/link";
import { currentUser } from "@/lib/session";
import { ShortCourseForm } from "@/components/short-course-form";

export const metadata = { title: "Create short course" };

export default async function NewShortCoursePage() {
  const user = await currentUser();
  if (!user) redirect("/");
  if (user.role !== "SUPER_ADMIN") redirect("/short-courses");
  return <div className="mx-auto max-w-4xl space-y-5">
    <nav aria-label="Breadcrumb" className="text-sm text-ink-muted"><Link href="/short-courses" className="hover:text-brand-700 hover:underline">Short courses</Link><span aria-hidden="true"> / New course</span></nav>
    <ShortCourseForm standalone />
  </div>;
}
