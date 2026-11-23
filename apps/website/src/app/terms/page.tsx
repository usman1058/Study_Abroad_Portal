import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms and conditions" };

const sections = [
  { title: "Using this website", text: "You may use this website to learn about our services, browse the public program catalog, and send an enquiry. Please use the site lawfully and do not attempt to disrupt, damage, or gain unauthorized access to the website or the connected portal." },
  { title: "Program information", text: "Program descriptions, fees, entry requirements, dates, and other listing details are supplied through the portal catalog and may change. A listing is for general information and is not an offer of admission. Confirm current requirements and costs with the institution and an advisor before relying on them." },
  { title: "Admissions and immigration decisions", text: "Submitting an enquiry or starting an application does not guarantee admission, a scholarship, a visa, or any other outcome. Institutions and relevant government authorities make their own decisions. You are responsible for providing accurate information and meeting applicable deadlines." },
  { title: "Student portal", text: "Applications, personal information, uploaded documents, and messages are managed through the separate student portal. Portal use may be subject to additional terms and account requirements presented there." },
  { title: "Third-party websites", text: "The website may link to institution websites or the student portal. We do not control the content, security, or privacy practices of external sites. Review their terms and notices before using them." },
  { title: "Changes and availability", text: "We may update website content and these terms as the service changes. We aim to keep the site available but do not promise uninterrupted access. The latest version of these terms will be published on this page." },
  { title: "Contact", text: "If you have a question about these terms, use the Contact page and select the relevant topic in your enquiry." },
];

export default function TermsPage() {
  return <section className="bg-ivory py-14 sm:py-20"><div className="site-container max-w-4xl"><p className="eyebrow">Legal information</p><h1 className="mt-3 font-display text-4xl font-extrabold text-navy sm:text-5xl">Terms and conditions</h1><p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">These terms describe the basic conditions for using the StudyAbroad public website.</p><div className="surface-card mt-10 space-y-8 p-6 sm:p-10">{sections.map((section) => <section key={section.title}><h2 className="font-display text-xl font-bold text-navy">{section.title}</h2><p className="prose-copy mt-2">{section.text}</p></section>)}</div><p className="mt-5 text-xs leading-5 text-slate-500">These website terms should be reviewed and adapted for the operating entity and applicable jurisdiction before launch.</p></div></section>;
}
