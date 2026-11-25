import type { Metadata } from "next";

const SITE_NAME = "CheckMyUni";
const SOCIAL_IMAGE = { url: "/checkmyuni-og.jpg", width: 1200, height: 630, alt: "CheckMyUni study program search and guidance" };

type PageMetadataInput = { title: string; description: string; path: string; keywords?: string | string[]; noIndex?: boolean };

export function pageMetadata({ title, description, path, keywords = [], noIndex = false }: PageMetadataInput): Metadata {
  return {
    title,
    description,
    keywords: [SITE_NAME, ...(Array.isArray(keywords) ? keywords : keywords.split(",").map((keyword) => keyword.trim()).filter(Boolean))],
    alternates: { canonical: path },
    robots: { index: !noIndex, follow: !noIndex },
    openGraph: { type: "website", siteName: SITE_NAME, title, description, url: path, images: [SOCIAL_IMAGE] },
    twitter: { card: "summary_large_image", title, description, images: [SOCIAL_IMAGE.url] },
  };
}
