import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { ChangePasswordForm } from "@/components/change-password-form";
import { LanguageSwitcher } from "@/components/language-switcher";
import { CurrencySwitcher } from "@/components/currency";
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
        <p className="text-sm text-ink-muted">Account preferences and security.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <p className="mb-1.5 text-sm font-medium">Language</p>
            <div className="max-w-xs">
              <LanguageSwitcher />
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-sm font-medium">Preferred currency</p>
            <CurrencySwitcher defaultCurrency={me?.preferredCurrency ?? "MYR"} />
          </div>
        </CardContent>
      </Card>

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
          <div className="flex justify-between"><span className="text-ink-muted">Email</span><span>{me?.email}</span></div>
          <div className="flex justify-between"><span className="text-ink-muted">Status</span><span>{me?.status}</span></div>
          {me?.companyName && <div className="flex justify-between"><span className="text-ink-muted">Company</span><span>{me.companyName}</span></div>}
          {me?.licenseNumber && <div className="flex justify-between"><span className="text-ink-muted">License</span><span>{me.licenseNumber}</span></div>}
        </CardContent>
      </Card>
    </div>
  );
}