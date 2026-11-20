import Link from "next/link";
import { connection } from "next/server";
import { AuthShell } from "@/components/auth-shell";
import { SignupForm } from "@/components/signup-form";

export const metadata = { title: "Student Signup" };

export default async function StudentSignupPage() {
  await connection();
  return (
    <AuthShell
      title="Student Signup"
      subtitle="Create an account to explore programs and track your applications."
      footer={
        <>
          Already registered?{" "}
          <Link href="/student/login" className="font-medium text-brand-600 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <SignupForm />
    </AuthShell>
  );
}
