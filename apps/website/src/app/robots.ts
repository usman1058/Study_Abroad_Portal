import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = "https://checkmyuni.com";
  return {
    rules: [
      { userAgent: "OAI-SearchBot", allow: "/" },
      { userAgent: "*", allow: "/" },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
