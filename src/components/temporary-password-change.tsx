"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/password-input";
import { PasswordChecklist, isStrongPassword } from "@/components/password-checklist";
import { Button } from "@/components/ui/button";

export function TemporaryPasswordChange({ email, homeHref }: { email: string; homeHref: string }) {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!isStrongPassword(newPassword)) {
      setError("Choose a password with at least 8 characters, one letter, and one number.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("The new passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch("/api/profile/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error ?? "Your password could not be changed.");
        return;
      }

      const login = await signIn("credentials", { email, password: newPassword, redirect: false });
      if (login?.error) {
        setError("Your password was changed. Sign in again with your new password to continue.");
        return;
      }
      router.replace(homeHref);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onClose={() => {}} title="Change your temporary password" dismissible={false}>
      <form onSubmit={submit} className="space-y-4">
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-900/25 dark:text-amber-100">
          <p className="font-semibold">Change this password before using your account.</p>
          <p className="mt-1">Your invitation included a temporary password. Set a private password to continue to the CheckMyUni portal.</p>
        </div>
        {error && <div role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200">{error}</div>}
        <div>
          <Label htmlFor="invite-current-password">Temporary password</Label>
          <Input id="invite-current-password" type="password" autoComplete="current-password" required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
        </div>
        <div>
          <Label htmlFor="invite-new-password">New password</Label>
          <PasswordInput id="invite-new-password" autoComplete="new-password" required minLength={8} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} aria-describedby="invite-password-rules" />
          <PasswordChecklist value={newPassword} id="invite-password-rules" />
        </div>
        <div>
          <Label htmlFor="invite-confirm-password">Confirm new password</Label>
          <PasswordInput id="invite-confirm-password" autoComplete="new-password" required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
        </div>
        <Button type="submit" disabled={busy} className="w-full">{busy ? "Updating password…" : "Save password and continue"}</Button>
      </form>
    </Dialog>
  );
}
