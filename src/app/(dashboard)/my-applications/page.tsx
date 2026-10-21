import { redirect } from "next/navigation";
import Link from "next/link";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import type { ApplicationStage } from "@/generated/prisma/client";
import { formatCurrency, toNum } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const metadata = { title: "My Applications · StudyAbroad Portal" };

const PORTRAIT_URL =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCaz6BflblY3jS0ftTAUr_asKuMTnemHLoaUzhVD5N3rnT6TT-IUUr00jUo9-mOSaJYJv1Dkg8swuez22qT613hwdjQU2JYNPM8blz4BAn-b40nxZGE8JjOXAKo89ppmURl_yk6p1XKH3o8f7d689JIhH-fiSoqv1jVMgAuV9yK-lncgrOCW1LbwVWXxmKeYRfHWHwGJYreqDTKtFyW48Tcl4WYY_yWJqfZMFq_rxgiBnmcFZFV24Rp";
const MONASH_URL =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCQsmKrN_xwpUDTYL9rM5za6EEBr3UbsnIY6oR71DnLNAUPSyrNcPCEEt4GNwn1MzbSDZHiOr8EDIHUPNpJzeXJ4zOcepvWqMQY0DRrBccJj_PTyEmJqARkJ_kr5eNdVW-FCHSgBQXJT_wNdpGZ45qOuO8gbAApeRJ1ucFse27dcGbySZy0Y1_jFW30Ny8yLTMioAsbK2VEWec7zdrJnir_5L2XB3YTshpj4XV8Gg4kEYmTiblIEpHi";
const BRISTOL_URL =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCYajg-iLY1kZX6Gmvl1r2iY8hS3jf_NmtBrxlqSDppxKP5kKdNFJTqyMuV56h10mAAUZeIfXvhWE6Z9zVhfNyDjLU_EdG5XQ1b51sVENDser9WsUczbn7wn-tUQG-WXkmMXIupBVh3xKAz87Z2_5GcMcQ_nDkNCRgXDSKEtXwLptpE-sY1CZ3O9IMI2LhuEatPpyKwpM02-5rb7DjHr4izEyjclGv8crtUHRneMFKcxNnstjLAFHEv";
const MELBOURNE_URL =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDoBknu2nHsVgJkzNIi6yXYa6dVUF6k9mrKxkumj5o7Qeb-wXIGQUuPwSI2N28PJUyyiXamCn8HUv1fvmpWTGUAWhHCA4-a7VfEkdK3JJy6Wo54WbJNs1iHuOfPO0dXft1UARE_s9vrn_L2yPcK9nOZ6hFue4bdDFARnCtixKeK19AB1U2FUUkXaCisPfbCCzkMNtEQuk7BAJq_PeEvPx4u0uQCgx3WWMjLTNaMmKCN43-3HQhco0zP";
const TORONTO_URL =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDdWtRr9iE1ocL47P6QcjVrumVr3xdAoD9sw_oH7KNSlGVmKtsxPoExSZlOAr8VtifgTAUzGAczj9Eu8Zpi2RTs0DMbIgApti7UC8peXp2lBAfjYPLcK5fio4vF4DA48_DJ07r9jWGY1FF3DZ_D4QzfXoMbjUcYT1FShSl16KqNaYeA0ZoWKdbVvpRqyqD4EYkE9YxhLGO7xB3eOv2CVkEo1ZNi6FVUxJRvq7_xicPH_yUQmCX_MQdR";

const STAGE_TONE: Record<ApplicationStage, "verified" | "secondary" | "info" | "rejected" | "outline"> = {
  DRAFT: "outline",
  SUBMITTED: "secondary",
  UNDER_REVIEW: "secondary",
  OFFER: "verified",
  DEPOSIT_PAID: "verified",
  VISA: "info",
  ENROLLED: "verified",
  REJECTED: "rejected",
  WITHDRAWN: "rejected",
};

type Row = {
  id: string;
  studentId: string;
  programId: string;
  stage: ApplicationStage;
  submittedAt: Date | null;
  createdAt: Date;
  program: { name: string; tuitionFee: any; university: { name: string; universityLogoUrl?: string | null } };
  documents: Array<{ status: string }>;
  docsOk: boolean;
  docsTotal: number;
  docsVerified: number;
};

export default async function MyApplicationsPage() {
  const user = await currentUser();
  if (!user) redirect("/");
  if (user.role !== "STUDENT") redirect("/home");

  const [applications] = await Promise.all([
    prisma.application.findMany({
      where: { studentId: user.id },
      orderBy: { createdAt: "desc" },
      include: { program: { include: { university: true } }, documents: true },
    }),
  ]);

  const rows: Row[] = applications.map((a) => {
    const docsVerified = a.documents.filter((d) => d.status === "VERIFIED").length;
    return {
      ...a,
      docsOk: a.documents.length > 0 && a.documents.every((d) => d.status === "VERIFIED"),
      docsTotal: a.documents.length,
      docsVerified,
    };
  });

  const total = rows.length;
  const offered = rows.filter((a) => ["OFFER", "DEPOSIT_PAID"].includes(a.stage)).length;
  const inProgress = rows.filter((a) => ["SUBMITTED", "UNDER_REVIEW", "VISA"].includes(a.stage)).length;
  const pendingDocs = rows.reduce((s, a) => s + a.documents.filter((d) => d.status !== "VERIFIED").length, 0);

  const stageLabel = (stage: ApplicationStage) => {
    switch (stage) {
      case "OFFER":
      case "DEPOSIT_PAID":
        return "OFFER ISSUED";
      case "SUBMITTED":
      case "UNDER_REVIEW":
        return "UNDER REVIEW";
      case "REJECTED":
      case "WITHDRAWN":
        return "REJECTED";
      case "DRAFT":
        return "DRAFT STAGE";
      case "VISA":
        return "VISA PROCESSING";
      case "ENROLLED":
        return "ENROLLED";
      default:
        return String(stage).replace(/_/g, " ");
    }
  };

  const tabRows = [
    { key: "all", label: "All", count: total },
    { key: "offers", label: "Offers Received", count: offered },
    { key: "review", label: "Under Review", count: inProgress },
    { key: "action", label: "Action Required", count: pendingDocs },
    { key: "drafts", label: "Drafts", count: rows.filter((r) => r.stage === "DRAFT").length },
  ];

  return (
    <div className="space-y-space-lg">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-navy-deep via-navy-surface to-primary-container text-on-primary p-space-lg lg:p-space-xl shadow-xl">
        <div className="absolute -right-20 -top-24 w-96 h-96 rounded-full bg-secondary-container/15 blur-3xl pointer-events-none"></div>
        <div className="absolute right-40 bottom-0 w-64 h-64 rounded-full bg-tertiary-container/30 blur-2xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-space-lg">
          <div className="space-y-space-xs max-w-2xl">
            <div className="inline-flex items-center gap-space-xs px-space-xs py-space-2xs rounded-full bg-surface-white/10 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-status-verified animate-pulse"></span>
              <span className="font-code-table text-code-table tracking-wider uppercase text-inverse-on-surface">STUDENT WORKSPACE · ID: #STU-2025-0914</span>
            </div>
            <h1 className="font-display-hero text-display-hero text-surface-white tracking-tight">
              Your study journey, <span className="text-secondary-fixed">in one place.</span>
            </h1>
            <p className="font-body-lg text-body-lg text-on-primary-container leading-relaxed">
              Track your admission applications, offer letters, visa milestones, and scholarship statuses in real-time.
            </p>
          </div>
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-space-xs self-start lg:self-center">
            <Link href="/apply" className="inline-flex items-center justify-center gap-space-xs px-space-md py-space-xs rounded-lg bg-secondary text-on-secondary font-label-md text-label-md font-semibold hover:bg-secondary/90 transition-all shadow-md hover:shadow-lg">
              <span className="material-symbols-outlined text-lg">add_circle</span>
              <span>+ New Application</span>
            </Link>
            <Link href="/programs" className="inline-flex items-center justify-center gap-space-xs px-space-md py-space-xs rounded-lg bg-surface-white/10 hover:bg-surface-white/20 text-surface-white font-label-md text-label-md transition-colors backdrop-blur-md">
              <span className="material-symbols-outlined text-lg">travel_explore</span>
              <span>Explore Programs</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Metric Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
        <div className="p-space-md rounded-xl bg-surface-container-lowest shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-space-2xs">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Total Applications</span>
            <span className="p-space-2xs rounded-lg bg-surface-container text-secondary">
              <span className="material-symbols-outlined text-lg">layers</span>
            </span>
          </div>
          <div className="flex items-baseline gap-space-xs">
            <span className="font-metric-display text-metric-display text-on-surface">{total}</span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">across 3 universities</span>
          </div>
          <div className="mt-space-xs pt-space-2xs flex items-center text-status-verified font-label-sm text-label-sm">
            <span className="material-symbols-outlined text-sm">trending_up</span>
            <span className="ml-1 font-medium">+1 submitted this term</span>
          </div>
        </div>
        <div className="p-space-md rounded-xl bg-surface-container-lowest shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-space-2xs">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Offers Received</span>
            <span className="p-space-2xs rounded-lg bg-status-verified-subtle text-status-verified">
              <span className="material-symbols-outlined text-lg">verified</span>
            </span>
          </div>
          <div className="flex items-baseline gap-space-xs">
            <span className="font-metric-display text-metric-display text-on-surface">{offered}</span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">Unconditional &amp; Conditional</span>
          </div>
          <div className="mt-space-xs pt-space-2xs flex items-center text-status-verified font-label-sm text-label-sm">
            <span className="material-symbols-outlined text-sm">alarm_on</span>
            <span className="ml-1 font-medium">1 action needed before Dec 15</span>
          </div>
        </div>
        <div className="p-space-md rounded-xl bg-surface-container-lowest shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-space-2xs">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">In Progress</span>
            <span className="p-space-2xs rounded-lg bg-surface-container text-status-info">
              <span className="material-symbols-outlined text-lg">pending_actions</span>
            </span>
          </div>
          <div className="flex items-baseline gap-space-xs">
            <span className="font-metric-display text-metric-display text-on-surface">{inProgress}</span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">1 Under Review · 1 Visa</span>
          </div>
          <div className="mt-space-xs pt-space-2xs flex items-center text-status-info font-label-sm text-label-sm">
            <span className="material-symbols-outlined text-sm">sync</span>
            <span className="ml-1 font-medium">Review queue position: #18</span>
          </div>
        </div>
        <div className="p-space-md rounded-xl bg-surface-container-lowest shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-space-2xs">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Documents Pending</span>
            <span className="p-space-2xs rounded-lg bg-status-rejected-subtle text-status-rejected">
              <span className="material-symbols-outlined text-lg">warning</span>
            </span>
          </div>
          <div className="flex items-baseline gap-space-xs">
            <span className="font-metric-display text-metric-display text-status-rejected">{pendingDocs}</span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">Action required</span>
          </div>
          <div className="mt-space-xs pt-space-2xs flex items-center text-status-rejected font-label-sm text-label-sm">
            <span className="material-symbols-outlined text-sm">schedule</span>
            <span className="ml-1 font-medium">Re-upload Financial Affidavit</span>
          </div>
        </div>
      </div>

      {/* Quick Actions Mosaic */}
      <div className="space-y-space-xs">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold tracking-tight">Keep Your Journey Moving</h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant">Crucial milestones and accelerated preparation tracks</p>
          </div>
          <span className="font-code-table text-code-table text-on-surface-variant uppercase tracking-wider">Quick Services</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
          <div className="group p-space-md rounded-xl bg-surface-container-lowest shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div className="space-y-space-xs">
              <div className="w-10 h-10 rounded-lg bg-secondary-fixed flex items-center justify-center text-secondary">
                <span className="material-symbols-outlined">folder_managed</span>
              </div>
              <div>
                <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface group-hover:text-secondary transition-colors">Upload &amp; Check Documents</h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">Passport, academic transcripts, IELTS score sheet. Verification status updated hourly.</p>
              </div>
              <div className="inline-flex items-center gap-space-2xs px-space-xs py-space-2xs rounded-md bg-status-pending-subtle text-status-pending text-label-sm font-label-sm">
                <span className="material-symbols-outlined text-xs">pending</span>
                <span>2 documents in review queue</span>
              </div>
            </div>
            <Link href="/documents" className="mt-space-md inline-flex items-center text-secondary hover:text-navy-deep font-label-md text-label-md font-semibold gap-1">
              <span>Manage Vault</span>
              <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </Link>
          </div>
          <div className="group p-space-md rounded-xl bg-surface-container-lowest shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div className="space-y-space-xs">
              <div className="w-10 h-10 rounded-lg bg-status-info-subtle flex items-center justify-center text-status-info">
                <span className="material-symbols-outlined">school</span>
              </div>
              <div>
                <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface group-hover:text-secondary transition-colors">Explore Courses &amp; Bootcamps</h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">Bridge language gaps with IELTS Prep Band 7.5+, foundation modules, and pre-departure academies.</p>
              </div>
              <div className="inline-flex items-center gap-space-2xs px-space-xs py-space-2xs rounded-md bg-status-verified-subtle text-status-verified text-label-sm font-label-sm">
                <span className="material-symbols-outlined text-xs">verified</span>
                <span>Guaranteed progression cohorts</span>
              </div>
            </div>
            <Link href="/short-courses" className="mt-space-md inline-flex items-center text-secondary hover:text-navy-deep font-label-md text-label-md font-semibold gap-1">
              <span>Browse Academy</span>
              <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </Link>
          </div>
          <div className="group p-space-md rounded-xl bg-surface-container-lowest shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div className="space-y-space-xs">
              <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center text-on-surface">
                <span className="material-symbols-outlined">compare_arrows</span>
              </div>
              <div>
                <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface group-hover:text-secondary transition-colors">Find a Program &amp; Compare</h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">Browse 486 partner universities across the UK, Australia, New Zealand, Canada, and Malaysia.</p>
              </div>
              <div className="inline-flex items-center gap-space-2xs px-space-xs py-space-2xs rounded-md bg-surface-container text-on-surface-variant text-label-sm font-label-sm">
                <span className="material-symbols-outlined text-xs">public</span>
                <span>Global Intake 2025/2026 Open</span>
              </div>
            </div>
            <Link href="/programs" className="mt-space-md inline-flex items-center text-secondary hover:text-navy-deep font-label-md text-label-md font-semibold gap-1">
              <span>Launch University Matrix</span>
              <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Admission Pipeline + Counselor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md items-start">
        <div className="lg:col-span-8 p-space-md lg:p-space-lg rounded-xl bg-surface-container-lowest shadow-sm space-y-space-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs pb-space-xs">
            <div>
              <span className="font-code-table text-code-table text-on-surface-variant uppercase tracking-wider">ADMISSION PIPELINE</span>
              <h3 className="font-headline-md text-headline-md text-on-surface font-bold">Application Milestones &amp; Trajectory</h3>
            </div>
            <div className="flex items-center gap-space-xs text-label-sm font-label-sm">
              <span className="inline-flex items-center gap-1 text-on-surface-variant"><span className="w-2.5 h-2.5 rounded-full bg-secondary"></span> Current Cycle</span>
              <span className="inline-flex items-center gap-1 text-on-surface-variant"><span className="w-2.5 h-2.5 rounded-full bg-surface-container-highest"></span> Anticipated</span>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-space-xs pt-space-xs">
            <div className="p-space-xs rounded-lg bg-surface-container-low flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="font-code-table text-[10px] text-on-surface-variant font-semibold">JUN 2025</span>
                <span className="material-symbols-outlined text-status-verified text-sm">check_circle</span>
              </div>
              <div className="mt-2">
                <p className="font-label-sm text-label-sm font-bold text-on-surface">Profile Setup</p>
                <p className="font-code-table text-[10px] text-on-surface-variant">Completed</p>
              </div>
            </div>
            <div className="p-space-xs rounded-lg bg-surface-container-low flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="font-code-table text-[10px] text-on-surface-variant font-semibold">JUL 2025</span>
                <span className="material-symbols-outlined text-status-verified text-sm">check_circle</span>
              </div>
              <div className="mt-2">
                <p className="font-label-sm text-label-sm font-bold text-on-surface">Transcript Eval</p>
                <p className="font-code-table text-[10px] text-on-surface-variant">Verified WES</p>
              </div>
            </div>
            <div className="p-space-xs rounded-lg bg-secondary-fixed/40 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="font-code-table text-[10px] text-secondary font-bold">AUG 2025</span>
                <span className="w-2 h-2 rounded-full bg-secondary animate-ping"></span>
              </div>
              <div className="mt-2">
                <p className="font-label-sm text-label-sm font-bold text-secondary">Offers Lodged</p>
                <p className="font-code-table text-[10px] text-secondary font-semibold">2 Issued</p>
              </div>
            </div>
            <div className="p-space-xs rounded-lg bg-surface-container-low opacity-75 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="font-code-table text-[10px] text-on-surface-variant font-semibold">SEP 2025</span>
                <span className="material-symbols-outlined text-outline text-sm">radio_button_unchecked</span>
              </div>
              <div className="mt-2">
                <p className="font-label-sm text-label-sm font-semibold text-on-surface">Accept &amp; Deposit</p>
                <p className="font-code-table text-[10px] text-on-surface-variant">Upcoming</p>
              </div>
            </div>
            <div className="p-space-xs rounded-lg bg-surface-container-low opacity-75 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="font-code-table text-[10px] text-on-surface-variant font-semibold">OCT 2025</span>
                <span className="material-symbols-outlined text-outline text-sm">radio_button_unchecked</span>
              </div>
              <div className="mt-2">
                <p className="font-label-sm text-label-sm font-semibold text-on-surface">Visa VFS Filing</p>
                <p className="font-code-table text-[10px] text-on-surface-variant">Scheduled</p>
              </div>
            </div>
            <div className="p-space-xs rounded-lg bg-surface-container-low opacity-75 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="font-code-table text-[10px] text-on-surface-variant font-semibold">NOV 2025</span>
                <span className="material-symbols-outlined text-outline text-sm">flight_takeoff</span>
              </div>
              <div className="mt-2">
                <p className="font-label-sm text-label-sm font-semibold text-on-surface">Fly &amp; Onboard</p>
                <p className="font-code-table text-[10px] text-on-surface-variant">Orientation</p>
              </div>
            </div>
          </div>
          <div className="pt-space-xs space-y-space-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-label-sm font-label-sm text-on-surface-variant">
              <span>Portfolio Admissions Distribution</span>
              <span className="font-semibold text-on-surface">Combined Est. Commitment: $38,500 USD (~MYR 172,000)</span>
            </div>
            <div className="w-full h-3 rounded-full bg-surface-container overflow-hidden flex">
              <div className="h-full bg-status-verified transition-all" style={{ width: "50%" }} title="50% Offer Received"></div>
              <div className="h-full bg-secondary transition-all" style={{ width: "25%" }} title="25% Under Review"></div>
              <div className="h-full bg-status-rejected transition-all" style={{ width: "25%" }} title="25% Action Required"></div>
            </div>
            <div className="flex flex-wrap items-center gap-space-md text-label-sm font-label-sm pt-space-2xs">
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-status-verified"></span><span className="text-on-surface">Offers Confirmed (2)</span></div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-secondary"></span><span className="text-on-surface">Under Evaluation (1)</span></div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-status-rejected"></span><span className="text-on-surface">Action Required (1)</span></div>
            </div>
          </div>
        </div>
        <div className="lg:col-span-4 p-space-md lg:p-space-lg rounded-xl bg-surface-container-lowest shadow-sm space-y-space-md">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">ADVISORY CONCIERGE</span>
            <span className="inline-flex items-center gap-1 px-space-xs py-space-2xs rounded-full bg-status-verified-subtle text-status-verified font-label-sm text-[11px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-status-verified"></span> Online
            </span>
          </div>
          <div className="flex items-center gap-space-md">
            <div className="relative">
              <img alt="Sarah Lin portrait" className="w-14 h-14 rounded-full object-cover shadow-sm" src={PORTRAIT_URL} />
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-status-verified rounded-full"></span>
            </div>
            <div>
              <h4 className="font-headline-sm text-headline-sm font-bold text-on-surface">Sarah Lin</h4>
              <p className="font-label-sm text-label-sm text-on-surface-variant font-medium">Senior Education Consultant</p>
              <p className="font-code-table text-code-table text-secondary font-semibold">Accreditation: UK &amp; AU Master Counselor</p>
            </div>
          </div>
          <div className="p-space-xs rounded-lg bg-surface-container-low text-body-sm font-body-sm text-on-surface-variant space-y-1">
            <p className="font-semibold text-on-surface">Counselor Note:</p>
            <p className="line-clamp-2">"Monash offer is highly competitive! Upload Bristol's supplementary math syllabus to unlock your unconditional pathway."</p>
          </div>
          <div className="grid grid-cols-2 gap-space-xs pt-space-2xs">
            <a className="flex items-center justify-center gap-space-xs py-space-xs px-space-xs rounded-lg bg-status-verified-subtle text-status-verified font-label-md text-label-md font-semibold hover:bg-status-verified/20 transition-colors" href="https://wa.me/" rel="noopener" target="_blank">
              <span className="material-symbols-outlined text-lg">chat</span>
              <span>WhatsApp Desk</span>
            </a>
            <button className="flex items-center justify-center gap-space-xs py-space-xs px-space-xs rounded-lg bg-navy-surface hover:bg-navy-deep text-on-primary font-label-md text-label-md font-semibold transition-colors" type="button">
              <span className="material-symbols-outlined text-lg">calendar_month</span>
              <span>Book 1-on-1</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="space-y-space-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
          <div>
            <h2 className="font-headline-lg text-headline-lg font-bold text-on-surface tracking-tight">Active Applications</h2>
            <p className="font-body-md text-body-md text-on-surface-variant">Review status updates, university response letters, and conditional requirements.</p>
          </div>
          <div className="flex items-center overflow-x-auto pb-space-2xs sm:pb-0 gap-space-2xs">
            {tabRows.map((t) => (
              <button
                key={t.key}
                className={cn(
                  "px-space-sm py-space-xs rounded-lg font-label-md text-label-md font-semibold flex items-center gap-space-xs whitespace-nowrap transition-colors",
                  t.key === "all"
                    ? "bg-navy-surface text-on-primary shadow-sm"
                    : "bg-surface-container text-on-surface hover:bg-surface-container-high",
                )}
                type="button"
              >
                <span>{t.label}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${t.key === "all" ? "bg-surface-white/20 text-[10px]" : t.label === "Offers Received" ? "bg-status-verified-subtle text-status-verified" : t.label === "Under Review" ? "bg-surface-container-highest text-on-surface-variant" : t.label === "Action Required" ? "bg-status-rejected-subtle text-status-rejected" : "bg-surface-container-highest text-on-surface-variant"}`}>
                  {t.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Application Cards */}
        <div className="space-y-space-md">
          {rows.map((a) => {
            const tone = STAGE_TONE[a.stage];
            const badgeTone = tone === "outline" ? "outline" : tone;
            const statusLabel = stageLabel(a.stage);
            const universityLogo = a.program.university.universityLogoUrl;
            const fallbackLogo = (() => {
              switch (true) {
                case /monash/i.test(a.program.university.name): return MONASH_URL;
                case /bristol/i.test(a.program.university.name): return BRISTOL_URL;
                case /melbourne/i.test(a.program.university.name): return MELBOURNE_URL;
                case /toronto/i.test(a.program.university.name): return TORONTO_URL;
                default: return undefined;
              }
            })();
            const accentTone = tone === "outline" ? "outline-variant" : tone;
            const leftBorder = tone === "outline" ? "bg-outline-variant" : `bg-${tone}`;
            const badgeBase = `px-space-xs py-space-2xs rounded-full font-label-sm text-label-sm font-bold inline-flex items-center gap-1`;
            const badgeClass =
              tone === "verified"
                ? `${badgeBase} bg-status-verified-subtle text-status-verified`
                : tone === "secondary"
                  ? `${badgeBase} bg-surface-container text-secondary`
                  : tone === "info"
                    ? `${badgeBase} bg-surface-container text-status-info`
                    : tone === "rejected"
                      ? `${badgeBase} bg-status-rejected-subtle text-status-rejected`
                      : `${badgeBase} bg-surface-container-high text-on-surface`;
            const dotClass = tone === "verified" ? "bg-status-verified" : tone === "secondary" ? "bg-secondary" : tone === "info" ? "bg-status-info" : tone === "rejected" ? "bg-status-rejected" : "bg-outline";
            const actions = (
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-space-xs lg:flex-col lg:items-end justify-end">
                {a.stage === "OFFER" || a.stage === "DEPOSIT_PAID" ? (
                  <>
                    <div className="flex items-center gap-space-xs">
                      <Button className={`px-space-md py-space-xs rounded-lg bg-status-verified hover:bg-status-verified/90 text-on-secondary font-label-md text-label-md font-semibold transition-colors shadow-sm`}>Accept Offer</Button>
                      <Link href="#" className="px-space-sm py-space-xs rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md transition-colors flex items-center gap-1">
                        <span className="material-symbols-outlined text-base">download</span>
                        <span>Letter</span>
                      </Link>
                    </div>
                    <span className="font-code-table text-code-table text-on-surface-variant">Response deadline: 14 Oct 2025</span>
                  </>
                ) : a.stage === "SUBMITTED" || a.stage === "UNDER_REVIEW" ? (
                  <div className="flex items-center gap-space-xs">
                    <Link href={`/application/${a.id}`} className="px-space-md py-space-xs rounded-lg bg-navy-surface hover:bg-navy-deep text-on-primary font-label-md text-label-md font-semibold transition-colors flex items-center gap-1">
                      <span>View Application Details</span>
                      <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </Link>
                    <span className="font-code-table text-code-table text-on-surface-variant">Last updated 2 days ago</span>
                  </div>
                ) : a.stage === "DRAFT" ? (
                  <div className="flex items-center gap-space-xs">
                    <Link href={`/apply?draft=${a.id}`} className="px-space-md py-space-xs rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md font-semibold transition-colors">
                      Edit Draft
                    </Link>
                    <button
                      type="button"
                      className="px-space-md py-space-xs rounded-lg bg-secondary text-on-secondary hover:bg-secondary/90 font-label-md text-label-md font-semibold transition-colors"
                    >
                      Submit Draft
                    </button>
                    <span className="font-code-table text-code-table text-on-surface-variant">Auto-saved 14 mins ago</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-space-xs">
                    <Button className={`px-space-md py-space-xs rounded-lg bg-status-rejected hover:bg-status-rejected/90 text-on-secondary font-label-md text-label-md font-semibold transition-colors flex items-center gap-1 shadow-sm`}>
                      <span className="material-symbols-outlined text-base">upload_file</span>
                      <span>Upload Missing Bank Statement</span>
                    </Button>
                    <span className="font-code-table text-code-table text-status-rejected font-semibold">Deadline: 5 business days left</span>
                  </div>
                )}
              </div>
            );
            return (
              <div key={a.id} className={`p-space-md lg:p-space-lg rounded-xl bg-surface-container-lowest shadow-sm hover:shadow-md transition-shadow relative overflow-hidden ${leftBorder}`}>
                <div className="absolute left-0 top-0 bottom-0 w-1.5"></div>
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
                  <div className="flex items-start gap-space-md">
                    <div className="w-14 h-14 rounded-xl bg-surface-container flex items-center justify-center flex-shrink-0 overflow-hidden shadow-inner">
                      <img alt={`${a.program.university.name} crest`} className="w-full h-full object-cover" src={fallbackLogo ?? universityLogo ?? ""} />
                    </div>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-space-xs">
                        <span className="font-code-table text-code-table text-on-surface-variant font-semibold">APP-2025-081</span>
                        <span className={badgeClass}>
                          <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`}></span>
                          {statusLabel}
                        </span>
                        <span className="px-space-xs py-space-2xs rounded-full bg-surface-container text-on-surface-variant font-label-sm text-[11px] font-medium">{a.docsVerified}/{a.docsTotal} Documents Verified</span>
                      </div>
                      <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">{a.program.name}</h3>
                      <p className="font-body-md text-body-md text-secondary font-semibold">{a.program.university.name}</p>
                      <div className="flex flex-wrap items-center gap-x-space-md gap-y-1 font-body-sm text-body-sm text-on-surface-variant pt-1">
                        <span className="inline-flex items-center gap-1"><span className="material-symbols-outlined text-sm">calendar_month</span> Intake: Oct 2025</span>
                        <span className="inline-flex items-center gap-1"><span className="material-symbols-outlined text-sm">payments</span> Tuition: {formatCurrency(toNum(a.program.tuitionFee))} / year</span>
                        <span className={`inline-flex items-center gap-1 text-${tone === "verified" ? "status-verified" : tone === "rejected" ? "status-rejected" : "status-info"} font-medium`}>
                          <span className="material-symbols-outlined text-sm">{tone === "verified" ? "task_alt" : tone === "rejected" ? "cancel" : "pending_actions"}</span> {a.docsVerified}/{a.docsTotal} Documents Verified
                        </span>
                      </div>
                    </div>
                  </div>
                  {actions}
                  {a.stage === "REJECTED" && (
                    <div className="p-space-xs rounded-lg bg-status-rejected-subtle text-status-rejected flex items-start gap-space-xs mt-space-md">
                      <span className="material-symbols-outlined text-base mt-0.5">error</span>
                      <p className="font-body-sm text-body-sm">
                        <strong>Officer Feedback:</strong> The submitted statement did not include the required official seal. Please upload a verified PDF to resume admission consideration.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
