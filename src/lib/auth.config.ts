import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";

export const authConfig = {
  session: { strategy: "jwt" },
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

        if (user.status !== "active") return null;

        return {
          id: user.id,
          role: user.role,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as never;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;