import { AuthShell } from "@/components/auth-shell";
import { PartnerSignupForm } from "@/components/partner-signup-form";

export const metadata = { title: "Partner Signup" };

export default function PartnerSignupPage() {
  return (
    <AuthShell
      title="Partner Signup"
      subtitle="Register your agency. An administrator will review and approve your request before you can sign in."
    >
      <PartnerSignupForm />
    </AuthShell>
  );
}