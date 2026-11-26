import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "@/components/login-form";

export const metadata = { title: "Partner Login" };

type SearchParams = Promise<{ next?: string | string[]; reset?: string | string[] }>;

export default async function PartnerLoginPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : undefined;
  const notice = params.reset ? "Your password was updated. Sign in with the new one." : undefined;

  return (
    <AuthShell
      title="Partner Login"
      subtitle="Sign in to your institution or partner workspace. Use an account approved by CheckMyUni."
      wide
      footer={
        <>
          No account yet?{" "}
          <Link href="/partner/signup" className="font-medium text-brand-600 hover:underline">
            Request an agency account
          </Link>
        </>
      }
    >
      <LoginForm nextPath={next ?? "/home"} notice={notice} />
    </AuthShell>
  );
}
