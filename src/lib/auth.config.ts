import type { NextAuthConfig } from "next-auth";
import { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { credentialVersion } from "@/lib/session-version";
import { portalBaseUrl } from "@/lib/portal-url";

/** Distinguishes "password is fine but the account is not usable yet" from bad credentials. */
class PendingApproval extends CredentialsSignin {
  code = "pending";
}
class InactiveAccount extends CredentialsSignin {
  code = "inactive";
}

export const authConfig = {
  session: { strategy: "jwt", maxAge: 12 * 60 * 60 },
  trustHost: true,
  pages: {
    signIn: "/",
  },
  providers: [
    Credentials({
      name: "Email + Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const key = email.toLowerCase().trim();
        const ip = request?.headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
        if (!checkRateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 10, keyPrefix: "login" }, key) ||
            !checkRateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 60, keyPrefix: "login-ip" }, ip)) {
          throw new Error("Too many login attempts. Please try again later.");
        }

        const user = await prisma.user.findUnique({ where: { email: key } });
        if (!user) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        if (user.status === "pending") throw new PendingApproval();
        if (user.status !== "active") throw new InactiveAccount();

        return {
          id: user.id,
          role: user.role,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          credentialVersion: credentialVersion(user.passwordHash),
          mustChangePassword: user.mustChangePassword,
        };
      },
    }),
  ],
  callbacks: {
    async redirect({ url, baseUrl }) {
      const requestHostIsVercel = new URL(baseUrl).hostname.toLowerCase().endsWith(".vercel.app");
      const canonicalBase = process.env.NODE_ENV === "production" || requestHostIsVercel ? portalBaseUrl() : baseUrl;
      const allowedOrigins = new Set([
        canonicalBase,
        "https://portal.checkmyuni.com",
        "https://checkmyuni.com",
        "https://www.checkmyuni.com",
      ]);
      try {
        const target = new URL(url, canonicalBase);
        return allowedOrigins.has(target.origin) ? target.toString() : `${canonicalBase}/`;
      } catch {
        return `${canonicalBase}/`;
      }
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.credentialVersion = user.credentialVersion;
        token.mustChangePassword = user.mustChangePassword;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as never;
        session.user.credentialVersion = token.credentialVersion as string;
        session.user.mustChangePassword = Boolean(token.mustChangePassword);
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
