import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001").replace(/\/$/, "");
  return ["", "/applications", "/about", "/how-it-works", "/partners", "/contact", "/faq", "/terms", "/privacy"].map((path) => ({
    url: `${base}${path}`,
    changeFrequency: path === "/applications" ? "daily" : "monthly",
    priority: path === "" ? 1 : path === "/applications" ? 0.9 : 0.7,
  }));
}
