import type { Metadata } from "next";
import { Suspense } from "react";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { Providers } from "@/components/providers";
import { RouteProgress } from "@/components/route-progress";
import { WhatsAppContactButton } from "@/components/whatsapp-contact-button";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL("https://portal.checkmyuni.com"),
  applicationName: "CheckMyUni",
  title: {
    default: "CheckMyUni Portal",
    template: "%s · CheckMyUni Portal",
  },
  description: "Manage study programs, applications, documents, payments, and student support with CheckMyUni.",
  robots: { index: false, follow: false },
  openGraph: {
    type: "website",
    siteName: "CheckMyUni",
    title: "CheckMyUni Portal",
    description: "Your study programs, applications, documents, and support in one place.",
    url: "https://portal.checkmyuni.com",
  },
  twitter: {
    card: "summary",
    title: "CheckMyUni Portal",
    description: "Your study programs, applications, documents, and support in one place.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${jakarta.variable}`}>
      <body>
        <Suspense fallback={null}><RouteProgress /></Suspense>
        <Providers>{children}</Providers>
        <WhatsAppContactButton />
      </body>
    </html>
  );
}
