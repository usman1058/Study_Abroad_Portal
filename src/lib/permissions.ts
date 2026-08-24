import type { Role, User } from "@/generated/prisma/client";
import { ROLE_RANK } from "@/lib/constants";
import { prisma } from "@/lib/db";

export type Section = {
  key: string;
  label: string;
  href: string;
  icon: string; // lucide icon name key, resolved in the sidebar component
  roles: Role[];
};

// §7a — the sidebar is built from this mapping at render time. Partner-only
// sections are simply absent from a student's list; nothing is CSS-hidden.
export const SECTIONS: Section[] = [
  { key: "home", label: "Home", href: "/home", icon: "home", roles: ["SUPER_ADMIN", "MANAGER", "COUNSELOR", "AGENCY"] },
  { key: "my-applications", label: "My Applications", href: "/my-applications", icon: "file", roles: ["STUDENT"] },
  { key: "apply", label: "Apply Application", href: "/apply", icon: "filePlus", roles: ["STUDENT"] },
  { key: "programs", label: "Programs", href: "/programs", icon: "globe", roles: ["SUPER_ADMIN", "MANAGER", "COUNSELOR", "AGENCY", "STUDENT"] },
  { key: "users", label: "Users", href: "/users", icon: "users", roles: ["SUPER_ADMIN", "MANAGER"] },
  { key: "scholarships", label: "Scholarships", href: "/scholarships", icon: "graduation", roles: ["SUPER_ADMIN", "MANAGER", "COUNSELOR", "AGENCY", "STUDENT"] },
  { key: "short-courses", label: "Short Courses", href: "/short-courses", icon: "book", roles: ["SUPER_ADMIN", "MANAGER", "COUNSELOR", "AGENCY", "STUDENT"] },
  { key: "search", label: "Search", href: "/search", icon: "search", roles: ["SUPER_ADMIN", "MANAGER", "COUNSELOR", "AGENCY"] },
  { key: "application", label: "Application", href: "/application", icon: "clipboard", roles: ["SUPER_ADMIN", "MANAGER", "COUNSELOR", "AGENCY"] },
  { key: "sub-agencies", label: "Sub Agencies", href: "/sub-agencies", icon: "network", roles: ["SUPER_ADMIN", "MANAGER", "AGENCY"] },
  { key: "partner-commissions", label: "Partner Commissions", href: "/partner-commissions", icon: "percent", roles: ["SUPER_ADMIN", "MANAGER", "AGENCY"] },
  { key: "transaction", label: "Transaction", href: "/transaction", icon: "wallet", roles: ["SUPER_ADMIN", "MANAGER", "AGENCY"] },
  { key: "documents", label: "Documents", href: "/documents", icon: "shield", roles: ["SUPER_ADMIN", "MANAGER", "COUNSELOR", "AGENCY"] },
  { key: "reports", label: "Reports", href: "/reports", icon: "chart", roles: ["SUPER_ADMIN", "MANAGER", "AGENCY"] },
  { key: "visitor-form", label: "Visitor Form", href: "/visitor-form", icon: "form", roles: ["SUPER_ADMIN", "MANAGER", "COUNSELOR", "AGENCY"] },
  { key: "my-shortlist", label: "My Shortlist", href: "/my-shortlist", icon: "star", roles: ["STUDENT"] },
  { key: "messages", label: "Messages", href: "/messages", icon: "message", roles: ["SUPER_ADMIN", "MANAGER", "COUNSELOR", "AGENCY", "STUDENT"] },
  { key: "payments", label: "Payments", href: "/payments", icon: "credit", roles: ["SUPER_ADMIN", "MANAGER", "COUNSELOR", "AGENCY", "STUDENT"] },
  { key: "profile", label: "Profile", href: "/profile", icon: "user", roles: ["SUPER_ADMIN", "MANAGER", "COUNSELOR", "AGENCY", "STUDENT"] },
  { key: "settings", label: "Settings", href: "/settings", icon: "settings", roles: ["SUPER_ADMIN", "MANAGER", "COUNSELOR", "AGENCY", "STUDENT"] },
];

export function sectionsForRole(role: Role): Section[] {
  return SECTIONS.filter((s) => s.roles.includes(role));
}

/**
 * Can `actor` manage `target` (create / edit / delete)?
 * Top-down hierarchy only:
 *  - super_admin manages everyone
 *  - manager manages agency / counselor / student
 *  - agency manages students and sub-agencies (same AGENCY role + parentAgencyId)
 *  - counselor manages students assigned to them
 */
export function canManageUser(actor: Pick<User, "id" | "role">, target: Pick<User, "id" | "role">): boolean {
  if (target.role === "SUPER_ADMIN") return false;
  if (actor.role === "SUPER_ADMIN") return true;
  if (actor.role === "AGENCY" && target.role === "AGENCY") return actor.id !== target.id;
  return ROLE_RANK[actor.role] > ROLE_RANK[target.role];
}

/**
 * Which roles may `actor` create? (used to build the "create user" form options)
 */
export function creatableRoles(actor: Role): Role[] {
  switch (actor) {
    case "SUPER_ADMIN":
      return ["MANAGER", "AGENCY", "COUNSELOR", "STUDENT"];
    case "MANAGER":
      return ["AGENCY", "COUNSELOR", "STUDENT"];
    case "AGENCY":
      return ["AGENCY", "STUDENT"];
    case "COUNSELOR":
      return ["STUDENT"];
    default:
      return [];
  }
}

/**
 * Whether a partner can access a given student's data. §7c — used by every
 * API route that touches student-specific resources.
 */
export async function canAccessStudent(
  actor: Pick<User, "id" | "role">,
  student: Pick<User, "id" | "role" | "createdById" | "parentAgencyId" | "assignedCounselorId">
): Promise<boolean> {
  if (actor.role === "SUPER_ADMIN" || actor.role === "MANAGER") return true;
  if (student.id === actor.id) return true;

  if (actor.role === "COUNSELOR") {
    return student.assignedCounselorId === actor.id;
  }

  if (actor.role === "AGENCY") {
    // owns students they created themselves
    if (student.createdById === actor.id) return true;
    // owns students created by their direct sub-agencies
    if (student.createdById) {
      const creator = await prisma.user.findUnique({
        where: { id: student.createdById },
        select: { parentAgencyId: true },
      });
      if (creator?.parentAgencyId === actor.id) return true;
    }
  }
  return false;
}

export function isPartnerRole(role: Role): boolean {
  return role !== "STUDENT";
}