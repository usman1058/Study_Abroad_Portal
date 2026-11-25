import { prisma } from "@/lib/db";

/** Resolve only the student's direct owner, assigned counselor and admins. */
export async function getStudentSupportRecipients(studentId: string) {
  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      assignedCounselorId: true,
      createdById: true,
      assignedCounselor: { select: { createdById: true } },
    },
  });
  if (!student) return null;

  const ids = new Set<string>();
  for (const id of [student.assignedCounselorId, student.createdById, student.assignedCounselor?.createdById]) {
    if (id) ids.add(id);
  }
  const admins = await prisma.user.findMany({ where: { role: "SUPER_ADMIN", status: "active" }, select: { id: true } });
  for (const admin of admins) ids.add(admin.id);

  const recipients = await prisma.user.findMany({
    where: { id: { in: [...ids] }, status: "active" },
    select: { id: true, email: true },
  });

  return {
    student,
    recipients,
    studentName: `${student.firstName} ${student.lastName}`.trim(),
  };
}
