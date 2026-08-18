import { redirect } from "next/navigation";
import Link from "next/link";
import { GraduationCap, Briefcase } from "lucide-react";
import { currentUser } from "@/lib/session";

export default async function LandingPage() {
  const user = await currentUser();
  if (user) {
    redirect(user.role === "STUDENT" ? "/my-applications" : "/home");
  }

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-10 p-6">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 text-3xl font-bold text-white">
          SA
        </div>
        <h1 className="text-3xl font-bold tracking-tight">StudyAbroad Portal</h1>
        <p className="mt-2 text-muted-foreground text-slate-500 dark:text-slate-400">
          Are you a student or a partner?
        </p>
      </div>

      <div className="grid w-full max-w-2xl gap-5 sm:grid-cols-2">
        <Link
          href="/student/login"
          className="group rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition hover:border-brand-400 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
        >
          <GraduationCap className="mb-4 h-10 w-10 text-brand-600" />
          <h2 className="text-xl font-semibold">I am a Student</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Login to track applications, shortlisted courses, documents and payments.
          </p>
          <span className="mt-4 inline-block text-sm font-medium text-brand-600 group-hover:underline">
            Continue →
          </span>
        </Link>

        <Link
          href="/partner/login"
          className="group rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition hover:border-brand-400 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
        >
          <Briefcase className="mb-4 h-10 w-10 text-brand-600" />
          <h2 className="text-xl font-semibold">I am a Partner</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Agency staff and counselors. Login to manage cases, students and operations.
          </p>
          <span className="mt-4 inline-block text-sm font-medium text-brand-600 group-hover:underline">
            Continue →
          </span>
        </Link>
      </div>
    </main>
  );
}