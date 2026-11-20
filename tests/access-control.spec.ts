import { test, expect } from "@playwright/test";
import { encode } from "next-auth/jwt";
import { credentialVersion } from "../src/lib/session-version";
import { redactAuditPayload } from "../src/lib/audit-redaction";

const PROTECTED_ROUTES = [
  "/home",
  "/my-applications",
  "/apply",
  "/programs",
  "/users",
  "/scholarships",
  "/short-courses",
  "/search",
  "/application",
  "/partner-commissions",
  "/transaction",
  "/documents",
  "/reports",
  "/visitor-form",
  "/my-shortlist",
  "/messages",
  "/payments",
  "/profile",
  "/settings",
];

test.describe("Unauthenticated access control", () => {
  test("audit payloads redact credentials, payment details, and file URLs recursively", () => {
    expect(redactAuditPayload({
      token: "invite-bearer-secret",
      course: { meetingLink: "https://meeting.invalid", bankDetails: { accountNumber: "12345" } },
      accountNumber: "12345",
      iban: "PK00TEST123",
      routingNumber: "00123456",
      nested: [{ imageUrl: "https://image.invalid/private?sig=secret", linkUrl: "https://example.invalid/?token=private", title: "Banner" }],
      university: { logoUrl: "https://cdn.invalid/logo.svg?sig=private" },
      description: "Public course description",
    })).toEqual({
      token: "[REDACTED]",
      course: { meetingLink: "[REDACTED]", bankDetails: "[REDACTED]" },
      accountNumber: "[REDACTED]",
      iban: "[REDACTED]",
      routingNumber: "[REDACTED]",
      nested: [{ imageUrl: "[REDACTED]", linkUrl: "[REDACTED]", title: "Banner" }],
      university: { logoUrl: "[REDACTED]" },
      description: "Public course description",
    });
  });

  test("guest invite routes reach token validation without a session", async ({ request }) => {
    const response = await request.get("/invite/opaque-audit-token", {
      maxRedirects: 0,
      timeout: 30_000,
    });
    expect(response.headers().location).toBeUndefined();
  });

  test("responses include baseline security headers", async ({ request }) => {
    const response = await request.get("/");
    const headers = response.headers();
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["permissions-policy"]).toContain("camera=()");
    if (new URL(response.url()).protocol === "http:") {
      expect(headers["content-security-policy"]).not.toContain("upgrade-insecure-requests");
    }

    const protectedResponse = await request.get("/home", { maxRedirects: 0 });
    const csp = protectedResponse.headers()["content-security-policy"];
    expect(csp).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9+/]+=*' 'strict-dynamic'/);
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");

    const signupResponse = await request.get("/student/signup");
    const signupCsp = signupResponse.headers()["content-security-policy"];
    const nonce = signupCsp.match(/'nonce-([^']+)'/)?.[1];
    expect(nonce).toBeTruthy();
    expect(await signupResponse.text()).toContain(`nonce="${nonce}"`);
  });

  test("legacy sessions without a credential fingerprint are treated as signed out", async ({ request }) => {
    const secret = process.env.AUTH_SECRET;
    expect(secret).toBeTruthy();
    const token = await encode({
      secret: secret!,
      salt: "authjs.session-token",
      token: { sub: "legacy-audit-session", id: "legacy-audit-session", role: "SUPER_ADMIN" },
    });
    const response = await request.get("/home", {
      headers: { cookie: `authjs.session-token=${token}` },
      maxRedirects: 0,
    });

    expect(response.status()).toBe(307);
    expect(response.headers().location).toMatch(/\/$/);
  });

  test("password changes invalidate the session credential fingerprint", () => {
    const initial = credentialVersion("bcrypt-hash-before-password-change");
    const unchanged = credentialVersion("bcrypt-hash-before-password-change");
    const changed = credentialVersion("bcrypt-hash-after-password-change");

    expect(initial).toBe(unchanged);
    expect(changed).not.toBe(initial);
  });

  for (const route of PROTECTED_ROUTES) {
    test(`anonymous visit to ${route} is redirected to landing`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/\/$/);
      await expect(page.getByRole("heading", { level: 1, name: "StudyAbroad Portal" })).toBeVisible();
    });
  }

  test("unknown route redirects to not-found page", async ({ page }) => {
    const response = await page.goto("/this-route-does-not-exist");
    expect(response?.status()).toBe(404);
  });
});
