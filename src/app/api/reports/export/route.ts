import { requireUser } from "@/lib/api";
import { prisma } from "@/lib/db";
import { studentScopeWhere } from "@/lib/permissions";
import type { Prisma } from "@/generated/prisma/client";

const DATASETS = ["applications", "students", "transactions", "enrollments"] as const;
type Dataset = (typeof DATASETS)[number];

function csvResponse(dataset: Dataset, header: string[], rows: (string | number | null | undefined)[][]) {
  const escape = (value: string | number | null | undefined) => {
    let text = String(value ?? "").replace(/\r?\n/g, " ");
    if (/^[=+\-@]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  };
  const csv = [header, ...rows].map((row) => row.map(escape).join(",")).join("\r\n");
  return new Response(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="checkmyuni-${dataset}-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}

export async function GET(req: Request) {
  try {
    const { error, user } = await requireUser();
    if (error) return error;
    if (user.role !== "SUPER_ADMIN" && user.role !== "MANAGER") return new Response("Forbidden", { status: 403 });

    const params = new URL(req.url).searchParams;
    const dataset = DATASETS.includes(params.get("dataset") as Dataset) ? params.get("dataset") as Dataset : "applications";
    const rawPeriod = params.get("period") ?? "30";
    const period = ["30", "90", "365", "all"].includes(rawPeriod) ? rawPeriod : "30";
    const startDate = period === "all" ? undefined : new Date(Date.now() - Number(period) * 86400000);
    const dateFilter = startDate ? { gte: startDate } : undefined;
    const studentScope = studentScopeWhere(user);

    if (dataset === "applications") {
      const where: Prisma.ApplicationWhereInput = { student: studentScope, ...(dateFilter ? { createdAt: dateFilter } : {}) };
      const rows = await prisma.application.findMany({
        where,
        include: { student: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, country: true, createdAt: true, assignedCounselor: { select: { firstName: true, lastName: true, email: true } } } }, program: { select: { name: true, level: true, university: { select: { name: true, country: true } } } } },
        orderBy: { createdAt: "asc" },
      });
      return csvResponse(dataset, ["Application ID", "Stage", "Created", "Updated", "Student ID", "Student", "Email", "Phone", "Country", "Consultant", "Consultant email", "University", "University country", "Program", "Study level"], rows.map((app) => [app.id, app.stage, app.createdAt.toISOString(), app.updatedAt.toISOString(), app.student.id, `${app.student.firstName} ${app.student.lastName}`, app.student.email, app.student.phone, app.student.country, app.student.assignedCounselor ? `${app.student.assignedCounselor.firstName} ${app.student.assignedCounselor.lastName}` : "Admin", app.student.assignedCounselor?.email, app.program.university.name, app.program.university.country, app.program.name, app.program.level]));
    }

    if (dataset === "students") {
      const where: Prisma.UserWhereInput = { AND: [studentScope, ...(dateFilter ? [{ createdAt: dateFilter }] : [])] };
      const rows = await prisma.user.findMany({ where, select: { id: true, firstName: true, lastName: true, email: true, phone: true, country: true, cityOfResidence: true, status: true, createdAt: true, assignedCounselor: { select: { firstName: true, lastName: true, email: true } } }, orderBy: [{ createdAt: "asc" }] });
      return csvResponse(dataset, ["Student ID", "Name", "Email", "Phone", "Country", "City", "Account status", "Registered", "Consultant", "Consultant email"], rows.map((student) => [student.id, `${student.firstName} ${student.lastName}`, student.email, student.phone, student.country, student.cityOfResidence, student.status, student.createdAt.toISOString(), student.assignedCounselor ? `${student.assignedCounselor.firstName} ${student.assignedCounselor.lastName}` : "Admin", student.assignedCounselor?.email]));
    }

    if (dataset === "transactions") {
      const where: Prisma.TransactionWhereInput = { ...(user.role === "MANAGER" ? { relatedStudent: studentScope } : {}), ...(dateFilter ? { date: dateFilter } : {}) };
      const rows = await prisma.transaction.findMany({ where, select: { id: true, type: true, amount: true, currency: true, date: true, method: true, notes: true, relatedApplicationId: true, relatedStudent: { select: { id: true, firstName: true, lastName: true, email: true } } }, orderBy: { date: "asc" } });
      return csvResponse(dataset, ["Transaction ID", "Type", "Amount", "Currency", "Date", "Method", "Notes", "Student ID", "Student", "Student email", "Application ID"], rows.map((transaction) => [transaction.id, transaction.type, transaction.amount.toString(), transaction.currency, transaction.date.toISOString(), transaction.method, transaction.notes, transaction.relatedStudent?.id, transaction.relatedStudent ? `${transaction.relatedStudent.firstName} ${transaction.relatedStudent.lastName}` : "", transaction.relatedStudent?.email, transaction.relatedApplicationId]));
    }

    const enrollmentWhere: Prisma.ShortCourseEnrollmentWhereInput = { student: studentScope, ...(dateFilter ? { enrolledAt: dateFilter } : {}) };
    const rows = await prisma.shortCourseEnrollment.findMany({ where: enrollmentWhere, select: { id: true, status: true, enrolledAt: true, approvedAt: true, student: { select: { id: true, firstName: true, lastName: true, email: true } }, shortCourse: { select: { title: true, provider: true, category: true, fee: true, paymentType: true } } }, orderBy: { enrolledAt: "asc" } });
    return csvResponse(dataset, ["Enrollment ID", "Status", "Enrolled", "Approved", "Student ID", "Student", "Email", "Course", "Provider", "Category", "Fee (MYR)", "Payment type"], rows.map((enrollment) => [enrollment.id, enrollment.status, enrollment.enrolledAt.toISOString(), enrollment.approvedAt?.toISOString(), enrollment.student.id, `${enrollment.student.firstName} ${enrollment.student.lastName}`, enrollment.student.email, enrollment.shortCourse.title, enrollment.shortCourse.provider, enrollment.shortCourse.category, enrollment.shortCourse.fee.toString(), enrollment.shortCourse.paymentType]));
  } catch (error) {
    console.error("[api] report export failed:", error);
    return new Response("Unable to create report export.", { status: 500 });
  }
}
