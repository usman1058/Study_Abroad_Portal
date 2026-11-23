import Link from "next/link";
import { ArrowRight, ArrowUpRight, BadgeCheck, BookOpenCheck, Globe2, HeartHandshake, ShieldCheck, Sparkles, UserRoundPlus } from "lucide-react";
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
      <div className="site-container grid min-h-[38rem] items-center gap-8 py-14 md:grid-cols-[1.1fr_.9fr] md:py-20 lg:min-h-[43rem]">
        <div className="site-reveal relative z-10 max-w-[46rem]">
          <p className="eyebrow inline-flex items-center gap-2 rounded-full border border-blue/15 bg-white px-3 py-2 shadow-sm"><Sparkles aria-hidden="true" className="h-4 w-4" /> Your future has more than one destination</p>
          <h1 className="mt-6 max-w-[13ch] font-display text-[clamp(3rem,6.5vw,5.65rem)] font-extrabold leading-[1.01] text-navy">Make your next <span className="relative inline-block text-blue">move count.<span aria-hidden="true" className="absolute -bottom-1 left-0 -z-0 h-2 w-full rounded-full bg-amber/65" /></span></h1>
          <p className="mt-6 max-w-[37rem] text-lg leading-8 text-slate-600">Find a study path that feels right for you. Explore real programs, understand what comes next, and get support along the way.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row"><Link href="/get-started" className="btn-primary"><UserRoundPlus aria-hidden="true" className="h-4 w-4" />Create an account</Link><Link href="/applications" className="btn-secondary">Explore study programs <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link></div>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm"><Link href={portalUrl("/")} className="font-bold text-blue underline decoration-blue/30 underline-offset-4 hover:text-blue-dark">Already registered? Access the portal <ArrowUpRight aria-hidden="true" className="inline h-3.5 w-3.5" /></Link><Link href="/contact" className="font-semibold text-slate-600 underline decoration-slate-300 underline-offset-4 hover:text-blue">Talk to an advisor</Link></div>
          <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-500"><span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-blue" /> Clear information</span><span className="inline-flex items-center gap-2"><HeartHandshake className="h-4 w-4 text-blue" /> Human guidance</span><span className="inline-flex items-center gap-2"><Globe2 className="h-4 w-4 text-blue" /> Global choices</span></div>
        </div>
        <div className="site-reveal site-reveal-delay-2 relative"><HeroArt /></div>
      </div>
      <div className="border-y border-slate-200/80 bg-white"><div className="site-container py-9 sm:py-11">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="eyebrow">A clearer first step</p><h2 className="mt-2 max-w-3xl font-display text-2xl font-extrabold leading-tight text-navy sm:text-3xl">Useful choices, with support when you need it.</h2></div><Link href="/get-started" className="inline-flex min-h-11 shrink-0 items-center gap-2 font-bold text-blue hover:text-blue-dark">Choose your account type <ArrowRight className="h-4 w-4" /></Link></div>
        <div className="grid gap-3 sm:grid-cols-3 sm:gap-5">
          <div className="site-reveal surface-card flex min-h-32 items-center gap-4 p-5 sm:p-6"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-soft text-blue"><BookOpenCheck className="h-6 w-6" /></span><span><strong className="block font-display text-3xl font-extrabold tracking-tight text-navy sm:text-4xl">{catalog.available ? catalog.pagination.total : "—"}</strong><span className="mt-1 block text-sm font-semibold text-slate-600">programs in the live catalog</span></span></div>
          <div className="site-reveal site-reveal-delay-1 surface-card flex min-h-32 items-center gap-4 p-5 sm:p-6"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-soft text-blue"><Globe2 className="h-6 w-6" /></span><span><strong className="block font-display text-3xl font-extrabold tracking-tight text-navy sm:text-4xl">{catalog.available ? catalog.filters.countries.length : "—"}</strong><span className="mt-1 block text-sm font-semibold text-slate-600">destinations represented</span></span></div>
          <div className="site-reveal site-reveal-delay-2 surface-card flex min-h-32 items-center gap-4 p-5 sm:p-6"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-soft text-blue"><BadgeCheck className="h-6 w-6" /></span><span><strong className="block font-display text-2xl font-extrabold tracking-tight text-navy sm:text-3xl">Step by step</strong><span className="mt-1 block text-sm font-semibold text-slate-600">guidance throughout the process</span></span></div>
        </div>
      </div></div>
    </section>

    <section className="section-space"><div className="site-container">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div className="section-heading"><p className="eyebrow">Find your fit</p><h2>Start with a program that sparks your interest.</h2><p>Explore options from the live catalog. Compare what matters to you and open each program for the full details.</p></div><Link href="/applications" className="inline-flex min-h-11 shrink-0 items-center gap-2 font-bold text-blue hover:text-blue-dark">Browse all programs <ArrowRight className="h-4 w-4" /></Link></div>
      {featured.length ? <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{featured.map((program, index) => <div key={program.id} className={`site-reveal ${index === 1 ? "site-reveal-delay-1" : index === 2 ? "site-reveal-delay-2" : ""}`}><ProgramCard program={program} /></div>)}</div> : <div className="mt-10 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center"><p className="font-bold text-navy">{catalog.available ? "The program catalog is getting ready." : "Program listings are temporarily unavailable."}</p><p className="mt-2 text-sm text-slate-600">You can still tell us what you want to study and an advisor will help you explore options.</p><Link href="/contact" className="btn-primary mt-5">Ask an advisor <ArrowRight className="h-4 w-4" /></Link></div>}
    </div></section>

    <section className="section-space bg-ivory"><div className="site-container grid gap-12 lg:grid-cols-[.8fr_1.2fr]">
      <div className="section-heading lg:sticky lg:top-28 lg:self-start"><p className="eyebrow">A clearer process</p><h2>Big plans feel easier with a next step.</h2><p>Going abroad is a journey. We help you break it into manageable decisions and keep the important details in view.</p><Link href="/about" className="btn-secondary mt-6">How we support you <ArrowRight className="h-4 w-4" /></Link></div>
      <ol className="space-y-4">{steps.map((step, index) => <li key={step.number} className={`site-reveal ${index === 1 ? "site-reveal-delay-1" : index === 2 ? "site-reveal-delay-2" : ""} surface-card grid gap-4 p-6 sm:grid-cols-[4rem_1fr] sm:gap-6 sm:p-8`}><span className="font-display text-3xl font-extrabold text-blue/45">{step.number}</span><div><h3 className="font-display text-xl font-bold text-navy">{step.title}</h3><p className="mt-2 max-w-xl leading-7 text-slate-600">{step.body}</p></div></li>)}</ol>
    </div></section>

    <section className="section-space"><div className="site-container"><div className="relative overflow-hidden rounded-[2rem] bg-navy px-6 py-12 text-white sm:px-10 sm:py-16 lg:px-16"><div aria-hidden="true" className="absolute -right-12 -top-36 h-96 w-96 rounded-full border border-white/10" /><div aria-hidden="true" className="absolute -right-2 -top-24 h-72 w-72 rounded-full border border-white/10" /><div className="site-reveal relative max-w-3xl"><p className="text-xs font-extrabold uppercase tracking-[.15em] text-amber">A good conversation can change your direction</p><h2 className="mt-4 max-w-2xl font-display text-3xl font-extrabold leading-tight sm:text-4xl">Not sure where to begin? Let’s figure out your next step.</h2><p className="mt-4 max-w-xl leading-7 text-blue-100">Create an account to keep your next steps together, open the portal if you already have one, or talk with an advisor.</p><div className="mt-7 flex flex-wrap gap-3"><Link href="/get-started" className="btn-primary"><UserRoundPlus className="h-4 w-4" />Create an account</Link><Link href={portalUrl("/")} className="btn-light">Access the portal <ArrowUpRight className="h-4 w-4" /></Link><Link href="/contact" className="inline-flex min-h-12 items-center rounded-xl border border-white/25 px-5 text-sm font-bold text-white transition hover:bg-white/10">Talk to an advisor <ArrowRight className="h-4 w-4" /></Link></div></div></div></div></section>
  </>;
}
