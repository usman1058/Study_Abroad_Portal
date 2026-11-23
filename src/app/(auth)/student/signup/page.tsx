import Link from "next/link";
import { connection } from "next/server";
import { AuthShell } from "@/components/auth-shell";
import { SignupForm } from "@/components/signup-form";

export const metadata = { title: "Student Signup" };

export default async function StudentSignupPage({ searchParams }: { searchParams: Promise<{ programId?: string }> }) {
  await connection();
  const params = await searchParams;
  const programId = params.programId?.slice(0, 64);
  const nextPath = programId ? `/apply?programId=${encodeURIComponent(programId)}` : "/student-home";
  return (
    <AuthShell
      title="Student Signup"
      subtitle="Create an account to explore programs and track your applications."
      footer={
        <>
          Already registered?{" "}
          <Link href={`/student/login?next=${encodeURIComponent(nextPath)}`} className="font-medium text-brand-600 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <SignupForm initialProgramId={programId} />
    </AuthShell>
  );
}
