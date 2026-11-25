import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import { ArrowRight, CircleHelp } from "lucide-react";

export const metadata = pageMetadata({ title: 'Study abroad FAQs', description: 'Find answers about study programs, tuition information, applications, documents, and getting support from CheckMyUni.', path: '/faq', keywords: 'study abroad questions, university application FAQs' });

const groups = [
  { title: "Programs and costs", questions: [
    ["Where do program listings come from?", "Program information is shown from the catalog maintained in the CheckMyUni portal. Availability and details can change, so confirm current information with an advisor or the institution before making a decision."],
    ["What does the listed tuition include?", "The public listing displays the tuition amount stored for the program. It may not specify a billing period or include living costs, insurance, travel, or other fees. Ask an advisor to confirm the full and current cost."],
    ["How do I know which program is right for me?", "Compare study level, subject, location, fees, and entry information. If you are unsure how your background fits, send an enquiry so an advisor can discuss your situation."],
  ] },
  { title: "Applications and the portal", questions: [
    ["Can I read program details without an account?", "Yes. The public catalog and program detail pages can be browsed without signing in. You need a student portal account to create and manage an application."],
    ["How do I start an application?", "Open a program detail page and choose the application link. It takes you to the student portal, where you can create an account or sign in."],
    ["Where can I track my application?", "After signing in to the student portal, open My Applications to see your application records and their current status."],
    ["Who can see my application and documents?", "Your application and documents are handled inside the portal and are scoped to your account and the staff assigned to support you. They are not displayed on the public website."],
  ] },
  { title: "Enquiries and partners", questions: [
    ["Where does my contact form go?", "Your enquiry is sent to the admin Visitor Form queue in the portal. The team can review it and follow up using the contact details you provide."],
    ["How can an institution or agency become a partner?", "Use the partner application linked from the Partners page. You will be asked to provide organization information and supporting documents. Portal access is granted after review and approval."],
  ] },
];

export default function FAQPage() {
  return <><section className="bg-ivory py-16 sm:py-20"><div className="site-container"><p className="eyebrow inline-flex items-center gap-2"><CircleHelp className="h-4 w-4" />Helpful answers</p><h1 className="mt-3 max-w-3xl font-display text-4xl font-extrabold leading-tight text-navy sm:text-5xl">Questions, answered clearly.</h1><p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">Find out how to explore programs, contact the team, and continue in the student portal.</p></div></section><section className="section-space pt-10"><div className="site-container mx-auto max-w-4xl space-y-10">{groups.map((group) => { const groupId = `faq-${group.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`; return <section key={group.title} aria-labelledby={groupId}><h2 id={groupId} className="font-display text-2xl font-bold text-navy">{group.title}</h2><div className="mt-4 divide-y divide-slate-200 border-y border-slate-200">{group.questions.map(([question, answer]) => <details key={question} className="group py-5"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-base font-bold text-navy marker:hidden [&::-webkit-details-marker]:hidden"><span>{question}</span><span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-soft text-blue transition group-open:rotate-45">+</span></summary><p className="max-w-3xl pt-3 pr-10 text-sm leading-7 text-slate-600">{answer}</p></details>)}</div></section>; })}<div className="surface-card flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-display text-xl font-bold text-navy">Still have a question?</h2><p className="mt-1 text-sm text-slate-600">Send the team an enquiry and tell us what you need help with.</p></div><Link href="/contact" className="btn-primary shrink-0">Contact us <ArrowRight className="h-4 w-4" /></Link></div></div></section></>;
}
