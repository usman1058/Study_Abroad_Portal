ALTER TABLE "User" ADD COLUMN "parentAgencyId" TEXT;

CREATE TABLE "AgencyPermission" (
    "id" TEXT NOT NULL,
    "grantorId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "canViewCommission" BOOLEAN NOT NULL DEFAULT false,
    "canViewFullChain" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "AgencyPermission_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "User_parentAgencyId_idx" ON "User"("parentAgencyId");
CREATE UNIQUE INDEX "AgencyPermission_grantorId_receiverId_key" ON "AgencyPermission"("grantorId", "receiverId");
CREATE INDEX "AgencyPermission_receiverId_idx" ON "AgencyPermission"("receiverId");

ALTER TABLE "User" ADD CONSTRAINT "User_parentAgencyId_fkey"
FOREIGN KEY ("parentAgencyId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AgencyPermission" ADD CONSTRAINT "AgencyPermission_grantorId_fkey"
FOREIGN KEY ("grantorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AgencyPermission" ADD CONSTRAINT "AgencyPermission_receiverId_fkey"
FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
