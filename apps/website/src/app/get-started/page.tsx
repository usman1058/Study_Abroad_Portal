import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, BriefcaseBusiness, GraduationCap, UserRoundPlus } from "lucide-react";
import { portalUrl } from "@/lib/portal";

export const metadata: Metadata = {
  title: "Create an account",
  description: "Choose a student or institution and partner account to continue to the CheckMyUni portal.",
};

const accountTypes = [
  {
    title: "Student",
    description: "Create your student account to manage applications, documents, messages, and next steps.",
    href: portalUrl("/student/signup"),
    icon: GraduationCap,
    eyebrow: "For your study journey",
  },
  {
    title: "Institution or partner",
    description: "Apply as an education institution or agency. Upload your organization documents for review before portal access is approved.",
    href: portalUrl("/partner/signup"),
    icon: BriefcaseBusiness,
    eyebrow: "For education organizations",
  },
];

export default function GetStartedPage() {
  return (
    <section className="relative overflow-hidden bg-ivory py-16 sm:py-24">
      <div aria-hidden="true" className="pointer-events-none absolute -right-36 -top-24 h-96 w-96 rounded-full bg-blue/10 blur-3xl" />
      <div className="site-container relative max-w-5xl">
        <div className="site-reveal mx-auto max-w-3xl text-center">
          <p className="eyebrow">Get started</p>
          <h1 className="mt-3 font-display text-4xl font-extrabold leading-tight text-navy sm:text-5xl">Choose the account that fits you.</h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-600">Select a student or an institution/partner account. You’ll continue to the secure portal to complete registration.</p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {accountTypes.map(({ title, description, href, icon: Icon, eyebrow }, index) => (
            <article key={title} className={`site-reveal ${index ? "site-reveal-delay-1" : ""} surface-card flex h-full flex-col p-6 sm:p-8`}>
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-soft text-blue"><Icon aria-hidden="true" className="h-7 w-7" /></span>
              <p className="mt-6 text-xs font-extrabold uppercase tracking-[.12em] text-blue">{eyebrow}</p>
              <h2 className="mt-2 font-display text-2xl font-extrabold text-navy">{title}</h2>
              <p className="mt-3 flex-1 leading-7 text-slate-600">{description}</p>
              <Link href={href} className="btn-primary mt-7 w-full sm:w-fit">Continue to signup <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>
            </article>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-slate-600">Already have an account? <Link href={portalUrl("/")} className="font-bold text-blue underline decoration-blue/30 underline-offset-4 hover:text-blue-dark">Access the portal <ArrowUpRight aria-hidden="true" className="inline h-3.5 w-3.5" /></Link></p>
        <p className="mt-3 text-center text-sm text-slate-500">Need help choosing? <Link href="/contact" className="font-semibold text-navy underline decoration-slate-300 underline-offset-4 hover:text-blue">Talk to our team</Link></p>
      </div>
    </section>
  );
}

