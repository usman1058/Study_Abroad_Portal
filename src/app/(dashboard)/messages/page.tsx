import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { MessageForm } from "@/components/message-form";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, fullName } from "@/lib/utils";

export const metadata = { title: "Messages" };

type SearchParams = Promise<{ with?: string }>;

export default async function MessagesPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await currentUser();
  if (!user) redirect("/");
  const { with: withId = "" } = await searchParams;

  const mine = await prisma.message.findMany({
    where: {
      OR: [{ senderId: user.id }, { recipientId: user.id }],
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      sender: { select: { id: true, firstName: true, lastName: true, role: true } },
      recipient: { select: { id: true, firstName: true, lastName: true, role: true } },
    },
  });

  // Conversations grouped by the other party.
  const conversations = new Map<string, { id: string; name: string; lastAt: Date }>();
  for (const m of mine) {
    const other = m.senderId === user.id ? m.recipient : m.sender;
    const existing = conversations.get(other.id);
    if (!existing || m.createdAt > existing.lastAt) {
      conversations.set(other.id, { id: other.id, name: fullName(other), lastAt: m.createdAt });
    }
  }
  const list = [...conversations.values()].sort((a, b) => b.lastAt.getTime() - a.lastAt.getTime());

  const selectedId = withId || list[0]?.id || "";
  const thread = selectedId
    ? mine
        .filter((m) => m.senderId === selectedId || m.recipientId === selectedId)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    : [];

  const selectedUser = selectedId ? await prisma.user.findUnique({ where: { id: selectedId }, select: { id: true, firstName: true, lastName: true } }) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Messages</h1>
        <p className="text-sm text-slate-500">Conversations with our team.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardContent className="p-2">
            {list.length === 0 ? (
              <p className="p-4 text-sm text-slate-500">No conversations yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {list.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/messages?with=${c.id}`}
                      className={
                        "block px-3 py-2.5 text-sm " +
                        (selectedId === c.id ? "bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200" : "hover:bg-slate-50 dark:hover:bg-slate-800/40")
                      }
                    >
                      <span className="font-medium">{c.name}</span>
                      <span className="block text-xs text-slate-400">{formatDate(c.lastAt)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardContent className="p-0">
            {!selectedId ? (
              <p className="py-12 text-center text-sm text-slate-500">Select a conversation.</p>
            ) : (
              <div className="flex h-[28rem] flex-col">
                <div className="border-b border-slate-200 px-4 py-3 text-sm font-medium dark:border-slate-800">
                  {selectedUser ? fullName(selectedUser) : "Conversation"}
                </div>
                <div className="flex-1 space-y-3 overflow-y-auto p-4">
                  {thread.map((m) => {
                    const mineMsg = m.senderId === user.id;
                    return (
                      <div key={m.id} className={"flex " + (mineMsg ? "justify-end" : "justify-start")}>
                        <div
                          className={
                            "max-w-[75%] rounded-2xl px-3 py-2 text-sm " +
                            (mineMsg
                              ? "bg-brand-600 text-white"
                              : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100")
                          }
                        >
                          {m.body}
                          <span className={"mt-0.5 block text-[10px] " + (mineMsg ? "text-white/70" : "text-slate-400")}>
                            {formatDate(m.createdAt, { dateStyle: "short", timeStyle: "short" })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {thread.length === 0 && <p className="text-center text-sm text-slate-500">No messages yet.</p>}
                </div>
                <div className="border-t border-slate-200 p-3 dark:border-slate-800">
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