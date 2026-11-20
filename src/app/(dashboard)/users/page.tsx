import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { creatableRoles, studentScopeWhere } from "@/lib/permissions";
import { ROLE_LABELS } from "@/lib/constants";
import { UserForm } from "@/components/user-form";
import { InviteLinkForm } from "@/components/invite-link-form";
import { DeleteButton } from "@/components/delete-button";
import { ApproveButton } from "@/components/approve-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, fullName } from "@/lib/utils";
import { UserRoleEditor } from "@/components/user-role-editor";
import { CopyLinkButton } from "@/components/copy-link-button";

export const metadata = { title: "Users" };
const USER_PAGE_SIZE = 25;

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string; role?: string; status?: string; page?: string }> }) {
  const user = await currentUser();
  if (!user || user.role === "STUDENT") redirect("/");
  if (user.role === "COUNSELOR") redirect("/home");

  const allowed = creatableRoles(user.role);
  const params = await searchParams;
  const q = (params.q ?? "").trim().slice(0, 100);
  const roleFilter = Object.prototype.hasOwnProperty.call(ROLE_LABELS, params.role ?? "") ? params.role : "";
  const statusFilter = ["active", "pending", "inactive"].includes(params.status ?? "") ? params.status : "";
  const parsedPage = Number(params.page);
  const requestedPage = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const searchWhere = q ? { OR: [{ firstName: { contains: q, mode: "insensitive" as const } }, { lastName: { contains: q, mode: "insensitive" as const } }, { email: { contains: q, mode: "insensitive" as const } }, { companyName: { contains: q, mode: "insensitive" as const } }] } : {};
  const listWhere = { AND: [visibleUserScope(user), searchWhere, ...(roleFilter ? [{ role: roleFilter as keyof typeof ROLE_LABELS }] : []), ...(statusFilter ? [{ status: statusFilter }] : [])] };

  const [counselors, studentsForInvites, inviteLinks, inviteCount, userCount] = await Promise.all([
    ["SUPER_ADMIN", "MANAGER"].includes(user.role)
      ? prisma.user.findMany({ where: { role: "COUNSELOR" }, select: { id: true, firstName: true, lastName: true } })
      : Promise.resolve([]),
    prisma.user.findMany({ where: studentScopeWhere(user), select: { id: true, firstName: true, lastName: true, email: true } }),
    prisma.inviteLink.findMany({
      where: { createdById: user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, token: true, expiresAt: true, revoked: true, student: { select: { firstName: true, lastName: true } } },
    }),
    prisma.inviteLink.count({ where: { createdById: user.id } }),
    prisma.user.count({ where: listWhere }),
  ]);
  const pageCount = Math.max(1, Math.ceil(userCount / USER_PAGE_SIZE));
  if (userCount > 0 && requestedPage > pageCount) redirect(`/users?${new URLSearchParams({ ...(q ? { q } : {}), ...(roleFilter ? { role: roleFilter } : {}), ...(statusFilter ? { status: statusFilter } : {}), ...(pageCount > 1 ? { page: String(pageCount) } : {}) })}`);
  const visibleUsers = await prisma.user.findMany({ where: listWhere, orderBy: { createdAt: "desc" }, skip: (requestedPage - 1) * USER_PAGE_SIZE, take: USER_PAGE_SIZE });
  const query = (page?: number) => {
    const next = new URLSearchParams();
    if (q) next.set("q", q);
    if (roleFilter) next.set("role", roleFilter);
    if (statusFilter) next.set("status", statusFilter);
    if (page && page > 1) next.set("page", String(page));
    return next.size ? `/users?${next}` : "/users";
  };

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-sm text-ink-muted">Create and manage accounts below your role in the hierarchy.</p>
      </div>

      <form method="get" role="search" className="flex flex-wrap gap-2 rounded-xl border border-line p-3">
        <label htmlFor="user-search" className="sr-only">Search users by name, email, or company</label>
        <input id="user-search" name="q" defaultValue={q} placeholder="Search name, email, or company" className="min-h-10 min-w-0 flex-1 rounded-lg border border-line-strong px-3 text-sm" />
        <label htmlFor="user-role" className="sr-only">Filter users by role</label>
        <select id="user-role" name="role" defaultValue={roleFilter} className="min-h-10 rounded-lg border border-line-strong px-2 text-sm"><option value="">All roles</option>{Object.entries(ROLE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
        <label htmlFor="user-status" className="sr-only">Filter users by status</label>
        <select id="user-status" name="status" defaultValue={statusFilter} className="min-h-10 rounded-lg border border-line-strong px-2 text-sm"><option value="">All statuses</option><option value="active">Active</option><option value="pending">Pending</option><option value="inactive">Inactive</option></select>
        <button className="min-h-10 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white">Search</button>
      </form>

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
          {visibleUsers.length === 0 ? <p className="py-8 text-center text-sm text-ink-muted">No users match these filters.</p> : <>
          <ul className="divide-y divide-line lg:hidden">{visibleUsers.map((u) => <li key={u.id} className="space-y-2 py-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><Link href={`/users/${u.id}`} className="inline-flex min-h-6 font-medium hover:underline">{u.userTitle ? `${u.userTitle} ` : ""}{fullName(u)}</Link><p className="break-all text-xs text-ink-muted">{u.email}</p></div><Badge tone={u.role === "AGENCY" ? "brand" : u.role === "STUDENT" ? "green" : "slate"}>{ROLE_LABELS[u.role]}</Badge></div><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs text-ink-muted">{u.phone ?? "No phone"} · {u.status}</span><div className="flex flex-wrap gap-2">{u.status === "pending" && <ApproveButton userId={u.id} email={u.email} />}{u.role !== "SUPER_ADMIN" && allowed.some((candidate) => candidate !== u.role) && <UserRoleEditor userId={u.id} role={u.role} allowedRoles={allowed} />}<DeleteButton endpoint={`/api/users/${u.id}`} confirmText={`Delete ${u.email}?`} label="Delete" /></div></div></li>)}</ul>
          <div className="hidden min-w-0 max-w-full overflow-x-auto lg:block" tabIndex={0} role="region" aria-label="User accounts table">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase text-ink-muted dark:border-navy-700">
                  <th scope="col" className="pb-2 pr-4">Name</th>
                  <th scope="col" className="pb-2 pr-4">Email</th>
                  <th scope="col" className="pb-2 pr-4">Role</th>
                  <th scope="col" className="pb-2 pr-4">Phone</th>
                  <th scope="col" className="pb-2 pr-4">Status</th>
                  <th scope="col" className="pb-2 pr-4">Created</th>
                  <th scope="col" className="pb-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line dark:divide-navy-700">
                {visibleUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-canvas dark:hover:bg-navy-800/40">
                    <td className="py-2.5 pr-4">
                      <Link href={`/users/${u.id}`} className="inline-flex min-h-6 items-center font-medium hover:underline">
                        {u.userTitle ? `${u.userTitle} ` : ""}
                        {fullName(u)}
                      </Link>
                    </td>
                    <td className="py-2.5 pr-4 text-ink-muted">{u.email}</td>
                    <td className="py-2.5 pr-4">
                      <Badge tone={u.role === "AGENCY" ? "brand" : u.role === "STUDENT" ? "green" : "slate"}>
                        {ROLE_LABELS[u.role]}
                      </Badge>
                    </td>
                    <td className="py-2.5 pr-4 text-ink-muted">{u.phone ?? "—"}</td>
                    <td className="py-2.5 pr-4">
                      <Badge tone={u.status === "active" ? "green" : u.status === "pending" ? "amber" : "red"}>{u.status}</Badge>
                    </td>
                    <td className="py-2.5 pr-4 text-ink-muted">{formatDate(u.createdAt)}</td>
                    <td className="py-2.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {u.status === "pending" && <ApproveButton userId={u.id} email={u.email} />}
                        {u.role !== "SUPER_ADMIN" && allowed.some((candidate) => candidate !== u.role) && <UserRoleEditor userId={u.id} role={u.role} allowedRoles={allowed} />}
                        <DeleteButton endpoint={`/api/users/${u.id}`} confirmText={`Delete ${u.email}?`} label="Delete" />
                      </div>
                    </td>
                  </tr>
                ))}
                {visibleUsers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-ink-muted">
                      No users to show.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div></>}
        </CardContent>
      </Card>

      {userCount > 0 && <div className="flex flex-wrap items-center justify-between gap-3 text-sm"><p className="text-ink-muted">Showing {(requestedPage - 1) * USER_PAGE_SIZE + 1}–{Math.min(requestedPage * USER_PAGE_SIZE, userCount)} of {userCount} accounts.</p>{pageCount > 1 && <nav aria-label="User pages" className="flex items-center gap-2">{requestedPage > 1 && <Link className="inline-flex min-h-9 items-center rounded-lg border px-3" href={query(requestedPage - 1)}>Previous</Link>}<span>Page {requestedPage} of {pageCount}</span>{requestedPage < pageCount && <Link className="inline-flex min-h-9 items-center rounded-lg border px-3" href={query(requestedPage + 1)}>Next</Link>}</nav>}</div>}

      <Card>
        <CardHeader>
          <CardTitle>Guest invite links (latest 10 of {inviteCount})</CardTitle>
        </CardHeader>
        <CardContent>
          {inviteLinks.length === 0 ? (
            <p className="text-sm text-ink-muted">No invite links created yet.</p>
          ) : (
            <ul className="divide-y divide-line dark:divide-navy-700">
              {inviteLinks.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate text-xs">
                      {l.student ? `${l.student.firstName} ${l.student.lastName}` : "Any student"} · expires {formatDate(l.expiresAt)}
                    </p>
                    <Link href={`/invite/${l.token}`} target="_blank" rel="noreferrer" className="inline-flex min-h-6 items-center text-xs text-brand-600 hover:underline">Open invite</Link>
                  </div>
                  <div className="flex items-center gap-2">
                    <CopyLinkButton path={`/invite/${l.token}`} label="Copy invite" />
                    {l.revoked ? (
                      <Badge tone="red">Revoked</Badge>
                    ) : new Date(l.expiresAt) < new Date() ? (
                      <Badge tone="slate">Expired</Badge>
                    ) : (
                      <Badge tone="green">Active</Badge>
                    )}
                    {!l.revoked && <DeleteButton endpoint={`/api/invites/${l.id}`} confirmText="Revoke this invite link?" label="Revoke" />}
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

function visibleUserScope(user: { id: string; role: string }) {
  if (user.role === "SUPER_ADMIN" || user.role === "MANAGER") {
    return user.role === "SUPER_ADMIN" ? {} : { role: { not: "SUPER_ADMIN" as const } };
  }
  if (user.role === "AGENCY") {
    return { role: "STUDENT" as const, createdById: user.id };
  }
  return { role: "STUDENT" as const, assignedCounselorId: user.id };
}
