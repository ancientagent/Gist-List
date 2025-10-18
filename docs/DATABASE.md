# GISTer Database Documentation
**Living Document - Update when schema changes**

---

## 🗄️ Database Overview

**Type**: PostgreSQL  
**ORM**: Prisma  
**Schema Location**: `app/prisma/schema.prisma`  
**Connection**: Environment variable `DATABASE_URL`

---

## ⚠️ Critical Rules

1. **No Migrations**: This is a production database. Schema changes must be backward compatible.
2. **Additive Only**: Only add new fields or tables. Never drop columns/tables without explicit permission.
3. **Optional Fields**: New fields should be optional (`?`) to maintain compatibility.
4. **Test Locally**: Always test schema changes with `yarn prisma generate` before committing.

---

## 📊 Core Models

### User
Stores user account information, subscription details, and usage tracking.

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  password      String
  fullName      String?
  subscriptionTier String @default("FREE") // FREE, BASIC, PRO
  listingCount  Int       @default(0)
  premiumPostsUsed Int    @default(0)
  premiumPostsTotal Int   @default(4) // Free users get 4 premium posts
  stripeCustomerId String?
  
  // Saved Preferences (auto-fill for new listings)
  defaultFulfillmentType String? @default("shipping")
  defaultWillingToShip   Boolean @default(true)
  defaultOkForLocals     Boolean @default(false)
  defaultLocation        String?
  defaultMeetupPreference String?
  defaultWeight          Float?
  defaultDimensions      String?
  
  // Cost Tracking
  totalTokensUsed     Int     @default(0)
  totalStorageBytes   BigInt  @default(0)
  totalApiCost        Float   @default(0)
  totalStorageCost    Float   @default(0)
  
  conditionReportMode String  @default("all") // "all", "premium", or "off"
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  // Relations
  listings      Listing[]
  ebayCredential         EbayCredential?
  reverbCredential       ReverbCredential?
  etsyCredential         EtsyCredential?
  // ... other relations
}
```

**Key Fields**:
- `subscriptionTier`: Determines feature access (FREE, BASIC, PRO)
- `premiumPostsUsed/Total`: Tracks premium post credits for free users
- `default*`: Auto-fill values for new listings
- `totalApiCost`: Running cost total for transparency

---

### Listing
Core model for items to sell. Contains 35+ fields for item details, AI analysis, and market research.

```prisma
model Listing {
  id                String   @id @default(cuid())
  userId            String
  status            String   @default("DRAFT") // DRAFT, ACTIVE, POSTED, ARCHIVED
  
  // Core fields
  title             String?
  description       String?  @db.Text
  theGist           String?  @db.Text
  price             Float?
  condition         String?
  conditionNotes    String?  @db.Text
  
  // Cost Tracking
  tokensUsed        Int?
  storageBytes      Int?
  apiCost           Float?
  storageCost       Float?
  
  // Profit Estimation
  purchasePrice     Float?
  estimatedProfit   Float?
  profitMargin      Float?
  
  // Item Details
  brand             String?
  model             String?
  year              String?
  color             String?
  material          String?
  size              String?
  specs             String?  @db.Text
  
  // Image Quality
  imageQualityIssue String?  @db.Text
  
  // AI Analysis
  itemIdentified    Boolean  @default(false)
  confidence        Float?
  category          String?
  tags              String[]
  searchTags        String[] // SEO-optimized (up to 20)
  
  // Market Research
  priceRangeHigh    Float?   // Very Good condition
  priceRangeMid     Float?   // Good condition
  priceRangeLow     Float?   // Fair/Poor condition
  priceForParts     Float?   // For Parts condition
  brandNewPrice     Float?   // Resale price for brand new sealed
  bestPostTime      String?
  marketInsights    String?  @db.Text
  
  // Shipping & Local
  fulfillmentType   String?  @default("shipping")
  willingToShip     Boolean  @default(true)
  okForLocals       Boolean  @default(false)
  weight            Float?
  dimensions        String?
  shippingCostEst   Float?
  location          String?
  meetupPreference  String?
  
  // Standardized Location (for buyer search)
  locationCity      String?
  locationState     String?
  locationCountry   String   @default("US")
  locationZipCode   String?
  latitude          Float?
  longitude         Float?
  
  // Premium Features
  usePremium        Boolean  @default(false)
  premiumFacts      String?  @db.Text
  usefulLinks       String?  @db.Text
  
  // Verified Condition
  verifiedCondition      String?
  verifiedConditionScore String? @db.Text // JSON
  
  // Special Items
  isSpecialItem     Boolean  @default(false)
  specialItemReason String?
  specialItemCategory String?
  facets            String?  @db.Text // JSON
  priceUplifts      String?  @db.Text // JSON
  
  // Platform recommendations
  recommendedPlatforms String[]
  qualifiedPlatforms   String[]
  
  // Availability Tracking
  availableOnPlatforms String[] @default([])
  lastSeenOnPlatform   String?
  lastVerifiedAt       DateTime?
  
  // Popularity Metrics
  viewCount         Int      @default(0)
  favoriteCount     Int      @default(0)
  shareCount        Int      @default(0)
  
  // Search Optimization
  searchableText    String?  @db.Text
  categoryId        String?
  editedFields      String[]
  
  // Metadata
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  postedAt          DateTime?
  
  // API Platform IDs
  ebayListingId     String?
  reverbListingId   String?
  etsyListingId     String?
  
  // Relations
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  photos            Photo[]
  platformData      PlatformData[]
  notifications     AINotification[]
  searchIndex       SearchIndex?
  // ... other relations
}
```

**Key Fields**:
- `status`: Workflow state (DRAFT → ACTIVE → POSTED → ARCHIVED)
- `usePremium`: User opted for premium analysis
- `isSpecialItem`: Detected as vintage/collectible/luxury
- `searchTags`: AI-generated SEO tags (up to 20)
- Platform IDs: Populated after posting to marketplaces

---

### Photo
Image metadata (no raw image data stored long-term).

```prisma
model Photo {
  id                String   @id @default(cuid())
  listingId         String
  cloudStoragePath  String?  // Temporary S3 key (deleted after sold)
  cdnUrl            String?
  thumbnailUrl      String?  // Small thumbnail (kept for search)
  platformImageUrl  String?  // URL on marketplace (eBay, Mercari, etc.)
  order             Int      @default(0)
  isPrimary         Boolean  @default(false)
  
  // Image metadata
  width             Int?
  height            Int?
  aspectRatio       String?
  originalSizeBytes Int?
  compressedSizeBytes Int?
  processedAt       DateTime?
  deletedFromS3At   DateTime? // When removed from S3
  
  createdAt         DateTime @default(now())
  
  listing           Listing  @relation(fields: [listingId], references: [id], onDelete: Cascade)
}
```

**Storage Strategy**:
1. Upload to S3 → AI analysis → delete/compress
2. Keep thumbnail for search
3. Store marketplace URL after posting
4. Result: Minimal storage cost

---

### AINotification
Smart chips/alerts for users. Context-aware notifications.

```prisma
model AINotification {
  id          String   @id @default(cuid())
  listingId   String
  type        String   // "ALERT", "QUESTION", "INSIGHT"
  message     String   @db.Text
  field       String?  // Related field (for jumps)
  actionType  String?  // "retake_photo", "add_photo", "inoperable_check", etc.
  actionData  String?  @db.Text // JSON data
  resolved    Boolean  @default(false)
  createdAt   DateTime @default(now())
  
  listing     Listing  @relation(fields: [listingId], references: [id], onDelete: Cascade)
}
```

**Chip Types**:
- **ALERT** (❗): Required fields, critical issues (red)
- **QUESTION** (❓): Actionable insights (blue)
- **INSIGHT** (💡): Helpful information (purple)

---

## 🔌 Marketplace Integration Models

### EbayCredential
OAuth 2.0 tokens for eBay API.

```prisma
model EbayCredential {
  id           String   @id @default(cuid())
  userId       String   @unique
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  accessToken  String   @db.Text
  refreshToken String   @db.Text
  expiresAt    DateTime
  ebayUserId   String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

**Security**: Tokens stored in database (consider encryption at rest for production).

---

### EtsyCredential
OAuth 2.0 tokens for Etsy API.

```prisma
model EtsyCredential {
  id           String   @id @default(cuid())
  userId       String   @unique
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  accessToken  String   @db.Text
  refreshToken String   @db.Text
  expiresAt    DateTime
  etsyUserId   String
  etsyShopId   String
  shopName     String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

**Multi-Shop Support**: User can connect multiple Etsy shops (future enhancement).

---

### ReverbCredential
API key for Reverb API.

```prisma
model ReverbCredential {
  id        String   @id @default(cuid())
  userId    String   @unique
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  apiToken  String   @db.Text
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

---

### PlatformData
Platform-specific listing data (stored as JSON).

```prisma
model PlatformData {
  id                String   @id @default(cuid())
  listingId         String
  platform          String   // "ebay", "mercari", etc.
  customFields      String   @db.Text // JSON string
  exported          Boolean  @default(false)
  exportedAt        DateTime?
  posted            Boolean  @default(false)
  postedAt          DateTime?
  platformListingId String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  listing           Listing  @relation(fields: [listingId], references: [id], onDelete: Cascade)
  
  @@unique([listingId, platform])
}
```

---

## 📅 Scheduling Models

### ScheduledPost
Timed posting queue for marketplaces.

```prisma
model ScheduledPost {
  id            String   @id @default(cuid())
  userId        String
  listingId     String
  platforms     String[] // Array of platform names
  scheduledTime DateTime
  useAITime     Boolean  @default(false)
  status        String   @default("PENDING") // PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED
  errorMessage  String?  @db.Text
  completedAt   DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  listing       Listing  @relation(fields: [listingId], references: [id], onDelete: Cascade)
  
  @@index([userId, status])
  @@index([scheduledTime, status])
}
```

**Background Job**: Cron job checks for scheduled posts and triggers posting.

---

## 🔍 Buyer Search Models

### SearchIndex
Denormalized search data with facet-based quality grading.

```prisma
model SearchIndex {
  id              String   @id @default(cuid())
  listingId       String   @unique
  
  // Denormalized search data
  title           String
  searchableText  String           @db.Text
  category        String
  subcategory     String?
  condition       String
  priceMin        Float?
  priceMax        Float?
  location        String?
  geoHash         String?
  
  // Facet-based Quality System
  facets          Json?            // Full facet payload
  highlightedFacets String[] @default([])
  gradeSignals    Json?            // Grade metadata
  gradeScore      Float    @default(0)   // 0-1 composite score
  
  // Ranking Scores
  popularityScore Float   @default(0)
  relevanceScore  Float   @default(0)
  
  lastIndexedAt   DateTime @default(now())
  
  listing         Listing  @relation(fields: [listingId], references: [id], onDelete: Cascade)
  
  @@index([category, priceMin, priceMax])
  @@index([location])
  @@index([gradeScore])
}
```

**Quality Grading**:
- Facets: authentication, condition, rarity, provenance, completeness
- Grade score: 0-1 composite from seller-selected facets
- Higher score = better search ranking

---

### ItemCategory
Category taxonomy for search.

```prisma
model ItemCategory {
  id          String   @id @default(cuid())
  name        String   @unique
  slug        String   @unique
  parentId    String?
  level       Int      @default(0)
  facets      String[] // Searchable facets
  
  parent      ItemCategory?  @relation("CategoryHierarchy", fields: [parentId], references: [id])
  children    ItemCategory[] @relation("CategoryHierarchy")
  listings    Listing[]
  
  @@index([slug])
  @@index([parentId])
}
```

---

## 💰 Payment & Subscription Models

### Subscription
Stripe subscription management.

```prisma
model Subscription {
  id                String   @id @default(cuid())
  userId            String
  stripeSubscriptionId String @unique
  stripePriceId     String
  status            String   // active, canceled, past_due
  currentPeriodEnd  DateTime
  cancelAtPeriodEnd Boolean  @default(false)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

---

## 📊 Analytics & Tracking Models

### ApiUsage
Track API usage for rate limiting and billing.

```prisma
model ApiUsage {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  platform   String   // "ebay", "reverb", "openai"
  action     String   // "listing_create", "market_research", etc.
  month      String   // "2025-10"
  count      Int      @default(0)
  cost       Float?   @default(0)
  updatedAt  DateTime @updatedAt
  
  @@unique([userId, platform, action, month])
  @@index([userId, month])
}
```

---

### MarketResearch
Cached market research data.

```prisma
model MarketResearch {
  id                String   @id @default(cuid())
  listingId         String   @unique
  listing           Listing  @relation(fields: [listingId], references: [id], onDelete: Cascade)
  
  // Price Intelligence
  averagePrice      Float?
  medianPrice       Float?
  lowPrice          Float?
  highPrice         Float?
  competitorCount   Int      @default(0)
  pricePercentile   Float?
  
  // Trending Data
  trendingScore     Float?
  trendingKeywords  String[]
  
  // Timing Intelligence
  bestDayToList     String?
  bestTimeToList    String?
  avgSaleSpeed      Float?
  
  // Seasonal Patterns
  seasonalTrend     String?
  peakSeason        String?
  platform          String   @default("ebay")
  dataFetchedAt     DateTime @default(now())
  
  @@index([dataFetchedAt])
}
```

**Cache Strategy**: Refresh data if older than 7 days.

---

## 🔔 Notification Models

### PushSubscription
PWA push notification subscriptions.

```prisma
model PushSubscription {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  endpoint  String   @unique
  keys      Json     // {p256dh, auth}
  deviceInfo String?
  createdAt DateTime @default(now())
}
```

---

### NotificationPreference
User notification settings.

```prisma
model NotificationPreference {
  id            String   @id @default(cuid())
  userId        String   @unique
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  pushEnabled   Boolean  @default(true)
  emailEnabled  Boolean  @default(true)
  smsEnabled    Boolean  @default(false) // Premium only
  phoneNumber   String?
  
  notifyOnReady    Boolean @default(true)
  notifyOnPosted   Boolean @default(true)
  notifyOnTrending Boolean @default(true)
  notifyOnPriceDrop Boolean @default(false)
  
  updatedAt     DateTime @updatedAt
}
```

---

## 🧩 User Customization Models

### UserChip
User's saved quick-add chips.

```prisma
model UserChip {
  id          String   @id @default(cuid())
  userId      String
  category    String   // "missing", "comes_with", "condition_details"
  text        String
  itemCategory String? // Item category relevance
  useCount    Int      @default(1)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([userId, category, text, itemCategory])
  @@index([userId, category, itemCategory])
}
```

---

## 🔗 Indexes & Performance

### Key Indexes:
- `User.email` - Unique index for auth
- `Listing.userId + status` - User's listings by status
- `SearchIndex.category + priceMin + priceMax` - Faceted search
- `ScheduledPost.scheduledTime + status` - Background jobs
- `ApiUsage.userId + month` - Usage tracking

### Query Optimization:
- Select only needed fields
- Use `include` for relations sparingly
- Paginate large result sets
- Cache expensive queries (MarketResearch)

---

## 🔐 Data Security

### Sensitive Fields:
- `User.password` - Hashed with bcryptjs (12 rounds)
- `*Credential.accessToken/refreshToken` - Should be encrypted at rest
- `User.stripeCustomerId` - PII, handle with care

### Data Retention:
- `Photo.cloudStoragePath` - Deleted after item sold or 90 days
- `Photo.thumbnailUrl` - Kept for search history
- `MarketResearch` - Cached for 7 days, then refreshed

---

## 🚀 Schema Evolution

### Adding New Fields:
```typescript
// ✅ SAFE - Optional field
model Listing {
  newField String? // Backward compatible
}

// ❌ UNSAFE - Required field
model Listing {
  newField String // Breaks existing data
}
```

### Adding New Tables:
```typescript
// ✅ SAFE - New table
model NewFeature {
  id String @id @default(cuid())
  userId String
  // ...
}
```

### After Schema Changes:
```bash
cd app
yarn prisma generate  # Regenerate Prisma client
# No migration - production DB!
```

---

## 📝 Common Queries

### Get user listings with photos:
```typescript
const listings = await prisma.listing.findMany({
  where: { userId: session.user.id },
  include: {
    photos: {
      orderBy: { order: 'asc' }
    }
  },
  orderBy: { createdAt: 'desc' }
})
```

### Check premium posts remaining:
```typescript
const user = await prisma.user.findUnique({
  where: { id: userId },
  select: {
    premiumPostsUsed: true,
    premiumPostsTotal: true,
    subscriptionTier: true
  }
})

const remaining = user.subscriptionTier === 'FREE' 
  ? user.premiumPostsTotal - user.premiumPostsUsed
  : Infinity
```

### Get marketplace connections:
```typescript
const user = await prisma.user.findUnique({
  where: { id: userId },
  include: {
    ebayCredential: true,
    etsyCredential: true,
    reverbCredential: true
  }
})

const connected = {
  ebay: !!user.ebayCredential,
  etsy: !!user.etsyCredential,
  reverb: !!user.reverbCredential
}
```

---

**Last Updated**: 2025-10-14  
**Maintained By**: All agents and developers
**Schema Version**: See `app/prisma/schema.prisma`

---

## 🤖 Agent Automation Models

### AgentDevice

Registered local machines that can execute automation jobs for a user. Updated whenever the device requests a token.

```prisma
model AgentDevice {
  id           String   @id @default(cuid())
  userId       String
  os           String
  name         String
  lastSeenAt   DateTime?
  healthySites String[] @default([])
  jsonPolicy   Json?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  user     User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  sessions AgentSession[]
}
```

- `healthySites`: cached allow-listed domains verified during health checks.
- `jsonPolicy`: optional snapshot of the effective policy blob delivered to the device.
- `lastSeenAt`: refreshed on every `/api/agent/start` or `/api/agent/run` invocation.

### AgentSession

Minted automation sessions tied to a device. Stores JWT metadata, consent state, and the remote agent session identifier used for SSE proxying.

```prisma
model AgentSession {
  id              String   @id @default(cuid())
  userId          String
  deviceId        String
  token           String   @unique
  agentSessionId  String?  @unique
  domain          String
  actions         String[]
  consentState    String   @default("pending")
  expiresAt       DateTime
  createdAt       DateTime @default(now())

  user   User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  device AgentDevice @relation(fields: [deviceId], references: [id], onDelete: Cascade)
}
```

- `token`: Single-use JWS shared with the localhost agent.
- `agentSessionId`: Identifier returned by the Electron runtime; required to proxy `/v1/events/stream`.
- `consentState`: `pending`, `allowed`, or `denied`, updated by the backend as automation progresses.
- `expiresAt`: Mirrors the JWT TTL (≤120 s) to simplify cleanup jobs.
