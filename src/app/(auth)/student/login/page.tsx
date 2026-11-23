import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "@/components/login-form";

export const metadata = { title: "Student Login" };

type SearchParams = Promise<{ next?: string | string[]; reset?: string | string[] }>;

export default async function StudentLoginPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : undefined;
  const notice = params.reset ? "Your password was updated. Sign in with the new one." : undefined;

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
      <LoginForm nextPath={next ?? "/student-home"} notice={notice} />
    </AuthShell>
  );
}
