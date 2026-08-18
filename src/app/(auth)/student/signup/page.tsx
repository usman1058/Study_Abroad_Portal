import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { SignupForm } from "@/components/signup-form";

export const metadata = { title: "Student Signup" };

export default function StudentSignupPage() {
  return (
    <AuthShell
      title="Create your account"
      subtitle="Quick signup — just a few details to get started."
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