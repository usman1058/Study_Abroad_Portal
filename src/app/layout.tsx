import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import { RouteProgress } from "@/components/route-progress";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "StudyAbroad Portal",
    template: "%s · StudyAbroad Portal",
  },
  description: "Study abroad & visa agency management system",
  openGraph: {
    images: [{ url: "/images/og-image.png" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
      </head>
      <body>
        <RouteProgress />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
