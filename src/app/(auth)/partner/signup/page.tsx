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
      subtitle="Register your institute, then upload its business registration and any supporting documents in the final step. You can enter the portal after review and approval."
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
