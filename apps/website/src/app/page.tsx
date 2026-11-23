import Link from "next/link";
import { ArrowRight, ArrowUpRight, BadgeCheck, BookOpenCheck, Compass, Globe2, HeartHandshake, ShieldCheck, Sparkles } from "lucide-react";
import { HeroArt } from "@/components/hero-art";
import { ProgramCard } from "@/components/program-card";
import { getPrograms, portalUrl } from "@/lib/portal";

const steps = [
  { number: "01", title: "Explore your options", body: "Browse real study programs and compare locations, levels, fees, and entry requirements." },
  { number: "02", title: "Talk through your goals", body: "Tell us what you want to study. An advisor can help you understand your next steps." },
  { number: "03", title: "Move forward with clarity", body: "When you're ready, continue in the student portal to manage your application and documents." },
];

export default async function HomePage() {
  const catalog = await getPrograms({ page: 1 });
  const featured = catalog.programs.slice(0, 3);

  return <>
    <section className="relative overflow-hidden bg-ivory">
      <div aria-hidden="true" className="pointer-events-none absolute -left-48 top-20 h-[30rem] w-[30rem] rounded-full bg-blue/5 blur-3xl" />
      <div className="site-container grid min-h-[38rem] items-center gap-8 py-14 md:grid-cols-[1.05fr_.95fr] md:py-20 lg:min-h-[43rem]">
        <div className="relative z-10 max-w-[41rem]">
          <p className="eyebrow inline-flex items-center gap-2 rounded-full border border-blue/15 bg-white px-3 py-2 shadow-sm"><Sparkles aria-hidden="true" className="h-4 w-4" /> Your future has more than one destination</p>
          <h1 className="mt-6 font-display text-[clamp(2.8rem,6vw,5.25rem)] font-extrabold leading-[1.02] text-navy">Make your next <span className="relative inline-block text-blue">move count.<span aria-hidden="true" className="absolute -bottom-1 left-0 -z-0 h-2 w-full rounded-full bg-amber/65" /></span></h1>
          <p className="mt-6 max-w-[37rem] text-lg leading-8 text-slate-600">Find a study path that feels right for you. Explore real programs, understand what comes next, and get support along the way.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row"><Link href="/applications" className="btn-primary">Explore study programs <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link><Link href="/contact" className="btn-secondary">Talk to an advisor <ArrowUpRight aria-hidden="true" className="h-4 w-4" /></Link></div>
          <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-500"><span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-blue" /> Clear information</span><span className="inline-flex items-center gap-2"><HeartHandshake className="h-4 w-4 text-blue" /> Human guidance</span><span className="inline-flex items-center gap-2"><Globe2 className="h-4 w-4 text-blue" /> Global choices</span></div>
        </div>
        <div className="relative"><HeroArt /></div>
      </div>
      <div className="border-y border-slate-200/80 bg-white/80"><div className="site-container grid gap-4 py-5 text-sm sm:grid-cols-3 sm:gap-8">
        <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-soft text-blue"><BookOpenCheck className="h-5 w-5" /></span><span><strong className="block text-navy">{catalog.available ? catalog.pagination.total : "—"} programs</strong><span className="text-slate-500">in the live catalog</span></span></div>
        <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-soft text-blue"><Globe2 className="h-5 w-5" /></span><span><strong className="block text-navy">{catalog.available ? catalog.filters.countries.length : "—"} destinations</strong><span className="text-slate-500">represented in the catalog</span></span></div>
        <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-soft text-blue"><BadgeCheck className="h-5 w-5" /></span><span><strong className="block text-navy">One step at a time</strong><span className="text-slate-500">support through the process</span></span></div>
      </div></div>
    </section>

    <section className="section-space"><div className="site-container">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div className="section-heading"><p className="eyebrow">Find your fit</p><h2>Start with a program that sparks your interest.</h2><p>Explore options from the live catalog. Compare what matters to you and open each program for the full details.</p></div><Link href="/applications" className="inline-flex min-h-11 shrink-0 items-center gap-2 font-bold text-blue hover:text-blue-dark">Browse all programs <ArrowRight className="h-4 w-4" /></Link></div>
      {featured.length ? <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{featured.map((program) => <ProgramCard key={program.id} program={program} />)}</div> : <div className="mt-10 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center"><p className="font-bold text-navy">{catalog.available ? "The program catalog is getting ready." : "Program listings are temporarily unavailable."}</p><p className="mt-2 text-sm text-slate-600">You can still tell us what you want to study and an advisor will help you explore options.</p><Link href="/contact" className="btn-primary mt-5">Ask an advisor <ArrowRight className="h-4 w-4" /></Link></div>}
    </div></section>

    <section className="section-space bg-ivory"><div className="site-container grid gap-12 lg:grid-cols-[.8fr_1.2fr]">
      <div className="section-heading lg:sticky lg:top-28 lg:self-start"><p className="eyebrow">A clearer process</p><h2>Big plans feel easier with a next step.</h2><p>Going abroad is a journey. We help you break it into manageable decisions and keep the important details in view.</p><Link href="/about" className="btn-secondary mt-6">How we support you <ArrowRight className="h-4 w-4" /></Link></div>
      <ol className="space-y-4">{steps.map((step) => <li key={step.number} className="surface-card grid gap-4 p-6 sm:grid-cols-[4rem_1fr] sm:gap-6 sm:p-8"><span className="font-display text-3xl font-extrabold text-blue/45">{step.number}</span><div><h3 className="font-display text-xl font-bold text-navy">{step.title}</h3><p className="mt-2 max-w-xl leading-7 text-slate-600">{step.body}</p></div></li>)}</ol>
    </div></section>

    <section className="section-space"><div className="site-container"><div className="relative overflow-hidden rounded-[2rem] bg-navy px-6 py-12 text-white sm:px-10 sm:py-16 lg:px-16"><div aria-hidden="true" className="absolute -right-12 -top-36 h-96 w-96 rounded-full border border-white/10" /><div aria-hidden="true" className="absolute -right-2 -top-24 h-72 w-72 rounded-full border border-white/10" /><div className="relative max-w-2xl"><p className="text-xs font-extrabold uppercase tracking-[.15em] text-amber">A good conversation can change your direction</p><h2 className="mt-4 font-display text-3xl font-extrabold leading-tight sm:text-4xl">Not sure where to begin? Let’s figure out your next step.</h2><p className="mt-4 max-w-xl leading-7 text-blue-100">Share what you’re interested in. We’ll connect your enquiry with our advising team.</p><div className="mt-7 flex flex-wrap gap-3"><Link href="/contact" className="btn-light">Contact an advisor <ArrowRight className="h-4 w-4" /></Link><Link href={portalUrl("/student/signup")} className="inline-flex min-h-12 items-center rounded-xl border border-white/25 px-5 text-sm font-bold text-white hover:bg-white/10">Create a student account</Link></div></div></div></div></section>
  </>;
}
