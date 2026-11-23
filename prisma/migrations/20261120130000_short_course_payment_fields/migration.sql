ALTER TABLE "ShortCourse"
  ADD COLUMN "paymentType" TEXT NOT NULL DEFAULT 'FREE',
  ADD COLUMN "bankDetails" TEXT;

ALTER TABLE "ShortCourseEnrollment"
  ADD COLUMN "receiptUrl" TEXT,
  ADD COLUMN "approvedAt" TIMESTAMP(3),
  ADD COLUMN "approvedById" TEXT;

ALTER TABLE "ShortCourseEnrollment"
  ADD CONSTRAINT "ShortCourseEnrollment_approvedById_fkey"
  FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
