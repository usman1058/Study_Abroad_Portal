"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthSplitShell } from "@/components/auth-split-shell";

const SEAL_URL =
  "https://lh3.googleusercontent.com/aida/AEtjO1XFzkiYjZCo_6OiSnsgB9UWdmHilU-wexkPy96chbzeDZv22bKj6_Ntut2pcL3kjBFj2K3kyut3E66V7Oq3tuksMI6SbKyb4TIioDdZDCJlRLo7AUREjZ70Ai5LQMBDJXLnG3xVcimHykknxArhlHJR7ph5tLodEmGDQQpX8Wc-o0H35ubk3ByGjSGz0Wbf6zteut2mtnoCPjKHk4QRB3LNIDxuZQpiSXaIBlGqYkajYYf0CvhjS8DiGPc";
const CAMPUS_URL =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCHw6ezxdUuJXCrlHXdqXTXgGYa5btn2IXJmbq5YB-fxvTjy4hXOJb_kJCrtlEdarve-72uaP0xOQSsvj2I2cJS6PED12c3GZzFUovgzdAM9lOjTooQwJVNSCmQdmh1Le7MGFCTjPuFQDcZQK8ftW-mu0vISQI_dlmfYZwBJdjdWEtj0bqUKhVfmWXL81gDQqGy1QRsBY4suckk3NKCqo0dD2NyUBj99PxzA6-kGHYw5oc1ezemw2kO";

export function StudentLoginAuth() {
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const email = (form.elements.namedItem("email") as HTMLInputElement)?.value;
    const password = (form.elements.namedItem("password") as HTMLInputElement)?.value;
    setLoading(true);
    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (res?.error) {
        return;
      }
      window.location.href = "/my-applications";
    } catch {
      // swallow; NextAuth handles redirect on success
    } finally {
      setLoading(false);
    }
  }

  async function handleSSO(provider: "google" | "apple") {
    setLoading(true);
    try {
      await signIn(provider, { callbackUrl: "/my-applications" });
    } catch {
      setLoading(false);
    }
  }

  const left = (
    <>
      <div className="absolute -top-16 -left-12 w-80 h-80 bg-secondary-fixed/50 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute -bottom-16 -right-12 w-96 h-96 bg-surface-container-high/60 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="relative z-10 flex flex-col space-y-space-md">
        <div className="inline-flex items-center gap-space-xs px-2.5 py-1 rounded-full bg-surface-white/10 text-surface-container backdrop-blur-md w-fit">
          <span className="material-symbols-outlined text-[15px] text-secondary-fixed">
            verified_user
          </span>
          <span className="font-label-sm text-label-sm tracking-wide">Candidate Gateway</span>
        </div>
        <div className="space-y-space-xs pt-space-xs">
          <h2 className="font-headline-lg text-headline-lg text-surface-white tracking-tight">
            Your gateway to global universities.
          </h2>
          <p className="font-body-md text-body-md text-surface-container-high/85 leading-relaxed">
            Track multi-country applications, dispatch verified transcripts, and secure institutional offer letters across 180+ global campuses.
          </p>
        </div>
        <div className="relative z-10 pt-space-xl space-y-space-md">
          <div className="bg-surface-white/10 backdrop-blur-md rounded-lg p-space-md shadow-sm">
            <div className="flex items-center justify-between mb-space-xs">
              <span className="font-label-sm text-label-sm text-secondary-fixed uppercase tracking-wider">
                Candidate Dossier Status
              </span>
              <span className="font-code-table text-code-table text-status-verified flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-status-verified animate-ping" />
                Live Sync
              </span>
            </div>
            <div className="w-full bg-surface-white/20 h-1.5 rounded-full overflow-hidden">
              <div className="bg-secondary-container h-full rounded-full w-3/4" />
            </div>
            <div className="flex justify-between items-center mt-2 text-surface-container-high font-body-sm text-body-sm">
              <span>Visa &amp; Offer Pipeline</span>
              <span className="font-code-table font-semibold">Stage 4 of 6</span>
            </div>
          </div>
          <div className="flex items-center gap-space-xs text-surface-container-high/70">
            <span className="material-symbols-outlined text-[16px] text-secondary-fixed">
              shield_lock
            </span>
            <span className="font-body-sm text-body-sm">ISO 27001 Certified Academic Data Pipeline</span>
          </div>
        </div>
      </div>
    </>
  );

  const right = (
    <>
      <div className="mb-space-lg">
        <div className="flex items-center justify-between">
          <h1 className="font-headline-lg text-headline-lg text-navy-surface tracking-tight">
            Student Login
          </h1>
          <span className="px-2.5 py-0.5 rounded-full bg-surface-container text-secondary font-label-sm text-label-sm font-semibold uppercase">
            SSO Enabled
          </span>
        </div>
        <p className="font-body-md text-body-md text-on-surface-variant mt-1.5">
          Sign in to track your applications, shortlist and documents.
        </p>
      </div>
      <form onSubmit={handleLogin} className="space-y-space-md" id="student-login-form">
        <div className="space-y-1.5">
          <Label htmlFor="student-email" className="block font-label-md text-label-md text-on-surface font-medium">
            Student Email Address <span className="text-error">*</span>
          </Label>
          <div className="relative flex items-center">
            <span className="material-symbols-outlined absolute left-3 text-[18px] text-outline pointer-events-none">
              alternate_email
            </span>
            <Input
              id="student-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="e.g. daniel.nguyen@outlook.vn"
              required
              className="w-full h-10 pl-10 pr-3 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md placeholder:text-outline focus:outline-none focus:bg-surface-white focus:shadow-md transition-all duration-150"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="student-password" className="block font-label-md text-label-md text-on-surface font-medium">
              Password <span className="text-error">*</span>
            </Label>
          </div>
          <div className="relative flex items-center">
            <span className="material-symbols-outlined absolute left-3 text-[18px] text-outline pointer-events-none">
              lock
            </span>
            <Input
              id="student-password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••••••"
              required
              className="w-full h-10 pl-10 pr-10 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md placeholder:text-outline focus:outline-none focus:bg-surface-white focus:shadow-md transition-all duration-150"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label="Toggle password visibility"
              className="absolute right-2 p-1.5 rounded text-outline hover:text-on-surface hover:bg-canvas-subtle transition-colors focus:outline-none"
            >
              <span className="material-symbols-outlined text-[18px]" id="password-toggle-icon">
                {showPassword ? "visibility_off" : "visibility"}
              </span>
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between pt-0.5">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberDevice}
              onChange={(e) => setRememberDevice(e.target.checked)}
              className="w-4 h-4 rounded bg-surface-container-low text-secondary accent-secondary focus:ring-0 focus:outline-none cursor-pointer"
              id="remember-device"
            />
            <span className="font-body-sm text-body-sm text-on-surface-variant hover:text-on-surface">
              Remember my device for 30 days
            </span>
          </label>
          <Link
            href="#forgot-password"
            className="font-label-md text-label-md text-secondary hover:text-navy-surface font-semibold underline-offset-2 hover:underline transition-colors"
          >
            Forgot password?
          </Link>
        </div>
        <div className="pt-space-xs">
          <Button
            type="submit"
            className="w-full h-11 rounded-lg bg-secondary text-surface-white font-label-md text-label-md font-semibold shadow-md hover:bg-navy-surface hover:shadow-lg active:scale-[0.99] transition-all duration-150 group"
            disabled={loading}
          >
            <span>Sign in to Student Workspace</span>
            <span className="material-symbols-outlined text-[18px] transition-transform group-hover:translate-x-0.5">
              arrow_forward
            </span>
            {loading && (
              <span className="material-symbols-outlined text-[18px] animate-spin">
                refresh
              </span>
            )}
          </Button>
        </div>
      </form>
      <div className="relative my-space-lg flex items-center justify-center">
        <div className="w-full h-px bg-surface-container" />
        <span className="absolute px-3 bg-surface-white font-code-table text-code-table text-on-surface-variant uppercase tracking-wider">
          or continue with single sign-on
        </span>
      </div>
      <div className="grid grid-cols-2 gap-space-sm">
        <button
          type="button"
          onClick={() => handleSSO("google")}
          className="h-10 px-3 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface flex items-center justify-center gap-2 font-label-md text-label-md font-medium transition-colors duration-150 focus:outline-none disabled:opacity-60"
          disabled={loading}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          <span>Google</span>
        </button>
        <button
          type="button"
          onClick={() => handleSSO("apple")}
          className="h-10 px-3 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface flex items-center justify-center gap-2 font-label-md text-label-md font-medium transition-colors duration-150 focus:outline-none disabled:opacity-60"
          disabled={loading}
        >
          <svg className="w-4 h-4 fill-current" viewBox="0 0 170 170">
            <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.67-7.83-11.96-14.38-6.19-9.39-10.9-19.98-14.13-31.78-3.23-11.8-4.85-22.9-4.85-33.29 0-14.36 3.58-26.39 10.74-36.08 7.16-9.7 16.14-14.67 26.96-14.92 5.09 0 10.45 1.25 16.08 3.76 5.63 2.5 9.4 3.82 11.3 3.96 1.7 0 5.64-1.39 11.82-4.17 6.18-2.77 11.66-3.96 16.44-3.56 12.59.88 22.84 5.68 30.76 14.41-10.97 6.64-16.32 15.68-16.06 27.12.26 8.94 3.73 16.48 10.41 22.62 6.69 6.13 14.54 9.69 23.57 10.66-2.01 6.14-4.58 12.72-7.72 19.74zM119.22 33.15c0-6.73 2.45-13.13 7.35-19.2 4.9-6.07 10.95-10.23 18.15-12.48.51 1.25.77 2.57.77 3.96 0 6.6-2.54 13.06-7.62 19.38-5.08 6.32-11.17 10.45-18.27 12.39-.12-1.35-.38-2.69-.38-4.05z" />
          </svg>
          <span>Apple ID</span>
        </button>
      </div>
      <div className="mt-space-lg text-center font-body-sm text-body-sm text-on-surface-variant">
        New here{" "}
        <Link
          href="/student/signup"
          className="text-secondary font-semibold hover:text-navy-surface hover:underline transition-colors ml-1"
        >
          Create a free account
        </Link>
      </div>
      <div className="w-full flex flex-col sm:flex-row items-center justify-between mt-space-md px-space-xs text-on-surface-variant/70 font-body-sm text-body-sm">
        <div className="flex items-center gap-space-md">
          <span>Meridian Admissions Engine v4.12</span>
          <span className="hidden sm:inline">·</span>
          <a className="hover:text-on-surface hover:underline" href="#privacy">
            Data Protection Policy
          </a>
          <span className="hidden sm:inline">·</span>
          <a className="hover:text-on-surface hover:underline" href="#helpdesk">
            Student Helpdesk
          </a>
        </div>
      </div>
    </>
  );

  return (
    <AuthSplitShell topBar={undefined} left={left} right={right} />
  );
}
