import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok, fail, requireUser, serverError } from "@/lib/api";

const profileSchema = z.object({
  userTitle: z.string().optional().nullable(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  gender: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  passportNumber: z.string().optional().nullable(),
  birthday: z.string().optional().nullable(),
  countryOfResidence: z.string().optional().nullable(),
  nationality: z.string().optional().nullable(),
  cityOfResidence: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  motherName: z.string().optional().nullable(),
  fatherName: z.string().optional().nullable(),
  preferredCurrency: z.string().optional(),
  companyName: z.string().optional().nullable(),
  licenseNumber: z.string().optional().nullable(),
  assignedCounselorId: z.string().optional().nullable(),
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
      },
      select: { id: true },
    });

    return ok({ id: updated.id });
  } catch (e) {
    return serverError(e);
  }
}