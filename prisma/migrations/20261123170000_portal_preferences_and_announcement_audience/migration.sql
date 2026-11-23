ALTER TABLE "DashboardAdvertisement"
ADD COLUMN "targetRoles" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE TABLE "PortalSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PortalSetting_pkey" PRIMARY KEY ("key")
);
