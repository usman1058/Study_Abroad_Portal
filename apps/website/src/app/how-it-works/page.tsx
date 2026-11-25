import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, ClipboardCheck, FileText, MessageSquareText, Search, UserRoundPlus } from "lucide-react";
import { portalUrl } from "@/lib/portal";

export const metadata = pageMetadata({ title: 'How CheckMyUni works', description: 'See how to explore university programs, discuss your goals with an advisor, and manage your application with CheckMyUni.', path: '/how-it-works', keywords: 'how to study abroad, university application process' });

const stages = [
  { number: "01", icon: Search, title: "Explore programs", text: "Search the public catalog by subject, study level, or destination. Open a program to review its listed costs, intakes, and requirements." },
  { number: "02", icon: MessageSquareText, title: "Ask questions", text: "Send an enquiry if you want to discuss a program, your plans, or what to consider before applying." },
  { number: "03", icon: ClipboardCheck, title: "Create your portal account", text: "When you decide to start, create a student account in the portal and begin your application there." },
  { number: "04", icon: FileText, title: "Manage your next steps", text: "Use your portal to complete details, organize documents, message your support team, and follow application updates." },
];

export default function HowItWorksPage() {
  return <><section className="bg-ivory py-16 sm:py-20"><div className="site-container"><p className="eyebrow">A step-by-step guide</p><h1 className="mt-3 max-w-3xl font-display text-4xl font-extrabold leading-tight text-navy sm:text-5xl">From first search to a clear next step.</h1><p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">Take the process at your pace. Start with public information; use the student portal when you’re ready to manage an application.</p></div></section><section className="section-space"><div className="site-container"><ol className="mx-auto max-w-4xl space-y-4">{stages.map(({ number, icon: Icon, title, text }) => <li key={number} className="surface-card grid gap-5 p-6 sm:grid-cols-[3rem_3rem_1fr] sm:items-start sm:p-8"><span aria-hidden="true" className="font-display text-2xl font-extrabold text-blue">{number}</span><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-soft text-blue"><Icon aria-hidden="true" className="h-5 w-5" /></span><div><h2 className="font-display text-xl font-bold text-navy">{title}</h2><p className="mt-2 leading-7 text-slate-600">{text}</p></div></li>)}</ol><div className="mt-10 flex flex-wrap justify-center gap-3"><Link href="/applications" className="btn-primary">Explore programs <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link><Link href={portalUrl("/student/signup")} className="btn-secondary"><UserRoundPlus aria-hidden="true" className="h-4 w-4" />Create a student account</Link><Link href={portalUrl("/")} className="btn-secondary">Access the portal <ArrowUpRight aria-hidden="true" className="h-4 w-4" /></Link></div></div></section></>;
}
