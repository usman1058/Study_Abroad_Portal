import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "@/components/login-form";

export const metadata = { title: "Partner Login" };

export default function PartnerLoginPage() {
  return (
    <AuthShell
      title="Partner Login"
      subtitle="Agency staff and counselors. Accounts are created by your organization."
    >
      <LoginForm nextPath="/home" />
    </AuthShell>
  );
}