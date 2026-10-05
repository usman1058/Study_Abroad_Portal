ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_parentAgencyId_fkey";
DROP INDEX IF EXISTS "User_parentAgencyId_idx";
ALTER TABLE "User" DROP COLUMN IF EXISTS "parentAgencyId";
DROP TABLE IF EXISTS "AgencyPermission";