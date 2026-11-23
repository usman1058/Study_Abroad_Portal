CREATE TYPE "PartnerDocumentType" AS ENUM (
    'BUSINESS_REGISTRATION',
    'BUSINESS_LICENSE',
    'TAX_REGISTRATION',
    'AUTHORIZATION_LETTER',
    'COMPANY_PROFILE',
    'OTHER'
);

CREATE TABLE "PartnerDocument" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "type" "PartnerDocumentType" NOT NULL,
    "originalName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING',
    "verifiedById" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PartnerDocument_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PartnerDocument_agencyId_status_idx" ON "PartnerDocument"("agencyId", "status");

ALTER TABLE "PartnerDocument"
    ADD CONSTRAINT "PartnerDocument_agencyId_fkey"
    FOREIGN KEY ("agencyId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PartnerDocument"
    ADD CONSTRAINT "PartnerDocument_verifiedById_fkey"
    FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
