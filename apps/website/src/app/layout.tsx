import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { WhatsAppContactButton } from "@/components/whatsapp-contact-button";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://checkmyuni.com"),
  applicationName: "CheckMyUni",
  title: { default: "CheckMyUni — Find your next destination", template: "%s | CheckMyUni" },
  description: "Explore study programs, compare your options, and get practical support with CheckMyUni.",
  openGraph: {
    type: "website",
    siteName: "CheckMyUni",
    title: "CheckMyUni — Find your next destination",
    description: "Explore study programs, compare your options, and get practical support with CheckMyUni.",
    url: "https://checkmyuni.com",
  },
  twitter: {
    card: "summary",
    title: "CheckMyUni — Find your next destination",
    description: "Explore study programs, compare your options, and get practical support with CheckMyUni.",
  },
};

export default function WebsiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={`${inter.variable} ${jakarta.variable}`}><body>
    <a className="skip-link" href="#main-content">Skip to content</a>
    <SiteHeader />
    <main id="main-content">{children}</main>
    <SiteFooter />
    <WhatsAppContactButton />
  </body></html>;
}
