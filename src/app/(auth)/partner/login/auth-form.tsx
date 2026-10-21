"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthSplitShell } from "@/components/auth-split-shell";

export function PartnerLoginAuth() {
  const [showPassword, setShowPassword] = useState(false);
  const [mfaEnforce, setMfaEnforce] = useState(true);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const form = e.currentTarget as HTMLFormElement;
      const email = (form.elements.namedItem("email") as HTMLInputElement)?.value;
      const password = (form.elements.namedItem("password") as HTMLInputElement)?.value;
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (res?.error) return;
      window.location.href = "/home";
    } catch {
      // NextAuth handles redirect on success
    } finally {
      setLoading(false);
    }
  }

  async function handleSSO() {
    setLoading(true);
    try {
      await signIn("saml", { callbackUrl: "/home" });
    } catch {
      setLoading(false);
    }
  }

  const left = (
    <>
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-secondary-container/20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-tertiary-container/30 blur-2xl pointer-events-none" />
      <div className="relative z-10">
        <div className="flex items-center gap-space-sm mb-space-2xl">
          <div className="h-10 w-10 rounded-lg bg-surface-white flex items-center justify-center text-primary shadow-sm">
            <span className="material-symbols-outlined text-headline-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
              public
            </span>
          </div>
          <div>
            <span className="font-headline-sm text-headline-sm text-surface-white tracking-tight block">Meridian Gateway</span>
            <span className="font-label-sm text-label-sm text-surface-dim uppercase tracking-wider block">Institutional Placement Infrastructure</span>
          </div>
        </div>
        <div className="inline-flex items-center gap-space-xs px-space-sm py-1 rounded-full bg-navy-surface text-secondary-fixed text-label-sm font-label-sm mb-space-lg shadow-sm">
          <span className="w-2 h-2 rounded-full bg-status-verified animate-pulse" />
          Global Placement Relay • 140+ Partner Universities
        </div>
        <h2 className="font-display-hero text-display-hero text-surface-white tracking-tight mb-space-md">Enterprise Admissions Orchestration</h2>
        <p className="font-body-md text-body-md text-surface-dim leading-relaxed max-w-md">
          Single-sign interface for authorized education counselors, master super-administrators, and regional accredited partner networks.
        </p>
      </div>
      <div className="relative z-10 bg-navy-surface/80 backdrop-blur-md rounded-xl p-space-lg mt-space-xl">
        <div className="flex items-center justify-between pb-space-sm">
          <span className="font-label-sm text-label-sm uppercase text-surface-dim tracking-wider">Active Cycle Telemetry</span>
          <span className="flex items-center gap-1 font-label-sm text-label-sm text-status-verified bg-status-verified/10 px-2 py-0.5 rounded-full">
            <span className="material-symbols-outlined text-sm">trending_up</span> 99.98% SLA
          </span>
        </div>
        <div className="grid grid-cols-2 gap-space-md pt-space-xs">
          <div>
            <p className="font-label-sm text-label-sm text-surface-dim">Verified Caseload</p>
            <p className="font-metric-display text-metric-display text-surface-white tracking-tight">42,890+</p>
            <p className="font-body-sm text-body-sm text-surface-dim/80">Cross-border candidates</p>
          </div>
          <div>
            <p className="font-label-sm text-label-sm text-surface-dim">Avg. Offer Clearance</p>
            <p className="font-metric-display text-metric-display text-status-verified tracking-tight">3.4 <span className="font-label-md text-label-md text-surface-dim">Days</span></p>
            <p className="font-body-sm text-body-sm text-surface-dim/80">Automated audit parity</p>
          </div>
        </div>
        <div className="mt-space-sm pt-space-xs">
          <svg className="w-full h-8 text-secondary-container" fill="none" stroke="currentColor" viewBox="0 0 280 32">
            <path d="M0 24 L35 18 L70 22 L105 12 L140 16 L175 8 L210 14 L245 4 L280 9" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            <path d="M0 24 L35 18 L70 22 L105 12 L140 16 L175 8 L210 14 L245 4 L280 9 L280 32 L0 32 Z" fill="currentColor" fillOpacity={0.12} />
          </svg>
        </div>
      </div>
      <div className="relative z-10 flex items-center gap-space-xs text-surface-dim/70 pt-space-lg font-body-sm text-body-sm">
        <span className="material-symbols-outlined text-sm">lock</span>
        <span>SOC2 Type II • End-to-end Ledger Encryption</span>
      </div>
    </>
  );

  const right = (
    <>
      <div className="flex flex-col gap-space-xs mb-space-xl">
        <div className="self-start">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-status-pending-subtle text-status-pending font-label-sm text-label-sm shadow-sm">
            <span className="w-2 h-2 rounded-full bg-status-pending" />
            Authorized Personnel Only (Super Admin / Manager / Agency / Counselor)
          </span>
        </div>
        <h1 className="font-headline-lg text-headline-lg text-primary tracking-tight mt-space-sm">Partner Login</h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant max-w-xl">
          Sign in to your authorized partner workspace, counselor desk, or agency management hub.
        </p>
      </div>
      <form onSubmit={handleLogin} className="flex flex-col gap-space-md" id="partnerLoginForm">
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center">
            <Label htmlFor="partnerEmail" className="font-label-md text-label-md text-on-surface">Enterprise / Partner Email</Label>
            <span className="font-code-table text-code-table text-on-surface-variant">SECURE_DOMAIN_MATCH</span>
          </div>
          <div className="relative flex items-center">
            <span className="material-symbols-outlined absolute left-3.5 text-on-surface-variant pointer-events-none text-headline-sm">alternate_email</span>
            <Input
              id="partnerEmail"
              name="email"
              type="email"
              placeholder="counselor@studyabroad.partner"
              required
              className="w-full h-11 pl-11 pr-4 bg-canvas-base rounded-lg text-on-surface font-body-md text-body-md placeholder-on-surface-variant/50 focus:outline-none focus:bg-surface-white transition-all shadow-sm"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center">
            <Label htmlFor="partnerPassword" className="font-label-md text-label-md text-on-surface">Password</Label>
            <Link href="#reset" className="font-label-sm text-label-sm text-secondary hover:underline transition-all">Reset Institutional Password?</Link>
          </div>
          <div className="relative flex items-center">
            <span className="material-symbols-outlined absolute left-3.5 text-on-surface-variant pointer-events-none text-headline-sm">key</span>
            <Input
              id="partnerPassword"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••••••"
              required
              className="w-full h-11 pl-11 pr-11 bg-canvas-base rounded-lg text-on-surface font-body-md text-body-md placeholder-on-surface-variant/50 focus:outline-none focus:bg-surface-white transition-all shadow-sm"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label="Toggle password visibility"
              className="absolute right-3.5 text-on-surface-variant hover:text-on-surface focus:outline-none"
            >
              <span className="material-symbols-outlined text-headline-sm" id="pwdEyeIcon">{showPassword ? "visibility_off" : "visibility"}</span>
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between py-space-xs">
          <label className="flex items-center gap-space-sm cursor-pointer select-none">
            <input type="checkbox" checked={mfaEnforce} onChange={(e) => setMfaEnforce(e.target.checked)} id="mfaEnforce" className="w-4 h-4 rounded bg-canvas-base accent-primary text-primary focus:ring-0 cursor-pointer" />
            <span className="font-body-md text-body-md text-on-surface">Enforce MFA session security</span>
          </label>
          <span className="font-label-sm text-label-sm text-status-verified flex items-center gap-1 bg-status-verified-subtle px-2 py-0.5 rounded-full">
            <span className="material-symbols-outlined text-sm">shield</span>
            TOTP / Hardware Ready
          </span>
        </div>
        <div className="pt-space-xs">
          <Button
            type="submit"
            className="w-full h-12 bg-navy-deep hover:bg-navy-surface text-surface-white font-label-md text-label-md rounded-lg shadow-md hover:shadow-lg flex items-center justify-center gap-space-sm transition-all transform active:scale-[0.99] mt-space-xs"
            disabled={loading}
          >
            <span id="btnText">Sign in to Partner Hub</span>
            <span className="material-symbols-outlined text-headline-sm" id="btnIcon">arrow_forward</span>
            <span className={`hidden material-symbols-outlined animate-spin text-headline-sm ${loading ? "" : "hidden"}`} id="btnSpinner">progress_activity</span>
          </Button>
        </div>
        <div className="relative my-space-sm flex items-center justify-center">
          <div className="w-full h-px bg-canvas-subtle" />
          <span className="absolute px-3 bg-surface-white font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Enterprise Identity Federation</span>
        </div>
        <button
          type="button"
          onClick={handleSSO}
          className="w-full h-11 bg-canvas-base hover:bg-surface-container-low text-on-surface font-label-md text-label-md rounded-lg flex items-center justify-center gap-space-sm transition-all shadow-sm disabled:opacity-60"
          disabled={loading}
        >
          <span className="material-symbols-outlined text-headline-sm text-secondary">token</span>
          Sign in with SAML / Okta SSO
        </button>
      </form>
      <div className="pt-space-xl flex flex-col gap-space-md">
        <div className="flex items-center gap-space-sm p-space-sm rounded-lg bg-status-info-subtle text-status-info">
          <span className="material-symbols-outlined text-headline-sm flex-shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>
            verified_user
          </span>
          <span className="font-body-sm text-body-sm">
            ISO 27001 Certified &amp; GDPR Compliant Data Vault. Access attempts logged under statutory cross-border mobility regulations.
          </span>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-between text-body-sm font-body-sm text-on-surface-variant pt-space-xs gap-space-xs">
          <span>
            New agency partner?{" "}
            <Link href="/partner/signup" className="text-secondary font-body-md-medium hover:underline ml-1">
              Request accredited partnership
            </Link>
          </span>
        </div>
      </div>
    </>
  );

  return <AuthSplitShell left={left} right={right} />;
}
