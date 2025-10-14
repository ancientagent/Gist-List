# GISTer Architecture
**Living Document - Update when system design changes**

---

## 🏗️ System Overview

GISTer is a full-stack Next.js application that uses AI to help resellers create and manage marketplace listings. The system follows a **metadata-only architecture** for images, storing only metadata and thumbnails long-term while temporarily hosting full images for AI analysis.

---

## 📐 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
│  ┌─────────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │  Web App (PWA)  │  │  Extension   │  │  Mobile (TBD)  │ │
│  │  Next.js + React│  │  Chrome Ext  │  │  React Native  │ │
│  └────────┬────────┘  └──────┬───────┘  └────────┬───────┘ │
└───────────┼───────────────────┼───────────────────┼─────────┘
            │                   │                   │
            └───────────────────┼───────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────┐
│                      Next.js App Router                      │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              API Routes (/app/api/*)                 │   │
│  │  ┌──────────┐ ┌─────────┐ ┌──────────┐ ┌──────────┐│   │
│  │  │Listings  │ │ Photos  │ │Marketplace│ │Extension ││   │
│  │  │  APIs    │ │  APIs   │ │   APIs    │ │  APIs    ││   │
│  │  └──────────┘ └─────────┘ └──────────┘ └──────────┘│   │
│  └────────────────────┬────────────────────────────────┘   │
│                       │                                      │
│  ┌────────────────────▼────────────────────────────────┐   │
│  │           Server Components (RSC)                    │   │
│  │  - Camera Page   - Listing Detail   - Connections   │   │
│  │  - Search Page   - Auth Pages       - Costs Page    │   │
│  └──────────────────────────────────────────────────────┘   │
└───────────────────────┬──────────────────────────────────────┘
                        │
     ┌──────────────────┼──────────────────┐
     │                  │                  │
┌────▼─────┐    ┌──────▼──────┐    ┌─────▼──────┐
│PostgreSQL│    │  AWS S3     │    │  External  │
│  Prisma  │    │  (Temp)     │    │    APIs    │
│   ORM    │    │  Storage    │    │            │
└──────────┘    └─────────────┘    │- OpenAI    │
                                    │- eBay      │
                                    │- Etsy      │
                                    │- Reverb    │
                                    │- Stripe    │
                                    └────────────┘
```

---

## 🧱 Core Components

### Frontend Layer

#### 1. Web App (Next.js 14 App Router)
- **Technology**: React 18, TypeScript, Tailwind CSS
- **Routing**: File-based routing with App Router
- **State Management**: React hooks + Zustand (minimal)
- **UI Library**: Shadcn UI (Radix UI primitives)
- **Forms**: React Hook Form + Zod validation

**Key Pages**:
- `/camera` - Photo capture interface
- `/listing/[id]` - Listing detail/edit page
- `/listings` - All listings overview
- `/connections` - Marketplace connections manager
- `/search` - Buyer search marketplace
- `/costs` - Cost tracking dashboard
- `/auth/signin` - Authentication

#### 2. Chrome Extension (GISTer v2.0.0)
- **Technology**: Vanilla JS, Chrome APIs
- **Purpose**: Semi-automated posting to platforms without APIs
- **Communication**: REST APIs to main app
- **Features**: Form filling, image upload, progress tracking

#### 3. Mobile App (Planned)
- **Technology**: React Native (future)
- **Purpose**: Native iOS/Android experience

---

### Backend Layer

#### 1. API Routes (`/app/api/*`)
**Pattern**: Next.js 14 route handlers

**Endpoint Categories**:
- **Listings**: CRUD operations for listings
  - `POST /api/listings/create` - Create new listing
  - `GET /api/listings` - Get all listings for user
  - `GET /api/listings/[id]` - Get single listing
  - `POST /api/listings/[id]/analyze` - AI analysis
  - `POST /api/listings/[id]/reanalyze` - Re-run AI analysis
  - `POST /api/listings/[id]/use-premium` - Use premium feature
  - `POST /api/listings/[id]/upgrade-premium` - Upgrade to premium
  - `POST /api/listings/[id]/profit` - Calculate profit estimate
  
- **Photos**: Image upload/management
  - `POST /api/photos/upload` - Upload photo to S3
  - `GET /api/photos/[id]` - Get photo metadata
  - `GET /api/photos/[id]/url` - Get signed URL for download
  
- **Marketplace**: Platform integrations
  - eBay: `/api/marketplace/ebay/*` (OAuth 2.0)
  - Etsy: `/api/marketplace/etsy/*` (OAuth 2.0)
  - Reverb: `/api/marketplace/reverb/*` (API key)
  - Research: `/api/marketplace/research` - Market data fetching
  
- **Extension**: Chrome extension communication
  - `POST /api/extension/auth/verify` - Verify extension auth
  - `GET /api/extension/listings` - Get listings for extension
  - `POST /api/extension/schedule` - Schedule posts
  - `POST /api/extension/listings/[id]/posted` - Mark as posted
  
- **Auth**: NextAuth.js authentication
  - `POST /api/signup` - User registration
  - `/api/auth/[...nextauth]` - NextAuth.js handler
  
- **Stripe**: Payment processing
  - `POST /api/stripe/checkout` - Create checkout session
  - `POST /api/stripe/portal` - Customer portal
  - `POST /api/stripe/webhook` - Stripe webhooks
  
- **User**: User preferences and data
  - `GET/POST /api/user/preferences` - User preferences
  - `GET /api/user/costs` - Cost tracking data

#### 2. Server Components
**Pattern**: React Server Components (RSC)

Benefits:
- Zero JavaScript sent to client by default
- Direct database access (no API calls)
- Better SEO
- Faster initial page loads

**Usage**:
- Page layouts (`layout.tsx`)
- Static pages (signin, signup)
- Data-fetching pages (listings, search)

---

### Data Layer

#### 1. Database (PostgreSQL + Prisma ORM)
**Schema**: `app/prisma/schema.prisma` (35+ models)

**Key Models**:
- `User` - Users, subscriptions, preferences
- `Listing` - Items to sell (35+ fields)
- `Photo` - Image metadata (no raw data)
- `AINotification` - Smart chips/alerts
- `EbayCredential`, `EtsyCredential`, `ReverbCredential` - OAuth tokens
- `SearchIndex` - Buyer search with facet grading
- `MarketResearch` - Cached market data
- `ScheduledPost` - Timed posting queue

**Connection**:
- Singleton Prisma client (`lib/db.ts`)
- Connection pooling via Prisma
- Environment variable: `DATABASE_URL`

**Migrations**:
- ⚠️ **No migrations** - production database, backward compatibility required
- Schema changes must be **additive only** (new fields, new tables)

#### 2. File Storage (AWS S3)
**Strategy**: Metadata-only architecture

**Workflow**:
1. User uploads photo → S3 (temporary)
2. AI analyzes photo → generates listing
3. After AI analysis → delete from S3 or compress to thumbnail
4. When posted to marketplace → image hosted by marketplace
5. Database stores only: thumbnail URL, platform image URL, metadata

**S3 Structure**:
```
BUCKET_NAME/
└── FOLDER_PREFIX/
    └── uploads/
        └── {timestamp}-{filename}
```

**Cost Optimization**:
- Temporary storage only (delete after analysis or sale)
- Thumbnails for search (small size)
- Marketplace hosting for live listings

**Implementation**: `lib/s3.ts`, `lib/aws-config.ts`

---

### External Services Layer

#### 1. AI Provider (OpenAI GPT-4 Vision)
**Current**: OpenAI GPT-4 Vision API
**Future**: Considering Gemini 2.5 Flash migration

**Usage**:
- Item identification
- Title/description generation
- Condition assessment
- Market research
- Special items detection
- Price estimation

**Cost Tracking**:
- Token usage tracked per listing
- User-level aggregation
- Cost displayed in dashboard

#### 2. Marketplace APIs

##### eBay API
- **Auth**: OAuth 2.0 (user consent flow)
- **Endpoints**: Browse API, Sell API
- **Features**: Listing creation, status tracking
- **Rate Limits**: Per API call type
- **Credentials**: `EbayCredential` model

##### Etsy API
- **Auth**: OAuth 2.0 with shop selection
- **Endpoints**: Listings API, Shops API
- **Features**: Multi-shop support, listing creation
- **Rate Limits**: Per endpoint
- **Credentials**: `EtsyCredential` model

##### Reverb API
- **Auth**: API key
- **Endpoints**: Listings API
- **Features**: Musical instrument listings
- **Rate Limits**: Per API key
- **Credentials**: `ReverbCredential` model

#### 3. Payment Processing (Stripe)
- **Integration**: Stripe Checkout + Customer Portal
- **Webhooks**: Subscription events
- **Models**: `Subscription` model
- **Plans**: FREE (4 premium posts), BASIC ($10/mo), PRO ($20/mo)

---

## 🔄 Data Flow Patterns

### Pattern 1: Camera to Listing Creation

```
┌──────────┐      ┌─────────┐      ┌──────────┐      ┌──────────┐
│  Camera  │─1───▶│ Upload  │─2───▶│   AI     │─3───▶│  Listing │
│   Page   │      │   S3    │      │ Analysis │      │  Created │
└──────────┘      └─────────┘      └──────────┘      └──────────┘
     │                                    │                 │
     │                                    │                 │
     ▼                                    ▼                 ▼
 Capture        Store temp file    Generate title,    Save to DB
  Photo         + metadata         description,       + update
                                   price, etc.        user stats

Steps:
1. User captures photo via /camera page
2. Photo uploaded to S3 via POST /api/photos/upload
3. Photo record created in DB (Photo model)
4. AI analysis triggered via POST /api/listings/[id]/analyze
5. OpenAI processes image + generates listing data
6. Listing updated in DB with AI results
7. User reviews/edits on /listing/[id] page
8. Optionally: User clicks "Use Premium" for enhanced analysis
```

### Pattern 2: Marketplace OAuth Flow

```
┌───────────┐     ┌─────────┐     ┌──────────┐     ┌──────────┐
│Connections│─1──▶│  OAuth  │─2──▶│Marketplace│─3──▶│ Callback │
│   Page    │     │  Start  │     │  Consent │     │ Handler  │
└───────────┘     └─────────┘     └──────────┘     └──────────┘
                                                          │
                                                          ▼
                                                    ┌──────────┐
                                                    │  Tokens  │
                                                    │  Saved   │
                                                    └──────────┘

Steps (eBay example):
1. User clicks "Connect eBay" on /connections page
2. GET /api/marketplace/ebay/auth redirects to eBay consent page
3. User authorizes on eBay
4. eBay redirects to /api/marketplace/ebay/callback with auth code
5. Server exchanges code for access_token + refresh_token
6. Tokens stored in EbayCredential model (encrypted)
7. User redirected back to /connections page
8. Connection status shows "Connected"
```

### Pattern 3: Extension Posting Flow

```
┌──────────┐     ┌─────────┐     ┌──────────┐     ┌──────────┐
│   Web    │─1──▶│Extension│─2──▶│Platform  │─3──▶│ Update   │
│   App    │     │ Injects │     │  Website │     │  Status  │
└──────────┘     └─────────┘     └──────────┘     └──────────┘

Steps:
1. User schedules post via web app
2. Extension fetches listing data via GET /api/extension/listings
3. User navigates to target platform (e.g., Mercari)
4. Extension auto-fills form fields
5. Extension uploads images
6. User reviews and submits
7. Extension notifies web app via POST /api/extension/listings/[id]/posted
8. Listing status updated to "POSTED"
```

### Pattern 4: Buyer Search Query

```
┌──────────┐     ┌─────────┐     ┌──────────┐     ┌──────────┐
│  Search  │─1──▶│  Query  │─2──▶│  Facet   │─3──▶│ Results  │
│   Page   │     │ Parsing │     │ Scoring  │     │ Ranking  │
└──────────┘     └─────────┘     └──────────┘     └──────────┘

Steps:
1. Buyer enters search query (text or voice)
2. GET /api/search parses query + extracts facets
3. SearchIndex table queried with filters
4. Quality grading calculated (facet-based)
5. Results ranked by relevance + quality score
6. Results returned with highlighted facets
```

---

## 🔐 Security Architecture

### Authentication
- **Provider**: NextAuth.js v4
- **Strategy**: Credential provider (email + password)
- **Session Storage**: Database sessions (Session model)
- **Password Hashing**: bcryptjs
- **Token Lifetime**: 30 days

### Authorization
- **Pattern**: Session-based (server-side checks)
- **Implementation**: Middleware + route handlers
- **Premium Features**: Check `User.subscriptionTier`

### API Security
- **Authentication**: Session cookies (NextAuth)
- **Rate Limiting**: Per-user API usage tracking (ApiUsage model)
- **Input Validation**: Zod schemas
- **SQL Injection**: Prisma ORM (parameterized queries)

### Secrets Management
- **Storage**: `.env` file (gitignored)
- **Access**: `process.env.*` in server code only
- **External Secrets**: Encrypted in database (OAuth tokens)

### CORS
- **Extension**: Allowed origin for extension APIs
- **Marketplace APIs**: Server-to-server (no CORS issues)

---

## 🚀 Deployment Architecture

### Current Deployment
- **Platform**: Abacus.AI Cloud
- **URL**: https://gistlist.abacusai.app
- **Environment**: Production
- **Build Tool**: Next.js build
- **Package Manager**: Yarn

### Infrastructure
- **Compute**: Serverless (Next.js App Router)
- **Database**: Managed PostgreSQL
- **Storage**: AWS S3
- **CDN**: Automatic (Next.js optimization)

### Environment Variables
```
# Database
DATABASE_URL=postgresql://...

# Auth
NEXTAUTH_URL=https://gistlist.abacusai.app
NEXTAUTH_SECRET=...

# AWS S3
AWS_BUCKET_NAME=...
AWS_FOLDER_PREFIX=...

# OpenAI
OPENAI_API_KEY=...

# eBay
EBAY_CLIENT_ID=...
EBAY_CLIENT_SECRET=...
EBAY_REDIRECT_URI=...

# Etsy
ETSY_CLIENT_ID=...
ETSY_CLIENT_SECRET=...
ETSY_REDIRECT_URI=...

# Stripe
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
```

---

## 📊 Performance Considerations

### Image Optimization
- **Next.js Image Component**: Automatic optimization
- **Lazy Loading**: Images load on scroll
- **Responsive Images**: Multiple sizes served based on device
- **CDN**: Automatic CDN distribution

### Database Optimization
- **Indexes**: Strategic indexes on foreign keys, search fields
- **Connection Pooling**: Prisma connection pool
- **Query Optimization**: Select only needed fields

### Caching Strategy
- **Market Research**: Cached in MarketResearch model
- **User Sessions**: Database sessions (fast lookup)
- **Static Assets**: Next.js automatic caching

### Code Splitting
- **Route-based**: Automatic with App Router
- **Component-based**: Dynamic imports for large components
- **Third-party Libraries**: Lazy load when possible

---

## 🔧 Development Patterns

### Error Handling
```typescript
// API Routes
try {
  // Operation
  return NextResponse.json({ success: true })
} catch (error) {
  console.error('Error:', error)
  return NextResponse.json(
    { error: 'Error message' },
    { status: 500 }
  )
}
```

### Database Access
```typescript
// Use singleton Prisma client
import prisma from '@/lib/db'

// Query with error handling
const user = await prisma.user.findUnique({
  where: { email }
})
```

### Form Validation
```typescript
// Zod schema
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
})

// React Hook Form
const form = useForm({
  resolver: zodResolver(schema)
})
```

### AI Analysis
```typescript
// Cost tracking
const response = await openai.chat.completions.create(...)
const tokensUsed = response.usage.total_tokens

// Update listing
await prisma.listing.update({
  where: { id },
  data: {
    tokensUsed,
    apiCost: calculateCost(tokensUsed)
  }
})

// Update user totals
await prisma.user.update({
  where: { id: userId },
  data: {
    totalTokensUsed: { increment: tokensUsed },
    totalApiCost: { increment: apiCost }
  }
})
```

---

## 🧪 Testing Strategy

### E2E Tests
- **Framework**: Playwright
- **Location**: `app/tests/`
- **Coverage**: Auth, photo upload, listing creation, marketplace connections

### Unit Tests
- **Framework**: Jest (planned)
- **Focus**: Business logic, utilities

### Manual Testing
- **Tool**: `test_nextjs_project` (automated checks)
- **Checks**: TypeScript compilation, Next.js build, dev server startup

---

## 📈 Scalability Considerations

### Current Scale
- **Users**: Early stage (<100 users)
- **Listings**: Small dataset
- **API Calls**: Low volume

### Scaling Plan
1. **Database**: Vertical scaling (increase CPU/RAM)
2. **Caching**: Add Redis for session + market data
3. **Storage**: S3 already scales infinitely
4. **Compute**: Serverless scales automatically
5. **Rate Limiting**: Implement API rate limiting per user

---

## 🔄 Migration Paths

### AI Provider Migration (OpenAI → Gemini)
1. Create new `lib/gemini.ts` module
2. Update analyze endpoint to use Gemini
3. A/B test quality with sample listings
4. Migrate traffic gradually
5. Monitor cost savings + quality metrics

### Database Migration (if needed)
⚠️ **No migrations** on production DB - must be backward compatible

---

**Last Updated**: 2025-10-14  
**Maintained By**: All agents and developers
