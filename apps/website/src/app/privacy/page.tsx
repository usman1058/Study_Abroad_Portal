import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy notice",
  description: "How CheckMyUni handles information submitted through its website and study portal.",
};

const sections = [
  {
    title: "Information this service handles",
    body: "When you send an enquiry, the form collects your name, email address, phone number, destination and subject interests, and message. If you create a portal account or apply to a program, the portal also handles the account, academic, application, document, message, and payment information you provide for those services. Do not send passport or payment-card details through the public enquiry form.",
  },
  {
    title: "How information is used",
    body: "Enquiry details are saved in the portal’s Visitor Forms area so the team can review and respond. Portal information is used to operate accounts, review partner applications, support students, manage application records, and provide related portal functions such as document and payment tracking.",
  },
  {
    title: "Access and service providers",
    body: "Portal information is available to signed-in staff according to their account role and the records assigned to them. Hosting, database, file-storage, and email providers process information as needed to operate the website and portal. The public program catalog does not display private student profiles, applications, uploaded documents, or messages.",
  },
  {
    title: "Retention and security",
    body: "Records remain in the portal so the service team can manage the related enquiry, account, or application. The system does not publish a fixed retention period; records may be retained for operational, contractual, or legal needs. Access controls and encrypted connections are used where supported by the service providers, but no internet service can guarantee absolute security.",
  },
  {
    title: "Your requests",
    body: "You can ask to access or correct information, or ask for deletion, by contacting the team. The team may need to verify your identity and may retain information where it is still needed to operate the service or meet a legal obligation. Use the Contact page or email info@checkmyuni.com and identify the request as a privacy matter.",
  },
  {
    title: "Cookies and updates",
    body: "The portal uses necessary session cookies to support sign-in and security. See the Cookies page for more information. This notice may change when the service or its data practices change; the current version will be published here.",
  },
];

export default function PrivacyPage() {
  return <section className="bg-ivory py-14 sm:py-20">
    <div className="site-container max-w-4xl">
      <p className="eyebrow">Your information</p>
      <h1 className="mt-3 font-display text-4xl font-extrabold text-navy sm:text-5xl">Privacy notice</h1>
      <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">This notice explains what information is handled when you browse the CheckMyUni website, send an enquiry, or use the CheckMyUni portal.</p>
      <div className="surface-card mt-10 space-y-8 p-6 sm:p-10">
        {sections.map(({ title, body }) => <section key={title}><h2 className="font-display text-xl font-bold text-navy">{title}</h2><p className="prose-copy mt-2">{body}</p></section>)}
      </div>
      <p className="mt-6 text-sm leading-6 text-slate-600">For questions or privacy requests, <Link href="/contact" className="font-semibold text-blue underline underline-offset-4">contact the team</Link> or email <a className="font-semibold text-blue underline underline-offset-4" href="mailto:info@checkmyuni.com">info@checkmyuni.com</a>.</p>
    </div>
  </section>;
}
