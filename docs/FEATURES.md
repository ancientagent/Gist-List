
# GISTer Features
**Living Document - Update when features are added/modified/removed**

---

## 🎯 Core Features

### 1. AI-Powered Listing Generation
**Status**: ✅ Complete  
**Last Updated**: 2025-10-14

**Description**: Capture item photos and let AI generate complete marketplace listings with pricing, descriptions, and platform recommendations.

**Key Components**:
- Camera capture page (`app/camera/page.tsx`)
- AI analysis endpoint (`app/api/listings/[id]/analyze/route.ts`)
- Listing detail page (`app/listing/[id]/page.tsx`)
- Photo upload API (`app/api/photos/upload/route.ts`)

**AI Capabilities**:
- Item identification with confidence scoring
- Automatic title and description generation
- Condition assessment with notes
- Market price research (brand new, very good, good, fair, parts)
- Platform recommendations (top 2-3 + all qualified platforms)
- Search tag generation (up to 20 SEO-optimized tags)
- Special items detection (vintage, collectible, luxury, etc.)

**Premium Features**:
- Enhanced market insights
- Special item facet analysis (authentication, rarity, provenance)
- Premium facts and useful links
- Verified condition scoring

**Dependencies**:
- OpenAI GPT-4 Vision API
- AWS S3 for temporary image storage

---

### 2. Special Items Detection
**Status**: ✅ Complete  
**Last Updated**: 2025-10-14

**Description**: Automatically detects vintage, collectible, rare, luxury, and specialty items with premium insights for paying users.

**Key Components**:
- AI detection logic (`app/api/listings/[id]/analyze/route.ts`)
- Special item UI (`app/listing/[id]/listing-detail.tsx`)
- Premium gating system (`app/components/premium-packs-section.tsx`)

**How It Works**:
- AI always analyzes for special items (all tiers)
- Free users see teaser banner + upgrade prompt
- Premium users see full facet analysis:
  - Authentication status
  - Condition details
  - Rarity assessment
  - Provenance information
  - Completeness evaluation

**Database Fields**:
- `isSpecialItem: Boolean`
- `specialItemReason: String`
- `specialItemCategory: String`
- `facets: String` (JSON)
- `priceUplifts: String` (JSON)

---

### 3. Marketplace Integrations
**Status**: ✅ Complete  
**Last Updated**: 2025-10-08

**Description**: Direct integrations with major reselling platforms for automated posting.

#### 3a. eBay Integration
**Status**: ✅ Complete  
**Auth Method**: OAuth 2.0

**Key Components**:
- OAuth flow (`app/api/marketplace/ebay/auth/route.ts`, `callback/route.ts`)
- Posting API (`app/api/marketplace/ebay/post/route.ts`)
- Status checker (`app/api/marketplace/ebay/status/route.ts`)
- Disconnect handler (`app/api/marketplace/ebay/disconnect/route.ts`)

**Features**:
- Secure OAuth 2.0 consent flow
- Token refresh automation
- Listing creation with images
- Status tracking

**Database Model**: `EbayCredential`

#### 3b. Etsy Integration
**Status**: ✅ Complete  
**Auth Method**: OAuth 2.0

**Key Components**:
- OAuth flow (`app/api/marketplace/etsy/auth/route.ts`, `callback/route.ts`)
- Posting API (`app/api/marketplace/etsy/post/route.ts`)
- Status checker (`app/api/marketplace/etsy/status/route.ts`)
- Disconnect handler (`app/api/marketplace/etsy/disconnect/route.ts`)

**Features**:
- OAuth 2.0 with shop selection
- Multi-shop support
- Listing creation with shop-specific settings

**Database Model**: `EtsyCredential`

#### 3c. Reverb Integration
**Status**: ✅ Complete  
**Auth Method**: API Key

**Key Components**:
- API key connection (`app/api/marketplace/reverb/connect/route.ts`)
- Posting API (`app/api/marketplace/reverb/post/route.ts`)
- Status checker (`app/api/marketplace/reverb/status/route.ts`)
- Disconnect handler (`app/api/marketplace/reverb/disconnect/route.ts`)

**Features**:
- API key-based authentication
- Musical instrument listings
- Reverb-specific fields (year, finish, condition)

**Database Model**: `ReverbCredential`

---

### 4. Chrome Extension (GISTer Extension v2.0.0)
**Status**: ✅ Complete  
**Last Updated**: 2025-10-07

**Description**: Chrome extension for semi-automated posting to platforms without official APIs.

**Key Components**:
- Extension code (`extension/`)
- Auth verification API (`app/api/extension/auth/verify/route.ts`)
- Listings sync API (`app/api/extension/listings/route.ts`)
- Schedule API (`app/api/extension/schedule/route.ts`)
- Posted status update (`app/api/extension/listings/[id]/posted/route.ts`)

**Features**:
- Smart form filling automation
- Image upload automation
- Progress tracking
- Multi-platform support (Mercari, Poshmark, OfferUp, etc.)
- Scheduled posting with AI-recommended times

**Platforms Supported**:
- Mercari
- Poshmark
- OfferUp
- Nextdoor
- Facebook Marketplace
- Craigslist

---

### 5. Connections Management
**Status**: ✅ Complete  
**Last Updated**: 2025-10-08

**Description**: Centralized page for managing all marketplace connections.

**Key Components**:
- Connections page (`app/connections/page.tsx`)
- Connection cards with status indicators
- OAuth flow triggers
- Disconnect handlers

**Features**:
- Visual status indicators (connected/disconnected)
- Easy OAuth re-authorization
- One-click disconnect
- Connection metadata (username, shop name, etc.)

---

### 6. Premium Feature Gating
**Status**: ✅ Complete  
**Last Updated**: 2025-10-14

**Description**: Freemium business model with tiered features.

**Key Components**:
- Subscription management (`app/api/stripe/checkout/route.ts`)
- Premium upgrade API (`app/api/listings/[id]/upgrade-premium/route.ts`)
- Usage tracking (`User.premiumPostsUsed`, `User.premiumPostsTotal`)
- Premium packs UI (`app/components/premium-packs-section.tsx`)

**Tiers**:
- **FREE**: 4 premium analyses per account
- **BASIC**: $10/month - Unlimited analyses
- **PRO**: $20/month - All features + priority support

**Premium Features**:
- Enhanced market research
- Special item facet analysis
- Verified condition scoring
- Premium facts and useful links
- Historical price data
- Advanced analytics

**Dependencies**:
- Stripe for payment processing

---

### 7. User Preferences & Auto-Fill
**Status**: ✅ Complete  
**Last Updated**: 2025-09-15

**Description**: Save user preferences for shipping, location, and common listing details.

**Key Components**:
- Preferences API (`app/api/user/preferences/route.ts`)
- Auto-fill logic in listing creation

**Saved Preferences**:
- Default fulfillment type (shipping/local)
- Willing to ship
- OK for local pickups
- Default location
- Meetup preferences
- Typical weight/dimensions

**Database Fields**: `User.default*` fields

---

### 8. Smart Notifications (Chips System)
**Status**: ✅ Complete  
**Last Updated**: 2025-10-10

**Description**: Context-aware notifications with mood-based styling and section-scoped chips.

**Key Components**:
- Notification types (`app/lib/types.ts`)
- Mood engine (`app/components/notifications/moods.ts`)
- Chips row component (`app/components/ChipsRow.tsx`)
- Quick facts panel (`app/components/QuickFactsPanel.tsx`)

**Chip Types**:
- ❗ **Alerts**: Required fields, critical issues (red)
- ❓ **Actions**: Actionable insights (blue)
- 💡 **Insights**: Helpful information (purple)

**Section Scoping**:
- Photos section
- Condition section
- Price section
- Shipping section
- Fine details section

**Database Model**: `AINotification`

---

### 9. Cost Tracking & Transparency
**Status**: ✅ Complete  
**Last Updated**: 2025-09-20

**Description**: Track AI API costs, storage costs, and usage per user and per listing.

**Key Components**:
- Cost calculation API (`app/api/user/costs/route.ts`)
- Cost display page (`app/costs/page.tsx`)
- Usage tracking in `User` and `Listing` models

**Tracked Metrics**:
- LLM tokens used
- Storage bytes consumed
- API costs (USD)
- Storage costs (USD)
- Per-listing breakdown

**Database Fields**:
- `User`: `totalTokensUsed`, `totalApiCost`, `totalStorageCost`
- `Listing`: `tokensUsed`, `apiCost`, `storageCost`

---

### 10. Buyer Search Marketplace
**Status**: ✅ Complete  
**Last Updated**: 2025-10-12

**Description**: Facet-based search system for buyers to find quality items.

**Key Components**:
- Search API (`app/api/search/route.ts`)
- Search page (`app/search/page.tsx`)
- Search index model (`SearchIndex`)

**Features**:
- Multi-field faceted search
- Quality grading system (0-1 score)
- Relevance ranking
- Voice search support
- Category filtering
- Price range filtering
- Location-based search

**Quality Facets**:
- Authentication
- Condition verification
- Rarity assessment
- Provenance tracking
- Completeness evaluation

**Database Model**: `SearchIndex`

---

### 11. Authentication & User Management
**Status**: ✅ Complete  
**Last Updated**: 2025-09-01

**Description**: User authentication with email/password.

**Key Components**:
- NextAuth.js configuration (`app/api/auth/[...nextauth]/route.ts`)
- Sign-in page (`app/auth/signin/page.tsx`)
- Sign-up page (`app/auth/signup/page.tsx`)
- Sign-up API (`app/api/signup/route.ts`)

**Features**:
- Credential-based auth (email + password)
- Password hashing with bcrypt
- Session management
- Protected routes

**Database Models**: `User`, `Account`, `Session`, `VerificationToken`

---

### 12. PWA Support
**Status**: ✅ Complete  
**Last Updated**: 2025-10-03

**Description**: Progressive Web App capabilities for mobile "Add to Home Screen".

**Key Components**:
- PWA manifest (`app/manifest.json`)
- Service worker configuration
- Mobile-optimized UI
- Touch-friendly interactions

**Features**:
- Installable on iOS/Android
- Offline support (basic)
- Mobile viewport optimization
- App-like experience

---

## 🚧 In Progress

### 13. Telemetry & Analytics
**Status**: 🚧 In Progress  
**Owner**: GPT (parallel work)  
**Last Updated**: 2025-10-14

**Description**: User behavior tracking, error monitoring, and performance analytics.

**Planned Components**:
- Event tracking system
- Error reporting
- Performance monitoring
- User flow analysis

**Note**: No conflicts with other development work.

---

## 📋 Planned Features

### 14. Unified Inventory System ("Shelf")
**Status**: 📋 Planned  
**Priority**: High  
**Estimated Start**: 2025-10-16

**Description**: Single inventory page with multiple input methods.

**Planned Capabilities**:
- Batch image upload (drag-and-drop)
- CSV/Excel import with AI parsing
- Text writeup parsing
- Manual entry
- Gallery-like inventory view
- Bulk actions (edit, delete, post)
- Background AI processing
- Real-time status updates

**Database Changes**:
- May need `InventoryItem` model or status field updates

---

### 15. AI Provider Migration (Gemini 2.5 Flash)
**Status**: 📋 Planned  
**Priority**: Medium  
**Estimated Start**: 2025-10-20

**Description**: Migrate from OpenAI GPT-4 to Gemini 2.5 Flash for cost savings.

**Reasons**:
- Lower API costs
- Competitive performance
- Multimodal capabilities

**Risk**: May require prompt re-engineering and quality testing.

---

### 16. Historical Price Data
**Status**: 📋 Planned  
**Priority**: Medium  
**Premium Feature**: Yes

**Description**: Track historical pricing trends for items.

**Planned Components**:
- Price history chart
- Trend analysis
- Best time to sell insights
- Seasonal patterns

---

### 17. Analytics Dashboard
**Status**: 📋 Planned  
**Priority**: Low  
**Premium Feature**: Yes

**Description**: User dashboard with sales analytics, listing performance, and insights.

---

### 18. Mobile App (React Native)
**Status**: 📋 Planned  
**Priority**: Low  
**Estimated Start**: 2026-Q1

**Description**: Native mobile apps for iOS and Android.

---

## ❌ Deprecated Features

None yet.

---

## 📊 Feature Status Legend

- ✅ **Complete**: Feature is live and stable
- 🚧 **In Progress**: Actively being developed
- 📋 **Planned**: Approved for development, not started
- ❌ **Deprecated**: No longer supported/maintained

---

**Last Updated**: 2025-10-14  
**Maintained By**: All agents and developers

---

## Notes for Agents

**When adding a new feature**:
1. Add entry to this file with all required sections
2. Update `CHANGELOG.md` with feat: entry
3. Update `API.md` if new endpoints added
4. Update `DATABASE.md` if schema changed
5. Create session summary in `/sessions/`

**When completing a feature**:
1. Change status from 🚧 to ✅
2. Update "Last Updated" date
3. Add any production notes

**When deprecating a feature**:
1. Move to "Deprecated Features" section
2. Document reason for deprecation
3. Note migration path (if any)
