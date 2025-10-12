-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "verifiedCondition" VARCHAR(50),
ADD COLUMN     "verifiedConditionScore" JSONB;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "conditionReportMode" TEXT NOT NULL DEFAULT 'all';
