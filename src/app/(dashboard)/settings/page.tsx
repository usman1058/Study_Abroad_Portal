import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { ChangePasswordForm } from "@/components/change-password-form";
import { CurrencySwitcher } from "@/components/currency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { humanize } from "@/lib/utils";
import { PortalSettingsForm, blankPortalSettings } from "@/components/portal-settings-form";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await currentUser();
  if (!user) redirect("/");

  const me = await prisma.user.findUnique({ where: { id: user.id } });
  const portalRows = user.role === "SUPER_ADMIN"
    ? await prisma.portalSetting.findMany({ where: { key: { in: ["paymentDetails", "whatsappNumber"] } } })
    : [];
  let portalSettings = { ...blankPortalSettings };
  const paymentSetting = portalRows.find((row) => row.key === "paymentDetails");
  if (paymentSetting) {
    try { portalSettings = { ...portalSettings, ...JSON.parse(paymentSetting.value) }; } catch { /* use empty settings */ }
  }
  portalSettings.whatsappNumber = portalRows.find((row) => row.key === "whatsappNumber")?.value ?? "";

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
            <p className="mb-1.5 text-sm font-medium">Preferred currency</p>
            <CurrencySwitcher defaultCurrency={me?.preferredCurrency ?? "MYR"} />
            <p className="mt-2 text-xs text-ink-muted">Converted prices are indicative display estimates. Course fees and payment instructions remain in MYR.</p>
          </div>
        </CardContent>
      </Card>

      {user.role === "SUPER_ADMIN" && <Card><CardHeader><CardTitle>Portal settings</CardTitle></CardHeader><CardContent><PortalSettingsForm initial={portalSettings} /></CardContent></Card>}

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
          <div className="flex justify-between"><span className="text-ink-muted">Status</span><span>{me?.status ? humanize(me.status) : "Unknown"}</span></div>
          {me?.companyName && <div className="flex justify-between"><span className="text-ink-muted">Company</span><span>{me.companyName}</span></div>}
          {me?.licenseNumber && <div className="flex justify-between"><span className="text-ink-muted">License</span><span>{me.licenseNumber}</span></div>}
        </CardContent>
      </Card>
    </div>
  );
}
