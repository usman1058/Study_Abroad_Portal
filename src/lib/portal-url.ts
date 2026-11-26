const PRODUCTION_PORTAL_ORIGIN = "https://portal.checkmyuni.com";
const LOCAL_PORTAL_ORIGIN = "http://localhost:3000";

function isAllowedPortalOrigin(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.hostname.toLowerCase().endsWith(".vercel.app")) return null;
    return url.origin;
  } catch {
    return null;
  }
}

/** Use the branded portal host in production and never emit a Vercel preview URL. */
export function portalBaseUrl(): string {
  if (process.env.NODE_ENV === "production") return PRODUCTION_PORTAL_ORIGIN;

  for (const candidate of [process.env.NEXT_PUBLIC_BASE_URL, process.env.AUTH_URL, process.env.NEXT_PUBLIC_PORTAL_URL]) {
    if (!candidate) continue;
    const origin = isAllowedPortalOrigin(candidate);
    if (origin) return origin;
  }
  return LOCAL_PORTAL_ORIGIN;
}
