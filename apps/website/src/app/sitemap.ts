import type { MetadataRoute } from "next";
import { getPrograms, programHref } from "@/lib/portal";

const BASE_URL = "https://checkmyuni.com";
const STATIC_PATHS = ["", "/applications", "/about", "/how-it-works", "/partners", "/contact", "/faq", "/terms", "/privacy", "/cookies"];
const MAX_URLS = 50_000;
const PAGE_BATCH_SIZE = 10;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const urls: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({ url: new URL(path, BASE_URL).toString() }));
  const firstPage = await getPrograms({ page: 1 });
  if (!firstPage.available) return urls;

  const pageSize = Math.max(firstPage.pagination.pageSize, 1);
  const maxProgramPages = Math.floor((MAX_URLS - urls.length) / pageSize);
  const pageCount = Math.min(firstPage.pagination.pageCount, maxProgramPages);
  const programs = [...firstPage.programs];

  for (let start = 2; start <= pageCount; start += PAGE_BATCH_SIZE) {
    const end = Math.min(start + PAGE_BATCH_SIZE - 1, pageCount);
    const pages = await Promise.all(
      Array.from({ length: end - start + 1 }, (_, index) => getPrograms({ page: start + index }))
    );
    for (const page of pages) {
      if (page.available) programs.push(...page.programs);
    }
  }

  const detailUrls = new Set(programs.map((program) => new URL(programHref(program), BASE_URL).toString()));
  return [...urls, ...Array.from(detailUrls, (url) => ({ url }))].slice(0, MAX_URLS);
}
