"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { AuthSplitShell } from "@/components/auth-split-shell";

export function InviteLandingAuth() {
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [strength, setStrength] = useState<{ label: string; color: string; bars: number }>({
    label: "Moderate",
    color: "text-status-pending",
    bars: 2,
  });
  const [terms, setTerms] = useState(true);
  const [loading, setLoading] = useState(false);

  const pwRef = useState<string>("SecureMelb2025!")[0];
  const setPwRef = useState<string>("")[1];

  function checkPassword(value: string) {
    setPwRef(value);
    if (!value || value.length === 0) {
      setStrength({ label: "Enter Password", color: "text-on-surface-variant", bars: 0 });
      return;
    }
    let score = 0;
    if (value.length >= 8) score++;
    if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score++;
    if (/\d/.test(value)) score++;
    if (/[^A-Za-z0-9]/.test(value)) score++;
    if (score <= 1) {
      setStrength({ label: "Weak", color: "text-status-rejected", bars: 1 });
    } else if (score === 2) {
      setStrength({ label: "Fair", color: "text-status-pending", bars: 2 });
    } else if (score === 3) {
      setStrength({ label: "Good", color: "text-secondary", bars: 3 });
    } else {
      setStrength({ label: "Strong (Excellent)", color: "text-status-verified", bars: 4 });
    }
  }

  const barClass = (i: number) => {
    if (i < strength.bars) return `h-full flex-1 rounded-full transition-all duration-300 ${strength.color === "text-on-surface-variant" ? "bg-secondary" : strength.color.replace("text-", "bg-")}`;
    return "h-full flex-1 rounded-full transition-all duration-300 bg-canvas-subtle";
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const p1 = document.getElementById("passwordInput") as HTMLInputElement | null;
    const p2 = document.getElementById("confirmPasswordInput") as HTMLInputElement | null;
    if (!p1 || !p2 || p1.value !== p2.value) {
      alert("The entered passwords do not match. Please verify and retry.");
      return;
    }
    setLoading(true);
    try {
      const form = e.currentTarget as HTMLFormElement;
      const data = new FormData(form);
      await fetch("/api/auth/signup", {
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
      window.location.href = "/my-applications";
    } catch {
      // noop
    } finally {
      setLoading(false);
    }
  }

  const left = (
    <>
      <div className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-secondary-container opacity-10 blur-3xl pointer-events-none" />
      <div className="absolute -left-12 -top-12 w-64 h-64 rounded-full bg-surface-container-high opacity-5 blur-2xl pointer-events-none" />
      <div className="relative z-10 space-y-6">
        <div className="inline-flex items-center space-x-2 bg-navy-deep/60 px-3 py-1 rounded-full text-on-primary-fixed-variant">
          <span className="material-symbols-outlined text-body-sm text-secondary-fixed">verified_user</span>
          <span className="font-label-sm text-label-sm text-secondary-fixed uppercase tracking-wider">Authorized Invitation Protocol</span>
        </div>
        <div>
          <h1 className="font-headline-lg text-headline-lg text-surface-white leading-tight">
            You've been invited to join StudyAbroad Portal.
          </h1>
          <p className="font-body-md text-body-md text-on-primary-container mt-2">
            Cross-Border Academic Placement &amp; Verified Credentials Exchange for Global Higher Education.
          </p>
        </div>
        <div className="bg-navy-deep/80 rounded-xl p-4 space-y-3.5 shadow-sm">
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 rounded-full bg-secondary text-on-primary flex items-center justify-center font-headline-sm text-headline-sm shrink-0">SL</div>
            <div className="min-w-0 flex-1">
              <span className="font-label-sm text-label-sm text-on-primary-container uppercase tracking-wider block">Assigned Senior Counselor</span>
              <span className="font-body-md-medium text-body-md-medium text-surface-white truncate block">Sarah Lin</span>
              <span className="font-body-sm text-body-sm text-on-primary-container block truncate">Apex Global Education Group</span>
            </div>
          </div>
          <div className="pt-3 space-y-2">
            <div className="flex items-center justify-between text-body-sm">
              <span className="text-on-primary-container font-label-md text-label-md">Student Candidate</span>
              <span className="font-body-md-medium text-body-md-medium text-surface-white">Daniel Nguyen</span>
            </div>
            <div className="bg-navy-surface/90 rounded-lg p-2.5 flex items-start space-x-2.5">
              <span className="material-symbols-outlined text-secondary-fixed text-headline-sm shrink-0 mt-0.5">account_balance</span>
              <div className="min-w-0">
                <span className="font-label-sm text-label-sm text-secondary-fixed block">Pre-Allocated Cohort Placement</span>
                <span className="font-body-md-medium text-body-md-medium text-surface-white block leading-tight">Univ. of Melbourne — Master of IT</span>
                <span className="font-code-table text-code-table text-on-primary-container">Feb 2025 Intake • Direct Partner Stream</span>
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-2.5 pt-1">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-primary-container block">Exclusive Privileges Unlocked</span>
          <div className="flex items-start space-x-2.5">
            <span className="material-symbols-outlined text-status-verified text-body-md mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>
              check_circle
            </span>
            <span className="font-body-md text-body-md text-surface-white">Direct fast-track priority university admissions review</span>
          </div>
          <div className="flex items-start space-x-2.5">
            <span className="material-symbols-outlined text-status-verified text-body-md mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>
              check_circle
            </span>
            <span className="font-body-md text-body-md text-surface-white">Dedicated WhatsApp desk &amp; visa apostille auditing</span>
          </div>
          <div className="flex items-start space-x-2.5">
            <span className="material-symbols-outlined text-status-verified text-body-md mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>
              check_circle
            </span>
            <span className="font-body-md text-body-md text-surface-white">$100 AUD portal admissions application fee fully waived</span>
          </div>
        </div>
        <div className="relative z-10 pt-6 mt-6">
          <div className="flex items-center justify-between text-on-primary-container text-label-sm font-label-sm">
            <span className="flex items-center space-x-1">
              <span className="material-symbols-outlined text-body-sm">shield</span>
              <span>SOC2 Type II</span>
            </span>
            <span>•</span>
            <span>ISO 27001 Certified</span>
            <span>•</span>
            <span>GDPR/FERPA Compliant</span>
          </div>
        </div>
      </div>
    </>
  );

  const right = (
    <>
      <div className="mb-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-headline-lg text-headline-lg text-on-surface">Accept Invitation &amp; Activate</h2>
          <span className="bg-status-verified-subtle text-status-verified font-label-sm text-label-sm px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-status-verified" />
            Valid Link
          </span>
        </div>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Confirm your candidate profile to link with counselor Sarah Lin and synchronize your application documents.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4" id="inviteActivationForm">
        <div>
          <div className="flex justify-between items-center mb-1">
            <Label htmlFor="email" className="font-label-md text-label-md text-on-surface font-medium">Pre-Registered Invitation Email</Label>
            <span className="inline-flex items-center text-status-verified text-body-sm gap-1">
              <span className="material-symbols-outlined text-body-sm" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
              Identity Locked
            </span>
          </div>
          <div className="relative flex items-center">
            <Input
              id="email"
              name="email"
              type="email"
              value="daniel.nguyen@outlook.vn"
              readOnly
              className="w-full h-10 px-3.5 bg-canvas-subtle text-on-surface font-body-md-medium rounded-lg cursor-not-allowed select-none focus:outline-none"
            />
            <div className="absolute right-3 flex items-center space-x-1.5 bg-status-verified-subtle px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-status-verified" />
              <span className="font-label-sm text-label-sm text-status-verified">Verified</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <Label htmlFor="firstName" className="block font-label-md text-label-md text-on-surface mb-1">Legal First Name</Label>
            <Input id="firstName" name="firstName" type="text" value="Daniel" required className="w-full h-10 px-3.5 bg-surface-container-lowest text-on-surface font-body-md rounded-lg shadow-sm focus:outline-none focus:bg-surface-white" />
          </div>
          <div>
            <Label htmlFor="lastName" className="block font-label-md text-label-md text-on-surface mb-1">Legal Family Name</Label>
            <Input id="lastName" name="lastName" type="text" value="Nguyen" required className="w-full h-10 px-3.5 bg-surface-container-lowest text-on-surface font-body-md rounded-lg shadow-sm focus:outline-none focus:bg-surface-white" />
          </div>
        </div>
        <div>
          <Label htmlFor="phoneInput" className="block font-label-md text-label-md text-on-surface mb-1">Mobile Contact (WhatsApp / SMS notifications)</Label>
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-4 sm:col-span-3">
              <Select defaultValue="+84" className="w-full h-10 px-2.5 bg-surface-container-low text-on-surface font-body-md rounded-lg focus:outline-none">
                <option value="+84">🇻🇳 +84</option>
                <option value="+61">🇦🇺 +61</option>
                <option value="+1">🇺🇸 +1</option>
                <option value="+44">🇬🇧 +44</option>
                <option value="+65">🇸🇬 +65</option>
                <option value="+91">🇮🇳 +91</option>
              </Select>
            </div>
            <div className="col-span-8 sm:col-span-9">
              <Input id="phoneInput" name="phone" type="tel" placeholder="90 123 4567" required value="91 482 9901" className="w-full h-10 px-3.5 bg-surface-container-lowest text-on-surface font-body-md rounded-lg shadow-sm focus:outline-none" />
            </div>
          </div>
        </div>
        <div>
          <div className="flex justify-between items-center mb-1">
            <Label htmlFor="passwordInput" className="font-label-md text-label-md text-on-surface">Create Master Password</Label>
            <button
              type="button"
              onClick={() => setShowPwd((v) => !v)}
              className="text-on-surface-variant hover:text-primary text-body-sm flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-body-md" id="toggleIcon1">{showPwd ? "visibility_off" : "visibility"}</span>
              <span className="font-label-sm text-label-sm">Toggle</span>
            </button>
          </div>
          <Input
            id="passwordInput"
            name="password"
            type={showPwd ? "text" : "password"}
            placeholder="At least 8 chars, 1 number, 1 symbol"
            required
            onInput={(e) => checkPassword((e.target as HTMLInputElement).value)}
            className="w-full h-10 px-3.5 bg-surface-container-lowest text-on-surface font-body-md rounded-lg shadow-sm focus:outline-none"
          />
          <div className="mt-2 space-y-1">
            <div className="flex items-center justify-between text-body-sm font-label-sm">
              <span className="text-on-surface-variant">Security Rating:</span>
              <span className={`font-semibold ${strength.color}`} id="strengthLabel">{strength.label}</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full bg-canvas-subtle rounded-full overflow-hidden">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className={barClass(i)} />
              ))}
            </div>
          </div>
        </div>
        <div>
          <div className="flex justify-between items-center mb-1">
            <Label htmlFor="confirmPasswordInput" className="font-label-md text-label-md text-on-surface">Confirm Password</Label>
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="text-on-surface-variant hover:text-primary text-body-sm flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-body-md" id="toggleIcon2">{showConfirm ? "visibility_off" : "visibility"}</span>
              <span className="font-label-sm text-label-sm">Toggle</span>
            </button>
          </div>
          <Input
            id="confirmPasswordInput"
            name="confirmPassword"
            type={showConfirm ? "text" : "password"}
            placeholder="Re-enter chosen password"
            required
            className="w-full h-10 px-3.5 bg-surface-container-lowest text-on-surface font-body-md rounded-lg shadow-sm focus:outline-none"
          />
        </div>
        <div className="pt-1">
          <label className="flex items-start space-x-2.5 cursor-pointer">
            <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} required className="mt-1 w-4 h-4 rounded text-secondary bg-surface-container-low accent-secondary focus:ring-0 cursor-pointer" />
            <span className="font-body-sm text-body-sm text-on-surface-variant leading-snug">
              I agree to the{" "}
              <a className="text-secondary font-medium hover:underline" href="#">Terms of Service</a>{", "}
              <a className="text-secondary font-medium hover:underline" href="#">Privacy Policy</a>{", "}
              and consent to academic record dispatch with authorized partner institutions.
            </span>
          </label>
        </div>
        <div className="pt-2">
          <Button
            type="submit"
            className="w-full h-11 bg-secondary hover:bg-primary text-on-secondary rounded-lg font-label-md text-label-md flex items-center justify-center space-x-2 shadow-md transition-all duration-200 disabled:opacity-60"
            disabled={loading || !terms}
          >
            <span>Accept Invite &amp; Enter Student Portal</span>
            <span className="material-symbols-outlined text-headline-sm">arrow_forward</span>
            {loading && <span className="material-symbols-outlined text-headline-sm animate-spin">refresh</span>}
          </Button>
        </div>
      </form>
      <div className="pt-6 mt-6 space-y-3">
        <div className="bg-status-pending-subtle p-3 rounded-lg flex items-center justify-between text-body-sm">
          <div className="flex items-center space-x-2 text-on-surface">
            <span className="material-symbols-outlined text-status-pending text-headline-sm">alarm</span>
            <span>Invitation expires in <strong>6 days</strong> (Jan 24, 2025)</span>
          </div>
          <button type="button" className="text-secondary hover:underline font-label-sm text-label-sm font-medium" onClick={() => alert("A refreshed invitation link has been dispatched to daniel.nguyen@outlook.vn and Sarah Lin.")}>
            Request fresh invite
          </button>
        </div>
        <div className="text-center font-body-sm text-body-sm text-on-surface-variant">
          Already have an active account?{" "}
          <Link href="#" className="text-secondary font-medium hover:underline inline-flex items-center ml-1">
            <span>Sign in directly</span>
            <span className="material-symbols-outlined text-body-sm">chevron_right</span>
          </Link>
        </div>
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-on-surface-variant font-code-table text-code-table">
        <span>Portal Node: ap-southeast-2 (Sydney)</span>
        <span>•</span>
        <span>Session Token Hash: c4f2..9821</span>
        <span>•</span>
        <span>Authorized Dispatcher: Apex Global Edu (ID #AG-8820)</span>
      </div>
    </>
  );

  return <AuthSplitShell left={left} right={right} />;
}
