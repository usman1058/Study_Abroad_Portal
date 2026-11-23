import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { Role } from "@/generated/prisma/client";

const STUDENT_ONLY = ["/my-shortlist", "/my-applications", "/student-home", "/apply"];
const PARTNER_ONLY = [
  "/home",
  "/advertisements",
  "/users",
  "/search",
  "/application",
  "/partner-commissions",
  "/transaction",
  "/reports",
  "/visitor-form",
];

const matches = (pathname: string, prefixes: string[]) =>
  prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));

function cspForNonce(nonce: string, secureRequest: boolean) {
  const isDev = process.env.NODE_ENV === "development";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'nonce-${nonce}' 'unsafe-inline'`,
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src 'self'${isDev ? " ws:" : ""}`,
    "media-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(secureRequest ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

// §7b — route guard: a student typing a partner URL is redirected, never shown the page.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0].trim();
  const secureRequest = request.nextUrl.protocol === "https:" || forwardedProtocol === "https";
  const contentSecurityPolicy = cspForNonce(nonce, secureRequest);
  const continueRequest = () => {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-nonce", nonce);
    requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    response.headers.set("Content-Security-Policy", contentSecurityPolicy);
    return response;
  };
  const redirectWithCsp = (destination: URL) => {
    const response = NextResponse.redirect(destination);
    response.headers.set("Content-Security-Policy", contentSecurityPolicy);
    return response;
  };

  // Cookie prefix must match how the auth handler derives it from the request
  // protocol (https -> __Secure-authjs.session-token), otherwise every protected
  // page redirect-loops between "/" and the target.
  const secureCookie = request.nextUrl.protocol === "https:";
  const token = await getToken({ req: request, secret: process.env.AUTH_SECRET, secureCookie });
  const role = token?.role as Role | undefined;
  const authed = Boolean(token?.id && role && token.credentialVersion);

  // Invite links are bearer credentials; the page validates token, expiry, and revocation.
  if (pathname.startsWith("/invite/")) return continueRequest();

  // Auth pages & landing — bounce already-logged-in users to their home.
  if (
    pathname === "/" ||
    pathname.startsWith("/student/login") ||
    pathname.startsWith("/student/signup") ||
    pathname.startsWith("/partner/login") ||
    pathname.startsWith("/partner/signup") ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password"
  ) {
    if (authed) {
      return redirectWithCsp(
        new URL(role === "STUDENT" ? "/student-home" : "/home", request.url)
      );
    }
    return continueRequest();
  }

  if (!authed) {
    return redirectWithCsp(new URL("/", request.url));
  }

  if (role === "STUDENT") {
    if (matches(pathname, PARTNER_ONLY)) {
      return redirectWithCsp(new URL("/student-home", request.url));
    }
  } else {
    if (matches(pathname, STUDENT_ONLY)) {
      return redirectWithCsp(new URL("/home", request.url));
    }
  }

  return continueRequest();
}

export const config = {
  matcher: [
    "/",
    "/student/login/:path*",
    "/student/signup/:path*",
    "/partner/login/:path*",
    "/partner/signup/:path*",
    "/forgot-password/:path*",
    "/reset-password/:path*",
    "/invite/:path*",
    "/home/:path*",
    "/advertisements/:path*",
    "/users/:path*",
    "/scholarships/:path*",
    "/programs/:path*",
    "/short-courses/:path*",
    "/search/:path*",
    "/application/:path*",
    "/partner-commissions/:path*",
    "/transaction/:path*",
    "/documents/:path*",
    "/reports/:path*",
    "/settings/:path*",
    "/visitor-form/:path*",
    "/my-shortlist/:path*",
    "/my-applications/:path*",
    "/student-home/:path*",
    "/apply/:path*",
    "/messages/:path*",
    "/payments/:path*",
    "/profile/:path*",
  ],
};
