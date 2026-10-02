import type { ApplicationStage } from "@/generated/prisma/client";

export const DOC_GATED_APPLICATION_STAGES: ApplicationStage[] = ["OFFER", "DEPOSIT_PAID", "VISA", "ENROLLED"];

export const APPLICATION_STAGE_TRANSITIONS: Record<ApplicationStage, ApplicationStage[]> = {
  DRAFT: ["SUBMITTED", "WITHDRAWN"],
  SUBMITTED: ["UNDER_REVIEW", "REJECTED", "WITHDRAWN"],
  UNDER_REVIEW: ["OFFER", "REJECTED", "WITHDRAWN"],
  OFFER: ["DEPOSIT_PAID", "REJECTED", "WITHDRAWN"],
  DEPOSIT_PAID: ["VISA", "WITHDRAWN"],
  VISA: ["ENROLLED", "REJECTED", "WITHDRAWN"],
  ENROLLED: [],
  REJECTED: [],
  WITHDRAWN: [],
};

type DocumentForGate = { type: string; status: string };

function documentMatchesRequirement(type: string, requirement: string): boolean {
  const normalized = requirement.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const aliases: Record<string, string[]> = {
    PASSPORT: ["passport"],
    DIPLOMA: ["diploma", "degree", "certificate"],
    TRANSCRIPT: ["transcript", "academic record"],
    SOP: ["sop", "statement of purpose", "personal statement"],
    IELTS: ["ielts", "english test", "english language"],
    FINANCIAL: ["financial", "bank statement"],
    RECOMMENDATION: ["recommendation", "reference"],
    OTHER: [],
  };
  return aliases[type]?.some((alias) => normalized.includes(alias)) ?? false;
}

/** Matches the exact document gate enforced by the API. */
export function hasVerifiedRequiredDocuments(documents: DocumentForGate[], requiredDocuments: string[]): boolean {
  return (
    documents.length > 0 &&
    documents.every((document) => document.status === "VERIFIED") &&
    requiredDocuments.every((requirement) => documents.some((document) => documentMatchesRequirement(document.type, requirement)))
  );
}
