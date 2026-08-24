import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, fail, requireUser, serverError } from "@/lib/api";
import { optionalText } from "@/lib/validation";

const profileSchema = z.object({
  userTitle: optionalText(10),
  firstName: z.string().trim().max(80).optional(),
  lastName: z.string().trim().max(80).optional(),
  gender: optionalText(20),
  phone: optionalText(30),
  country: optionalText(80),
  passportNumber: optionalText(20),
  birthday: z.string().max(32).optional().nullable(),
  countryOfResidence: optionalText(80),
  nationality: optionalText(80),
  cityOfResidence: optionalText(100),
  address: optionalText(300),
  motherName: optionalText(80),
  fatherName: optionalText(80),
  preferredCurrency: z.string().length(3).optional(),
  companyName: optionalText(160),
  licenseNumber: optionalText(60),
  assignedCounselorId: z.string().max(64).optional().nullable(),
  educationHistory: z
    .array(
      z.object({
        level: z.string().trim().min(1).max(120),
        institution: z.string().trim().min(1).max(160),
        fieldOfStudy: z.string().trim().max(160).optional(),
        startYear: z.string().trim().max(9).optional(),
        endYear: z.string().trim().max(9).optional(),
        grade: z.string().trim().max(60).optional(),
      })
    )
    .max(20)
    .optional(),
});

export async function PUT(req: NextRequest) {
  try {
    const { error, user } = await requireUser();
    if (error) return error;

    const body = await req.json();
    const parsed = profileSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input", 422);

    const data = parsed.data;

    // Only staff may reassign the counselor on a student they own.
    if (data.assignedCounselorId !== undefined) {
      const allowed = user.role !== "STUDENT";
      if (!allowed) return fail("Students cannot assign counselors", 403);
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(data.userTitle !== undefined ? { userTitle: data.userTitle } : {}),
        ...(data.firstName !== undefined ? { firstName: data.firstName } : {}),
        ...(data.lastName !== undefined ? { lastName: data.lastName } : {}),
        ...(data.gender !== undefined ? { gender: data.gender } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        ...(data.country !== undefined ? { country: data.country } : {}),
        ...(data.passportNumber !== undefined ? { passportNumber: data.passportNumber } : {}),
        ...(data.birthday !== undefined ? { birthday: data.birthday ? new Date(data.birthday) : null } : {}),
        ...(data.countryOfResidence !== undefined ? { countryOfResidence: data.countryOfResidence } : {}),
        ...(data.nationality !== undefined ? { nationality: data.nationality } : {}),
        ...(data.cityOfResidence !== undefined ? { cityOfResidence: data.cityOfResidence } : {}),
        ...(data.address !== undefined ? { address: data.address } : {}),
        ...(data.motherName !== undefined ? { motherName: data.motherName } : {}),
        ...(data.fatherName !== undefined ? { fatherName: data.fatherName } : {}),
        ...(data.preferredCurrency !== undefined ? { preferredCurrency: data.preferredCurrency } : {}),
        ...(data.companyName !== undefined ? { companyName: data.companyName } : {}),
        ...(data.licenseNumber !== undefined ? { licenseNumber: data.licenseNumber } : {}),
        ...(data.assignedCounselorId !== undefined ? { assignedCounselorId: data.assignedCounselorId } : {}),
        ...(data.educationHistory !== undefined ? { educationHistory: data.educationHistory } : {}),
      },
      select: { id: true },
    });

    return ok({ id: updated.id });
  } catch (e) {
    return serverError(e);
  }
}