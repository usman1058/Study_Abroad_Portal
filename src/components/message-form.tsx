"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export function MessageForm({ recipientId }: { recipientId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) {
      setError("Write a message first.");
      inputRef.current?.focus();
      return;
    }
    setBusy(true);
    setError(null);
    setSent(false);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId, body }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Message could not be sent. Please try again.");
        inputRef.current?.focus();
        return;
      }
      setBody("");
      setSent(true);
      inputRef.current?.focus();
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      inputRef.current?.focus();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={send} className="space-y-2">
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200">
          {error}
        </p>
      )}
      <div>
        <Label htmlFor="message-body" className="sr-only">
          Message
        </Label>
        <Textarea
          ref={inputRef}
          id="message-body"
          name="body"
          rows={2}
          maxLength={5000}
          required
          value={body}
          onChange={(e) => {
            setBody(e.target.value);
            setSent(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void send(e);
            }
          }}
          aria-describedby="message-help"
          placeholder="Write a message…"
        />
        <p id="message-help" className="mt-1 flex items-center justify-between text-xs text-ink-muted">
          <span>Ctrl+Enter to send.</span>
          <span>{body.length}/5000</span>
        </p>
      </div>
      <div className="flex items-center justify-between gap-2">
        <Button type="submit" size="sm" disabled={busy || !body.trim()}>
          {busy ? "Sending…" : "Send"}
        </Button>
        {sent && !busy && (
          <span role="status" className="text-xs text-emerald-700 dark:text-emerald-300">
            Message sent.
          </span>
        )}
      </div>
    </form>
  );
}
