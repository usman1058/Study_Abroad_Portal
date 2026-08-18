import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { ChangePasswordForm } from "@/components/change-password-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await currentUser();
  if (!user) redirect("/");

  const me = await prisma.user.findUnique({ where: { id: user.id } });

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-slate-500">Account preferences and security.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-slate-500">Email</span><span>{me?.email}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Status</span><span>{me?.status}</span></div>
          {me?.companyName && <div className="flex justify-between"><span className="text-slate-500">Company</span><span>{me.companyName}</span></div>}
          {me?.licenseNumber && <div className="flex justify-between"><span className="text-slate-500">License</span><span>{me.licenseNumber}</span></div>}
        </CardContent>
      </Card>
    </div>
  );
}