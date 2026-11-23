import type { ApplicationStage, DocumentStatus, Role } from "@/generated/prisma/client";

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  MANAGER: "Manager",
  COUNSELOR: "Counselor",
  AGENCY: "Agency",
  STUDENT: "Student",
};

/**
 * Role labels used when choosing a role for a new account. The stored role for
 * an application officer is still COUNSELOR, but agencies know the job by its
 * operational name, so the picker spells it out.
 */
export const ROLE_OPTION_LABELS: Partial<Record<Role, string>> = {
  COUNSELOR: "Application Officer / Consultant",
};

export function roleOptionLabel(role: Role): string {
  return ROLE_OPTION_LABELS[role] ?? ROLE_LABELS[role];
}

export const ROLE_RANK: Record<Role, number> = {
  SUPER_ADMIN: 100,
  MANAGER: 60,
  AGENCY: 40,
  COUNSELOR: 30,
  STUDENT: 10,
};

export const PARTNER_ROLES: Role[] = ["SUPER_ADMIN", "MANAGER", "COUNSELOR", "AGENCY"];

/**
 * Study levels offered when creating or filtering programs. `phd` is a
 * doctoral level and is kept lowercase in the database like every other value;
 * the label spells it the way universities do.
 */
export const PROGRAM_LEVELS = ["undergrad", "postgrad", "phd", "diploma", "foundation", "english", "other"] as const;

export type ProgramLevel = (typeof PROGRAM_LEVELS)[number];

const PROGRAM_LEVEL_LABELS: Record<string, string> = {
  undergrad: "Undergrad",
  postgrad: "Postgrad",
  phd: "PhD",
  diploma: "Diploma",
  foundation: "Foundation",
  english: "English",
  other: "Other",
};

export function programLevelLabel(level: string | null | undefined): string {
  if (!level) return "—";
  return PROGRAM_LEVEL_LABELS[level.toLowerCase()] ?? level.charAt(0).toUpperCase() + level.slice(1);
}

export const APPLICATION_STAGES: { value: ApplicationStage; label: string }[] = [
  { value: "DRAFT", label: "Draft" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "UNDER_REVIEW", label: "Under Review" },
  { value: "OFFER", label: "Offer" },
  { value: "DEPOSIT_PAID", label: "Deposit Paid" },
  { value: "VISA", label: "Visa" },
  { value: "ENROLLED", label: "Enrolled" },
  { value: "REJECTED", label: "Rejected" },
  { value: "WITHDRAWN", label: "Withdrawn" },
];

export const APPLICATION_STAGE_ORDER: ApplicationStage[] = APPLICATION_STAGES.map((s) => s.value);

export const TERMINAL_STAGES: ApplicationStage[] = ["ENROLLED", "REJECTED", "WITHDRAWN"];

export const VISA_STAGES = [
  { value: "DOCUMENTS_SUBMITTED", label: "Documents Submitted" },
  { value: "BIOMETRICS", label: "Biometrics" },
  { value: "APPROVED", label: "Visa Approved" },
  { value: "REJECTED", label: "Visa Rejected" },
];

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  PENDING: "Pending",
  VERIFIED: "Verified",
  REJECTED: "Rejected",
};

export const DOCUMENT_TYPES = [
  "PASSPORT",
  "DIPLOMA",
  "TRANSCRIPT",
  "SOP",
  "IELTS",
  "FINANCIAL",
  "RECOMMENDATION",
  "OTHER",
];

export const SHORT_COURSE_CATEGORIES = [
  "LANGUAGE",
  "TEST_PREP",
  "FOUNDATION",
  "PROFESSIONAL",
  "OTHER",
];

export const TRANSACTION_TYPES = [
  "SERVICE_FEE",
  "COMMISSION_PAYOUT",
  "DEPOSIT",
  "REFUND",
];

export const CURRENCIES = ["MYR", "USD", "EUR", "GBP", "AUD", "SGD", "CNY", "INR", "BDT", "NPR", "PKR", "LKR"];

// Hardcoded approximate rates (MYR base) for the currency toggle, §6.
// In v1 these are static; a rates API can replace them later without a migration.
export const CURRENCY_RATES_TO_MYR: Record<string, number> = {
  MYR: 1,
  USD: 4.2,
  EUR: 4.55,
  GBP: 5.3,
  AUD: 2.75,
  SGD: 3.1,
  CNY: 0.58,
  INR: 0.05,
  BDT: 0.036,
  NPR: 0.032,
  PKR: 0.015,
  LKR: 0.014,
};

export function convertAmount(amount: number, fromCurrency = "MYR", toCurrency = "MYR"): number {
  if (toCurrency === fromCurrency) return amount;
  const fromRate = CURRENCY_RATES_TO_MYR[fromCurrency];
  const toRate = CURRENCY_RATES_TO_MYR[toCurrency];
  if (!fromRate || !toRate) return amount;
  return (amount * fromRate) / toRate;
}

export const INVITE_SECTIONS = [
  { key: "applications", label: "Applications" },
  { key: "documents", label: "Documents" },
  { key: "shortlist", label: "Shortlist" },
  { key: "payments", label: "Payments" },
  { key: "profile", label: "Profile" },
];
