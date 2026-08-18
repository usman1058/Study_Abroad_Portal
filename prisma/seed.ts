import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\u00e0-\u00ff]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function main() {
  const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD ?? "Admin@12345", 12);

  const superAdmin = await prisma.user.upsert({
    where: { email: (process.env.ADMIN_EMAIL ?? "admin@studyabroad.test").toLowerCase() },
    update: {},
    create: {
      role: "SUPER_ADMIN",
      email: (process.env.ADMIN_EMAIL ?? "admin@studyabroad.test").toLowerCase(),
      passwordHash,
      firstName: "Portal",
      lastName: "Admin",
      verified: true,
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: "manager@studyabroad.test" },
    update: {},
    create: {
      role: "MANAGER",
      email: "manager@studyabroad.test",
      passwordHash,
      firstName: "Maya",
      lastName: "Manager",
      createdById: superAdmin.id,
      verified: true,
    },
  });

  const agency = await prisma.user.upsert({
    where: { email: "agency@studyabroad.test" },
    update: {},
    create: {
      role: "AGENCY",
      email: "agency@studyabroad.test",
      passwordHash,
      firstName: "EduLink",
      lastName: "Global",
      companyName: "EduLink Global",
      createdById: manager.id,
      verified: true,
    },
  });

  const subAgency = await prisma.user.upsert({
    where: { email: "subagency@studyabroad.test" },
    update: {},
    create: {
      role: "AGENCY",
      email: "subagency@studyabroad.test",
      passwordHash,
      firstName: "NextStep",
      lastName: "Consultancy",
      companyName: "NextStep Consultancy",
      createdById: agency.id,
      parentAgencyId: agency.id,
      verified: true,
    },
  });

  const counselor = await prisma.user.upsert({
    where: { email: "counselor@studyabroad.test" },
    update: {},
    create: {
      role: "COUNSELOR",
      email: "counselor@studyabroad.test",
      passwordHash,
      firstName: "Charlie",
      lastName: "Counselor",
      createdById: manager.id,
      verified: true,
    },
  });

  const student = await prisma.user.upsert({
    where: { email: "student@studyabroad.test" },
    update: {},
    create: {
      role: "STUDENT",
      email: "student@studyabroad.test",
      passwordHash,
      firstName: "Sam",
      lastName: "Student",
      phone: "+60123456789",
      country: "Malaysia",
      nationality: "Malaysian",
      countryOfResidence: "Malaysia",
      cityOfResidence: "Kuala Lumpur",
      createdById: agency.id,
      assignedCounselorId: counselor.id,
      verified: true,
    },
  });

  const uniDefs = [
    { name: "Monash University Malaysia", country: "Malaysia", city: "Subang Jaya" },
    { name: "University of Melbourne", country: "Australia", city: "Melbourne" },
    { name: "University of Auckland", country: "New Zealand", city: "Auckland" },
    { name: "Nanyang Technological University", country: "Singapore", city: "Singapore" },
    { name: "University of Malaya", country: "Malaysia", city: "Kuala Lumpur" },
  ];

  const unis = [];
  for (const u of uniDefs) {
    const existing = await prisma.university.findFirst({ where: { name: u.name } });
    unis.push(existing ?? (await prisma.university.create({ data: u })));
  }

  const programDefs = [
    {
      university: unis[0],
      name: "Bachelor of Computer Science",
      level: "undergrad",
      field: "Computing",
      tuitionFee: 46000,
      applicationFee: 300,
      intakeDates: ["2027-02-01", "2027-07-01"],
      visaRequired: false,
      commissionRate: 8,
      tags: ["high-demand", "computing"],
      whyHighlights: ["Hands-on industry projects", "Strong alumni network"],
      collegeRank: "Top 50 worldwide",
      courseDurationMonths: 36,
      offerTurnaroundDays: 21,
      eligibilityCriteria: ["Minimum 12 years schooling", "IELTS 6.0 or equivalent"],
    },
    {
      university: unis[1],
      name: "Master of Information Technology",
      level: "postgrad",
      field: "Computing",
      tuitionFee: 52000,
      applicationFee: 120,
      intakeDates: ["2027-02-01"],
      visaRequired: true,
      commissionRate: 10,
      tags: ["postgrad", "australia"],
      whyHighlights: ["Pathway to Australian PR", "2-year post-study work visa"],
      collegeRank: "Top 20 worldwide",
      courseDurationMonths: 24,
      offerTurnaroundDays: 14,
      eligibilityCriteria: ["Bachelor degree in any field", "IELTS 6.5"],
    },
    {
      university: unis[3],
      name: "Bachelor of Engineering (Electrical)",
      level: "undergrad",
      field: "Engineering",
      tuitionFee: 49000,
      applicationFee: 150,
      intakeDates: ["2027-08-01"],
      visaRequired: true,
      commissionRate: 9,
      tags: ["engineering", "singapore"],
      whyHighlights: ["Top-ranked engineering faculty", "Industry attachments"],
      collegeRank: "Top 15 worldwide",
      courseDurationMonths: 48,
      offerTurnaroundDays: 28,
      eligibilityCriteria: ["Strong mathematics background", "IELTS 6.0"],
    },
  ];

  for (const p of programDefs) {
    await prisma.program.upsert({
      where: { id: `${p.university.id}:${p.name}` },
      update: {},
      create: {
        id: `${p.university.id}:${p.name}`,
        slug: slugify(`${p.university.name}-${p.name}`),
        universityId: p.university.id,
        name: p.name,
        level: p.level,
        field: p.field,
        tuitionFee: p.tuitionFee,
        applicationFee: p.applicationFee,
        intakeDates: p.intakeDates.map((d) => new Date(d)),
        requiredDocuments: ["Passport", "Transcript", "English test result"],
        visaRequired: p.visaRequired,
        commissionRate: p.commissionRate,
        tags: p.tags,
        whyHighlights: p.whyHighlights,
        collegeRank: p.collegeRank,
        courseDurationMonths: p.courseDurationMonths,
        offerTurnaroundDays: p.offerTurnaroundDays,
        eligibilityCriteria: p.eligibilityCriteria,
      },
    });
  }

  const programs = await prisma.program.findMany({ take: 3 });

  await prisma.shortCourse.upsert({
    where: { id: "ielts-prep" },
    update: {},
    create: {
      id: "ielts-prep",
      title: "IELTS Preparation (6-week intensive)",
      provider: "EduLink Academy",
      category: "test-prep",
      duration: "6 weeks",
      startDates: [new Date("2027-01-04"), new Date("2027-03-01")],
      fee: 1500,
      deliveryMode: "Online + classroom",
      classSchedule: "Mon/Wed 7:00 PM–9:00 PM (MYT), Sat mock-test sessions",
      meetingLink: "https://meet.example.com/ielts-prep",
      description: "Intensive band-6.5 preparation with mock tests.",
    },
  });

  await prisma.shortCourse.upsert({
    where: { id: "foundation-english" },
    update: {},
    create: {
      id: "foundation-english",
      title: "Foundation English for Academic Study",
      provider: "EduLink Academy",
      category: "foundation",
      duration: "12 weeks",
      startDates: [new Date("2027-02-01")],
      fee: 2400,
      deliveryMode: "Classroom",
      classSchedule: "Tue/Thu 9:00 AM–12:00 PM (MYT)",
      meetingLink: "https://meet.example.com/foundation-english",
      description: "Build academic writing and presentation skills.",
    },
  });

  // Sample application for the seeded student.
  if (programs[0]) {
    await prisma.application.upsert({
      where: { id: "sample-app-1" },
      update: {},
      create: {
        id: "sample-app-1",
        studentId: student.id,
        programId: programs[0].id,
        stage: "UNDER_REVIEW",
        submittedAt: new Date(),
      },
    });
  }

  // Sample shortlist.
  const shortlist = await prisma.shortlist.upsert({
    where: { studentId: student.id },
    update: {},
    create: { studentId: student.id },
  });
  for (let i = 0; i < programs.length; i++) {
    await prisma.shortlistItem.upsert({
      where: { shortlistId_programId: { shortlistId: shortlist.id, programId: programs[i].id } },
      update: {},
      create: { shortlistId: shortlist.id, programId: programs[i].id, position: i },
    });
  }

  // Sample transaction.
  await prisma.transaction.create({
    data: {
      type: "service_fee",
      amount: 2000,
      currency: "MYR",
      relatedStudentId: student.id,
      relatedApplicationId: programs[0] ? "sample-app-1" : null,
      enteredById: manager.id,
      method: "bank_transfer",
      notes: "Service fee for the Bachelor of Computer Science application",
      date: new Date(),
    },
  });

  console.log("Seed complete.");
  console.log("Logins (password varies by ADMIN_PASSWORD or default Admin@12345):");
  console.log(`  super_admin  ${superAdmin.email}`);
  console.log(`  manager      ${manager.email}`);
  console.log(`  agency       ${agency.email}`);
  console.log(`  sub_agency   ${subAgency.email}`);
  console.log(`  counselor    ${counselor.email}`);
  console.log(`  student      ${student.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());