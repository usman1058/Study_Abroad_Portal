import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { creatableRoles } from "@/lib/permissions";
import { ROLE_LABELS } from "@/lib/constants";
import { UserForm } from "@/components/user-form";
import { InviteLinkForm } from "@/components/invite-link-form";
import { DeleteButton } from "@/components/delete-button";
import { ApproveButton } from "@/components/approve-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, fullName } from "@/lib/utils";

export const metadata = { title: "Users" };

export default async function UsersPage() {
  const user = await currentUser();
  if (!user || user.role === "STUDENT") redirect("/");
  if (user.role === "COUNSELOR") redirect("/home");

  const allowed = creatableRoles(user.role);

  const [counselors, studentsForInvites, inviteLinks, visibleUsers] = await Promise.all([
    prisma.user.findMany({ where: { role: "COUNSELOR" }, select: { id: true, firstName: true, lastName: true } }),
    prisma.user.findMany({ where: { role: "STUDENT" }, select: { id: true, firstName: true, lastName: true, email: true } }),
    prisma.inviteLink.findMany({
      where: { createdById: user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, token: true, expiresAt: true, revoked: true, student: { select: { firstName: true, lastName: true } } },
    }),
    loadVisibleUsers(user),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-sm text-slate-500">Create and manage accounts below your role in the hierarchy.</p>
      </div>

      {allowed.length > 0 && (
        <UserForm
          allowedRoles={allowed}
          counselors={counselors.map((c) => ({ id: c.id, label: `${c.firstName} ${c.lastName}` }))}
        />
      )}

      <InviteLinkForm students={studentsForInvites.map((s) => ({ id: s.id, label: `${s.firstName} ${s.lastName} (${s.email})` }))} />

      <Card>
        <CardHeader>
          <CardTitle>Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500 dark:border-slate-800">
                  <th className="pb-2 pr-4">Name</th>
                  <th className="pb-2 pr-4">Email</th>
                  <th className="pb-2 pr-4">Role</th>
                  <th className="pb-2 pr-4">Phone</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2 pr-4">Created</th>
                  <th className="pb-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {visibleUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 pr-4">
                      <Link href={`/users/${u.id}`} className="font-medium hover:underline">
                        {u.userTitle ? `${u.userTitle} ` : ""}
                        {fullName(u)}
                      </Link>
                    </td>
                    <td className="py-2.5 pr-4 text-slate-500">{u.email}</td>
                    <td className="py-2.5 pr-4">
                      <Badge tone={u.role === "AGENCY" ? "brand" : u.role === "STUDENT" ? "green" : "slate"}>
                        {ROLE_LABELS[u.role]}
                      </Badge>
                    </td>
                    <td className="py-2.5 pr-4 text-slate-500">{u.phone ?? "—"}</td>
                    <td className="py-2.5 pr-4">
                      <Badge tone={u.status === "active" ? "green" : u.status === "pending" ? "amber" : "red"}>{u.status}</Badge>
                    </td>
                    <td className="py-2.5 pr-4 text-slate-500">{formatDate(u.createdAt)}</td>
                    <td className="py-2.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {u.status === "pending" && <ApproveButton userId={u.id} email={u.email} />}
                        <DeleteButton endpoint={`/api/users/${u.id}`} confirmText={`Delete ${u.email}?`} label="Delete" />
                      </div>
                    </td>
                  </tr>
                ))}
                {visibleUsers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No users to show.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Guest invite links</CardTitle>
        </CardHeader>
        <CardContent>
          {inviteLinks.length === 0 ? (
            <p className="text-sm text-slate-500">No invite links created yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {inviteLinks.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate text-xs">
                      {l.student ? `${l.student.firstName} ${l.student.lastName}` : "Any student"} · expires {formatDate(l.expiresAt)}
                    </p>
                    <code className="text-[11px] text-slate-500">/invite/{l.token}</code>
                  </div>
                  <div className="flex items-center gap-2">
                    {l.revoked ? (
                      <Badge tone="red">Revoked</Badge>
                    ) : new Date(l.expiresAt) < new Date() ? (
                      <Badge tone="slate">Expired</Badge>
                    ) : (
                      <Badge tone="green">Active</Badge>
                    )}
                    {!l.revoked && <DeleteButton endpoint={`/api/invites/${l.id}/revoke`} confirmText="Revoke this invite link?" label="Revoke" />}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

async function loadVisibleUsers(user: { id: string; role: string }) {
  if (user.role === "SUPER_ADMIN" || user.role === "MANAGER") {
    return prisma.user.findMany({
      where: user.role === "SUPER_ADMIN" ? {} : { role: { not: "SUPER_ADMIN" } },
      orderBy: { createdAt: "desc" },
    });
  }
  if (user.role === "AGENCY") {
    return prisma.user.findMany({
      where: {
        OR: [
          { role: "STUDENT", createdById: user.id },
          { role: "AGENCY", parentAgencyId: user.id },
        ],
      },
      orderBy: { createdAt: "desc" },
    });
  }
  return prisma.user.findMany({
    where: { role: "STUDENT", assignedCounselorId: user.id },
    orderBy: { createdAt: "desc" },
  });
}