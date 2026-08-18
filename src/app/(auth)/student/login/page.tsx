import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "@/components/login-form";

export const metadata = { title: "Student Login" };

export default function StudentLoginPage() {
  return (
    <AuthShell
      title="Student Login"
      subtitle="Sign in to track your applications, shortlist and documents."
      footer={
        <>
          New here?{" "}
          <Link href="/student/signup" className="font-medium text-brand-600 hover:underline">
            Create a free account
          </Link>
        </>
      }
    >
      <LoginForm nextPath="/my-applications" />
    </AuthShell>
  );
}