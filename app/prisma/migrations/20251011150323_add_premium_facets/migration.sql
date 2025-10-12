-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "facets" JSONB,
ADD COLUMN     "priceUplifts" JSONB,
ADD COLUMN     "specialClass" VARCHAR(50);
