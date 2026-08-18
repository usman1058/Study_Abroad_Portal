-- AlterTable
ALTER TABLE "Program" ADD COLUMN "slug" TEXT;

-- AlterTable
ALTER TABLE "ShortCourse" ADD COLUMN "classSchedule" TEXT,
ADD COLUMN "meetingLink" TEXT;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN "method" TEXT,
ADD COLUMN "notes" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Program_slug_key" ON "Program"("slug");