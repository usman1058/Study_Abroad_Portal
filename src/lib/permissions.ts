import type { Prisma, Role, User } from "@/generated/prisma/client";
import { ROLE_RANK } from "@/lib/constants";

export type Section = {
  key: string;
  label: string;
  href: string;
  icon: string;
  roles: Role[];
};

export const SECTIONS: Section[] = [
  { key: "home", label: "Home", href: "/home", icon: "home", roles: ["SUPER_ADMIN", "MANAGER", "COUNSELOR", "AGENCY", "STUDENT"] },
  { key: "advertisements", label: "Advertisements", href: "/advertisements", icon: "megaphone", roles: ["SUPER_ADMIN"] },
  { key: "my-applications", label: "My Applications", href: "/my-applications", icon: "file", roles: ["STUDENT"] },
  { key: "apply", label: "Apply Application", href: "/apply", icon: "filePlus", roles: ["STUDENT"] },
  { key: "programs", label: "Programs", href: "/programs", icon: "globe", roles: ["SUPER_ADMIN", "MANAGER", "COUNSELOR", "AGENCY", "STUDENT"] },
  { key: "users", label: "Users", href: "/users", icon: "users", roles: ["SUPER_ADMIN", "MANAGER", "AGENCY"] },
  { key: "scholarships", label: "Scholarships", href: "/scholarships", icon: "graduation", roles: ["SUPER_ADMIN", "MANAGER", "COUNSELOR", "AGENCY", "STUDENT"] },
  { key: "short-courses", label: "Short Courses", href: "/short-courses", icon: "book", roles: ["SUPER_ADMIN", "MANAGER", "COUNSELOR", "AGENCY", "STUDENT"] },
  { key: "search", label: "Search", href: "/search", icon: "search", roles: ["SUPER_ADMIN", "MANAGER", "COUNSELOR", "AGENCY"] },
  { key: "application", label: "Application", href: "/application", icon: "clipboard", roles: ["SUPER_ADMIN", "MANAGER", "COUNSELOR", "AGENCY"] },
  { key: "partner-commissions", label: "Partner Commissions", href: "/partner-commissions", icon: "percent", roles: ["SUPER_ADMIN", "MANAGER", "AGENCY"] },
  { key: "transaction", label: "Transaction", href: "/transaction", icon: "wallet", roles: ["SUPER_ADMIN", "MANAGER", "AGENCY"] },
  { key: "documents", label: "Documents", href: "/documents", icon: "shield", roles: ["SUPER_ADMIN", "MANAGER", "COUNSELOR", "AGENCY", "STUDENT"] },
  { key: "reports", label: "Reports", href: "/reports", icon: "chart", roles: ["SUPER_ADMIN", "MANAGER"] },
  { key: "visitor-form", label: "Visitor Form", href: "/visitor-form", icon: "form", roles: ["SUPER_ADMIN", "MANAGER"] },
  { key: "my-shortlist", label: "My Shortlist", href: "/my-shortlist", icon: "star", roles: ["STUDENT"] },
  { key: "messages", label: "Messages", href: "/messages", icon: "message", roles: ["SUPER_ADMIN", "MANAGER", "COUNSELOR", "AGENCY", "STUDENT"] },
  { key: "payments", label: "Payments", href: "/payments", icon: "credit", roles: ["SUPER_ADMIN", "MANAGER", "COUNSELOR", "AGENCY"] },
  { key: "profile", label: "Profile", href: "/profile", icon: "user", roles: ["SUPER_ADMIN", "MANAGER", "COUNSELOR", "AGENCY", "STUDENT"] },
  { key: "settings", label: "Settings", href: "/settings", icon: "settings", roles: ["SUPER_ADMIN", "MANAGER", "COUNSELOR", "AGENCY", "STUDENT"] },
];

export function sectionsForRole(role: Role): Section[] {
  return SECTIONS.filter((section) => section.roles.includes(role)).map((section) =>
    role === "STUDENT" && section.key === "home" ? { ...section, href: "/student-home" } : section,
  );
}

export function canManageUser(actor: Pick<User, "id" | "role">, target: Pick<User, "id" | "role">): boolean {
  if (target.role === "SUPER_ADMIN") return false;
  if (actor.role === "SUPER_ADMIN") return true;
  // Agencies own their own staff (application officers / consultants) and the
  // students they registered, but nothing above them in the hierarchy.
  if (actor.role === "AGENCY") return target.role === "STUDENT" || target.role === "COUNSELOR";
  return ROLE_RANK[actor.role] > ROLE_RANK[target.role];
}

export async function canManageExistingUser(
  actor: Pick<User, "id" | "role">,
  target: Pick<User, "id" | "role" | "createdById" | "assignedCounselorId">,
): Promise<boolean> {
  if (target.role === "SUPER_ADMIN") return false;
  if (actor.role === "SUPER_ADMIN") return true;
  if (actor.role === "MANAGER") return canManageUser(actor, target);
  if (actor.role === "AGENCY") {
    return target.createdById === actor.id && (target.role === "STUDENT" || target.role === "COUNSELOR");
  }
  if (target.role === "STUDENT") return canAccessStudent(actor, target);
  return false;
}

export function creatableRoles(actor: Role): Role[] {
  switch (actor) {
    case "SUPER_ADMIN":
      return ["MANAGER", "AGENCY", "COUNSELOR", "STUDENT"];
    case "MANAGER":
      return ["AGENCY", "COUNSELOR", "STUDENT"];
    // Agencies add application officers/consultants and the students they
    // manage. A student can be assigned to one of the agency's consultants.
    case "AGENCY":
      return ["COUNSELOR", "STUDENT"];
    case "COUNSELOR":
      return ["STUDENT"];
    default:
      return [];
  }
}

export async function canAccessStudent(
  actor: Pick<User, "id" | "role">,
  student: Pick<User, "id" | "role" | "createdById" | "assignedCounselorId">,
): Promise<boolean> {
  if (actor.role === "SUPER_ADMIN" || actor.role === "MANAGER") return true;
  if (student.id === actor.id) return true;
  // Counselor access follows the explicit assignment, not who created the
  // student. This keeps each consultant's applications and student data apart.
  if (actor.role === "COUNSELOR") return student.assignedCounselorId === actor.id;
  if (actor.role === "AGENCY") return student.createdById === actor.id;
  return false;
}

export function studentScopeWhere(actor: Pick<User, "id" | "role">): Prisma.UserWhereInput {
  if (actor.role === "SUPER_ADMIN" || actor.role === "MANAGER") return { role: "STUDENT" };
  // Keep list and dashboard queries aligned with the same assignment rule
  // enforced by canAccessStudent and document authorization.
  if (actor.role === "COUNSELOR") return { role: "STUDENT", assignedCounselorId: actor.id };
  if (actor.role === "AGENCY") return { role: "STUDENT", createdById: actor.id };
  return { role: "STUDENT", id: actor.id };
}

export function directDocumentStudentScopeWhere(actor: Pick<User, "id" | "role">): Prisma.UserWhereInput {
  if (actor.role === "SUPER_ADMIN" || actor.role === "MANAGER") return { role: "STUDENT" };
  if (actor.role === "AGENCY") return { role: "STUDENT", createdById: actor.id };
  if (actor.role === "COUNSELOR") return { role: "STUDENT", assignedCounselorId: actor.id };
  return { role: "STUDENT", id: actor.id };
}

export async function canAccessStudentDocuments(
  actor: Pick<User, "id" | "role">,
  student: Pick<User, "id" | "role" | "createdById" | "assignedCounselorId">,
): Promise<boolean> {
  if (student.role !== "STUDENT") return false;
  if (student.id === actor.id) return true;
  if (actor.role === "SUPER_ADMIN" || actor.role === "MANAGER") return true;
  if (actor.role === "AGENCY") return student.createdById === actor.id;
  return actor.role === "COUNSELOR" && student.assignedCounselorId === actor.id;
}

export function counselorOversightScopeWhere(actor: Pick<User, "id" | "role">): Prisma.UserWhereInput | null {
  if (actor.role !== "MANAGER") return null;
  return { role: "STUDENT", assignedCounselor: { createdById: actor.id } };
}

export function isPartnerRole(role: Role): boolean {
  return role !== "STUDENT";
}
