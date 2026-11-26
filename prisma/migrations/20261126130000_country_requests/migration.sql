CREATE TYPE "CountryRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "CountryRequest" (
    "id" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "reason" TEXT,
    "status" "CountryRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requesterId" TEXT NOT NULL,
    "reviewedById" TEXT,
    "decisionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CountryRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CountryRequest_status_createdAt_idx" ON "CountryRequest"("status", "createdAt");
CREATE INDEX "CountryRequest_requesterId_status_idx" ON "CountryRequest"("requesterId", "status");

ALTER TABLE "CountryRequest" ADD CONSTRAINT "CountryRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CountryRequest" ADD CONSTRAINT "CountryRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
