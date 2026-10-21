"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { AuthSplitShell } from "@/components/auth-split-shell";

export function StudentSignupAuth() {
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [strength, setStrength] = useState<{ label: string; color: string; bars: number }>({
    label: "Empty",
    color: "text-outline",
    bars: 0,
  });
  const [passwordMatch, setPasswordMatch] = useState<"match" | "mismatch" | "empty">("empty");
  const [terms, setTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const pwRef = useState<string>("")[0];
  const setPwRef = useState<string>("")[1];

  function checkPassword(value: string) {
    setPwRef(value);
    if (!value) {
      setStrength({ label: "Empty", color: "text-outline", bars: 0 });
      setPasswordMatch("empty");
      return;
    }
    let score = 0;
    if (value.length >= 8) score++;
    if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score++;
    if (/[0-9]/.test(value)) score++;
    if (/[^A-Za-z0-9]/.test(value)) score++;
    if (score <= 1) {
      setStrength({ label: "Weak", color: "text-status-rejected", bars: 1 });
    } else if (score === 2) {
      setStrength({ label: "Fair", color: "text-status-pending", bars: 2 });
    } else if (score === 3) {
      setStrength({ label: "Good", color: "text-status-info", bars: 3 });
    } else {
      setStrength({ label: "Strong", color: "text-status-verified", bars: 4 });
    }
    validateMatch();
  }

  function validateMatch() {
    const confirm = document.getElementById("confirm-password") as HTMLInputElement | null;
    if (!confirm || !confirm.value) {
      setPasswordMatch("empty");
      return;
    }
    setPasswordMatch(pwRef === confirm.value ? "match" : "mismatch");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const form = e.currentTarget as HTMLFormElement;
      const data = new FormData(form);
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: data.get("firstName"),
          lastName: data.get("lastName"),
          phone: data.get("phone"),
          email: data.get("email"),
          password: data.get("password"),
        }),
      });
      if (!res.ok) return;
      window.location.href = "/my-applications";
    } catch {
      // noop
    } finally {
      setLoading(false);
    }
  }

  const barClass = (i: number) =>
    `h-full flex-1 rounded-full transition-colors duration-300 ${
      i < strength.bars ? strength.color === "text-outline" ? "bg-secondary" : strength.color.replace("text-", "bg-") : "bg-canvas-subtle"
    }`;

  const left = (
    <>
      <div className="absolute -right-12 -top-12 w-64 h-64 rounded-full bg-secondary-container/20 blur-2xl pointer-events-none" />
      <div className="absolute -left-12 bottom-0 w-48 h-48 rounded-full bg-status-info/10 blur-xl pointer-events-none" />
      <div className="relative z-10 flex flex-col gap-space-md">
        <div className="flex items-center gap-space-xs">
          <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shadow-md">
            <span className="material-symbols-outlined text-on-secondary text-headline-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
              public
            </span>
          </div>
          <div>
            <span className="font-headline-sm text-headline-sm tracking-tight text-surface-white block leading-none">
              Meridian Global
            </span>
            <span className="font-label-sm text-label-sm text-secondary-fixed tracking-wider uppercase">
              Admissions Protocol
            </span>
          </div>
        </div>
        <div className="pt-space-lg flex flex-col gap-space-sm">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-secondary-fixed w-fit font-label-sm text-label-sm backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-status-verified" />
            Cross-Border Verified Matrix
          </span>
          <h2 className="font-headline-lg text-headline-lg text-surface-white leading-tight">
            Direct Gateway to 1,200+ Premier Global Universities.
          </h2>
          <p className="font-body-md text-body-md text-slate-300">
            Certified application processing, tier-one institutional agreements, and verified scholarship distribution.
          </p>
        </div>
      </div>
      <div className="relative z-10 my-space-lg flex flex-col gap-space-md">
        <div className="rounded-xl bg-navy-deep/80 backdrop-blur-md p-space-md flex flex-col gap-space-sm shadow-lg">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary-fixed-dim">
              Verified Allocation Pool
            </span>
            <span className="px-2 py-0.5 rounded-full bg-status-verified-subtle text-status-verified font-code-table text-code-table">
              2025/2026
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-metric-display text-metric-display text-surface-white tracking-tight">$4.8M</span>
            <span className="font-body-sm text-body-sm text-slate-300">in student merit awards</span>
          </div>
          <div className="w-full pt-1">
            <div className="flex justify-between items-center text-slate-400 font-code-table text-code-table mb-1">
              <span>Scholarship Velocity</span>
              <span className="text-status-verified flex items-center font-body-sm-medium">
                <span className="material-symbols-outlined text-xs mr-0.5">trending_up</span> +34.2%
              </span>
            </div>
            <svg className="w-full h-10 text-secondary-container" fill="none" viewBox="0 0 200 40">
              <path d="M0 35 L25 30 L50 32 L75 22 L100 24 L125 15 L150 18 L175 8 L200 4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
              <path d="M0 35 L25 30 L50 32 L75 22 L100 24 L125 15 L150 18 L175 8 L200 4 V 40 H 0 Z" fill="currentColor" fillOpacity={0.15} />
            </svg>
          </div>
        </div>
        <div className="rounded-lg bg-white/5 p-space-sm flex items-start gap-space-xs backdrop-blur-sm">
          <span className="material-symbols-outlined text-status-verified text-headline-sm mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>
            verified
          </span>
          <p className="font-body-sm text-body-sm text-slate-200 leading-snug">
            Free access to $4.8M in international scholarships and certified counselor matching.
          </p>
        </div>
      </div>
      <div className="relative z-10 pt-space-md flex items-center gap-space-sm">
        <img
          className="w-11 h-11 rounded-full object-cover shadow-md"
          alt="Student portrait"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuDPzyR0EKg8xn01ngrtpY72WXRSAsxMPFYrFxgnxlsNIcChNlGO592AGvYaJ0JLvutUuUjTJ067_ClHzenMu7W__rY7nThSveA70_GU5OhoXgUS6ZBBLyljs6gqBkaxWpe43lUXKDRyI1ZQ9tgSNFa8lftQo7Jwuhz12tfdYn4uJDyHLQCu8g0fiA7VJTPRoXXOaBeq23FO4mPWHDr_HjTFc5AdLjzApbjk7D-Z1o1MdOw4qVCTbKkJ"
        />
        <div className="flex flex-col min-w-0">
          <span className="font-label-md text-label-md text-surface-white truncate">Ananya Rao</span>
          <span className="font-body-sm text-body-sm text-slate-400 truncate">University of Toronto • Fully Funded</span>
        </div>
      </div>
    </>
  );

  const right = (
    <>
      <div className="flex flex-col gap-space-2xs mb-space-lg">
        <div className="flex items-center justify-between">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">Student Enrollment Portal</span>
          <span className="inline-flex items-center gap-1 font-code-table text-code-table px-2.5 py-0.5 rounded-full bg-status-verified-subtle text-status-verified font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-status-verified" /> SSL 256-bit Encrypted
          </span>
        </div>
        <h1 className="font-headline-lg text-headline-lg text-navy-deep tracking-tight">Student Signup</h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Create your free account to unlock university program catalogs, compare scholarships, and submit applications.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-space-md" id="signup-form">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="first-name" className="font-label-md text-label-md text-on-surface flex items-center gap-1">
              First Name <span className="text-error">*</span>
            </Label>
            <div className="relative">
              <Input id="first-name" name="firstName" type="text" placeholder="e.g. Daniel" required className="w-full h-10 px-3 rounded-lg bg-canvas-subtle text-on-surface placeholder:text-outline font-body-md text-body-md focus:outline-none focus:bg-surface-white focus:ring-2 focus:ring-secondary transition-all" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="last-name" className="font-label-md text-label-md text-on-surface flex items-center gap-1">
              Last Name <span className="text-error">*</span>
            </Label>
            <div className="relative">
              <Input id="last-name" name="lastName" type="text" placeholder="e.g. Nguyen" required className="w-full h-10 px-3 rounded-lg bg-canvas-subtle text-on-surface placeholder:text-outline font-body-md text-body-md focus:outline-none focus:bg-surface-white focus:ring-2 focus:ring-secondary transition-all" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="phone-number" className="font-label-md text-label-md text-on-surface flex items-center gap-1">
              Phone Number <span className="text-error">*</span>
            </Label>
            <div className="flex rounded-lg bg-canvas-subtle focus-within:bg-surface-white focus-within:ring-2 focus-within:ring-secondary transition-all overflow-hidden">
              <Select name="countryCode" id="country-code" aria-label="Country Code" defaultValue="+84" className="h-10 pl-2.5 pr-6 bg-transparent text-on-surface font-code-table text-code-table appearance-none focus:outline-none cursor-pointer">
                <option value="+84">🇻🇳 +84</option>
                <option value="+91">🇮🇳 +91</option>
                <option value="+60">🇲🇾 +60</option>
                <option value="+65">🇸🇬 +65</option>
                <option value="+62">🇮🇩 +62</option>
                <option value="+63">🇵🇭 +63</option>
                <option value="+1">🇺🇸 +1</option>
                <option value="+44">🇬🇧 +44</option>
              </Select>
              <span className="material-symbols-outlined text-outline absolute right-1 pointer-events-none text-label-sm">expand_more</span>
              <div className="w-[1px] bg-outline-variant/30 my-2" />
              <Input id="phone-number" name="phone" type="tel" placeholder="912 345 678" required className="flex-1 h-10 px-3 bg-transparent text-on-surface placeholder:text-outline font-body-md text-body-md focus:outline-none" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email-address" className="font-label-md text-label-md text-on-surface flex items-center gap-1">
              Email Address <span className="text-error">*</span>
            </Label>
            <div className="relative">
              <Input id="email-address" name="email" type="email" placeholder="student@example.com" required className="w-full h-10 px-3 rounded-lg bg-canvas-subtle text-on-surface placeholder:text-outline font-body-md text-body-md focus:outline-none focus:bg-surface-white focus:ring-2 focus:ring-secondary transition-all" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password" className="font-label-md text-label-md text-on-surface flex items-center justify-between">
              <span>Create Password <span className="text-error">*</span></span>
            </Label>
            <div className="relative flex items-center">
              <Input
                id="password"
                name="password"
                type={showPwd ? "text" : "password"}
                placeholder="Minimum 8 characters"
                required
                onInput={(e) => checkPassword((e.target as HTMLInputElement).value)}
                className="w-full h-10 pl-3 pr-10 rounded-lg bg-canvas-subtle text-on-surface placeholder:text-outline font-body-md text-body-md focus:outline-none focus:bg-surface-white focus:ring-2 focus:ring-secondary transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                aria-label="Toggle password visibility"
                className="absolute right-2 p-1.5 text-outline hover:text-on-surface transition-colors flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-headline-sm">{showPwd ? "visibility_off" : "visibility"}</span>
              </button>
            </div>
            <div className="flex flex-col gap-1 mt-1">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-label-sm text-outline">Strength:</span>
                <span className={`font-label-sm text-label-sm font-medium ${strength.color}`} id="strength-label">
                  {strength.label}
                </span>
              </div>
              <div className="w-full h-1.5 bg-canvas-subtle rounded-full overflow-hidden flex gap-1">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className={barClass(i)} />
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirm-password" className="font-label-md text-label-md text-on-surface flex items-center gap-1">
              Confirm Password <span className="text-error">*</span>
            </Label>
            <div className="relative flex items-center">
              <Input
                id="confirm-password"
                name="confirmPassword"
                type={showConfirm ? "text" : "password"}
                placeholder="Repeat password"
                required
                onInput={validateMatch}
                className="w-full h-10 pl-3 pr-10 rounded-lg bg-canvas-subtle text-on-surface placeholder:text-outline font-body-md text-body-md focus:outline-none focus:bg-surface-white focus:ring-2 focus:ring-secondary transition-all"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                aria-label="Toggle confirm password visibility"
                className="absolute right-2 p-1.5 text-outline hover:text-on-surface transition-colors flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-headline-sm">{showConfirm ? "visibility_off" : "visibility"}</span>
              </button>
            </div>
            {passwordMatch !== "empty" && (
              <span className={`font-label-sm text-label-sm text-outline mt-1 ${passwordMatch === "match" ? "text-status-verified" : "text-status-rejected"}`} id="match-hint">
                {passwordMatch === "match" ? "✓ Passwords match" : "✗ Passwords do not match"}
              </span>
            )}
          </div>
        </div>
        <div className="pt-1 flex items-start gap-space-xs">
          <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} required id="terms" className="mt-1 w-4 h-4 rounded text-secondary focus:ring-secondary cursor-pointer" />
          <Label htmlFor="terms" className="font-body-sm text-body-sm text-on-surface-variant cursor-pointer select-none leading-relaxed">
            I agree to the{" "}
            <a className="text-secondary hover:underline font-body-sm-medium" href="#">Terms of Service</a>{", "}
            <a className="text-secondary hover:underline font-body-sm-medium" href="#">Privacy Policy</a>{", "}
            and cross-border student visa processing guidelines.
          </Label>
        </div>
        <div className="pt-space-xs">
          <Button
            type="submit"
            className="w-full h-11 mt-space-xs rounded-lg bg-secondary text-surface-white font-label-md text-label-md font-semibold shadow-md hover:bg-on-tertiary-container hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-secondary-container transition-all flex items-center justify-center space-x-space-xs cursor-pointer disabled:opacity-60"
            disabled={loading || !terms}
          >
            <span>Create Student Account</span>
            <span className="material-symbols-outlined text-headline-sm">arrow_forward</span>
            {loading && <span className="material-symbols-outlined text-headline-sm animate-spin">refresh</span>}
          </Button>
        </div>
      </form>
      <div className="mt-space-lg pt-space-md border-t border-canvas-subtle flex flex-col sm:flex-row items-center justify-between gap-space-xs">
        <p className="font-body-md text-body-md text-on-surface-variant">
          Already have an account?{" "}
          <Link
            href="/student/login"
            className="text-secondary font-body-md-medium hover:underline inline-flex items-center gap-0.5"
          >
            Sign in <span className="material-symbols-outlined text-label-sm">chevron_right</span>
          </Link>
        </p>
        <span className="font-code-table text-code-table text-outline">ED-PASS ID VERIFICATION V4.2</span>
      </div>
    </>
  );

  return <AuthSplitShell left={left} right={right} />;
}
