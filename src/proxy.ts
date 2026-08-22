import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { Role } from "@/generated/prisma/client";

const STUDENT_ONLY = ["/my-shortlist", "/my-applications", "/my-documents"];
const PARTNER_ONLY = [
  "/home",
  "/users",
  "/search",
  "/application",
  "/sub-agencies",
  "/partner-commissions",
  "/transaction",
  "/documents",
  "/reports",
  "/visitor-form",
];

const matches = (pathname: string, prefixes: string[]) =>
  prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));

// §7b — route guard: a student typing a partner URL is redirected, never shown the page.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Cookie prefix must match how the auth handler derives it from the request
  // protocol (https -> __Secure-authjs.session-token), otherwise every protected
  // page redirect-loops between "/" and the target.
  const secureCookie = request.nextUrl.protocol === "https:";
  const token = await getToken({ req: request, secret: process.env.AUTH_SECRET, secureCookie });
  const role = token?.role as Role | undefined;
  const authed = Boolean(token?.id && role);

  // Auth pages & landing — bounce already-logged-in users to their home.
  if (
    pathname === "/" ||
    pathname.startsWith("/student/login") ||
    pathname.startsWith("/student/signup") ||
    pathname.startsWith("/partner/login") ||
    pathname.startsWith("/partner/signup")
  ) {
    if (authed) {
      return NextResponse.redirect(
        new URL(role === "STUDENT" ? "/my-applications" : "/home", request.url)
      );
    }
    return NextResponse.next();
  }

  if (!authed) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (role === "STUDENT") {
    if (matches(pathname, PARTNER_ONLY)) {
      return NextResponse.redirect(new URL("/my-applications", request.url));
    }
  } else {
    if (matches(pathname, STUDENT_ONLY)) {
      return NextResponse.redirect(new URL("/home", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/home/:path*",
    "/users/:path*",
    "/scholarships/:path*",
    "/short-courses/:path*",
    "/search/:path*",
    "/application/:path*",
    "/sub-agencies/:path*",
    "/partner-commissions/:path*",
    "/transaction/:path*",
    "/documents/:path*",
    "/reports/:path*",
    "/settings/:path*",
    "/visitor-form/:path*",
    "/my-shortlist/:path*",
    "/my-applications/:path*",
    "/my-documents/:path*",
    "/messages/:path*",
    "/payments/:path*",
    "/profile/:path*",
  ],
};