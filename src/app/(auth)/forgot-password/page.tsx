import { AuthShell } from "@/components/auth-shell";
import { ForgotPasswordForm } from "@/components/forgot-password-form";

export const metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Reset password"
      subtitle="We will email you a secure link to choose a new password."
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
