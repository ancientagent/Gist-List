-- Alter Listing to store seller-selected showcased facets
ALTER TABLE "Listing"
ADD COLUMN "highlightedFacets" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Create SearchIndex table for denormalized buyer search data
CREATE TABLE "SearchIndex" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "searchableText" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subcategory" TEXT,
    "condition" TEXT NOT NULL,
    "priceMin" DOUBLE PRECISION,
    "priceMax" DOUBLE PRECISION,
    "location" TEXT,
    "geoHash" TEXT,
    "facets" JSONB,
    "highlightedFacets" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "gradeSignals" JSONB,
    "gradeScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "popularityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "relevanceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastIndexedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SearchIndex_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SearchIndex_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "SearchIndex_listingId_key" ON "SearchIndex"("listingId");
CREATE INDEX "SearchIndex_category_priceMin_priceMax_idx" ON "SearchIndex"("category", "priceMin", "priceMax");
CREATE INDEX "SearchIndex_location_idx" ON "SearchIndex"("location");
CREATE INDEX "SearchIndex_geoHash_idx" ON "SearchIndex"("geoHash");
CREATE INDEX "SearchIndex_gradeScore_idx" ON "SearchIndex"("gradeScore");
