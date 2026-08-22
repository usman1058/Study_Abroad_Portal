import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "@/components/login-form";

export const metadata = { title: "Partner Login" };

export default function PartnerLoginPage() {
  return (
    <AuthShell
      title="Partner Login"
      subtitle="Agency staff and counselors. Sign in with your approved account."
      footer={
        <>
          No account yet?{" "}
          <Link href="/partner/signup" className="font-medium text-brand-600 hover:underline">
            Request an agency account
          </Link>
        </>
      }
    >
      <LoginForm nextPath="/home" />
    </AuthShell>
  );
}