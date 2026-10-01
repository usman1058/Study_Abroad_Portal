CREATE TABLE "DashboardAdvertisement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "imageUrl" TEXT,
    "linkUrl" TEXT,
    "ctaLabel" TEXT DEFAULT 'Learn more',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DashboardAdvertisement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DashboardAdvertisement_active_sortOrder_idx" ON "DashboardAdvertisement"("active", "sortOrder");
CREATE INDEX "DashboardAdvertisement_startsAt_endsAt_idx" ON "DashboardAdvertisement"("startsAt", "endsAt");
ALTER TABLE "DashboardAdvertisement" ADD CONSTRAINT "DashboardAdvertisement_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
