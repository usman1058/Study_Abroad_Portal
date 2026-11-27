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
    <div className="mx-auto w-full max-w-6xl space-y-7">
      <header className="rounded-2xl border border-line bg-gradient-to-br from-white via-white to-indigo-50/70 p-6 shadow-sm dark:border-navy-700 dark:from-navy-900 dark:via-navy-900 dark:to-blue-950/40 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700 dark:text-blue-300">Workspace controls</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Settings</h1>
        <p className="mt-2 text-sm text-ink-muted sm:text-base">Manage preferences, security, and the settings available to your role.</p>
      </header>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="h-full">
        <CardHeader className="p-6 pb-0 sm:p-7 sm:pb-0">
          <CardTitle className="text-xl">Preferences</CardTitle>
          <p className="mt-1 text-sm text-ink-muted">Choose how fees and payment amounts appear across the portal.</p>
        </CardHeader>
        <CardContent className="space-y-5 p-6 sm:p-7">
          <div>
            <p className="mb-2 text-sm font-semibold">Preferred currency</p>
            <CurrencySwitcher defaultCurrency={me?.preferredCurrency ?? "MYR"} />
            <p className="mt-2 text-xs text-ink-muted">Currency is detected from your region when available. Choose a currency here to override it; displayed fees and course-entry fields update throughout the portal. Stored program and course fees remain in MYR.</p>
          </div>
        </CardContent>
      </Card>

        <Card className="h-full">
          <CardHeader className="p-6 pb-0 sm:p-7 sm:pb-0">
            <CardTitle className="text-xl">Security</CardTitle>
            <p className="mt-1 text-sm text-ink-muted">Update your password to keep your account secure.</p>
          </CardHeader>
          <CardContent className="p-6 sm:p-7"><ChangePasswordForm /></CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader className="p-6 pb-0 sm:p-7 sm:pb-0">
            <CardTitle className="text-xl">Account</CardTitle>
            <p className="mt-1 text-sm text-ink-muted">Your account identity and organization details.</p>
          </CardHeader>
          <CardContent className="grid gap-4 p-6 text-sm sm:grid-cols-2 sm:p-7">
            <div className="rounded-xl bg-canvas p-4 dark:bg-navy-800"><p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Email</p><p className="mt-1 break-all font-semibold">{me?.email}</p></div>
            <div className="rounded-xl bg-canvas p-4 dark:bg-navy-800"><p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Status</p><p className="mt-1 font-semibold">{me?.status ? humanize(me.status) : "Unknown"}</p></div>
            {me?.companyName && <div className="rounded-xl bg-canvas p-4 dark:bg-navy-800"><p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Company</p><p className="mt-1 font-semibold">{me.companyName}</p></div>}
            {me?.licenseNumber && <div className="rounded-xl bg-canvas p-4 dark:bg-navy-800"><p className="text-xs font-medium uppercase tracking-wide text-ink-muted">License</p><p className="mt-1 font-semibold">{me.licenseNumber}</p></div>}
          </CardContent>
        </Card>
      </div>

      {user.role === "SUPER_ADMIN" && <Card>
        <CardHeader className="p-6 pb-0 sm:p-7 sm:pb-0">
          <CardTitle className="text-xl">Portal settings</CardTitle>
          <p className="mt-1 text-sm text-ink-muted">Configure payment details, contact options, and upload limits used throughout the portal.</p>
        </CardHeader>
        <CardContent className="p-6 sm:p-7"><PortalSettingsForm initial={portalSettings} /></CardContent>
      </Card>}

      {(user.role === "SUPER_ADMIN" || user.role === "MANAGER" || user.role === "COUNSELOR") && <Card id="country-requests">
        <CardHeader className="p-6 pb-0 sm:p-7 sm:pb-0">
          <CardTitle className="text-xl">{user.role === "SUPER_ADMIN" ? "Destination countries" : "Country requests"}</CardTitle>
          <p className="mt-1 text-sm text-ink-muted">{user.role === "SUPER_ADMIN" ? "Manage supported destinations and review requests from your team." : "Request a destination that is not currently available in the portal."}</p>
        </CardHeader>
        <CardContent className="space-y-7 p-6 sm:p-7">
          {user.role === "SUPER_ADMIN" && <WorkingCountriesForm initial={workingCountries} />}
          <div className={user.role === "SUPER_ADMIN" ? "border-t border-line pt-6 dark:border-navy-700" : ""}>
            {user.role === "SUPER_ADMIN" && <h3 className="mb-4 text-base font-semibold">Country requests</h3>}
            <CountryRequestsPanel role={user.role} />
          </div>
        </CardContent>
      </Card>}
    </div>
  );
}
