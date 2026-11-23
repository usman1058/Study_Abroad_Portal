import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of use",
  description: "Terms for using the CheckMyUni website and StudyAbroad portal.",
};

const sections = [
  {
    title: "Using the website and portal",
    body: "You may use the public website to read about the service, browse published programs, and send an enquiry. Portal accounts are for the person or organization named on the account. Keep sign-in details secure, provide accurate information, and promptly tell the team if you suspect unauthorized account use.",
  },
  {
    title: "Program listings and fees",
    body: "Program names, entry information, dates, availability, tuition, and other fees come from records maintained in the portal and may change. A listing is general information, not an offer of admission. Fees shown may exclude living costs, travel, insurance, and other charges; confirm current details with the institution before making a decision.",
  },
  {
    title: "Applications and outcomes",
    body: "An enquiry, account, or application does not guarantee admission, a scholarship, a visa, or another outcome. Institutions and government authorities make their own decisions. You are responsible for reviewing requirements, supplying accurate information, and meeting relevant deadlines.",
  },
  {
    title: "Acceptable use",
    body: "Do not use the service to break the law, interfere with its operation, access another person’s records, upload harmful content, or bypass account permissions. The team may restrict access when needed to protect users, records, or the service.",
  },
  {
    title: "Third-party services and availability",
    body: "The service may link to institution websites and relies on hosting, email, storage, and other providers. Their services and websites have their own terms and privacy practices. The team works to keep CheckMyUni available, but maintenance, provider issues, or network problems may interrupt access.",
  },
  {
    title: "Changes and questions",
    body: "These terms may be updated as the service changes. Revised terms will be published on this page with an updated date. Please review this page periodically. If you have a question, use the Contact page or email info@checkmyuni.com.",
  },
];

export default function TermsPage() {
  return <section className="bg-ivory py-14 sm:py-20">
    <div className="site-container max-w-4xl">
      <p className="eyebrow">Legal information</p>
      <h1 className="mt-3 font-display text-4xl font-extrabold text-navy sm:text-5xl">Terms of use</h1>
      <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">These terms cover use of the CheckMyUni public website and its connected StudyAbroad portal.</p>
      <div className="surface-card mt-10 space-y-8 p-6 sm:p-10">
        {sections.map(({ title, body }) => <section key={title}><h2 className="font-display text-xl font-bold text-navy">{title}</h2><p className="prose-copy mt-2">{body}</p></section>)}
      </div>
      <p className="mt-6 text-sm leading-6 text-slate-600">Questions about these terms? <Link href="/contact" className="font-semibold text-blue underline underline-offset-4">Contact the team</Link> or email <a className="font-semibold text-blue underline underline-offset-4" href="mailto:info@checkmyuni.com">info@checkmyuni.com</a>.</p>
    </div>
  </section>;
}
