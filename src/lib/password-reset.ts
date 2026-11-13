import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Stateless, single-use password-reset tokens.
 *
 * The token carries the user id, an expiry and the last 10 characters of the
 * current bcrypt hash. Because the hash suffix is part of the signed payload,
 * a token stops working as soon as the password changes — no token table and
 * no cleanup job required. 30 minute lifetime.
 */
const TTL_MS = 30 * 60 * 1000;

function secret(): string {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET is not configured");
  return value;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createPasswordResetToken(user: { id: string; passwordHash: string }): string {
  const payload = Buffer.from(
    JSON.stringify({ u: user.id, e: Date.now() + TTL_MS, h: user.passwordHash.slice(-10) }),
    "utf8",
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export type ResetTokenPayload = { userId: string; hashSuffix: string };

export function verifyPasswordResetToken(token: string): ResetTokenPayload | null {
  const separator = token.lastIndexOf(".");
  if (separator <= 0) return null;
  const payload = token.slice(0, separator);
  const signature = token.slice(separator + 1);

  const expected = sign(payload);
  const given = Buffer.from(signature);
  const wanted = Buffer.from(expected);
  if (given.length !== wanted.length || !timingSafeEqual(given, wanted)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      u?: unknown;
      e?: unknown;
      h?: unknown;
    };
    if (typeof data.u !== "string" || typeof data.e !== "number" || typeof data.h !== "string") return null;
    if (data.e < Date.now()) return null;
    return { userId: data.u, hashSuffix: data.h };
  } catch {
    return null;
  }
}
