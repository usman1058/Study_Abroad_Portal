import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { profileCompleteness } from "@/lib/queries";
import { ProfileForm } from "@/components/profile-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Profile" };

const COMPLETENESS_FIELDS: { key: string; label: string }[] = [
  { key: "phone", label: "Phone" },
  { key: "country", label: "Country" },
  { key: "gender", label: "Gender" },
  { key: "passportNumber", label: "Passport number" },
  { key: "birthday", label: "Birthday" },
  { key: "countryOfResidence", label: "Country of residence" },
  { key: "nationality", label: "Nationality" },
  { key: "cityOfResidence", label: "City of residence" },
  { key: "address", label: "Address" },
  { key: "motherName", label: "Mother’s name" },
  { key: "fatherName", label: "Father’s name" },
];

function fieldToInput(u: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(u).map(([key, value]) => {
      if (value instanceof Date) return [key, value.toISOString().slice(0, 10)];
      return [key, value == null ? "" : String(value)];
    })
  );
}

export default async function ProfilePage() {
  const user = await currentUser();
  if (!user) redirect("/");

  const me = await prisma.user.findUnique({ where: { id: user.id } });
  if (!me) redirect("/");

  const completeness = profileCompleteness(me);
  const missing = COMPLETENESS_FIELDS.filter(({ key }) => {
    const value = (me as unknown as Record<string, unknown>)[key];
    return value == null || (typeof value === "string" && value.trim() === "");
  });

  return (
    <div className="mx-auto w-full max-w-6xl space-y-7">
      <header className="rounded-2xl border border-line bg-gradient-to-br from-white via-white to-blue-50/70 p-6 shadow-sm dark:border-navy-700 dark:from-navy-900 dark:via-navy-900 dark:to-indigo-950/40 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700 dark:text-blue-300">Account workspace</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Profile</h1>
        <p className="mt-2 text-sm text-ink-muted sm:text-base">
          Manage your details. {me.firstName} {me.lastName} · {me.email}
        </p>
      </header>

      {user.role === "STUDENT" && (
        <Card>
          <CardContent className="p-6 sm:p-7">
            <div className="mb-2 flex items-center justify-between gap-2 text-sm">
              <span id="completeness-label" className="font-medium">
                Profile completeness
              </span>
              <span>{completeness}%</span>
            </div>
            <svg
              role="progressbar"
              aria-labelledby="completeness-label"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={completeness}
              aria-valuetext={`${completeness}% complete`}
              className="h-2.5 w-full overflow-hidden rounded-full bg-line dark:bg-navy-800"
              viewBox="0 0 100 10"
              preserveAspectRatio="none"
            >
              <rect x="0" y="0" width={completeness} height="10" className="fill-brand-600" />
            </svg>
            {missing.length > 0 ? (
              <p className="mt-2 text-xs text-ink-muted">
                Still missing: {missing.map(({ label }) => label).join(", ")}. Complete these so counselors can
                process your applications faster.
              </p>
            ) : (
              <p className="mt-2 text-xs text-ink-muted">Everything is filled in. Keep your details up to date.</p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="p-6 pb-0 sm:p-7 sm:pb-0">
          <CardTitle className="text-xl">Your information</CardTitle>
          <p className="mt-1 text-sm text-ink-muted">Keep these details current so your applications and account records stay accurate.</p>
        </CardHeader>
        <CardContent className="p-6 sm:p-7">
          <ProfileForm role={user.role} initial={fieldToInput(me as unknown as Record<string, unknown>)} />
        </CardContent>
      </Card>
    </div>
  );
}
