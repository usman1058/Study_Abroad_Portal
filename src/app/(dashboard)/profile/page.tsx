import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { profileCompleteness } from "@/lib/queries";
import { ProfileForm } from "@/components/profile-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Profile" };

function fieldToInput(u: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(u).map(([k, v]) => {
      if (v instanceof Date) return [k, v.toISOString().slice(0, 10)];
      return [k, v == null ? "" : String(v)];
    })
  );
}

export default async function ProfilePage() {
  const user = await currentUser();
  if (!user) redirect("/");

  const me = await prisma.user.findUnique({ where: { id: user.id } });
  if (!me) redirect("/");

  const completeness = profileCompleteness(me);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="text-sm text-slate-500">Manage your details. {me.firstName} {me.lastName} · {me.email}</p>
      </div>

      {user.role === "STUDENT" && (
        <Card>
          <CardContent className="p-5">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium">Profile completeness</span>
              <span>{completeness}%</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${completeness}%` }} />
            </div>
            {completeness < 100 && (
              <p className="mt-2 text-xs text-slate-500">
                Complete your profile so our counselors can process your applications faster.
              </p>
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