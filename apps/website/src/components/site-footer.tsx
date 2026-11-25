import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Mail, MapPin } from "lucide-react";
import { portalUrl } from "@/lib/portal";

export function SiteFooter() {
  return <footer className="bg-navy text-white">
    <div className="site-container grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr] md:py-16">
      <div><Link href="/" aria-label="CheckMyUni home" className="inline-flex rounded-xl bg-white p-2"><Image src="/checkmyuni-logo.png" alt="" aria-hidden="true" width={144} height={107} className="h-auto w-32" /></Link><p className="mt-4 max-w-xs text-sm leading-6 text-slate-300">Clear guidance for your next step in education, wherever you want to study.</p><Link href="/contact" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-white hover:text-amber">Start a conversation <ArrowRight className="h-4 w-4" /></Link></div>
      <div><h2 className="text-sm font-bold text-white">Explore</h2><ul className="mt-4 space-y-3 text-sm text-slate-300"><li><Link className="hover:text-white" href="/applications">Study programs</Link></li><li><Link className="hover:text-white" href="/how-it-works">How it works</Link></li><li><Link className="hover:text-white" href="/about">About us</Link></li><li><Link className="hover:text-white" href="/faq">Frequently asked questions</Link></li></ul></div>
      <div><h2 className="text-sm font-bold text-white">Get support</h2><ul className="mt-4 space-y-3 text-sm text-slate-300"><li><Link className="hover:text-white" href="/contact">Contact an advisor</Link></li><li><Link className="hover:text-white" href="/partners">Partner with us</Link></li><li><Link className="hover:text-white" href="/get-started">Create an account</Link></li><li><Link className="hover:text-white" href={portalUrl("/")}>Access the portal</Link></li></ul></div>
      <div><h2 className="text-sm font-bold text-white">Contact</h2><ul className="mt-4 space-y-3 text-sm text-slate-300"><li className="flex items-start gap-2"><Mail aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-amber" /><Link href="/contact" className="hover:text-white">Send us an enquiry</Link></li><li className="flex items-start gap-2"><MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-amber" />Our team will connect you with the right advisor.</li></ul></div>
    </div>
    <div className="border-t border-white/10"><div className="site-container flex flex-col gap-3 py-5 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between"><p>© {new Date().getFullYear()} CheckMyUni. All rights reserved.</p><nav aria-label="Legal" className="flex flex-wrap gap-5"><Link href="/privacy" className="hover:text-white">Privacy</Link><Link href="/terms" className="hover:text-white">Terms</Link><Link href="/cookies" className="hover:text-white">Cookies</Link></nav></div></div>
  </footer>;
}
