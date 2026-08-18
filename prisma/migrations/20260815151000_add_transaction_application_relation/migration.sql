-- AlterTable
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_relatedApplicationId_fkey" FOREIGN KEY ("relatedApplicationId") REFERENCES "Application"("id") ON DELETE SET NULL ON UPDATE CASCADE;