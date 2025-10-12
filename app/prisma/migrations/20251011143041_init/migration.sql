-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "fullName" TEXT,
    "subscriptionTier" TEXT NOT NULL DEFAULT 'FREE',
    "listingCount" INTEGER NOT NULL DEFAULT 0,
    "premiumPostsUsed" INTEGER NOT NULL DEFAULT 0,
    "premiumPostsTotal" INTEGER NOT NULL DEFAULT 4,
    "stripeCustomerId" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "defaultFulfillmentType" TEXT DEFAULT 'shipping',
    "defaultWillingToShip" BOOLEAN NOT NULL DEFAULT true,
    "defaultOkForLocals" BOOLEAN NOT NULL DEFAULT false,
    "defaultLocation" TEXT,
    "defaultMeetupPreference" TEXT,
    "defaultWeight" DOUBLE PRECISION,
    "defaultDimensions" TEXT,
    "totalTokensUsed" INTEGER NOT NULL DEFAULT 0,
    "totalStorageBytes" BIGINT NOT NULL DEFAULT 0,
    "totalApiCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalStorageCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stripeSubscriptionId" TEXT NOT NULL,
    "stripePriceId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Listing" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "title" TEXT,
    "description" TEXT,
    "theGist" TEXT,
    "price" DOUBLE PRECISION,
    "condition" TEXT,
    "conditionNotes" TEXT,
    "tokensUsed" INTEGER,
    "storageBytes" INTEGER,
    "apiCost" DOUBLE PRECISION,
    "storageCost" DOUBLE PRECISION,
    "purchasePrice" DOUBLE PRECISION,
    "estimatedProfit" DOUBLE PRECISION,
    "profitMargin" DOUBLE PRECISION,
    "brand" TEXT,
    "model" TEXT,
    "year" TEXT,
    "color" TEXT,
    "material" TEXT,
    "size" TEXT,
    "specs" TEXT,
    "imageQualityIssue" TEXT,
    "itemIdentified" BOOLEAN NOT NULL DEFAULT false,
    "confidence" DOUBLE PRECISION,
    "category" TEXT,
    "tags" TEXT[],
    "searchTags" TEXT[],
    "alternativeItems" TEXT,
    "avgMarketPrice" DOUBLE PRECISION,
    "suggestedPriceMin" DOUBLE PRECISION,
    "suggestedPriceMax" DOUBLE PRECISION,
    "brandNewPrice" DOUBLE PRECISION,
    "priceRangeHigh" DOUBLE PRECISION,
    "priceRangeMid" DOUBLE PRECISION,
    "priceRangeLow" DOUBLE PRECISION,
    "priceForParts" DOUBLE PRECISION,
    "bestPostTime" TEXT,
    "marketInsights" TEXT,
    "fulfillmentType" TEXT DEFAULT 'shipping',
    "willingToShip" BOOLEAN NOT NULL DEFAULT true,
    "okForLocals" BOOLEAN NOT NULL DEFAULT false,
    "weight" DOUBLE PRECISION,
    "dimensions" TEXT,
    "shippingCostEst" DOUBLE PRECISION,
    "location" TEXT,
    "meetupPreference" TEXT,
    "usePremium" BOOLEAN NOT NULL DEFAULT false,
    "premiumFacts" TEXT,
    "usefulLinks" TEXT,
    "recommendedPlatforms" TEXT[],
    "qualifiedPlatforms" TEXT[],
    "editedFields" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "postedAt" TIMESTAMP(3),

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Photo" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "cloudStoragePath" TEXT NOT NULL,
    "cdnUrl" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "originalSizeBytes" INTEGER,
    "compressedSizeBytes" INTEGER,
    "requirement" TEXT,
    "facetTag" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notificationId" TEXT,
    "verificationReason" TEXT,
    "analysisData" JSONB,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Photo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformData" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "customFields" TEXT NOT NULL,
    "exported" BOOLEAN NOT NULL DEFAULT false,
    "exportedAt" TIMESTAMP(3),
    "posted" BOOLEAN NOT NULL DEFAULT false,
    "postedAt" TIMESTAMP(3),
    "platformListingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AINotification" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "field" TEXT,
    "actionType" TEXT,
    "actionData" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AINotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserChip" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "itemCategory" TEXT,
    "useCount" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserChip_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeSubscriptionId_key" ON "Subscription"("stripeSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformData_listingId_platform_key" ON "PlatformData"("listingId", "platform");

-- CreateIndex
CREATE INDEX "UserChip_userId_category_itemCategory_idx" ON "UserChip"("userId", "category", "itemCategory");

-- CreateIndex
CREATE UNIQUE INDEX "UserChip_userId_category_text_itemCategory_key" ON "UserChip"("userId", "category", "text", "itemCategory");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformData" ADD CONSTRAINT "PlatformData_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AINotification" ADD CONSTRAINT "AINotification_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserChip" ADD CONSTRAINT "UserChip_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
