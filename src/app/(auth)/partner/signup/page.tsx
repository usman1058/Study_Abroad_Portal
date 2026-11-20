import Link from "next/link";
import { connection } from "next/server";
import { AuthShell } from "@/components/auth-shell";
import { PartnerSignupForm } from "@/components/partner-signup-form";

export const metadata = { title: "Partner Signup" };

export default async function PartnerSignupPage() {
  await connection();
  return (
    <AuthShell
      title="Partner Signup"
      subtitle="Register your agency. An administrator will review and approve your request before you can sign in."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/partner/login" className="font-medium text-brand-600 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <PartnerSignupForm />
    </AuthShell>
  );
}
