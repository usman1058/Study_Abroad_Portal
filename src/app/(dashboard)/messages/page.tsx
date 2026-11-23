import Link from "next/link";
import { redirect } from "next/navigation";
import type { Prisma } from "@/generated/prisma/client";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { studentScopeWhere } from "@/lib/permissions";
import { MessageForm } from "@/components/message-form";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, fullName, humanize } from "@/lib/utils";
import { getStudentSupportContacts } from "@/lib/student-support-contacts";

export const metadata = { title: "Messages" };

const THREAD_PAGE = 50;
const SUGGESTION_LIMIT = 20;

type SearchParams = Promise<{ with?: string; q?: string; before?: string }>;

export default async function MessagesPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await currentUser();
  if (!user) redirect("/");
  const { with: withId = "", q = "", before = "" } = await searchParams;
  const supportContacts = user.role === "STUDENT" ? await getStudentSupportContacts(user.id) : [];
  const supportContactIds = supportContacts.map((contact) => contact.id);
  const studentMessageScope = user.role === "STUDENT"
    ? { in: supportContactIds }
    : undefined;

  // Conversation list from both directions, without loading every message.
  const [received, sent] = await Promise.all([
    prisma.message.groupBy({
      by: ["senderId"],
      where: { recipientId: user.id, ...(studentMessageScope ? { senderId: studentMessageScope } : {}) },
      _max: { createdAt: true },
    }),
    prisma.message.groupBy({
      by: ["recipientId"],
      where: { senderId: user.id, ...(studentMessageScope ? { recipientId: studentMessageScope } : {}) },
      _max: { createdAt: true },
    }),
  ]);

  const lastAt = new Map<string, Date>();
  for (const row of received) {
    if (row._max.createdAt) lastAt.set(row.senderId, row._max.createdAt);
  }
  for (const row of sent) {
    if (!row._max.createdAt) continue;
    const current = lastAt.get(row.recipientId);
    if (!current || row._max.createdAt > current) lastAt.set(row.recipientId, row._max.createdAt);
  }

  const partners = lastAt.size
    ? await prisma.user.findMany({
        where: { id: { in: [...lastAt.keys()] } },
        select: { id: true, firstName: true, lastName: true, role: true },
      })
    : [];

  const conversations = partners
    .map((person) => ({ ...person, lastAt: lastAt.get(person.id)! }))
    .sort((a, b) => b.lastAt.getTime() - a.lastAt.getTime());

  // Students get fixed support contacts. Other roles can discover people in
  // their permitted student scope, while Super Admins can contact any user.
  let suggestions: { id: string; firstName: string; lastName: string; role: "SUPER_ADMIN" | "MANAGER" | "COUNSELOR" | "AGENCY" | "STUDENT" }[] = [];
  let suggestionTotal = 0;
  const search = q.trim();
  if (user.role !== "STUDENT") {
    const suggestionFilter: Prisma.UserWhereInput = user.role === "SUPER_ADMIN"
      ? { id: { not: user.id } }
      : studentScopeWhere(user);
    const searchWhere: Prisma.UserWhereInput = search
      ? {
          AND: [
            suggestionFilter,
            {
              OR: [
                { firstName: { contains: search, mode: "insensitive" } },
                { lastName: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
              ],
            },
          ],
        }
      : suggestionFilter;

    const [suggestionRows, total] = await Promise.all([
      prisma.user.findMany({
        where: searchWhere,
        select: { id: true, firstName: true, lastName: true, role: true },
        orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
        take: SUGGESTION_LIMIT,
      }),
      prisma.user.count({ where: searchWhere }),
    ]);
    suggestions = suggestionRows;
    suggestionTotal = total;
  }

  const partnerIds = new Set(partners.map((person) => person.id));
  suggestions = suggestions.filter((person) => !partnerIds.has(person.id));

  const permittedIds = new Set([
    ...conversations.map((conversation) => conversation.id),
    ...suggestions.map((person) => person.id),
    ...supportContactIds,
  ]);
  const selectedId = withId && permittedIds.has(withId)
    ? withId
    : conversations[0]?.id ?? supportContactIds[0] ?? suggestions[0]?.id ?? "";
  const selectedUser =
    partners.find((person) => person.id === selectedId) ??
    suggestions.find((person) => person.id === selectedId) ??
    supportContacts.find((person) => person.id === selectedId) ??
    null;

  // Opening a conversation marks it read. This is a user-visible state change
  // (the sender sees their message was read), unlike analytics-style tracking.
  if (selectedId && !before) {
    await prisma.message.updateMany({
      where: { recipientId: user.id, senderId: selectedId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  const threadFilter: Prisma.MessageWhereInput = selectedId
    ? {
        OR: [
          { senderId: user.id, recipientId: selectedId },
          { senderId: selectedId, recipientId: user.id },
        ],
      }
    : { id: "__none__" };

  let beforeDate: Date | null = null;
  if (before && selectedId) {
    const anchor = await prisma.message.findFirst({
      where: { AND: [threadFilter, { id: before }] },
      select: { createdAt: true },
    });
    beforeDate = anchor?.createdAt ?? null;
  }

  const [threadRows, unreadRows] = await Promise.all([
    selectedId
      ? prisma.message.findMany({
          where: beforeDate ? { AND: [threadFilter, { createdAt: { lt: beforeDate } }] } : threadFilter,
          orderBy: { createdAt: "desc" },
          take: THREAD_PAGE + 1,
        })
      : Promise.resolve([]),
    prisma.message.groupBy({
      by: ["senderId"],
      where: { recipientId: user.id, readAt: null },
      _count: { _all: true },
    }),
  ]);

  const hasOlder = threadRows.length > THREAD_PAGE;
  const thread = threadRows.slice(0, THREAD_PAGE).reverse();
  const unread = new Map(unreadRows.map((row) => [row.senderId, row._count._all]));

  const subtitle =
    user.role === "SUPER_ADMIN"
      ? "Message any student, counselor, manager, agency, or administrator."
      : user.role === "STUDENT"
        ? supportContacts.some((contact) => contact.label === "Consultant")
          ? "Message your consultant or contact Admin for support."
          : "Contact Admin for account help or support."
        : "Conversations with your students.";

  return (
    <div className="space-y-6">
      <header className="rounded-2xl bg-gradient-to-r from-navy-900 to-brand-700 px-5 py-6 text-white shadow-sm sm:px-7">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-200">Communication center</p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Messages</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100">{subtitle}</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="min-w-0 overflow-hidden shadow-sm">
          <CardContent className="p-3">
            <h2 className="px-1 pb-2 text-sm font-semibold">Conversations</h2>

            {user.role !== "STUDENT" && (
              <form action="/messages" method="get" role="search" className="mb-3 flex gap-2 px-1">
                {selectedId && <input type="hidden" name="with" value={selectedId} />}
                <label htmlFor="contact-search" className="sr-only">Search contacts</label>
                <input
                  id="contact-search"
                  name="q"
                  type="search"
                  defaultValue={q}
                  placeholder="Search contacts…"
                  className="h-9 min-w-0 flex-1 rounded-lg border border-line-strong bg-white px-2 text-sm text-ink outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 dark:border-navy-700 dark:bg-navy-900 dark:text-slate-100"
                />
                <button type="submit" className="inline-flex min-h-9 items-center rounded-lg border border-line-strong px-3 text-xs font-medium hover:bg-canvas dark:border-navy-700 dark:hover:bg-navy-800">Search</button>
              </form>
            )}
            {search && user.role !== "STUDENT" && (
              <p className="mb-2 px-1 text-xs text-ink-muted">
                {suggestionTotal} contact{suggestionTotal === 1 ? "" : "s"} match “{search}”
                {suggestionTotal > SUGGESTION_LIMIT ? ` — showing the first ${SUGGESTION_LIMIT}` : ""}.
              </p>
            )}

            {user.role === "STUDENT" && (
              <div className="mb-3 border-b border-line px-1 pb-3 dark:border-navy-700">
                <h3 className="px-1 py-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">Support contacts</h3>
                {supportContacts.length === 0 ? (
                  <p className="px-1 py-2 text-sm text-ink-muted">No active Admin contact is available. Please contact the portal support team.</p>
                ) : (
                  <nav aria-label="Student support contacts" className="flex flex-wrap gap-2">
                    {supportContacts.map((contact) => (
                      <Link
                        key={contact.id}
                        href={`/messages?with=${contact.id}`}
                        aria-current={selectedId === contact.id ? "page" : undefined}
                        title={contact.label === "Admin" ? "For support requests, account help, or other issues" : "Message your assigned consultant"}
                        className={
                          "inline-flex min-h-9 items-center rounded-full border px-3 text-sm font-medium " +
                          (selectedId === contact.id
                            ? "border-brand-600 bg-brand-600 text-white"
                            : "border-line-strong hover:bg-canvas dark:border-navy-700 dark:hover:bg-navy-800")
                        }
                      >
                        <span>{contact.label}</span>
                        <span className="text-xs font-normal opacity-80">{fullName(contact)}</span>
                      </Link>
                    ))}
                  </nav>
                )}
              </div>
            )}

            {suggestions.length > 0 && (
              <div className="mb-2 border-b border-line px-1 pb-2 dark:border-navy-700">
                <h3 className="px-1 py-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  {search ? "Other contacts" : "Start a conversation"}
                </h3>
                <ul>
                  {suggestions.map((person) => (
                    <li key={person.id}>
                      <Link
                        href={`/messages?with=${person.id}${search ? `&q=${encodeURIComponent(search)}` : ""}`}
                        className="flex min-h-9 items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm font-medium hover:bg-canvas dark:hover:bg-navy-800"
                      >
                        <span className="min-w-0 truncate">
                          {fullName(person)}
                          <span className="ml-1 text-xs font-normal text-ink-muted">{humanize(person.role)}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
                {suggestionTotal > SUGGESTION_LIMIT && !search && (
                  <p className="px-1 pt-1 text-xs text-ink-muted">
                    More contacts are available — search by name or email.
                  </p>
                )}
              </div>
            )}

            {conversations.length === 0 ? (
              <p className="p-4 text-sm text-ink-muted">
                {suggestions.length > 0
                  ? "No conversations yet. Choose a contact to send the first message."
                  : user.role === "STUDENT"
                    ? "No contacts yet. Your assigned counselor will appear here once your account is linked."
                    : "No conversations yet."}
              </p>
            ) : (
              <ul aria-label="Conversations">
                {conversations.map((conversation) => {
                  const count = unread.get(conversation.id) ?? 0;
                  const active = selectedId === conversation.id;
                  return (
                    <li key={conversation.id}>
                      <Link
                        href={`/messages?with=${conversation.id}`}
                        aria-current={active ? "page" : undefined}
                        className={
                          "flex min-h-11 items-center justify-between gap-2 rounded-lg px-2 py-2 text-sm " +
                          (active
                            ? "bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200"
                            : "hover:bg-canvas dark:hover:bg-navy-800/40")
                        }
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{fullName(conversation)}</span>
                          <time
                            dateTime={conversation.lastAt.toISOString()}
                            className="block text-xs text-ink-muted"
                          >
                            {formatDate(conversation.lastAt)}
                          </time>
                        </span>
                        {count > 0 && (
                          <span
                            className="inline-flex min-w-6 items-center justify-center rounded-full bg-brand-600 px-1.5 py-0.5 text-xs font-semibold text-white"
                            aria-label={`${count} unread message${count === 1 ? "" : "s"}`}
                          >
                            {count}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0 overflow-hidden shadow-sm lg:col-span-2">
          <CardContent className="p-0">
            {!selectedId ? (
              <p className="py-12 text-center text-sm text-ink-muted">Select a conversation.</p>
            ) : (
              <div className="flex h-[34rem] flex-col">
                <div className="border-b border-line bg-canvas-subtle/60 px-4 py-4 dark:border-navy-700 dark:bg-navy-800/40">
                  <h2 className="text-sm font-semibold">
                    {selectedUser ? fullName(selectedUser) : "Conversation"}
                  </h2>
                  {selectedUser && (
                    <p className="text-xs text-ink-muted">
                      {supportContacts.find((contact) => contact.id === selectedUser.id)?.label ?? humanize(selectedUser.role)}
                      {unread.get(selectedId) ? ` · ${unread.get(selectedId)} unread` : ""}
                    </p>
                  )}
                </div>

                <div
                  role="log"
                  aria-label="Message history"
                  aria-live="polite"
                  className="flex-1 space-y-3 overflow-y-auto p-4"
                >
                  {hasOlder && thread[0] && (
                    <p className="text-center">
                      <Link
                        href={`/messages?with=${selectedId}&before=${thread[0].id}`}
                        className="inline-flex min-h-8 items-center text-xs font-medium text-brand-700 underline dark:text-brand-300"
                      >
                        Load older messages
                      </Link>
                    </p>
                  )}
                  {beforeDate && (
                    <p className="text-center">
                      <Link
                        href={`/messages?with=${selectedId}`}
                        className="inline-flex min-h-8 items-center text-xs font-medium text-brand-700 underline dark:text-brand-300"
                      >
                        Jump to the latest messages
                      </Link>
                    </p>
                  )}
                  {thread.length === 0 && (
                    <p className="py-8 text-center text-sm text-ink-muted">
                      No messages yet. Send the first one below.
                    </p>
                  )}
                  <ol className="space-y-3">
                    {thread.map((message) => {
                      const mine = message.senderId === user.id;
                      return (
                        <li key={message.id} className={"flex " + (mine ? "justify-end" : "justify-start")}>
                          <div
                            className={
                              "max-w-[75%] rounded-2xl px-3 py-2 text-sm " +
                              (mine
                                ? "bg-brand-600 text-white"
                                : "bg-canvas-subtle text-slate-800 dark:bg-navy-800 dark:text-slate-100")
                            }
                          >
                            <p className="whitespace-pre-wrap break-words">{message.body}</p>
                            <time
                              dateTime={message.createdAt.toISOString()}
                              className={"mt-0.5 block text-[11px] " + (mine ? "text-white" : "text-ink-muted")}
                            >
                              {formatDate(message.createdAt, { dateStyle: "short", timeStyle: "short" })}
                              {mine && message.readAt ? " · Read" : ""}
                            </time>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </div>

                <div className="border-t border-line p-3 dark:border-navy-700">
                  <MessageForm recipientId={selectedId} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
