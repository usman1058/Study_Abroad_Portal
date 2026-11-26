import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { ChangePasswordForm } from "@/components/change-password-form";
import { CurrencySwitcher } from "@/components/currency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { humanize } from "@/lib/utils";
import { PortalSettingsForm, blankPortalSettings } from "@/components/portal-settings-form";
import { parseUploadSizeMB } from "@/lib/upload-limits";
import { getWorkingCountries } from "@/lib/working-countries";
import { WorkingCountriesForm } from "@/components/working-countries-form";
import { CountryRequestsPanel } from "@/components/country-requests-panel";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await currentUser();
  if (!user) redirect("/");

  const me = await prisma.user.findUnique({ where: { id: user.id } });
  const [portalRows, workingCountries] = await Promise.all([
    user.role === "SUPER_ADMIN"
      ? prisma.portalSetting.findMany({ where: { key: { in: ["paymentDetails", "whatsappNumber", "maxUploadSizeMB"] } } })
      : Promise.resolve([]),
    user.role === "SUPER_ADMIN" ? getWorkingCountries() : Promise.resolve([]),
  ]);
  let portalSettings = { ...blankPortalSettings };
  const paymentSetting = portalRows.find((row) => row.key === "paymentDetails");
  if (paymentSetting) {
    try { portalSettings = { ...portalSettings, ...JSON.parse(paymentSetting.value) }; } catch { /* use empty settings */ }
  }
  portalSettings.whatsappNumber = portalRows.find((row) => row.key === "whatsappNumber")?.value ?? "";
  portalSettings.maxUploadSizeMB = parseUploadSizeMB(portalRows.find((row) => row.key === "maxUploadSizeMB")?.value);

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
            <p className="mt-2 text-xs text-ink-muted">Currency is detected from your region when available. Choose a currency here to override it; displayed fees and course-entry fields update throughout the portal. Stored program and course fees remain in MYR.</p>
          </div>
        </CardContent>
      </Card>

      {user.role === "SUPER_ADMIN" && <Card><CardHeader><CardTitle>Portal settings</CardTitle></CardHeader><CardContent><PortalSettingsForm initial={portalSettings} /></CardContent></Card>}

      {(user.role === "SUPER_ADMIN" || user.role === "MANAGER" || user.role === "COUNSELOR") && <Card id="country-requests"><CardHeader><CardTitle>{user.role === "SUPER_ADMIN" ? "Working countries" : "Request a destination country"}</CardTitle></CardHeader><CardContent className="space-y-6">{user.role === "SUPER_ADMIN" && <WorkingCountriesForm initial={workingCountries} />}<div className="border-t border-line pt-5 dark:border-navy-700"><h3 className="mb-3 font-semibold">{user.role === "SUPER_ADMIN" ? "Country requests" : "Country requests"}</h3><CountryRequestsPanel role={user.role} /></div></CardContent></Card>}

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
