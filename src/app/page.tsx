import { redirect } from "next/navigation";
import Link from "next/link";
import { GraduationCap, Briefcase } from "lucide-react";
import { currentUser } from "@/lib/session";
import type { ReactNode } from "react";

function RoleCard({ href, icon, title, description }: { href: string; icon: ReactNode; title: string; description: string }) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-xl border border-white/10 bg-white/[0.04] p-8 text-left backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-brand-500/60 hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
    >
      <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-brand-600/20 text-brand-300 ring-1 ring-inset ring-brand-500/30">
        {icon}
      </span>
      <h2 className="font-display text-xl font-semibold text-white">{title}</h2>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-navy-200">{description}</p>
      <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-brand-300">
        Continue
        <span aria-hidden className="transition group-hover:translate-x-0.5">→</span>
      </span>
    </Link>
  );
}

export default async function LandingPage() {
  const user = await currentUser();
  if (user) {
    redirect(user.role === "STUDENT" ? "/my-applications" : "/home");
  }

  return (
    <main className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-navy-950 p-6">
      <div aria-hidden className="pointer-events-none absolute -top-40 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-brand-600/20 blur-[120px]" />
      <div aria-hidden className="pointer-events-none absolute bottom-0 right-0 h-96 w-96 rounded-full bg-indigo-600/10 blur-[100px]" />

      <div className="relative flex w-full max-w-2xl flex-col items-center gap-12">
        <div className="text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-xl bg-brand-600 font-display text-2xl font-bold text-white shadow-lg shadow-brand-600/30">
            SA
          </div>
          <h1 className="font-display text-4xl font-bold tracking-tight text-white">StudyAbroad Portal</h1>
          <p className="mt-3 text-base text-navy-300">Are you a student or a partner?</p>
        </div>

        <div className="grid w-full gap-5 sm:grid-cols-2">
          <RoleCard
            href="/student/login"
            icon={<GraduationCap className="h-6 w-6" />}
            title="I am a Student"
            description="Login to track applications, shortlisted courses, documents and payments."
          />
          <RoleCard
            href="/partner/login"
            icon={<Briefcase className="h-6 w-6" />}
            title="I am a Partner"
            description="Agency staff and counselors. Login to manage cases, students and operations."
          />
        </div>
      </div>
    </main>
  );
}
