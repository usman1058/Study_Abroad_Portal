import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, ArrowUpRight, BriefcaseBusiness, GraduationCap, ShieldCheck } from "lucide-react";
import { currentUser } from "@/lib/session";

const pathways = [
  {
    title: "Student",
    description: "Manage your applications, shortlisted programs, documents, payments, and messages.",
    loginHref: "/student/login",
    signupHref: "/student/signup",
    icon: GraduationCap,
    label: "For applicants",
  },
  {
    title: "Institution / Partner",
    description: "Institutions, agencies, and counselors can apply for a partner account and manage their workspace.",
    loginHref: "/partner/login",
    signupHref: "/partner/signup",
    icon: BriefcaseBusiness,
    label: "For education organizations",
  },
];

export default async function LandingPage() {
  const user = await currentUser();
  if (user) {
    redirect(user.role === "STUDENT" ? "/student-home" : "/home");
  }

  return (
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden bg-canvas px-4 py-12 sm:px-6">
      <div aria-hidden="true" className="pointer-events-none absolute -right-28 -top-32 h-[34rem] w-[34rem] rounded-full bg-brand-100/70 blur-3xl dark:bg-brand-900/30" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-44 -left-32 h-[32rem] w-[32rem] rounded-full bg-indigo-100/60 blur-3xl dark:bg-indigo-900/25" />

      <div className="relative w-full max-w-5xl">
        <div className="mb-7">
          <Link href="https://checkmyuni.com" className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-ink-muted transition hover:bg-white hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2">
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Back to CheckMyUni home
          </Link>
        </div>
        <header className="portal-enter mx-auto max-w-3xl text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/20"><GraduationCap aria-hidden="true" className="h-7 w-7" /></span>
          <p className="mt-5 text-xs font-extrabold uppercase tracking-[.18em] text-brand-700">StudyAbroad portal</p>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-navy-950 sm:text-5xl">Welcome. Let’s get you to the right place.</h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-ink-muted sm:text-lg">Choose how you’ll use the portal. New users can create an account from the matching option.</p>
        </header>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {pathways.map(({ title, description, loginHref, signupHref, icon: Icon, label }, index) => (
            <article key={title} className={`portal-enter ${index ? "portal-enter-delay-1" : ""} group flex h-full flex-col rounded-2xl border border-line bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-brand-200 hover:shadow-xl hover:shadow-navy-900/5 sm:p-8`}>
              <div className="flex items-start justify-between gap-4">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100"><Icon aria-hidden="true" className="h-7 w-7" /></span>
                <span className="rounded-full bg-canvas-subtle px-3 py-1.5 text-xs font-bold text-ink-muted">{label}</span>
              </div>
              <h2 className="mt-6 font-display text-2xl font-bold tracking-tight text-navy-950">{title}</h2>
              <p className="mt-3 flex-1 leading-7 text-ink-muted">{description}</p>
              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                <Link href={loginHref} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2">Sign in <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>
                <Link href={signupHref} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-line-strong bg-white px-4 text-sm font-bold text-navy-900 transition hover:border-brand-300 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2">Create account <ArrowUpRight aria-hidden="true" className="h-4 w-4" /></Link>
              </div>
            </article>
          ))}
        </div>

        <p className="mx-auto mt-7 flex max-w-2xl items-start justify-center gap-2 text-center text-sm leading-6 text-ink-muted"><ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />Partner accounts are reviewed before portal access is approved. Students can create an account and continue right away.</p>
      </div>
    </main>
  );
}
