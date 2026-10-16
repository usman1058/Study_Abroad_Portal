import { redirect } from "next/navigation";
import { DashboardAdRail } from "@/components/dashboard-ad-rail";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/session";

export const metadata = { title: "Advertisements" };

export default async function AdvertisementsPage() {
  const user = await currentUser();
  if (!user || user.role !== "SUPER_ADMIN") redirect("/home");

  const advertisements = await prisma.dashboardAdvertisement.findMany({
    select: {
      id: true,
      title: true,
      body: true,
      imageUrl: true,
      linkUrl: true,
      ctaLabel: true,
      active: true,
      sortOrder: true,
      startsAt: true,
      endsAt: true,
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Advertisement management</h1>
        <p className="mt-1 text-sm text-ink-muted dark:text-slate-400">
          Create and control the announcements, offers, and deadlines shown on partner dashboards.
        </p>
      </div>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Dashboard advertisements</CardTitle>
          <CardDescription>
            Use Manage ads to add, edit, schedule, activate, or remove dashboard advertisements.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DashboardAdRail id="advertisement-management" ads={advertisements} canManage variant="rail" />
        </CardContent>
      </Card>
    </div>
  );
}
