ALTER TABLE "ShortCourse" ALTER COLUMN "status" SET DEFAULT 'draft';

CREATE TABLE "ShortCourseSession" (
  "id" TEXT NOT NULL,
  "shortCourseId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "timeZone" TEXT NOT NULL DEFAULT 'Asia/Kuala_Lumpur',
  "meetingLink" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ShortCourseSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ShortCourseMaterial" (
  "id" TEXT NOT NULL,
  "shortCourseId" TEXT NOT NULL,
  "uploadedById" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "fileName" TEXT NOT NULL,
  "contentType" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "objectRef" TEXT NOT NULL,
  "published" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ShortCourseMaterial_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ShortCourseSession_shortCourseId_startsAt_idx"
  ON "ShortCourseSession"("shortCourseId", "startsAt");
CREATE INDEX "ShortCourseMaterial_shortCourseId_published_createdAt_idx"
  ON "ShortCourseMaterial"("shortCourseId", "published", "createdAt");

ALTER TABLE "ShortCourseSession"
  ADD CONSTRAINT "ShortCourseSession_shortCourseId_fkey"
  FOREIGN KEY ("shortCourseId") REFERENCES "ShortCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShortCourseMaterial"
  ADD CONSTRAINT "ShortCourseMaterial_shortCourseId_fkey"
  FOREIGN KEY ("shortCourseId") REFERENCES "ShortCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShortCourseMaterial"
  ADD CONSTRAINT "ShortCourseMaterial_uploadedById_fkey"
  FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
