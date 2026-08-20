-- DropForeignKey
ALTER TABLE "AgencyPermission" DROP CONSTRAINT "AgencyPermission_grantorId_fkey";

-- DropForeignKey
ALTER TABLE "AgencyPermission" DROP CONSTRAINT "AgencyPermission_receiverId_fkey";

-- DropForeignKey
ALTER TABLE "Application" DROP CONSTRAINT "Application_programId_fkey";

-- DropForeignKey
ALTER TABLE "Application" DROP CONSTRAINT "Application_studentId_fkey";

-- DropForeignKey
ALTER TABLE "Document" DROP CONSTRAINT "Document_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "InviteLink" DROP CONSTRAINT "InviteLink_createdById_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_recipientId_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_senderId_fkey";

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_userId_fkey";

-- DropForeignKey
ALTER TABLE "Program" DROP CONSTRAINT "Program_universityId_fkey";

-- DropForeignKey
ALTER TABLE "ProgramView" DROP CONSTRAINT "ProgramView_programId_fkey";

-- DropForeignKey
ALTER TABLE "ProgramView" DROP CONSTRAINT "ProgramView_studentId_fkey";

-- DropForeignKey
ALTER TABLE "ShortCourseEnrollment" DROP CONSTRAINT "ShortCourseEnrollment_shortCourseId_fkey";

-- DropForeignKey
ALTER TABLE "ShortCourseEnrollment" DROP CONSTRAINT "ShortCourseEnrollment_studentId_fkey";

-- DropForeignKey
ALTER TABLE "Shortlist" DROP CONSTRAINT "Shortlist_studentId_fkey";

-- DropForeignKey
ALTER TABLE "ShortlistItem" DROP CONSTRAINT "ShortlistItem_programId_fkey";

-- DropForeignKey
ALTER TABLE "ShortlistItem" DROP CONSTRAINT "ShortlistItem_shortlistId_fkey";

-- DropForeignKey
ALTER TABLE "ShortlistView" DROP CONSTRAINT "ShortlistView_shortlistId_fkey";

-- DropForeignKey
ALTER TABLE "ShortlistView" DROP CONSTRAINT "ShortlistView_studentId_fkey";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "verified";

-- AddForeignKey
ALTER TABLE "AgencyPermission" ADD CONSTRAINT "AgencyPermission_grantorId_fkey" FOREIGN KEY ("grantorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgencyPermission" ADD CONSTRAINT "AgencyPermission_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Program" ADD CONSTRAINT "Program_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shortlist" ADD CONSTRAINT "Shortlist_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShortlistItem" ADD CONSTRAINT "ShortlistItem_shortlistId_fkey" FOREIGN KEY ("shortlistId") REFERENCES "Shortlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShortlistItem" ADD CONSTRAINT "ShortlistItem_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShortlistView" ADD CONSTRAINT "ShortlistView_shortlistId_fkey" FOREIGN KEY ("shortlistId") REFERENCES "Shortlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShortlistView" ADD CONSTRAINT "ShortlistView_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramView" ADD CONSTRAINT "ProgramView_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramView" ADD CONSTRAINT "ProgramView_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShortCourseEnrollment" ADD CONSTRAINT "ShortCourseEnrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShortCourseEnrollment" ADD CONSTRAINT "ShortCourseEnrollment_shortCourseId_fkey" FOREIGN KEY ("shortCourseId") REFERENCES "ShortCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InviteLink" ADD CONSTRAINT "InviteLink_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;