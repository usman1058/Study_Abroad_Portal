import { pageMetadata } from "@/lib/seo";
import Link from "next/link";

export const metadata = pageMetadata({ title: 'Cookie notice', description: 'Learn how cookies support sign-in, site security, and essential functions on CheckMyUni.', path: '/cookies', keywords: 'CheckMyUni cookies' });

export default function CookiesPage() {
  return <section className="bg-ivory py-14 sm:py-20">
    <div className="site-container max-w-4xl">
      <p className="eyebrow">Site preferences and sign-in</p>
      <h1 className="mt-3 font-display text-4xl font-extrabold text-navy sm:text-5xl">Cookie notice</h1>
      <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">Cookies are small browser files used to remember information between page requests.</p>
      <div className="surface-card mt-10 space-y-8 p-6 sm:p-10">
        <section><h2 className="font-display text-xl font-bold text-navy">Necessary portal cookies</h2><p className="prose-copy mt-2">When you sign in, the portal uses authentication and security cookies to maintain your session and protect account access. These cookies are required for signed-in portal features to work.</p></section>
        <section><h2 className="font-display text-xl font-bold text-navy">Public website</h2><p className="prose-copy mt-2">The public site does not require an account to browse programs or read its pages. Your browser or hosting provider may process technical information needed to deliver and protect the site.</p></section>
        <section><h2 className="font-display text-xl font-bold text-navy">Managing cookies</h2><p className="prose-copy mt-2">You can use browser settings to view, block, or delete cookies. Blocking necessary portal cookies may prevent sign-in and other account features from working properly.</p></section>
        <section><h2 className="font-display text-xl font-bold text-navy">Related information</h2><p className="prose-copy mt-2">See the <Link href="/privacy" className="font-semibold text-blue underline underline-offset-4">Privacy notice</Link> for information about personal data, or <Link href="/contact" className="font-semibold text-blue underline underline-offset-4">contact the team</Link> with a question.</p></section>
      </div>
    </div>
  </section>;
}
