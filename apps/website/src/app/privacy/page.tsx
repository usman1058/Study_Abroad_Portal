import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy notice" };

const sections = [
  { title: "Information you provide", text: "When you send the public contact form, we collect the name, email address, phone number, destination or subject interests, and message you choose to provide. Please do not include passport numbers, financial details, or sensitive documents in this form." },
  { title: "How we use enquiries", text: "Contact form submissions are sent to the Visitor Form queue in the StudyAbroad portal so the team can review and respond. Enquiry details are not displayed in the public catalog." },
  { title: "Program browsing", text: "The public catalog retrieves program and institution information managed in the portal. Browsing the catalog does not expose student profiles, applications, documents, or messages." },
  { title: "Sharing and service providers", text: "Enquiry information is available to authorized personnel who handle enquiries. The website and portal infrastructure may process information to host, secure, and deliver the service. We do not sell enquiry information." },
  { title: "Retention and security", text: "Enquiry records are retained in the portal so the team can follow up and manage its workflow. Access controls and technical safeguards are used to protect the systems, though no internet service can guarantee absolute security." },
  { title: "Your choices", text: "You may ask what contact information we hold or request a correction or deletion by submitting a request through the Contact page. We may need to verify your identity and may retain records where required for legitimate operational or legal reasons." },
  { title: "Student portal", text: "If you create an account or submit an application, additional personal information is handled in the separate student portal. Its account and privacy information applies to those activities." },
  { title: "Updates and questions", text: "We may update this notice when our practices change. If you have a privacy question, use the Contact page and identify it as a privacy request." },
];

export default function PrivacyPage() {
  return <section className="bg-ivory py-14 sm:py-20"><div className="site-container max-w-4xl"><p className="eyebrow">Your information</p><h1 className="mt-3 font-display text-4xl font-extrabold text-navy sm:text-5xl">Privacy notice</h1><p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">A plain-language summary of what happens when you browse the public site or send us an enquiry.</p><div className="surface-card mt-10 space-y-8 p-6 sm:p-10">{sections.map((section) => <section key={section.title}><h2 className="font-display text-xl font-bold text-navy">{section.title}</h2><p className="prose-copy mt-2">{section.text}</p></section>)}</div><p className="mt-5 text-xs leading-5 text-slate-500">This notice should be reviewed against the organization's actual data retention, hosting, and legal obligations before launch.</p></div></section>;
}
