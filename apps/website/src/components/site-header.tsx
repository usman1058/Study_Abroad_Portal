"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { ArrowUpRight, Menu, UserRoundPlus } from "lucide-react";
import { portalUrl } from "@/lib/portal";

const navigation = [
  { href: "/applications", label: "Study programs" },
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQs" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const menuRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (menuRef.current) menuRef.current.open = false;
  }, [pathname]);
  return <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
    <div className="site-container flex h-24 items-center justify-between gap-3 sm:h-28 lg:h-32">
      <Link href="/" aria-label="CheckMyUni home" className="group inline-flex shrink-0 items-center">
        <Image src="/checkmyuni-full-logo.png" alt="" aria-hidden="true" width={144} height={107} priority unoptimized className="block h-auto w-28 shrink-0 sm:w-32 lg:w-36" />
      </Link>
      <nav aria-label="Main navigation" className="hidden items-center gap-6 lg:flex">
        {navigation.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return <Link key={item.href} href={item.href} aria-current={pathname === item.href ? "page" : undefined} className={`rounded-md px-1 py-2 text-sm font-semibold transition hover:text-blue ${active ? "text-blue underline decoration-2 underline-offset-8" : "text-slate-600"}`}>{item.label}</Link>;
        })}
      </nav>
      <div className="hidden items-center gap-2 lg:flex">
        <Link href={portalUrl("/")} className="rounded-lg px-3 py-2 text-sm font-bold text-navy transition hover:bg-blue-soft hover:text-blue">Access portal</Link>
        <Link href="/get-started" className="btn-primary"><UserRoundPlus aria-hidden="true" className="h-4 w-4" />Create account</Link>
      </div>
      <details ref={menuRef} className="relative lg:hidden">
        <summary aria-label="Open navigation menu" className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-lg border border-slate-200 text-navy [&::-webkit-details-marker]:hidden"><Menu aria-hidden="true" className="h-5 w-5" /></summary>
        <nav aria-label="Mobile navigation" className="absolute right-0 top-12 flex w-64 flex-col gap-1 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
          {navigation.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return <Link key={item.href} href={item.href} aria-current={pathname === item.href ? "page" : undefined} className={`min-h-11 rounded-lg px-3 py-3 text-sm font-semibold hover:bg-blue-soft hover:text-blue ${active ? "bg-blue-soft text-blue" : "text-slate-700"}`}>{item.label}</Link>;
          })}
          <Link href={portalUrl("/")} className="rounded-lg px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-blue-soft">Access portal</Link>
          <Link href="/get-started" className="btn-primary mt-1"><UserRoundPlus className="h-4 w-4" />Create account</Link>
          <Link href="/contact" className="btn-secondary mt-1">Talk to an advisor <ArrowUpRight className="h-4 w-4" /></Link>
        </nav>
      </details>
    </div>
  </header>;
}
