"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { AuthSplitShell } from "@/components/auth-split-shell";

export function PartnerSignupAuth() {
  const [fileName, setFileName] = useState("Drag & drop files here, or browse system files");
  const [compliance, setCompliance] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(`${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
    } else {
      setFileName("Drag & drop files here, or browse system files");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const form = e.currentTarget as HTMLFormElement;
      const data = new FormData(form);
      const res = await fetch("/api/auth/partner-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: data.get("companyName"),
          brn: data.get("brn"),
          operatingTerritory: data.get("operatingTerritory"),
          studentVolume: data.get("studentVolume"),
          signatoryNameRole: data.get("signatoryNameRole"),
          corporateEmail: data.get("corporateEmail"),
          contactPhone: data.get("contactPhone"),
          accreditationDoc: data.get("accreditationDoc")?.toString(),
          complianceCert: data.get("complianceCert"),
        }),
      });
      if (!res.ok) return;
      window.location.href = "/partner/login";
    } catch {
      // noop
    } finally {
      setLoading(false);
    }
  }

  const left = (
    <>
      <div className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-secondary opacity-10 blur-3xl pointer-events-none" />
      <div className="absolute -left-10 -top-10 w-60 h-60 rounded-full bg-surface-container-high opacity-10 blur-2xl pointer-events-none" />
      <div className="relative z-10 flex flex-col space-y-space-md">
        <div className="flex items-center space-x-space-xs">
          <span className="material-symbols-outlined text-secondary-fixed text-headline-md" style={{ fontVariationSettings: "'FILL' 1" }}>
            assured_workload
          </span>
          <span className="font-headline-sm text-headline-sm tracking-wider uppercase text-secondary-fixed">Global Admissions Network</span>
        </div>
        <div className="pt-space-md">
          <p className="font-label-sm text-label-sm uppercase tracking-widest text-on-primary-container">Institutional Placement Infrastructure</p>
          <h2 className="font-headline-lg text-headline-lg text-surface-white mt-space-2xs">Scale Cross-Border Student Recruitment</h2>
          <p className="font-body-md text-body-md text-on-primary-container mt-space-xs leading-relaxed">
            Gain direct integration with top-tier university registries, automated visa compliance auditing, and protected institutional commission schedules.
          </p>
        </div>
        <div className="mt-space-lg p-space-md rounded-lg bg-navy-deep bg-opacity-70 flex flex-col space-y-space-sm shadow-sm">
          <div className="flex items-center justify-between">
            <span className="font-label-md text-label-md text-secondary-fixed">Accreditation Benchmark</span>
            <span className="inline-flex items-center px-space-xs py-0.5 rounded-full bg-status-verified-subtle text-status-verified font-label-sm text-label-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-status-verified mr-1.5" />
              Verified Tier
            </span>
          </div>
          <div className="flex items-baseline space-x-space-xs">
            <span className="font-metric-display text-metric-display text-surface-white tracking-tight">99.4%</span>
            <span className="font-body-sm text-body-sm text-on-primary-container">visa issuance success rate</span>
          </div>
          <div className="w-full pt-space-2xs">
            <svg className="w-full h-8 text-secondary-container opacity-85" fill="none" preserveAspectRatio="none" viewBox="0 0 240 32">
              <path d="M0 28 L30 22 L60 25 L90 14 L120 18 L150 9 L180 12 L210 4 L240 2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
              <path d="M0 28 L30 22 L60 25 L90 14 L120 18 L150 9 L180 12 L210 4 L240 2 V32 H0 Z" fill="currentColor" fillOpacity={0.15} />
            </svg>
          </div>
        </div>
      </div>
      <div className="relative z-10 py-space-xl flex flex-col space-y-space-sm">
        <div className="flex items-start space-x-space-sm">
          <div className="p-1 rounded bg-navy-deep text-secondary-fixed-dim">
            <span className="material-symbols-outlined text-body-lg">verified_user</span>
          </div>
          <div className="flex flex-col">
            <span className="font-body-md-medium text-body-md-medium text-surface-white">Direct University Liaison</span>
            <span className="font-body-sm text-body-sm text-on-primary-container">CAS &amp; I-20 fast-tracked issuance workflows.</span>
          </div>
        </div>
        <div className="flex items-start space-x-space-sm">
          <div className="p-1 rounded bg-navy-deep text-secondary-fixed-dim">
            <span className="material-symbols-outlined text-body-lg">account_balance_wallet</span>
          </div>
          <div className="flex flex-col">
            <span className="font-body-md-medium text-body-md-medium text-surface-white">Automated Commission Escrow</span>
            <span className="font-body-sm text-body-sm text-on-primary-container">Transparent milestone disbursements in multi-currencies.</span>
          </div>
        </div>
        <div className="flex items-start space-x-space-sm">
          <div className="p-1 rounded bg-navy-deep text-secondary-fixed-dim">
            <span className="material-symbols-outlined text-body-lg">rule_folder</span>
          </div>
          <div className="flex flex-col">
            <span className="font-body-md-medium text-body-md-medium text-surface-white">Single-Pane Pipeline Audit</span>
            <span className="font-body-sm text-body-sm text-on-primary-container">Full audit-grade records for MoET, British Council, &amp; AIRC.</span>
          </div>
        </div>
      </div>
      <div className="relative z-10 pt-space-md border-t-0 bg-navy-deep p-space-md rounded-lg flex items-center justify-between">
        <div className="flex items-center space-x-space-xs">
          <span className="material-symbols-outlined text-status-verified text-headline-sm">encrypted</span>
          <span className="font-label-sm text-label-sm text-on-primary-container">SOC2 Type II &amp; GDPR Academic Data Compliant</span>
        </div>
        <span className="font-code-table text-code-table text-secondary-fixed">ISO:27001</span>
      </div>
    </>
  );

  const right = (
    <>
      <div className="flex flex-col space-y-space-2xs pb-space-lg">
        <div className="inline-flex items-center space-x-space-xs text-secondary mb-1">
          <span className="material-symbols-outlined text-headline-sm">corporate_fare</span>
          <span className="font-label-sm text-label-sm uppercase tracking-wider">Enterprise Onboarding</span>
        </div>
        <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">Partner &amp; Agency Registration</h1>
        <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">
          Register your educational agency or apply for counselor accreditation to manage student pipelines and commissions.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col space-y-space-md" id="PartnerSignupForm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
          <div className="flex flex-col space-y-space-2xs">
            <Label htmlFor="companyLegalName" className="font-label-md text-label-md text-on-surface flex items-center justify-between">
              <span>Agency Legal Name <span className="text-error">*</span></span>
            </Label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-3 text-on-surface-variant pointer-events-none text-headline-sm">domain</span>
              <Input id="companyLegalName" name="companyName" type="text" placeholder="e.g. Apex Global Education Group" required className="w-full h-10 pl-10 pr-3 rounded bg-surface-container-low text-on-surface placeholder:text-outline focus:outline-none focus:bg-surface-white shadow-sm font-body-md text-body-md transition-all" />
            </div>
          </div>
          <div className="flex flex-col space-y-space-2xs">
            <Label htmlFor="brn" className="font-label-md text-label-md text-on-surface flex items-center justify-between">
              <span>Registration Number (BRN) <span className="text-error">*</span></span>
            </Label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-3 text-on-surface-variant pointer-events-none text-headline-sm">badge</span>
              <Input id="brn" name="brn" type="text" placeholder="e.g. VN-8839201-B or ACN 928 102" required className="w-full h-10 pl-10 pr-3 rounded bg-surface-container-low text-on-surface placeholder:text-outline focus:outline-none focus:bg-surface-white shadow-sm font-body-md text-body-md transition-all" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
          <div className="flex flex-col space-y-space-2xs">
            <Label htmlFor="operatingTerritory" className="font-label-md text-label-md text-on-surface">
              Primary Territory / Country <span className="text-error">*</span>
            </Label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-3 text-on-surface-variant pointer-events-none text-headline-sm">public</span>
              <Select id="operatingTerritory" name="operatingTerritory" required defaultValue="" className="w-full h-10 pl-10 pr-8 rounded bg-surface-container-low text-on-surface focus:outline-none focus:bg-surface-white shadow-sm font-body-md text-body-md appearance-none transition-all cursor-pointer size-sm">
                <option value="">Select operating region...</option>
                <option value="Vietnam">Vietnam (Southeast Asia Hub)</option>
                <option value="India">India (South Asia)</option>
                <option value="Malaysia">Malaysia</option>
                <option value="Indonesia">Indonesia</option>
                <option value="Nigeria">Nigeria (West Africa)</option>
                <option value="Australia">Australia &amp; Oceania</option>
                <option value="China">China (East Asia)</option>
                <option value="Nepal">Nepal</option>
                <option value="Philippines">Philippines</option>
                <option value="Other">Other Global Territories</option>
              </Select>
              <span className="material-symbols-outlined absolute right-3 text-on-surface-variant pointer-events-none text-headline-sm">arrow_drop_down</span>
            </div>
          </div>
          <div className="flex flex-col space-y-space-2xs">
            <Label htmlFor="studentVolume" className="font-label-md text-label-md text-on-surface">
              Expected Annual Student Volume <span className="text-error">*</span>
            </Label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-3 text-on-surface-variant pointer-events-none text-headline-sm">groups</span>
              <Select id="studentVolume" name="studentVolume" required defaultValue="" className="w-full h-10 pl-10 pr-8 rounded bg-surface-container-low text-on-surface focus:outline-none focus:bg-surface-white shadow-sm font-body-md text-body-md appearance-none transition-all cursor-pointer size-sm">
                <option value="">Anticipated placements/year...</option>
                <option value="10-50">10 – 50 students</option>
                <option value="51-200">51 – 200 students</option>
                <option value="201-500">201 – 500 students</option>
                <option value="500+">500+ students (Enterprise Tier)</option>
              </Select>
              <span className="material-symbols-outlined absolute right-3 text-on-surface-variant pointer-events-none text-headline-sm">arrow_drop_down</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
          <div className="flex flex-col space-y-space-2xs md:col-span-1">
            <Label htmlFor="signatoryNameRole" className="font-label-md text-label-md text-on-surface truncate">
              Signatory &amp; Role <span className="text-error">*</span>
            </Label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-3 text-on-surface-variant pointer-events-none text-headline-sm">person</span>
              <Input id="signatoryNameRole" name="signatoryNameRole" type="text" placeholder="e.g. Sarah Lin — Director" required className="w-full h-10 pl-10 pr-3 rounded bg-surface-container-low text-on-surface placeholder:text-outline focus:outline-none focus:bg-surface-white shadow-sm font-body-md text-body-md transition-all" />
            </div>
          </div>
          <div className="flex flex-col space-y-space-2xs md:col-span-1">
            <Label htmlFor="corporateEmail" className="font-label-md text-label-md text-on-surface truncate">
              Corporate Email <span className="text-error">*</span>
            </Label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-3 text-on-surface-variant pointer-events-none text-headline-sm">mail</span>
              <Input id="corporateEmail" name="corporateEmail" type="email" placeholder="director@agency.com" required className="w-full h-10 pl-10 pr-3 rounded bg-surface-container-low text-on-surface placeholder:text-outline focus:outline-none focus:bg-surface-white shadow-sm font-body-md text-body-md transition-all" />
            </div>
          </div>
          <div className="flex flex-col space-y-space-2xs md:col-span-1">
            <Label htmlFor="contactPhone" className="font-label-md text-label-md text-on-surface truncate">
              Contact Phone <span className="text-error">*</span>
            </Label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-3 text-on-surface-variant pointer-events-none text-headline-sm">call</span>
              <Input id="contactPhone" name="contactPhone" type="tel" placeholder="+84 908 123 456" required className="w-full h-10 pl-10 pr-3 rounded bg-surface-container-low text-on-surface placeholder:text-outline focus:outline-none focus:bg-surface-white shadow-sm font-body-md text-body-md transition-all" />
            </div>
          </div>
        </div>
        <div className="flex flex-col space-y-space-2xs pt-space-xs">
          <div className="flex items-center justify-between">
            <Label className="font-label-md text-label-md text-on-surface">License &amp; Accreditation Documentation</Label>
            <span className="font-code-table text-code-table text-on-surface-variant">PDF, PNG, JPG (Max 15MB)</span>
          </div>
          <div className="relative w-full rounded-xl p-space-md flex flex-col items-center justify-center cursor-pointer bg-surface-container-low hover:bg-surface-container transition-all group" id="dropzone" onClick={() => document.getElementById("fileInput")?.click()}>
            <input accept=".pdf,.png,.jpg,.jpeg" id="fileInput" name="accreditationDoc" type="file" className="hidden" onChange={handleFileSelected} />
            <div className="flex items-center space-x-space-md">
              <div className="w-12 h-12 rounded-full bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-headline-md">upload_file</span>
              </div>
              <div className="flex flex-col text-left">
                <div className="flex items-center space-x-space-2xs">
                  <span className="font-body-md-medium text-body-md-medium text-on-surface">Attach MoET, British Council, or AIRC certificate</span>
                  <span className="font-label-sm text-label-sm bg-surface-container-high text-on-surface-variant px-1.5 py-0.5 rounded">Required for verified status</span>
                </div>
                <span className="font-body-sm text-body-sm text-outline mt-0.5" id="fileNameDisplay">{fileName}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="pt-space-xs">
          <label className="flex items-start space-x-space-xs cursor-pointer group">
            <input type="checkbox" checked={compliance} onChange={(e) => setCompliance(e.target.checked)} required id="complianceCert" name="complianceCert" className="mt-1 w-4 h-4 rounded text-secondary bg-surface-container-low focus:ring-secondary focus:ring-offset-0 cursor-pointer" />
            <span className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed select-none group-hover:text-on-surface transition-colors">
              I certify that this agency complies with international student recruitment standards, institutional data handling policies, and relevant regulatory codes of ethics (including British Council Agent Quality Framework, US AIRC, or host territory equivalents).
            </span>
          </label>
        </div>
        <div className="pt-space-sm">
          <Button
            type="submit"
            className="w-full h-12 rounded-lg bg-secondary text-surface-white font-label-md text-label-md font-semibold tracking-wide shadow-md hover:bg-on-tertiary-container hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-secondary-container transition-all flex items-center justify-center space-x-space-xs disabled:opacity-60"
            disabled={loading || !compliance}
          >
            <span>Submit Agency Application</span>
            <span className="material-symbols-outlined text-headline-sm">arrow_forward</span>
            {loading && <span className="material-symbols-outlined text-headline-sm animate-spin">refresh</span>}
          </Button>
        </div>
      </form>
      <div className="mt-space-lg pt-space-md flex flex-col sm:flex-row items-center justify-between bg-surface-container-low p-space-md rounded-lg">
        <span className="font-body-md text-body-md text-on-surface-variant">Already an accredited partner?</span>
        <Link href="/partner/login" className="font-body-md-medium text-body-md-medium text-secondary hover:text-navy-surface flex items-center space-x-1 mt-space-2xs sm:mt-0 transition-colors">
          <span>Sign in to Partner Portal</span>
          <span className="material-symbols-outlined text-body-md">login</span>
        </Link>
      </div>
    </>
  );

  return <AuthSplitShell left={left} right={right} />;
}
