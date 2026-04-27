-- CreateEnum
CREATE TYPE "WorkSetup" AS ENUM ('REMOTE', 'HYBRID', 'ONSITE');

-- AlterTable
ALTER TABLE "JobApplication" ADD COLUMN     "salaryMin" INTEGER,
ADD COLUMN     "salaryMax" INTEGER,
ADD COLUMN     "salaryCurrency" TEXT,
ADD COLUMN     "workSetup" "WorkSetup",
ADD COLUMN     "locationAddress" TEXT,
ADD COLUMN     "companyWebsite" TEXT,
ADD COLUMN     "contactName" TEXT,
ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "contactPhone" TEXT;
