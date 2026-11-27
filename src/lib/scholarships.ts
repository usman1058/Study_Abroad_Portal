import { z } from "zod";
import { prisma } from "@/lib/db";

const list = (maxItems: number, maxLength: number) => z.array(z.string().trim().min(1).max(maxLength)).max(maxItems).default([]);

export const scholarshipSchema = z.object({
  name: z.string().trim().min(2).max(200),
  providerName: z.string().trim().max(160).optional().nullable(),
  description: z.string().trim().min(10).max(6000),
  category: z.enum(["MERIT", "NEED_BASED", "COUNTRY_SPECIFIC", "UNIVERSITY_SPECIFIC", "PROGRAM_SPECIFIC", "OTHER"]),
  awardType: z.enum(["PERCENTAGE", "FIXED_AMOUNT", "FULL_TUITION", "OTHER"]),
  awardValue: z.number().nonnegative().max(1_000_000_000).optional().nullable(),
  awardCurrency: z.string().trim().regex(/^[A-Z]{3}$/),
  eligibleCountries: list(100, 80),
  studyLevels: list(12, 50),
  subject: z.string().trim().max(120).optional().nullable(),
  eligibilityCriteria: list(30, 500),
  deadline: z.string().datetime().optional().nullable(),
  applicationUrl: z.string().trim().url().max(500).optional().nullable().or(z.literal("")),
  isActive: z.boolean().default(true),
  universityIds: z.array(z.string().trim().min(1).max(64)).max(100).default([]),
  programIds: z.array(z.string().trim().min(1).max(64)).max(300).default([]),
}).superRefine((value, context) => {
  if (value.awardType === "PERCENTAGE" && (value.awardValue == null || value.awardValue > 100)) context.addIssue({ code: "custom", path: ["awardValue"], message: "Percentage awards must be between 0 and 100." });
  if (value.awardType === "FIXED_AMOUNT" && value.awardValue == null) context.addIssue({ code: "custom", path: ["awardValue"], message: "Enter the fixed award amount." });
  if (!value.universityIds.length && !value.programIds.length) context.addIssue({ code: "custom", path: ["universityIds"], message: "Link this scholarship to at least one university or program." });
});

export async function validateScholarshipLinks(universityIds: string[], programIds: string[]) {
  const [universities, programs] = await Promise.all([
    universityIds.length ? prisma.university.findMany({ where: { id: { in: universityIds } }, select: { id: true } }) : [],
    programIds.length ? prisma.program.findMany({ where: { id: { in: programIds } }, select: { id: true, universityId: true } }) : [],
  ]);
  if (universities.length !== new Set(universityIds).size) return { error: "One or more selected universities no longer exist." } as const;
  if (programs.length !== new Set(programIds).size) return { error: "One or more selected programs no longer exist." } as const;
  return { universityIds: [...new Set([...universityIds, ...programs.map((program) => program.universityId)])], programIds: [...new Set(programIds)] } as const;
}
