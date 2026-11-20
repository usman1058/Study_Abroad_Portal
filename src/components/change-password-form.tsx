"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ChangePasswordForm() {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(false);
    if (next !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/profile/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to change password");
        return;
      }
      setOk(true);
      setCurrent("");
      setNext("");
      setConfirm("");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="max-w-md space-y-4">
      {error && <div role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      {ok && <div role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Password updated. Other active sessions may remain signed in for up to 12 hours.</div>}
      <div>
        <Label htmlFor="current-password">Current password</Label>
        <Input id="current-password" autoComplete="current-password" type="password" required value={current} onChange={(e) => setCurrent(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="new-password">New password</Label>
        <Input id="new-password" autoComplete="new-password" type="password" required minLength={8} value={next} onChange={(e) => setNext(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="confirm-new-password">Confirm new password</Label>
        <Input id="confirm-new-password" autoComplete="new-password" type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </div>
      <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Change password"}</Button>
    </form>
  );
}
