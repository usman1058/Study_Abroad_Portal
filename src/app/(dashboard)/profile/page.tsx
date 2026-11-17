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
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="text-sm text-ink-muted">
          Manage your details. {me.firstName} {me.lastName} · {me.email}
        </p>
      </div>

      {user.role === "STUDENT" && (
        <Card>
          <CardContent className="p-5">
            <div className="mb-2 flex items-center justify-between gap-2 text-sm">
              <span id="completeness-label" className="font-medium">
                Profile completeness
              </span>
              <span>{completeness}%</span>
            </div>
            <div
              role="progressbar"
              aria-labelledby="completeness-label"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={completeness}
              aria-valuetext={`${completeness}% complete`}
              className="h-2.5 w-full overflow-hidden rounded-full bg-line dark:bg-navy-800"
            >
              <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${completeness}%` }} />
            </div>
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
        <CardHeader>
          <CardTitle>Edit profile</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm role={user.role} initial={fieldToInput(me as unknown as Record<string, unknown>)} />
        </CardContent>
      </Card>
    </div>
  );
}
