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
  return <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 shadow-[0_8px_28px_rgba(25,48,95,0.06)] backdrop-blur-xl">
    <div className="site-container flex h-20 items-center justify-between gap-3 sm:h-24 lg:h-28">
      <Link href="/" aria-label="CheckMyUni home" className="group inline-flex shrink-0 items-center rounded-md focus-visible:outline-offset-4">
        <Image src="/checkmyuni-full-logo.png" alt="" aria-hidden="true" width={128} height={95} priority unoptimized className="block h-auto w-24 shrink-0 sm:w-28 lg:w-32" />
      </Link>
      <nav aria-label="Main navigation" className="hidden items-center gap-3 xl:gap-5 lg:flex">
        {navigation.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`site-nav-link rounded-md px-1 ${active ? "is-active" : ""}`}>{item.label}</Link>;
        })}
      </nav>
      <div className="hidden items-center gap-2 lg:flex">
        <Link href={portalUrl("/")} className="rounded-lg px-3 py-2.5 text-base font-bold text-navy transition hover:bg-blue-soft hover:text-blue">Access portal</Link>
        <Link href="/get-started" className="btn-primary"><UserRoundPlus aria-hidden="true" className="h-4 w-4" />Create account</Link>
      </div>
      <details ref={menuRef} className="site-nav-menu relative lg:hidden">
        <summary aria-label="Open navigation menu" className="flex h-12 w-12 cursor-pointer list-none items-center justify-center rounded-xl border border-slate-200 bg-white text-navy shadow-sm transition hover:border-blue/40 hover:bg-blue-soft focus-visible:outline-none [&::-webkit-details-marker]:hidden"><Menu aria-hidden="true" className="h-5 w-5" /></summary>
        <nav aria-label="Mobile navigation" className="site-nav-menu-panel absolute right-0 top-14 flex w-72 flex-col gap-1 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl">
          {navigation.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`flex min-h-12 items-center rounded-xl px-3 text-[1.0625rem] font-bold transition hover:bg-blue-soft hover:text-blue ${active ? "bg-blue-soft text-blue" : "text-slate-700"}`}>{item.label}</Link>;
          })}
          <Link href={portalUrl("/")} className="flex min-h-12 items-center rounded-xl px-3 text-[1.0625rem] font-bold text-slate-700 transition hover:bg-blue-soft">Access portal</Link>
          <Link href="/get-started" className="btn-primary mt-2 min-h-12"><UserRoundPlus className="h-4 w-4" />Create account</Link>
          <Link href="/contact" className="btn-secondary mt-1 min-h-12">Talk to an advisor <ArrowUpRight className="h-4 w-4" /></Link>
        </nav>
      </details>
    </div>
  </header>;
}
