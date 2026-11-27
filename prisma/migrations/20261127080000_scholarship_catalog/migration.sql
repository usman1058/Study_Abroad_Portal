CREATE TYPE "ScholarshipAwardType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT', 'FULL_TUITION', 'OTHER');
CREATE TYPE "ScholarshipCategory" AS ENUM ('MERIT', 'NEED_BASED', 'COUNTRY_SPECIFIC', 'UNIVERSITY_SPECIFIC', 'PROGRAM_SPECIFIC', 'OTHER');

CREATE TABLE "Scholarship" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "providerName" TEXT,
    "description" TEXT NOT NULL,
    "category" "ScholarshipCategory" NOT NULL DEFAULT 'OTHER',
    "awardType" "ScholarshipAwardType" NOT NULL DEFAULT 'OTHER',
    "awardValue" DECIMAL(12,2),
    "awardCurrency" TEXT NOT NULL DEFAULT 'MYR',
    "eligibleCountries" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "studyLevels" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "subject" TEXT,
    "eligibilityCriteria" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "deadline" TIMESTAMP(3),
    "applicationUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Scholarship_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ScholarshipUniversity" (
    "scholarshipId" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    CONSTRAINT "ScholarshipUniversity_pkey" PRIMARY KEY ("scholarshipId", "universityId")
);

CREATE TABLE "ScholarshipProgram" (
    "scholarshipId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    CONSTRAINT "ScholarshipProgram_pkey" PRIMARY KEY ("scholarshipId", "programId")
);

CREATE UNIQUE INDEX "Scholarship_slug_key" ON "Scholarship"("slug");
CREATE INDEX "Scholarship_isActive_deadline_idx" ON "Scholarship"("isActive", "deadline");
CREATE INDEX "Scholarship_category_idx" ON "Scholarship"("category");
CREATE INDEX "Scholarship_subject_idx" ON "Scholarship"("subject");
CREATE INDEX "ScholarshipUniversity_universityId_idx" ON "ScholarshipUniversity"("universityId");
CREATE INDEX "ScholarshipProgram_programId_idx" ON "ScholarshipProgram"("programId");

ALTER TABLE "ScholarshipUniversity" ADD CONSTRAINT "ScholarshipUniversity_scholarshipId_fkey" FOREIGN KEY ("scholarshipId") REFERENCES "Scholarship"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScholarshipUniversity" ADD CONSTRAINT "ScholarshipUniversity_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScholarshipProgram" ADD CONSTRAINT "ScholarshipProgram_scholarshipId_fkey" FOREIGN KEY ("scholarshipId") REFERENCES "Scholarship"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScholarshipProgram" ADD CONSTRAINT "ScholarshipProgram_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;
