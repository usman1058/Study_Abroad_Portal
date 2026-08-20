import { NextRequest, NextResponse } from "next/server";

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyPrefix: string;
}

const store = new Map<string, { count: number; resetAt: number }>();

function cleanup() {
  const now = Date.now();
  for (const [key, val] of store.entries()) {
    if (val.resetAt < now) store.delete(key);
  }
}

setInterval(cleanup, 60_000);

export function rateLimit(config: RateLimitConfig) {
  return async function (req: NextRequest): Promise<NextResponse | null> {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    if (!checkRateLimit(config, ip)) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: { "Retry-After": "60" },
        }
      );
    }
    return null;
  };
}

export function checkRateLimit(config: RateLimitConfig, key: string): boolean {
  const fullKey = `${config.keyPrefix}:${key}`;
  const now = Date.now();

  let entry = store.get(fullKey);
  if (!entry || entry.resetAt < now) {
    entry = { count: 0, resetAt: now + config.windowMs };
    store.set(fullKey, entry);
  }

  entry.count++;

  if (entry.count > config.maxRequests) {
    return false;
  }

  return true;
}

export const signupRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 5, keyPrefix: "signup" });
export const loginRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 10, keyPrefix: "login" });