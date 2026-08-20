/*
  Warnings:

  - The `status` column on the `VisitorLead` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `type` on the `Document` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `category` on the `ShortCourse` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `type` on the `Transaction` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('SERVICE_FEE', 'COMMISSION_PAYOUT', 'DEPOSIT', 'REFUND');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('PASSPORT', 'DIPLOMA', 'TRANSCRIPT', 'SOP', 'IELTS', 'FINANCIAL', 'RECOMMENDATION', 'OTHER');

-- CreateEnum
CREATE TYPE "ShortCourseCategory" AS ENUM ('LANGUAGE', 'TEST_PREP', 'FOUNDATION', 'PROFESSIONAL', 'OTHER');

-- CreateEnum
CREATE TYPE "VisitorLeadStatus" AS ENUM ('NEW', 'CONTACTED', 'CONVERTED', 'CLOSED');

-- AlterTable: Document.type - convert existing values to enum
ALTER TABLE "Document" 
  ALTER COLUMN "type" TYPE "DocumentType" 
  USING CASE 
    WHEN lower("type") = 'passport' THEN 'PASSPORT'::"DocumentType"
    WHEN lower("type") = 'diploma' THEN 'DIPLOMA'::"DocumentType"
    WHEN lower("type") = 'transcript' THEN 'TRANSCRIPT'::"DocumentType"
    WHEN lower("type") = 'sop' THEN 'SOP'::"DocumentType"
    WHEN lower("type") = 'ielts' THEN 'IELTS'::"DocumentType"
    WHEN lower("type") = 'financial' THEN 'FINANCIAL'::"DocumentType"
    WHEN lower("type") = 'recommendation' THEN 'RECOMMENDATION'::"DocumentType"
    ELSE 'OTHER'::"DocumentType"
  END;

-- AlterTable: ShortCourse.category - convert existing values to enum
ALTER TABLE "ShortCourse" 
  ALTER COLUMN "category" TYPE "ShortCourseCategory" 
  USING CASE 
    WHEN lower("category") = 'language' THEN 'LANGUAGE'::"ShortCourseCategory"
    WHEN lower("category") = 'test-prep' THEN 'TEST_PREP'::"ShortCourseCategory"
    WHEN lower("category") = 'foundation' THEN 'FOUNDATION'::"ShortCourseCategory"
    WHEN lower("category") = 'professional' THEN 'PROFESSIONAL'::"ShortCourseCategory"
    ELSE 'OTHER'::"ShortCourseCategory"
  END;

-- AlterTable: Transaction.type - convert existing values to enum
ALTER TABLE "Transaction" 
  ALTER COLUMN "type" TYPE "TransactionType" 
  USING CASE 
    WHEN lower("type") = 'service_fee' THEN 'SERVICE_FEE'::"TransactionType"
    WHEN lower("type") = 'commission_payout' THEN 'COMMISSION_PAYOUT'::"TransactionType"
    WHEN lower("type") = 'deposit' THEN 'DEPOSIT'::"TransactionType"
    WHEN lower("type") = 'refund' THEN 'REFUND'::"TransactionType"
    ELSE 'SERVICE_FEE'::"TransactionType"
  END;

-- AlterTable: VisitorLead.status - convert existing values to enum
-- First drop the default, then alter, then re-add default
ALTER TABLE "VisitorLead" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "VisitorLead" 
  ALTER COLUMN "status" TYPE "VisitorLeadStatus" 
  USING CASE 
    WHEN lower("status") = 'new' THEN 'NEW'::"VisitorLeadStatus"
    WHEN lower("status") = 'contacted' THEN 'CONTACTED'::"VisitorLeadStatus"
    WHEN lower("status") = 'converted' THEN 'CONVERTED'::"VisitorLeadStatus"
    WHEN lower("status") = 'closed' THEN 'CLOSED'::"VisitorLeadStatus"
    ELSE 'NEW'::"VisitorLeadStatus"
  END;
ALTER TABLE "VisitorLead" ALTER COLUMN "status" SET DEFAULT 'NEW'::"VisitorLeadStatus";