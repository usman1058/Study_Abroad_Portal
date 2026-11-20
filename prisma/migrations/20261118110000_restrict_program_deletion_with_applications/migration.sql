ALTER TABLE "Application" DROP CONSTRAINT "Application_programId_fkey";

ALTER TABLE "Application"
ADD CONSTRAINT "Application_programId_fkey"
FOREIGN KEY ("programId") REFERENCES "Program"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
