import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { sectionsForRole } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { detectPortalCurrency } from "@/lib/currency-location";
import { DashboardShell } from "@/components/dashboard-shell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) {
    redirect("/");
  }

  const sections = sectionsForRole(user.role);
  const [profile, requestHeaders] = await Promise.all([
    prisma.user.findUnique({ where: { id: user.id }, select: { preferredCurrency: true } }),
    headers(),
  ]);
  const savedCurrency = profile?.preferredCurrency ?? "MYR";
  const detectedCurrency = detectPortalCurrency(
    requestHeaders.get("x-vercel-ip-country") ?? requestHeaders.get("cf-ipcountry"),
    requestHeaders.get("accept-language"),
  );
  // A non-default saved value represents the user's explicit preference. MYR
  // is the legacy DB default, so use location detection until they choose one.
  const preferredCurrency = savedCurrency !== "MYR" ? savedCurrency : detectedCurrency ?? savedCurrency;

  return (
    <DashboardShell
        userEmail={user.email}
        sections={sections}
        role={user.role}
        userName={user.name}
        preferredCurrency={preferredCurrency}
        mustChangePassword={user.mustChangePassword}
      >
        {children}
      </DashboardShell>
  );
}
