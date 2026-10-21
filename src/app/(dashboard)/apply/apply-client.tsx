"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const AVATAR_URL =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCaz6BflblY3jS0ftTAUr_asKuMTnemHLoaUzhVD5N3rnT6TT-IUUr00jUo9-mOSaJYJv1Dkg8swuez22qT613hwdjQU2JYNPM8blz4BAn-b40nxZGE8JjOXAKo89ppmURl_yk6p1XKH3o8f7d689JIhH-fiSoqv1jVMgAuV9yK-lncgrOCW1LbwVWXxmKeYRfHWHwGJYreqDTKtFyW48Tcl4WYY_yWJqfZMFq_rxgiBnmcFZFV24Rp";

type FormValues = {
  firstName: string;
  lastName: string;
  gender: string;
  birthday: string;
  passportNumber: string;
  passportExpiry: string;
  nationality: string;
  countryOfResidence: string;
  cityOfResidence: string;
  address: string;
  intake: string;
  budget: string;
  field: string;
};

const EMPTY: FormValues = {
  firstName: "",
  lastName: "",
  gender: "male",
  birthday: "",
  passportNumber: "",
  passportExpiry: "",
  nationality: "",
  countryOfResidence: "",
  cityOfResidence: "",
  address: "",
  intake: "feb2026",
  budget: "25-40",
  field: "",
};

export default function ApplyClient({ draftId }: { draftId?: string }) {
  const [values, setValues] = useState<FormValues>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const sectionBRef = useRef<HTMLDivElement>(null);

  const draftLabel = draftId ?? "#DRAFT-2025-NEW-001";

  useEffect(() => {
    if (saved) {
      const b = document.getElementById("btn-save-continue");
      if (b) {
        const orig = b.innerHTML;
        b.innerHTML = '<span class="material-symbols-outlined text-base">check_circle</span><span>Personal Details Saved!</span>';
        setTimeout(() => { b.innerHTML = orig; setSaved(false); }, 1500);
      }
    }
  }, [saved]);

  async function handleSaveProfile() {
    setSaving(true);
    try {
      await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: values.firstName,
          lastName: values.lastName,
          gender: values.gender,
          birthday: values.birthday || null,
          passportNumber: values.passportNumber,
          nationality: values.nationality,
          countryOfResidence: values.countryOfResidence,
          cityOfResidence: values.cityOfResidence,
          address: values.address,
        }),
      });
      setSaved(true);
    } catch {
      // noop
    } finally {
      setSaving(false);
    }
  }

  function handleContinue() {
    void handleSaveProfile();
    if (sectionBRef.current) sectionBRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleDiscard() {
    setValues(EMPTY);
  }

  const intakeOptions = [
    { value: "feb2026", label: "February 2026 (Semester 1)" },
    { value: "jul2026", label: "July 2026 (Semester 2)" },
    { value: "oct2026", label: "October 2026 (Intensive Term)" },
  ];
  const budgetOptions = [
    { value: "25-40", label: "USD $25,000 - $40,000 / year" },
    { value: "40-60", label: "USD $40,000 - $60,000 / year" },
    { value: "60plus", label: "USD $60,000+ / year" },
  ];
  const genderOptions = [
    { value: "male", label: "Male (M)" },
    { value: "female", label: "Female (F)" },
    { value: "other", label: "Indeterminate / Non-Binary" },
  ];

  return (
    <div className="w-full max-w-[1440px] mx-auto px-gutter py-space-lg flex flex-col gap-space-lg">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-sm">
        <div className="flex flex-col gap-space-2xs">
          <div className="flex items-center gap-space-xs text-on-surface-variant font-label-md text-label-md">
            <Link href="/my-applications" className="flex items-center gap-1 hover:text-secondary font-medium transition-colors">
              <span className="material-symbols-outlined text-base">arrow_back</span>
              <span>Back to My Applications</span>
            </Link>
            <span className="text-outline-variant font-normal">/</span>
            <span className="text-on-surface-variant">Student Workspace</span>
            <span className="text-outline-variant font-normal">/</span>
            <span className="text-on-surface font-semibold">New University Intake</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">New University Admission Application</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Complete the 4-stage enrollment dossier. Progress auto-saves as a draft at each milestone.
          </p>
        </div>
        <div className="flex items-center gap-space-xs self-start md:self-auto bg-surface-container-lowest shadow-sm px-space-md py-space-xs rounded-xl">
          <span className="w-2.5 h-2.5 rounded-full bg-status-verified animate-pulse"></span>
          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Auto-Save Synchronized</span>
            <span className="font-code-table text-code-table text-on-surface font-medium">Cloud Vault · 14:32 UTC</span>
          </div>
        </div>
      </div>

      <div className="w-full bg-surface-container-low rounded-xl p-space-md flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm shadow-sm">
        <div className="flex items-center gap-space-sm">
          <div className="w-9 h-9 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary">
            <span className="material-symbols-outlined text-xl">folder_managed</span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-space-xs">
              <span className="font-label-md text-label-md font-bold text-on-surface">{draftLabel}</span>
              <span className="bg-status-verified-subtle text-status-verified font-label-sm text-label-sm px-2 py-0.5 rounded-full font-semibold">Saved 3m ago</span>
            </div>
            <span className="font-body-sm text-body-sm text-on-surface-variant">Target Destination: Australia · Monash University &amp; University of Melbourne</span>
          </div>
        </div>
        <div className="flex items-center gap-space-xs">
          <button type="button" className="px-space-sm py-1.5 rounded-lg bg-surface-container-lowest hover:bg-surface-white text-on-surface font-label-md text-label-md font-medium shadow-sm transition-colors" onClick={() => alert(JSON.stringify(values, null, 2))}>
            View Raw JSON
          </button>
          <button type="button" className="px-space-sm py-1.5 rounded-lg bg-surface-container-lowest hover:bg-surface-white text-status-rejected font-label-md text-label-md font-medium shadow-sm transition-colors" onClick={handleDiscard}>
            Discard Draft
          </button>
        </div>
      </div>

      <div className="w-full bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col gap-space-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs">
          <div className="flex items-center gap-space-xs">
            <span className="font-headline-sm text-headline-sm text-on-surface font-bold">Enrollment Pipeline Phase</span>
            <span className="bg-secondary text-on-secondary font-label-sm text-label-sm px-2.5 py-0.5 rounded-full font-semibold">Stage 1 of 4</span>
          </div>
          <span className="font-label-md text-label-md font-medium text-secondary">25% Total Dossier Completed</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-space-sm">
          <div className="flex items-center gap-space-xs p-space-xs rounded-lg bg-navy-surface text-on-primary shadow-sm">
            <div className="w-7 h-7 rounded-full bg-secondary text-on-secondary flex items-center justify-center font-label-md font-bold text-label-md">1</div>
            <div className="flex flex-col min-w-0">
              <span className="font-label-md text-label-md font-semibold truncate leading-tight">Personal Details</span>
              <span className="font-code-table text-code-table text-on-primary-container truncate">In-Progress · 8 fields</span>
            </div>
          </div>
          <div className="flex items-center gap-space-xs p-space-xs rounded-lg bg-surface-container-low text-on-surface-variant">
            <div className="w-7 h-7 rounded-full bg-surface-container text-on-surface-variant flex items-center justify-center font-label-md font-bold text-label-md">2</div>
            <div className="flex flex-col min-w-0">
              <span className="font-label-md text-label-md font-medium truncate leading-tight text-on-surface">Academic History</span>
              <span className="font-code-table text-code-table text-outline truncate">Transcripts &amp; GPA</span>
            </div>
          </div>
          <div className="flex items-center gap-space-xs p-space-xs rounded-lg bg-surface-container-low text-on-surface-variant">
            <div className="w-7 h-7 rounded-full bg-surface-container text-on-surface-variant flex items-center justify-center font-label-md font-bold text-label-md">3</div>
            <div className="flex flex-col min-w-0">
              <span className="font-label-md text-label-md font-medium truncate leading-tight text-on-surface">Document Vault</span>
              <span className="font-code-table text-code-table text-outline truncate">Passport &amp; Tests</span>
            </div>
          </div>
          <div className="flex items-center gap-space-xs p-space-xs rounded-lg bg-surface-container-low text-on-surface-variant">
            <div className="w-7 h-7 rounded-full bg-surface-container text-on-surface-variant flex items-center justify-center font-label-md font-bold text-label-md">4</div>
            <div className="flex flex-col min-w-0">
              <span className="font-label-md text-label-md font-medium truncate leading-tight text-on-surface">Program Choice</span>
              <span className="font-code-table text-code-table text-outline truncate">Final Verification</span>
            </div>
          </div>
        </div>
        <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
          <div className="h-full bg-secondary transition-all duration-500 rounded-full" style={{ width: "25%" }}></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
        <div className="lg:col-span-8 flex flex-col gap-space-lg">
          <form className="flex flex-col gap-space-lg" onSubmit={(e) => e.preventDefault()}>
            <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md">
              <div className="flex items-center justify-between pb-space-xs">
                <div className="flex items-center gap-space-xs">
                  <span className="w-2.5 h-6 bg-secondary rounded-full"></span>
                  <div className="flex flex-col">
                    <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">Section A: Identity &amp; Demographics</h2>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">Ensure details match your international travel passport exactly</span>
                  </div>
                </div>
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary font-semibold bg-secondary-fixed/30 px-2.5 py-1 rounded-md">Primary Dossier</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="firstName" className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface font-semibold flex items-center gap-1">
                    Given Name / First Name <span className="text-error">*</span>
                  </Label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3 text-on-surface-variant text-base">badge</span>
                    <Input id="firstName" value={values.firstName} onChange={(e) => setValues({ ...values, firstName: e.target.value })} required className="w-full h-10 pl-9 pr-3 rounded-lg bg-surface-container-low font-body-md text-body-md text-on-surface focus:outline-none focus:bg-surface-white shadow-sm" />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="lastName" className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface font-semibold flex items-center gap-1">
                    Family Name / Last Name <span className="text-error">*</span>
                  </Label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3 text-on-surface-variant text-base">badge</span>
                    <Input id="lastName" value={values.lastName} onChange={(e) => setValues({ ...values, lastName: e.target.value })} required className="w-full h-10 pl-9 pr-3 rounded-lg bg-surface-container-low font-body-md text-body-md text-on-surface focus:outline-none focus:bg-surface-white shadow-sm" />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="gender" className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface font-semibold flex items-center gap-1">
                    Biological Sex / Gender <span className="text-error">*</span>
                  </Label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3 text-on-surface-variant text-base">person</span>
                    <Select id="gender" defaultValue={values.gender} onChange={(e) => setValues({ ...values, gender: e.target.value })} className="w-full h-10 pl-9 pr-8 rounded-lg bg-surface-container-low font-body-md text-body-md text-on-surface focus:outline-none focus:bg-surface-white appearance-none cursor-pointer shadow-sm">
                      {genderOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </Select>
                    <span className="material-symbols-outlined absolute right-3 text-on-surface-variant text-base pointer-events-none">expand_more</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="birthday" className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface font-semibold flex items-center gap-1">
                    Date of Birth <span className="text-error">*</span>
                  </Label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3 text-on-surface-variant text-base">calendar_today</span>
                    <Input id="birthday" type="date" value={values.birthday} onChange={(e) => setValues({ ...values, birthday: e.target.value })} required className="w-full h-10 pl-9 pr-3 rounded-lg bg-surface-container-low font-body-md text-body-md text-on-surface focus:outline-none focus:bg-surface-white shadow-sm" />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="passportNumber" className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface font-semibold flex items-center gap-1">
                    Passport Number <span className="text-error">*</span>
                  </Label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3 text-on-surface-variant text-base">airplane_ticket</span>
                    <Input id="passportNumber" value={values.passportNumber} onChange={(e) => setValues({ ...values, passportNumber: e.target.value })} required className="w-full h-10 pl-9 pr-3 rounded-lg bg-surface-container-low font-body-md text-body-md text-on-surface focus:outline-none focus:bg-surface-white uppercase shadow-sm" />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="passportExpiry" className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface font-semibold flex items-center gap-1">
                    Passport Expiry Date <span className="text-error">*</span>
                  </Label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3 text-on-surface-variant text-base">event_busy</span>
                    <Input id="passportExpiry" type="date" value={values.passportExpiry} onChange={(e) => setValues({ ...values, passportExpiry: e.target.value })} required className="w-full h-10 pl-9 pr-3 rounded-lg bg-surface-container-low font-body-md text-body-md text-on-surface focus:outline-none focus:bg-surface-white shadow-sm" />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="nationality" className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface font-semibold flex items-center gap-1">
                    Nationality / Citizenship <span className="text-error">*</span>
                  </Label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3 text-on-surface-variant text-base">flag</span>
                    <Input id="nationality" value={values.nationality} onChange={(e) => setValues({ ...values, nationality: e.target.value })} required className="w-full h-10 pl-9 pr-3 rounded-lg bg-surface-container-low font-body-md text-body-md text-on-surface focus:outline-none focus:bg-surface-white shadow-sm" />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="countryOfResidence" className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface font-semibold flex items-center gap-1">
                    Country of Residence <span className="text-error">*</span>
                  </Label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3 text-on-surface-variant text-base">public</span>
                    <Input id="countryOfResidence" value={values.countryOfResidence} onChange={(e) => setValues({ ...values, countryOfResidence: e.target.value })} required className="w-full h-10 pl-9 pr-3 rounded-lg bg-surface-container-low font-body-md text-body-md text-on-surface focus:outline-none focus:bg-surface-white shadow-sm" />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <Label htmlFor="cityOfResidence" className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface font-semibold flex items-center gap-1">
                    Current City / Metropolitan Region <span className="text-error">*</span>
                  </Label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3 text-on-surface-variant text-base">location_city</span>
                    <Input id="cityOfResidence" value={values.cityOfResidence} onChange={(e) => setValues({ ...values, cityOfResidence: e.target.value })} required className="w-full h-10 pl-9 pr-3 rounded-lg bg-surface-container-low font-body-md text-body-md text-on-surface focus:outline-none focus:bg-surface-white shadow-sm" />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <Label htmlFor="address" className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface font-semibold flex items-center gap-1">
                    Permanent Residential Address <span className="text-error">*</span>
                  </Label>
                  <textarea id="address" value={values.address} onChange={(e) => setValues({ ...values, address: e.target.value })} required rows={2} className="w-full p-space-xs rounded-lg bg-surface-container-low font-body-md text-body-md text-on-surface focus:outline-none focus:bg-surface-white shadow-sm" />
                  <span className="font-code-table text-code-table text-on-surface-variant">Must align with utility bills or national ID documentation.</span>
                </div>
              </div>
            </div>

            <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md">
              <div className="flex items-center justify-between pb-space-xs">
                <div className="flex items-center gap-space-xs">
                  <span className="w-2.5 h-6 bg-secondary-container rounded-full"></span>
                  <div className="flex flex-col">
                    <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">Section B: Family &amp; Emergency Contacts</h2>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">Designated custodians for embassy correspondence and medical clearance</span>
                  </div>
                </div>
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold bg-surface-container-low px-2.5 py-1 rounded-md">2 Nominees</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                <div className="flex flex-col gap-1.5">
                  <Label className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface font-semibold flex items-center gap-1">Father's Full Name <span className="text-error">*</span></Label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3 text-on-surface-variant text-base">supervisor_account</span>
                    <Input id="fatherName" placeholder="Nguyen Van Thang" className="w-full h-10 pl-9 pr-3 rounded-lg bg-surface-container-low font-body-md text-body-md text-on-surface focus:outline-none focus:bg-surface-white shadow-sm" />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface font-semibold flex items-center gap-1">Father's Contact Phone <span className="text-error">*</span></Label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3 text-on-surface-variant text-base">call</span>
                    <Input id="fatherPhone" type="tel" placeholder="+84 90 312 8844" className="w-full h-10 pl-9 pr-3 rounded-lg bg-surface-container-low font-body-md text-body-md text-on-surface focus:outline-none focus:bg-surface-white shadow-sm" />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface font-semibold flex items-center gap-1">Mother's Full Name <span className="text-error">*</span></Label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3 text-on-surface-variant text-base">supervisor_account</span>
                    <Input id="motherName" placeholder="Le Thi Mai" className="w-full h-10 pl-9 pr-3 rounded-lg bg-surface-container-low font-body-md text-body-md text-on-surface focus:outline-none focus:bg-surface-white shadow-sm" />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface font-semibold flex items-center gap-1">Mother's Contact Phone <span className="text-error">*</span></Label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3 text-on-surface-variant text-base">call</span>
                    <Input id="motherPhone" type="tel" placeholder="+84 91 823 4455" className="w-full h-10 pl-9 pr-3 rounded-lg bg-surface-container-low font-body-md text-body-md text-on-surface focus:outline-none focus:bg-surface-white shadow-sm" />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface font-semibold flex items-center gap-1">Emergency Relationship <span className="text-error">*</span></Label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3 text-on-surface-variant text-base">diversity_1</span>
                    <Select className="w-full h-10 pl-9 pr-8 rounded-lg bg-surface-container-low font-body-md text-body-md text-on-surface focus:outline-none focus:bg-surface-white appearance-none cursor-pointer shadow-sm">
                      <option>Father</option>
                      <option>Mother</option>
                      <option>Legal Guardian</option>
                      <option>Sibling</option>
                    </Select>
                    <span className="material-symbols-outlined absolute right-3 text-on-surface-variant text-base pointer-events-none">expand_more</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface font-semibold flex items-center gap-1">Emergency Email Address <span className="text-error">*</span></Label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3 text-on-surface-variant text-base">alternate_email</span>
                    <Input id="emergencyEmail" type="email" placeholder="thang.nguyen.vn@gmail.com" className="w-full h-10 pl-9 pr-3 rounded-lg bg-surface-container-low font-body-md text-body-md text-on-surface focus:outline-none focus:bg-surface-white shadow-sm" />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md">
              <div className="flex items-center justify-between pb-space-xs">
                <div className="flex items-center gap-space-xs">
                  <span className="w-2.5 h-6 bg-status-info rounded-full"></span>
                  <div className="flex flex-col">
                    <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">Section C: Study Goals &amp; Intake Window</h2>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">Calibrate course matching with institutional timelines and budget thresholds</span>
                  </div>
                </div>
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-status-info font-semibold bg-status-info-subtle px-2.5 py-1 rounded-md">Intake Match</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="intake" className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface font-semibold flex items-center gap-1">Target Intake Season <span className="text-error">*</span></Label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3 text-on-surface-variant text-base">event_note</span>
                    <Select id="intake" defaultValue={values.intake} onChange={(e) => setValues({ ...values, intake: e.target.value })} className="w-full h-10 pl-9 pr-8 rounded-lg bg-surface-container-low font-body-md text-body-md text-on-surface focus:outline-none focus:bg-surface-white appearance-none cursor-pointer shadow-sm">
                      {intakeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </Select>
                    <span className="material-symbols-outlined absolute right-3 text-on-surface-variant text-base pointer-events-none">expand_more</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="budget" className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface font-semibold flex items-center gap-1">Budget Capacity (Tuition + Living) <span className="text-error">*</span></Label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3 text-on-surface-variant text-base">payments</span>
                    <Select id="budget" defaultValue={values.budget} onChange={(e) => setValues({ ...values, budget: e.target.value })} className="w-full h-10 pl-9 pr-8 rounded-lg bg-surface-container-low font-body-md text-body-md text-on-surface focus:outline-none focus:bg-surface-white appearance-none cursor-pointer shadow-sm">
                      {budgetOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </Select>
                    <span className="material-symbols-outlined absolute right-3 text-on-surface-variant text-base pointer-events-none">expand_more</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <Label htmlFor="field" className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface font-semibold flex items-center gap-1">Primary Academic Field of Interest <span className="text-error">*</span></Label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3 text-on-surface-variant text-base">school</span>
                    <Input id="field" value={values.field} onChange={(e) => setValues({ ...values, field: e.target.value })} required placeholder="Computer Science &amp; Artificial Intelligence / Data Science" className="w-full h-10 pl-9 pr-3 rounded-lg bg-surface-container-low font-body-md text-body-md text-on-surface focus:outline-none focus:bg-surface-white shadow-sm" />
                  </div>
                </div>
              </div>
            </div>

            <div ref={sectionBRef} className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col gap-space-sm opacity-90 hover:opacity-100 transition-opacity">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-space-xs">
                  <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-on-surface-variant font-bold text-label-md">2</div>
                  <div className="flex flex-col">
                    <span className="font-label-md text-label-md font-bold text-on-surface">Step 2: Academic History (Sneak Peek)</span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">1 record auto-populated from high school transcripts</span>
                  </div>
                </div>
                <span className="bg-surface-container text-on-surface-variant font-code-table text-code-table px-2.5 py-1 rounded">Locked until Step 1 validated</span>
              </div>
              <div className="bg-surface-container-low rounded-lg p-space-sm flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs">
                <div className="flex items-center gap-space-sm">
                  <span className="material-symbols-outlined text-secondary text-2xl">history_edu</span>
                  <div className="flex flex-col">
                    <span className="font-label-md text-label-md font-semibold text-on-surface">High School Diploma (Gifted STEM Track)</span>
                    <span className="font-code-table text-code-table text-on-surface-variant">Le Hong Phong High School for the Gifted · Graduated 2023</span>
                  </div>
                </div>
                <div className="flex items-center gap-space-sm self-end sm:self-auto">
                  <div className="flex flex-col text-right">
                    <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Cumulative GPA</span>
                    <span className="font-headline-sm text-headline-sm font-bold text-status-verified">9.1 / 10.0</span>
                  </div>
                  <span className="material-symbols-outlined text-on-surface-variant text-base">lock</span>
                </div>
              </div>
            </div>
          </form>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-space-md">
          <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col gap-space-md">
            <div className="flex items-center gap-space-sm">
              <div className="relative w-14 h-14 rounded-full overflow-hidden flex-shrink-0 shadow-sm">
                <img alt="Sarah Lin portrait" className="w-full h-full object-cover" src={AVATAR_URL} />
                <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-status-verified rounded-full ring-2 ring-surface-white"></span>
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1">
                  <span className="font-label-md text-label-md font-bold text-on-surface truncate">Sarah Lin</span>
                  <span className="material-symbols-outlined text-status-verified text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                </div>
                <span className="font-body-sm text-body-sm text-on-surface-variant truncate">Senior Education Consultant</span>
                <span className="font-code-table text-code-table text-secondary font-medium">Oceania Admissions Desk</span>
              </div>
            </div>
            <div className="bg-surface-container-low rounded-lg p-space-sm flex flex-col gap-space-2xs text-on-surface">
              <div className="flex items-center gap-1 text-on-surface-variant font-label-sm text-label-sm font-semibold uppercase tracking-wider">
                <span className="material-symbols-outlined text-sm">sticky_note_2</span>
                <span>Counselor Advice</span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface leading-relaxed">
                “Daniel, ensure your passport has at least <strong>18 months validity</strong> remaining for Australian Subclass 500 visa requirements. Your current expiry in 2031 is pristine! Ping me if you need help with GPA conversion.”
              </p>
            </div>
            <div className="flex flex-col gap-space-xs">
              <a className="w-full flex items-center justify-center gap-space-xs bg-status-verified-subtle hover:bg-status-verified/20 text-status-verified font-label-md text-label-md py-2 px-space-md rounded-lg transition-colors font-semibold" href="https://wa.me/" rel="noopener" target="_blank">
                <span className="material-symbols-outlined text-base">chat</span>
                <span>Chat on WhatsApp Desk</span>
              </a>
              <Link href="/messages" className="w-full flex items-center justify-center gap-space-xs bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md py-2 px-space-md rounded-lg transition-colors font-medium">
                <span className="material-symbols-outlined text-base">video_call</span>
                <span>Schedule 15m Video Review</span>
              </Link>
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col gap-space-sm">
            <div className="flex items-center justify-between">
              <span className="font-label-md text-label-md font-bold text-on-surface">Application Checklist &amp; Tips</span>
              <span className="font-code-table text-code-table text-secondary font-semibold">Stage 1 of 4</span>
            </div>
            <div className="flex flex-col gap-space-xs">
              <div className="flex items-start gap-space-xs p-space-xs bg-surface-container-low rounded-lg">
                <span className="material-symbols-outlined text-status-verified text-base mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                <div className="flex flex-col">
                  <span className="font-label-md text-label-md font-semibold text-on-surface">Valid International Passport</span>
                  <span className="font-code-table text-code-table text-on-surface-variant">Validated B98234120 (Expires Oct 2031)</span>
                </div>
              </div>
              <div className="flex items-start gap-space-xs p-space-xs bg-surface-container-low rounded-lg">
                <span className="material-symbols-outlined text-status-pending text-base mt-0.5">pending</span>
                <div className="flex flex-col">
                  <span className="font-label-md text-label-md font-semibold text-on-surface">Certified English Translations</span>
                  <span className="font-code-table text-code-table text-on-surface-variant">Required for Vietnamese transcripts in Step 3</span>
                </div>
              </div>
              <div className="flex items-start gap-space-xs p-space-xs bg-surface-container-low rounded-lg">
                <span className="material-symbols-outlined text-status-info text-base mt-0.5">info</span>
                <div className="flex flex-col">
                  <span className="font-label-md text-label-md font-semibold text-on-surface">English Proficiency Target</span>
                  <span className="font-code-table text-code-table text-on-surface-variant">Official IELTS 6.5+ or TOEFL iBT 79+ recommended</span>
                </div>
              </div>
              <div className="flex items-start gap-space-xs p-space-xs bg-surface-container-low rounded-lg">
                <span className="material-symbols-outlined text-on-surface-variant text-base mt-0.5">description</span>
                <div className="flex flex-col">
                  <span className="font-label-md text-label-md font-semibold text-on-surface">Statement of Purpose Draft</span>
                  <span className="font-code-table text-code-table text-on-surface-variant">Draft builder available in Step 3 vault</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col gap-space-sm">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold">Priority University Destinations</span>
            <div className="flex items-center gap-space-sm">
              <div className="flex-1 bg-surface-container-low p-space-xs rounded-lg flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-secondary text-lg">account_balance</span>
                <div className="flex flex-col truncate">
                  <span className="font-label-md text-label-md font-bold text-on-surface truncate">Monash Univ.</span>
                  <span className="font-code-table text-code-table text-on-surface-variant truncate">Group of Eight · AUS</span>
                </div>
              </div>
              <div className="flex-1 bg-surface-container-low p-space-xs rounded-lg flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-secondary text-lg">account_balance</span>
                <div className="flex flex-col truncate">
                  <span className="font-label-md text-label-md font-bold text-on-surface truncate">Univ. Melbourne</span>
                  <span className="font-code-table text-code-table text-on-surface-variant truncate">Rank #14 Global</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 z-30 bg-surface-container-lowest/95 backdrop-blur-md rounded-xl p-space-md shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-space-md mt-space-md">
        <div className="flex items-center gap-space-xs text-on-surface-variant">
          <span className="material-symbols-outlined text-status-verified text-base">cloud_done</span>
          <span className="font-code-table text-code-table text-on-surface">Session autosaved at <strong>14:32:08 UTC</strong> · Identity stage ready</span>
        </div>
        <div className="flex items-center gap-space-sm justify-end">
          <button type="button" className="px-space-md py-2.5 rounded-lg bg-surface-container text-on-surface hover:bg-surface-container-high font-label-md text-label-md font-semibold transition-colors flex items-center gap-1.5 shadow-sm" onClick={handleDiscard}>
            <span className="material-symbols-outlined text-base">save</span>
            <span>Save as Draft &amp; Exit</span>
          </button>
          <button id="btn-save-continue" type="button" className={cn("px-space-lg py-2.5 rounded-lg bg-navy-surface hover:bg-navy-deep text-on-primary font-label-md text-label-md font-semibold shadow-md transition-all flex items-center gap-space-xs", saving ? "opacity-80" : "")} onClick={handleContinue} disabled={saving}>
            <span>Save &amp; Continue to Academic History</span>
            <span className="material-symbols-outlined text-base">arrow_forward</span>
          </button>
        </div>
      </div>
    </div>
  );
}
