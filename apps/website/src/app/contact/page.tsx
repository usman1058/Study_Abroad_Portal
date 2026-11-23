import type { Metadata } from "next";
import { ArrowDownRight, Clock3, MessageCircle, ShieldCheck } from "lucide-react";
import { ContactForm } from "@/components/contact-form";

export const metadata: Metadata = { title: "Contact us", description: "Ask a question about study programs or your next steps." };

export default function ContactPage() {
  return <>
    <section className="bg-ivory py-14 sm:py-20"><div className="site-container"><p className="eyebrow">We’re here to help</p><h1 className="mt-3 max-w-3xl font-display text-4xl font-extrabold leading-tight text-navy sm:text-5xl">Let’s talk about where you want to go.</h1><p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">Tell us what you’re considering. Your message goes straight into our advising team’s enquiry queue.</p></div></section>
    <section className="section-space pt-10"><div className="site-container grid items-start gap-8 lg:grid-cols-[.72fr_1.28fr]">
      <aside className="space-y-4"><div className="surface-card p-6"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-soft text-blue"><MessageCircle className="h-5 w-5" /></span><h2 className="mt-4 font-display text-xl font-bold text-navy">What happens next?</h2><p className="mt-2 text-sm leading-6 text-slate-600">Your enquiry is saved in the portal’s Visitor Form section. An administrator can review it and route it to the right person.</p><ArrowDownRight aria-hidden="true" className="mt-4 h-5 w-5 text-blue" /></div><div className="rounded-xl border border-slate-200 bg-white p-5"><div className="flex gap-3"><ShieldCheck aria-hidden="true" className="h-5 w-5 shrink-0 text-blue" /><div><h2 className="font-bold text-navy">Your details stay in the enquiry workflow</h2><p className="mt-1 text-sm leading-6 text-slate-600">We use your contact details to respond to this request. See our <a className="font-semibold text-blue underline" href="/privacy">privacy notice</a>.</p></div></div></div><div className="rounded-xl border border-slate-200 bg-white p-5"><div className="flex gap-3"><Clock3 aria-hidden="true" className="h-5 w-5 shrink-0 text-blue" /><div><h2 className="font-bold text-navy">No pressure, just a first conversation</h2><p className="mt-1 text-sm leading-6 text-slate-600">Share only what’s useful. You can ask about a destination, subject, or how the application process works.</p></div></div></div></aside>
      <section aria-labelledby="contact-form-heading" className="surface-card p-5 sm:p-8"><h2 id="contact-form-heading" className="font-display text-2xl font-bold text-navy">Send an enquiry</h2><p className="mt-2 text-sm text-slate-600">Fields marked with an asterisk are required.</p><div className="mt-6"><ContactForm /></div></section>
    </div></section>
  </>;
}
