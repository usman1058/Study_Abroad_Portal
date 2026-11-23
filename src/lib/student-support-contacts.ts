import { prisma } from "@/lib/db";

export type StudentSupportContact = {
  id: string;
  firstName: string;
  lastName: string;
  role: "COUNSELOR" | "SUPER_ADMIN";
  label: "Consultant" | "Admin";
};

/**
 * Student chat is intentionally limited to the assigned consultant and one
 * active Super Admin. Agency ownership does not make the agency a chat contact.
 */
export async function getStudentSupportContacts(studentId: string): Promise<StudentSupportContact[]> {
  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { assignedCounselorId: true },
  });
  if (!student) return [];

  const assigned = student.assignedCounselorId
    ? await prisma.user.findUnique({
        where: { id: student.assignedCounselorId },
        select: { id: true, firstName: true, lastName: true, role: true, status: true },
      })
    : null;

  const contacts: StudentSupportContact[] = [];
  if (assigned?.role === "COUNSELOR" && assigned.status === "active") {
    contacts.push({ ...assigned, role: "COUNSELOR", label: "Consultant" });
  }

  const admin =
    assigned?.role === "SUPER_ADMIN" && assigned.status === "active"
      ? assigned
      : await prisma.user.findFirst({
          where: { role: "SUPER_ADMIN", status: "active" },
          orderBy: { createdAt: "asc" },
          select: { id: true, firstName: true, lastName: true, role: true },
        });

  if (admin && !contacts.some((contact) => contact.id === admin.id)) {
    contacts.push({ ...admin, role: "SUPER_ADMIN", label: "Admin" });
  }

  return contacts;
}
