import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";

const SEAL_URL =
  "https://lh3.googleusercontent.com/aida/AEtjO1XFzkiYjZCo_6OiSnsgB9UWdmHilU-wexkPy96chbzeDZv22bKj6_Ntut2pcL3kjBFj2K3kyut3E66V7Oq3tuksMI6SbKyb4TIioDdZDCJlRLo7AUREjZ70Ai5LQMBDJXLnG3xVcimHykknxArhlHJR7ph5tLodEmGDQQpX8Wc-o0H35ubk3ByGjSGz0Wbf6zteut2mtnoCPjKHk4QRB3LNIDxuZQpiSXaIBlGqYkajYYf0CvhjS8DiGPc";

export const metadata = {
  title: "StudyAbroad Portal — Gateway",
  description: "Unified institutional verification gateway connecting cross-border applicants with accredited universities and certified placement agencies.",
};

export default async function LandingPage() {
  const user = await currentUser();
  if (user) {
    redirect(user.role === "STUDENT" ? "/my-applications" : "/home");
  }

  return (
    <main className="flex min-h-svh flex-col overflow-hidden bg-canvas">
      {/* Top navigation shell */}
      <header className="sticky top-0 z-40 w-full border-b border-line bg-surface-white/80 backdrop-blur dark:border-navy-800 dark:bg-navy-deep/80">
        <div className="mx-auto max-w-7xl px-margin py-space-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-sm">
            <div className="flex items-center gap-space-xs">
              <img
                alt="StudyAbroad Portal Master Seal"
                className="h-8 w-auto object-contain"
                src={SEAL_URL}
              />
              <div className="flex flex-col">
                <span className="font-headline-sm text-headline-sm text-primary tracking-tight">
                  StudyAbroad Portal
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider hidden sm:inline">
                  Admissions &amp; Placement Gateway
                </span>
              </div>
            </div>
            <nav className="hidden lg:flex items-center gap-space-lg">
              <Link
                href="#"
                className="transition-colors text-secondary font-body-md-medium"
                data-active-classes="text-secondary font-body-md-medium"
                data-path="gateway-home"
              >
                Programs
              </Link>
              <Link
                href="#"
                className="font-body-md text-body-md text-on-surface-variant hover:text-on-surface transition-colors"
                data-path="university-directory"
              >
                Universities
              </Link>
              <Link
                href="#"
                className="font-body-md text-body-md text-on-surface-variant hover:text-on-surface transition-colors"
                data-path="agency-partnerships"
              >
                Partners
              </Link>
              <Link
                href="#"
                className="font-body-md text-body-md text-on-surface-variant hover:text-on-surface transition-colors"
                data-path="compliance-verification"
              >
                Accreditation
              </Link>
            </nav>
            <div className="flex items-center gap-space-md">
              <div className="hidden sm:flex items-center gap-space-xs px-space-sm py-space-2xs rounded-full bg-surface-subtle text-on-surface-variant font-label-md text-label-md">
                <span className="material-symbols-outlined text-status-verified text-[16px]">
                  lock
                </span>
                <span className="font-code-table text-code-table text-on-surface">256-bit SSL</span>
              </div>
              <div className="hidden md:flex items-center gap-space-2xs text-on-surface-variant font-label-md text-label-md">
                <span className="material-symbols-outlined text-[18px]">language</span>
                <span className="font-body-md-medium text-body-md-medium text-on-surface">English</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Ambient glow orbs */}
      <div className="relative z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[760px] h-[340px] bg-secondary-container/10 blur-[130px] rounded-full pointer-events-none" />
        <div className="absolute top-96 -left-32 w-[420px] h-[420px] bg-primary-fixed/30 blur-[110px] rounded-full pointer-events-none" />
        <div className="absolute top-[480px] -right-32 w-[460px] h-[460px] bg-secondary-fixed/35 blur-[120px] rounded-full pointer-events-none" />
      </div>

      {/* Main gateway container */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-margin py-space-lg lg:py-space-2xl flex flex-col items-center">
        {/* Central overline & logo badge unit */}
        <div className="flex flex-col items-center text-center space-y-space-sm mb-space-xl">
          <div className="inline-flex items-center gap-space-xs px-space-sm py-space-2xs rounded-full bg-surface-white shadow-sm mb-space-2xs">
            <span className="w-2 h-2 rounded-full bg-secondary-container animate-pulse" />
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-code-table">
              Enterprise Admissions Network • Fall 2025 Cycle
            </span>
          </div>
          <div className="relative group">
            <div className="w-20 h-20 rounded-2xl bg-surface-white shadow-md p-2 flex items-center justify-center transform transition-transform duration-300 group-hover:scale-105">
              <img alt="StudyAbroad Portal Master Seal" className="w-full h-full object-contain" src={SEAL_URL} />
            </div>
            <div className="absolute -bottom-2 -right-2 px-space-2xs py-[2px] bg-primary rounded-full shadow-sm">
              <span className="font-code-table text-[10px] text-surface-white font-semibold tracking-tight px-1">
                v4.2
              </span>
            </div>
          </div>
          <div className="space-y-space-2xs max-w-2xl mt-space-xs">
            <h1 className="font-display-hero text-display-hero text-on-surface tracking-tight leading-tight">
              StudyAbroad <span className="text-secondary">Portal</span>
            </h1>
            <p className="font-headline-md text-headline-md text-on-surface-variant">
              Are you a student or a partner?
            </p>
            <p className="font-body-md text-body-md text-on-surface-variant/80 max-w-lg mx-auto">
              Unified institutional verification gateway connecting cross-border applicants with accredited world-class universities and certified placement agencies.
            </p>
          </div>
        </div>

        {/* Dual Role Gateway Matrix (Bento Split) */}
        <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-space-lg lg:gap-space-xl mb-space-2xl items-stretch">
          {/* Card 1: I am a Student */}
          <Link
            href="/student/login"
            className="group block relative rounded-2xl bg-surface-white shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden"
          >
            <div className="h-2 w-full bg-gradient-to-r from-secondary-container via-secondary to-primary-container" />
            <div className="p-space-lg lg:p-space-xl flex-1 flex flex-col justify-between space-y-space-lg">
              <div>
                <div className="flex items-center justify-between gap-space-md mb-space-md">
                  <div className="w-12 h-12 rounded-xl bg-status-info-subtle flex items-center justify-center text-status-info shadow-sm group-hover:scale-105 transition-transform">
                    <span className="material-symbols-outlined text-[26px]">school</span>
                  </div>
                  <span className="font-label-sm text-label-sm px-space-sm py-space-2xs rounded-full bg-canvas-subtle text-on-surface-variant uppercase tracking-wider font-semibold">
                    Direct Applicant
                  </span>
                </div>
                <div className="space-y-space-xs">
                  <h2 className="font-headline-lg text-headline-lg text-primary tracking-tight">
                    I am a Student
                  </h2>
                  <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                    Discover top global universities, track admission milestones, manage visa documents, and secure scholarships.
                  </p>
                </div>
                {/* Pipeline Visual Hook */}
                <div className="mt-space-md p-space-sm rounded-xl bg-surface-container-low flex items-center justify-between">
                  <div className="flex items-center gap-space-xs">
                    <span className="w-2.5 h-2.5 rounded-full bg-status-verified" />
                    <span className="font-code-table text-code-table text-on-surface font-medium">Stage Tracker:</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-on-surface-variant font-code-table text-[11px]">
                    <span className="font-semibold text-secondary">Discover</span>
                    <span className="material-symbols-outlined text-[13px] text-outline-variant">
                      chevron_right
                    </span>
                    <span>Apply</span>
                    <span className="material-symbols-outlined text-[13px] text-outline-variant">
                      chevron_right
                    </span>
                    <span>Offer</span>
                    <span className="material-symbols-outlined text-[13px] text-outline-variant">
                      chevron_right
                    </span>
                    <span className="font-semibold text-status-verified">Visa</span>
                  </div>
                </div>
                {/* Features Checklist */}
                <ul className="mt-space-lg space-y-space-sm">
                  <li className="flex items-start gap-space-sm">
                    <div className="w-6 h-6 rounded-lg bg-status-verified-subtle text-status-verified flex items-center justify-center shrink-0 mt-0.5">
                      <span className="material-symbols-outlined text-[16px]">travel_explore</span>
                    </div>
                    <div className="flex-1">
                      <span className="font-body-md-medium text-body-md-medium text-on-surface">
                        Browse 400+ accredited university programs
                      </span>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        Full curriculum breakdowns, semester intakes, and minimum language requirements.
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-space-sm">
                    <div className="w-6 h-6 rounded-lg bg-status-verified-subtle text-status-verified flex items-center justify-center shrink-0 mt-0.5">
                      <span className="material-symbols-outlined text-[16px]">touch_app</span>
                    </div>
                    <div className="flex-1">
                      <span className="font-body-md-medium text-body-md-medium text-on-surface">
                        1-click application submission &amp; tracking
                      </span>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        Single-dossier credential evaluation synced live with university admissions nodes.
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-space-sm">
                    <div className="w-6 h-6 rounded-lg bg-status-verified-subtle text-status-verified flex items-center justify-center shrink-0 mt-0.5">
                      <span className="material-symbols-outlined text-[16px]">chat</span>
                    </div>
                    <div className="flex-1">
                      <span className="font-body-md-medium text-body-md-medium text-on-surface">
                        Direct counselor WhatsApp advisory
                      </span>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        Dedicated certified mentor guidance on Statement of Purpose and embassy interviews.
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-space-sm">
                    <div className="w-6 h-6 rounded-lg bg-status-verified-subtle text-status-verified flex items-center justify-center shrink-0 mt-0.5">
                      <span className="material-symbols-outlined text-[16px]">verified_user</span>
                    </div>
                    <div className="flex-1">
                      <span className="font-body-md-medium text-body-md-medium text-on-surface">
                        Automated document apostille checklist
                      </span>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        Dynamic, country-tailored legalisation workflows ensuring zero embassy rejections.
                      </p>
                    </div>
                  </li>
                </ul>
              </div>
              {/* Student Actions */}
              <div className="pt-space-md flex flex-col space-y-space-sm">
                <a
                  href="/student/login"
                  className="w-full inline-flex items-center justify-center gap-space-xs py-space-sm px-space-lg rounded-lg bg-secondary text-on-secondary font-label-md text-label-md shadow-sm hover:bg-secondary-container transition-colors group/btn"
                >
                  <span>Continue as Student</span>
                  <span className="material-symbols-outlined text-[18px] transition-transform group-hover/btn:translate-x-1">
                    arrow_forward
                  </span>
                </a>
                <div className="flex items-center justify-center gap-space-xs text-center">
                  <span className="font-body-sm text-body-sm text-on-surface-variant">New student?</span>
                  <Link
                    href="/student/signup"
                    className="font-body-md-medium text-body-md-medium text-secondary hover:underline transition-all"
                  >
                    Create account
                  </Link>
                </div>
              </div>
            </div>
          </Link>

          {/* Card 2: I am a Partner */}
          <Link
            href="/partner/login"
            className="group block relative rounded-2xl bg-surface-white shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden"
          >
            <div className="h-2 w-full bg-gradient-to-r from-navy-surface via-primary to-secondary" />
            <div className="p-space-lg lg:p-space-xl flex-1 flex flex-col justify-between space-y-space-lg">
              <div>
                <div className="flex items-center justify-between gap-space-md mb-space-md">
                  <div className="w-12 h-12 rounded-xl bg-surface-container-high flex items-center justify-center text-primary-container shadow-sm group-hover:scale-105 transition-transform">
                    <span className="material-symbols-outlined text-[26px]">corporate_fare</span>
                  </div>
                  <span className="font-label-sm text-label-sm px-space-sm py-space-2xs rounded-full bg-surface-container text-primary font-semibold uppercase tracking-wider">
                    Institutional &amp; Agency
                  </span>
                </div>
                <div className="space-y-space-xs">
                  <h2 className="font-headline-lg text-headline-lg text-primary tracking-tight">
                    I am a Partner
                  </h2>
                  <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                    Agency staff, education counselors, sub-agents, and institution managers.
                  </p>
                </div>
                {/* Ledger Strip Hook */}
                <div className="mt-space-md p-space-sm rounded-xl bg-surface-container-low flex items-center justify-between">
                  <div className="flex items-center gap-space-xs">
                    <span className="w-2.5 h-2.5 rounded-full bg-status-info" />
                    <span className="font-code-table text-code-table text-on-surface font-medium">B2B Core:</span>
                  </div>
                  <div className="flex items-center gap-space-xs text-on-surface font-code-table text-[11px]">
                    <span className="bg-surface-white px-1.5 py-0.5 rounded shadow-2xs font-semibold">CRM Active</span>
                    <span className="text-outline-variant">•</span>
                    <span className="bg-surface-white px-1.5 py-0.5 rounded shadow-2xs font-semibold">Sub-agents Onboard</span>
                    <span className="text-outline-variant">•</span>
                    <span className="bg-surface-white px-1.5 py-0.5 rounded shadow-2xs font-semibold text-status-verified">Automated Splits</span>
                  </div>
                </div>
                {/* Features Checklist */}
                <ul className="mt-space-lg space-y-space-sm">
                  <li className="flex items-start gap-space-sm">
                    <div className="w-6 h-6 rounded-lg bg-surface-container-high text-primary flex items-center justify-center shrink-0 mt-0.5">
                      <span className="material-symbols-outlined text-[16px]">hub</span>
                    </div>
                    <div className="flex-1">
                      <span className="font-body-md-medium text-body-md-medium text-on-surface">
                        Complete pipeline management &amp; CRM
                      </span>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        Track thousands of multi-country student applicants with custom stage gates and automated SLAs.
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-space-sm">
                    <div className="w-6 h-6 rounded-lg bg-surface-container-high text-primary flex items-center justify-center shrink-0 mt-0.5">
                      <span className="material-symbols-outlined text-[16px]">groups_3</span>
                    </div>
                    <div className="flex-1">
                      <span className="font-body-md-medium text-body-md-medium text-on-surface">
                        Fast-track sub-agency onboarding &amp; split commissions
                      </span>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        Contractual multi-tier profit-sharing rules with direct institutional payouts.
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-space-sm">
                    <div className="w-6 h-6 rounded-lg bg-surface-container-high text-primary flex items-center justify-center shrink-0 mt-0.5">
                      <span className="material-symbols-outlined text-[16px]">room_service</span>
                    </div>
                    <div className="flex-1">
                      <span className="font-body-md-medium text-body-md-medium text-on-surface">
                        Live visitor reception triage &amp; kiosk
                      </span>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        Physical branch intake console with QR ticketing and automated counselor load balancing.
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-space-sm">
                    <div className="w-6 h-6 rounded-lg bg-surface-container-high text-primary flex items-center justify-center shrink-0 mt-0.5">
                      <span className="material-symbols-outlined text-[16px]">account_balance</span>
                    </div>
                    <div className="flex-1">
                      <span className="font-body-md-medium text-body-md-medium text-on-surface">
                        SWIFT &amp; Flywire transaction ledger
                      </span>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        Audited multi-currency tuition remittances, proof-of-fund escrows, and fee reconciliation.
                      </p>
                    </div>
                  </li>
                </ul>
              </div>
              {/* Partner Actions */}
              <div className="pt-space-md flex flex-col space-y-space-sm">
                <a
                  href="/partner/login"
                  className="w-full inline-flex items-center justify-center gap-space-xs py-space-sm px-space-lg rounded-lg bg-primary text-on-primary font-label-md text-label-md shadow-sm hover:bg-navy-surface transition-colors group/btn"
                >
                  <span>Continue as Partner</span>
                  <span className="material-symbols-outlined text-[18px] transition-transform group-hover/btn:translate-x-1">
                    arrow_forward
                  </span>
                </a>
                <div className="flex items-center justify-center gap-space-xs text-center">
                  <span className="font-body-sm text-body-sm text-on-surface-variant">Looking to collaborate?</span>
                  <Link
                    href="/partner/signup"
                    className="font-body-md-medium text-body-md-medium text-secondary hover:underline transition-all"
                  >
                    Register educational agency
                  </Link>
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Executive Metrics & Trust Bar */}
        <div className="w-full rounded-2xl bg-surface-white shadow-sm p-space-lg lg:p-space-xl flex flex-col gap-space-lg">
          {/* Top Metrics Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-space-md lg:gap-space-lg">
            <div className="flex flex-col p-space-sm rounded-xl bg-surface-subtle">
              <div className="flex items-center gap-space-2xs text-on-surface-variant mb-space-2xs">
                <span className="material-symbols-outlined text-[18px] text-secondary">account_balance</span>
                <span className="font-label-sm text-label-sm uppercase tracking-wider">Institutions</span>
              </div>
              <span className="font-metric-display text-metric-display text-primary tracking-tight">140+</span>
              <span className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">Partner Universities</span>
            </div>
            <div className="flex flex-col p-space-sm rounded-xl bg-surface-subtle">
              <div className="flex items-center gap-space-2xs text-on-surface-variant mb-space-2xs">
                <span className="material-symbols-outlined text-[18px] text-status-verified">verified</span>
                <span className="font-label-sm text-label-sm uppercase tracking-wider">Admissions</span>
              </div>
              <span className="font-metric-display text-metric-display text-status-verified tracking-tight">98%</span>
              <span className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">Visa Success Rate</span>
            </div>
            <div className="flex flex-col p-space-sm rounded-xl bg-surface-subtle">
              <div className="flex items-center gap-space-2xs text-on-surface-variant mb-space-2xs">
                <span className="material-symbols-outlined text-[18px] text-secondary">payments</span>
                <span className="font-label-sm text-label-sm uppercase tracking-wider">Aid Disbursed</span>
              </div>
              <span className="font-metric-display text-metric-display text-primary tracking-tight">$4.8M</span>
              <span className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">Scholarships Cleared</span>
            </div>
            <div className="flex flex-col p-space-sm rounded-xl bg-surface-subtle">
              <div className="flex items-center gap-space-2xs text-on-surface-variant mb-space-2xs">
                <span className="material-symbols-outlined text-[18px] text-navy-surface">security</span>
                <span className="font-label-sm text-label-sm uppercase tracking-wider">Security</span>
              </div>
              <span className="font-metric-display text-metric-display text-primary tracking-tight">AES-256</span>
              <span className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">Encrypted Dossiers</span>
            </div>
          </div>
          {/* Institutional Logos & Endorsements */}
          <div className="pt-space-md border-t-0 flex flex-col md:flex-row items-center justify-between gap-space-md">
            <div className="flex items-center gap-space-xs text-on-surface-variant">
              <span className="material-symbols-outlined text-[18px] text-secondary">domain_verification</span>
              <span className="font-label-md text-label-md uppercase tracking-wider font-semibold">
                Direct Admission Consortia
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-center md:justify-end gap-space-md lg:gap-space-xl">
              {[["UoM", "University of Melbourne", "Australia • Go8 Flagship", "bg-primary"], ["LSE", "LSE", "United Kingdom • Russell Group", "bg-status-rejected"], ["UofT", "University of Toronto", "Canada • U15 Executive Member", "bg-secondary-container"], ["TUM", "TU Munich", "Germany • TU9 Alliance", "bg-secondary"]].map(([badge, name, detail, badgeClass]) => (
                <div key={badge} className="flex items-center gap-space-xs px-space-sm py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors">
                  <span className={`w-6 h-6 rounded ${badgeClass} flex items-center justify-center font-code-table text-[10px] text-surface-white font-bold`}>
                    {badge}
                  </span>
                  <div className="flex flex-col">
                    <span className="font-body-md-medium text-body-md-medium text-on-surface leading-none">{name}</span>
                    <span className="font-code-table text-[10px] text-on-surface-variant">{detail}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Security & Audit Micro-Bar */}
        <div className="mt-space-lg flex flex-wrap items-center justify-center gap-space-lg text-on-surface-variant font-code-table text-code-table">
          <div className="flex items-center gap-space-2xs">
            <span className="material-symbols-outlined text-[16px] text-status-verified">verified_user</span>
            <span>FERPA &amp; GDPR Compliant Cloud Engine</span>
          </div>
          <div className="flex items-center gap-space-2xs">
            <span className="material-symbols-outlined text-[16px] text-secondary">sync_saved_locally</span>
            <span>Real-time University Registrar Webhook Feeds</span>
          </div>
          <div className="flex items-center gap-space-2xs">
            <span className="material-symbols-outlined text-[16px] text-primary">vpn_key</span>
            <span>Identity Assurance Level 3 (IAL-3) Verified</span>
          </div>
        </div>
      </div>

      <footer className="w-full bg-surface-white py-space-lg shadow-[0_-1px_8px_rgba(15,32,66,0.02)] mt-auto">
        <div className="max-w-7xl mx-auto px-margin flex flex-col md:flex-row items-center justify-between gap-space-md">
          <div className="flex items-center gap-space-sm">
            <div className="flex items-center gap-space-2xs px-space-sm py-space-2xs rounded-full bg-status-verified-subtle">
              <span className="w-2 h-2 rounded-full bg-status-verified" />
              <span className="font-label-sm text-label-sm text-status-verified">Global Admissions Node: Active</span>
            </div>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              © 2025 StudyAbroad Gateway. Enterprise Compliance Engine.
            </span>
          </div>
          <div className="flex items-center gap-space-lg">
            <Link href="#" className="font-label-md text-label-md text-on-surface-variant hover:text-on-surface transition-colors">
              Security &amp; Encryption
            </Link>
            <Link href="#" className="font-label-md text-label-md text-on-surface-variant hover:text-on-surface transition-colors">
              Institutional Partner Terms
            </Link>
            <Link href="#" className="font-label-md text-label-md text-on-surface-variant hover:text-on-surface transition-colors">
              Privacy Policy
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
