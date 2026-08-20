import { prisma } from "@/lib/db";
import { toNum } from "@/lib/utils";
import type { Program, University, User } from "@/generated/prisma/client";

export type ProgramWithUniversity = Program & { university: University };

export type ProgramCard = {
  id: string;
  slug: string | null;
  name: string;
  level: string;
  field: string;
  location: string | null;
  tuitionFee: number;
  applicationFee: number | null;
  visaRequired: boolean;
  commissionRate: number;
  tags: string[];
  collegeRank: string | null;
  courseDurationMonths: number | null;
  offerTurnaroundDays: number | null;
  eligibilityCriteria: string[];
  intakeDates: string[];
  requiredDocuments: string[];
  whyHighlights: unknown[];
  minGpa: number | null;
  university: {
    id: string;
    name: string;
    country: string;
    city: string | null;
    logoUrl: string | null;
    website: string | null;
  } | null;
};

export function serializeProgram(p: ProgramWithUniversity): ProgramCard {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    level: p.level,
    field: p.field,
    location: p.location,
    tuitionFee: toNum(p.tuitionFee),
    applicationFee: p.applicationFee != null ? toNum(p.applicationFee) : null,
    visaRequired: p.visaRequired,
    commissionRate: toNum(p.commissionRate),
    tags: p.tags ?? [],
    collegeRank: p.collegeRank,
    courseDurationMonths: p.courseDurationMonths,
    offerTurnaroundDays: p.offerTurnaroundDays,
    eligibilityCriteria: p.eligibilityCriteria ?? [],
    intakeDates: (p.intakeDates ?? []).map((d) => d.toISOString()),
    requiredDocuments: p.requiredDocuments ?? [],
    whyHighlights: (p.whyHighlights ?? []) as unknown[],
    minGpa: p.minGpa,
    university: p.university
      ? {
          id: p.university.id,
          name: p.university.name,
          country: p.university.country,
          city: p.university.city,
          logoUrl: p.university.logoUrl,
          website: p.university.website,
        }
      : null,
  };
}

export async function listPrograms(): Promise<ProgramCard[]> {
  const rows = await prisma.program.findMany({
    include: { university: true },
    orderBy: [{ university: { name: "asc" } }, { name: "asc" }],
  });
  return rows.map(serializeProgram);
}

export async function getProgram(id: string): Promise<ProgramCard | null> {
  const row = await prisma.program.findUnique({
    where: { id },
    include: { university: true },
  });
  return row ? serializeProgram(row) : null;
}

export async function getProgramBySlug(slug: string): Promise<ProgramCard | null> {
  const row =
    (await prisma.program.findUnique({ where: { slug }, include: { university: true } })) ??
    (await prisma.program.findUnique({ where: { id: slug }, include: { university: true } }));
  return row ? serializeProgram(row) : null;
}

export async function listUniversities() {
  return prisma.university.findMany({ orderBy: { name: "asc" } });
}

export async function listShortCourses() {
  const rows = await prisma.shortCourse.findMany({
    where: { status: "active" },
    include: { linkedProgram: { include: { university: true } } },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((c) => ({
    id: c.id,
    title: c.title,
    provider: c.provider,
    category: c.category,
    duration: c.duration,
    startDates: c.startDates.map((d) => d.toISOString()),
    fee: toNum(c.fee),
    deliveryMode: c.deliveryMode,
    classSchedule: c.classSchedule,
    meetingLink: c.meetingLink,
    prerequisites: c.prerequisites,
    description: c.description,
    status: c.status,
    linkedProgram: c.linkedProgram ? serializeProgram(c.linkedProgram) : null,
  }));
}

export type UserCard = {
  id: string;
  role: User["role"];
  email: string;
  userTitle: string | null;
  firstName: string;
  lastName: string;
  phone: string | null;
  country: string | null;
  gender: string | null;
  status: string;
  companyName: string | null;
  parentAgencyId: string | null;
  assignedCounselorId: string | null;
  createdById: string | null;
  createdAt: Date;
  profileCompleteness?: number;
};

export function serializeUser(u: User): UserCard {
  return {
    id: u.id,
    role: u.role,
    email: u.email,
    userTitle: u.userTitle,
    firstName: u.firstName,
    lastName: u.lastName,
    phone: u.phone,
    country: u.country,
    gender: u.gender,
    status: u.status,
    companyName: u.companyName,
    parentAgencyId: u.parentAgencyId,
    assignedCounselorId: u.assignedCounselorId,
    createdById: u.createdById,
    createdAt: u.createdAt,
  };
}

const PROFILE_FIELDS: (keyof User)[] = [
  "phone",
  "country",
  "gender",
  "passportNumber",
  "birthday",
  "countryOfResidence",
  "nationality",
  "cityOfResidence",
  "address",
  "motherName",
  "fatherName",
];

export function profileCompleteness(u: User): number {
  const filled = PROFILE_FIELDS.filter((f) => {
    const v = u[f];
    if (v == null) return false;
    if (typeof v === "string" && v.trim() === "") return false;
    return true;
  }).length;
  return Math.round((filled / PROFILE_FIELDS.length) * 100);
}

export async function listUsers(role?: User["role"]): Promise<UserCard[]> {
  const rows = await prisma.user.findMany({
    where: role ? { role } : undefined,
    orderBy: { createdAt: "desc" },
  });
  return rows.map(serializeUser);
}

export async function getStudent(id: string) {
  return prisma.user.findUnique({
    where: { id },
    include: {
      applications: { include: { program: { include: { university: true } } }, orderBy: { createdAt: "desc" } },
      documents: { orderBy: { uploadedAt: "desc" } },
      transactions: { orderBy: { date: "desc" } },
      shortlists: { include: { items: { include: { program: { include: { university: true } } }, orderBy: { position: "asc" } } } },
    },
  });
}