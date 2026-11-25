import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { WhatsAppContactButton } from "@/components/whatsapp-contact-button";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL("https://checkmyuni.com"),
  applicationName: "CheckMyUni",
  authors: [{ name: "CheckMyUni" }],
  creator: "CheckMyUni",
  publisher: "CheckMyUni",
  category: "Education",
  keywords: ["CheckMyUni", "study abroad", "study programs", "international education", "university applications"],
  alternates: { canonical: "/" },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
  icons: { icon: "/icon.png", shortcut: "/icon.png", apple: "/icon.png" },
  title: { default: "CheckMyUni — Find your next destination", template: "%s | CheckMyUni" },
  description: "Explore study programs, compare your options, and get practical support with CheckMyUni.",
  openGraph: {
    type: "website",
    siteName: "CheckMyUni",
    title: "CheckMyUni — Find your next destination",
    description: "Explore study programs, compare your options, and get practical support with CheckMyUni.",
    url: "https://checkmyuni.com",
    images: [{ url: "/checkmyuni-og.jpg", width: 1200, height: 630, alt: "CheckMyUni study program search and guidance" }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/checkmyuni-og.jpg"],
    title: "CheckMyUni — Find your next destination",
    description: "Explore study programs, compare your options, and get practical support with CheckMyUni.",
  },
};

export default function WebsiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const structuredData = [
    { "@context": "https://schema.org", "@type": "Organization", name: "CheckMyUni", url: "https://checkmyuni.com", logo: "https://checkmyuni.com/checkmyuni-logo.png" },
    { "@context": "https://schema.org", "@type": "WebSite", name: "CheckMyUni", url: "https://checkmyuni.com", potentialAction: { "@type": "SearchAction", target: "https://checkmyuni.com/applications?q={search_term_string}", "query-input": "required name=search_term_string" } },
  ];
  return <html lang="en" className={`${inter.variable} ${jakarta.variable}`}><body>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
    <a className="skip-link" href="#main-content">Skip to content</a>
    <SiteHeader />
    <main id="main-content">{children}</main>
    <SiteFooter />
    <WhatsAppContactButton />
  </body></html>;
}
