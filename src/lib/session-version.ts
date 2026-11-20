import { createHmac } from "node:crypto";

/** Opaque marker tied to the current password hash so password changes revoke old JWTs. */
export function credentialVersion(passwordHash: string): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not configured");
  return createHmac("sha256", secret).update(passwordHash).digest("base64url");
}
