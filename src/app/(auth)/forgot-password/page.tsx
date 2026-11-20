import { connection } from "next/server";
import { AuthShell } from "@/components/auth-shell";
import { ForgotPasswordForm } from "@/components/forgot-password-form";

export const metadata = { title: "Reset password" };

export default async function ForgotPasswordPage() {
  await connection();
  return (
    <AuthShell
      title="Reset password"
      subtitle="We will email you a secure link to choose a new password."
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
