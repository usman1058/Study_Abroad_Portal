import { redirect } from "next/navigation";
import { AdvertisementsClient } from "@/components/advertisements-client";
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
        <p className="mt-1 text-sm text-ink-muted">
          Create and control the announcements, offers, and deadlines shown on partner dashboards.
        </p>
      </div>
      <AdvertisementsClient initialAds={advertisements} />
    </div>
  );
}
