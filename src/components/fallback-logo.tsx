"use client";

import { useState } from "react";

const BRAND_LOGO = "/checkmyuni-full-logo.png";

/** Shows the supplied institution mark, then falls back to CheckMyUni if absent or unavailable. */
export function FallbackLogo({ src, alt, className }: { src?: string | null; alt: string; className: string }) {
  const [failed, setFailed] = useState(false);
  const usingBrandFallback = failed || !src;
  return <img src={usingBrandFallback ? BRAND_LOGO : src} alt={usingBrandFallback ? "CheckMyUni logo" : alt} onError={() => setFailed(true)} className={className} />;
}
