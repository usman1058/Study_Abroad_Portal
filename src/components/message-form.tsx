"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function MessageForm({ recipientId }: { recipientId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId, body }),
      });
      const json = await res.json();
      if (!res.ok) alert(json.error ?? "Failed to send");
      setBody("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={send} className="space-y-2">
      <Textarea rows={2} placeholder="Send a message…" value={body} onChange={(e) => setBody(e.target.value)} />
      <Button type="submit" size="sm" disabled={busy || !body.trim()}>
        Send
      </Button>
    </form>
  );
}