import { prisma } from "@/lib/db";
import { sendShortCourseStaffEmail } from "@/lib/mail";

export async function notifyShortCourseStaff({ studentId, studentName, studentEmail, courseTitle, courseId, enrollmentId, receiptUploaded = false }: {
  studentId: string;
  studentName: string;
  studentEmail: string;
  courseTitle: string;
  courseId: string;
  enrollmentId: string;
  receiptUploaded?: boolean;
}) {
  const student = await prisma.user.findUnique({ where: { id: studentId }, select: { assignedCounselor: { select: { email: true } } } });
  const recipients = student?.assignedCounselor?.email
    ? [student.assignedCounselor.email]
    : (await prisma.user.findMany({ where: { role: "SUPER_ADMIN", status: "active" }, select: { email: true } })).map((item) => item.email);
  await Promise.allSettled(recipients.map((to) => sendShortCourseStaffEmail(to, { studentName, studentEmail, courseTitle, courseId, enrollmentId, receiptUploaded })));
}
