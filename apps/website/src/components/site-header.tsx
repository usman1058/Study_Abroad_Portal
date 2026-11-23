import Link from "next/link";
import { ArrowUpRight, GraduationCap, Menu } from "lucide-react";
import { portalUrl } from "@/lib/portal";

const navigation = [
  { href: "/applications", label: "Study programs" },
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQs" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader() {
  return <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
    <div className="site-container flex h-[4.5rem] items-center justify-between gap-4">
      <Link href="/" aria-label="StudyAbroad home" className="group inline-flex items-center gap-2.5">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy text-white shadow-sm transition group-hover:bg-blue"><GraduationCap aria-hidden="true" className="h-5 w-5" /></span>
        <span className="font-display text-[1.12rem] font-extrabold tracking-tight text-navy">StudyAbroad<span className="text-blue">.</span></span>
      </Link>
      <nav aria-label="Main navigation" className="hidden items-center gap-7 md:flex">
        {navigation.map((item) => <Link key={item.href} href={item.href} className="text-sm font-semibold text-slate-600 transition hover:text-blue">{item.label}</Link>)}
      </nav>
      <div className="hidden items-center gap-3 md:flex">
        <Link href={portalUrl("/student/login")} className="px-2 py-2 text-sm font-bold text-navy hover:text-blue">Log in</Link>
        <Link href="/contact" className="btn-primary">Talk to an advisor <ArrowUpRight aria-hidden="true" className="h-4 w-4" /></Link>
      </div>
      <details className="relative md:hidden">
        <summary aria-label="Open navigation menu" className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-lg border border-slate-200 text-navy [&::-webkit-details-marker]:hidden"><Menu className="h-5 w-5" /></summary>
        <nav aria-label="Mobile navigation" className="absolute right-0 top-12 flex w-64 flex-col gap-1 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
          {navigation.map((item) => <Link key={item.href} href={item.href} className="rounded-lg px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-blue-soft hover:text-blue">{item.label}</Link>)}
          <Link href={portalUrl("/student/login")} className="rounded-lg px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-blue-soft">Student login</Link>
          <Link href="/contact" className="btn-primary mt-1">Talk to an advisor <ArrowUpRight className="h-4 w-4" /></Link>
        </nav>
      </details>
    </div>
  </header>;
}
