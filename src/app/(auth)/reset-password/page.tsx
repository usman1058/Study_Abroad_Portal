import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { ResetPasswordForm } from "@/components/reset-password-form";

export const metadata = { title: "Choose a new password", robots: { index: false, follow: false } };

type SearchParams = Promise<{ token?: string }>;

export default async function ResetPasswordPage({ searchParams }: { searchParams: SearchParams }) {
  const { token = "" } = await searchParams;

  return (
    <AuthShell
      title="Choose a new password"
      subtitle={token ? "Pick something you have not used before." : "This reset link is incomplete."}
    >
      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <div className="space-y-4">
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200">
            The link is missing its reset token. Request a new email to continue.
          </p>
          <Link
            href="/forgot-password"
            className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-brand-600 px-5 text-sm font-semibold text-white transition hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          >
            Request a new link
          </Link>
        </div>
      )}
    </AuthShell>
  );
}
