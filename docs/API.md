# GISTer API Documentation
**Living Document - Update when endpoints change**

---

## 🔐 Authentication

All API endpoints (except auth endpoints) require authentication via NextAuth session cookies.

**Session Check**:
```typescript
import { getServerSession } from 'next-auth'
const session = await getServerSession()
if (!session) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

---

## 📝 Listings API

### POST /api/listings/create
Create a new listing (draft).

**Auth Required**: Yes  
**Premium Only**: No

**Request Body**:
```json
{
  "title": "Optional initial title",
  "category": "Optional category"
}
```

**Response**:
```json
{
  "id": "listing_id",
  "userId": "user_id",
  "status": "DRAFT",
  "createdAt": "2025-10-14T12:00:00Z"
}
```

**Errors**:
- `401`: Unauthorized
- `500`: Server error

---

### GET /api/listings
Get all listings for authenticated user.

**Auth Required**: Yes  
**Premium Only**: No

**Query Parameters**:
- `status` (optional): Filter by status (DRAFT, ACTIVE, POSTED, ARCHIVED)

**Response**:
```json
[
  {
    "id": "listing_id",
    "title": "Item Title",
    "status": "ACTIVE",
    "price": 29.99,
    "photos": [...],
    "createdAt": "2025-10-14T12:00:00Z"
  }
]
```

---

### GET /api/listings/[id]
Get single listing by ID.

**Auth Required**: Yes  
**Premium Only**: No

**Response**:
```json
{
  "id": "listing_id",
  "userId": "user_id",
  "title": "Item Title",
  "description": "Full description",
  "price": 29.99,
  "condition": "Like New",
  "photos": [...],
  "aiAnalysis": {...}
}
```

**Errors**:
- `401`: Unauthorized
- `404`: Listing not found
- `403`: Forbidden (not owner)

---

### POST /api/listings/[id]/analyze
Trigger AI analysis for a listing.

**Auth Required**: Yes  
**Premium Only**: Depends on user premium posts remaining

**Request Body**:
```json
{
  "usePremium": false
}
```

**Response**:
```json
{
  "success": true,
  "listing": {
    "title": "AI-generated title",
    "description": "AI-generated description",
    "price": 29.99,
    "condition": "Very Good",
    "suggestedPlatforms": ["ebay", "mercari"],
    "isSpecialItem": true,
    "specialItemReason": "Vintage item from 1980s",
    "marketInsights": "..."
  },
  "tokensUsed": 1234,
  "cost": 0.05
}
```

**Errors**:
- `401`: Unauthorized
- `404`: Listing not found
- `400`: No photos uploaded
- `402`: Premium posts exhausted (free users)
- `500`: AI analysis failed

---

### POST /api/listings/[id]/reanalyze
Re-run AI analysis on existing listing.

**Auth Required**: Yes  
**Premium Only**: Depends on user tier

**Request Body**: Same as `/analyze`

**Response**: Same as `/analyze`

---

### POST /api/listings/[id]/use-premium
Use a premium post credit to unlock premium features.

**Auth Required**: Yes  
**Premium Only**: Free users with remaining credits

**Response**:
```json
{
  "success": true,
  "listing": {...},
  "premiumPostsRemaining": 3
}
```

**Errors**:
- `402`: No premium posts remaining
- `400`: Already used premium for this listing

---

### POST /api/listings/[id]/upgrade-premium
Redirect user to Stripe checkout for premium upgrade.

**Auth Required**: Yes

**Response**:
```json
{
  "url": "https://checkout.stripe.com/..."
}
```

---

### POST /api/listings/[id]/profit
Calculate profit estimate based on purchase price.

**Auth Required**: Yes  
**Premium Only**: No

**Request Body**:
```json
{
  "purchasePrice": 15.00
}
```

**Response**:
```json
{
  "estimatedProfit": 10.00,
  "profitMargin": 40.0,
  "suggestedPrice": 25.00
}
```

---

### POST /api/listings/reindex
Rebuild search index for all user listings.

**Auth Required**: Yes  
**Premium Only**: No

**Response**:
```json
{
  "success": true,
  "indexed": 25
}
```

---

## 📷 Photos API

### POST /api/photos/upload
Upload photo to S3 and create Photo record.

**Auth Required**: Yes  
**Premium Only**: No

**Request**: `multipart/form-data`
- `file`: Image file (JPEG, PNG, WebP)
- `listingId`: Listing ID to attach photo to

**Response**:
```json
{
  "id": "photo_id",
  "listingId": "listing_id",
  "cloudStoragePath": "uploads/1234-photo.jpg",
  "thumbnailUrl": "https://cdn.example.com/thumb.jpg",
  "order": 0,
  "isPrimary": true
}
```

**Errors**:
- `400`: No file provided or invalid file type
- `401`: Unauthorized
- `500`: Upload failed

---

### GET /api/photos/[id]
Get photo metadata.

**Auth Required**: Yes  
**Premium Only**: No

**Response**:
```json
{
  "id": "photo_id",
  "listingId": "listing_id",
  "cloudStoragePath": "uploads/1234-photo.jpg",
  "thumbnailUrl": "https://cdn.example.com/thumb.jpg",
  "width": 1920,
  "height": 1080,
  "createdAt": "2025-10-14T12:00:00Z"
}
```

---

### GET /api/photos/[id]/url
Get signed S3 URL for photo download.

**Auth Required**: Yes  
**Premium Only**: No

**Response**:
```json
{
  "url": "https://s3.amazonaws.com/bucket/file?signature=..."
}
```

**Errors**:
- `404`: Photo not found or deleted

---

## 🛒 Marketplace API

### eBay API

#### GET /api/marketplace/ebay/auth
Initiate eBay OAuth 2.0 flow.

**Auth Required**: Yes  
**Premium Only**: No

**Response**: Redirects to eBay consent page

---

#### GET /api/marketplace/ebay/callback
Handle eBay OAuth callback.

**Auth Required**: Yes (session maintained)  
**Query Parameters**:
- `code`: OAuth authorization code
- `state`: CSRF token

**Response**: Redirects to /connections page

---

#### GET /api/marketplace/ebay/status
Check eBay connection status.

**Auth Required**: Yes  
**Premium Only**: No

**Response**:
```json
{
  "connected": true,
  "ebayUserId": "testuser",
  "expiresAt": "2025-11-14T12:00:00Z"
}
```

---

#### POST /api/marketplace/ebay/post
Post listing to eBay.

**Auth Required**: Yes  
**Premium Only**: No

**Request Body**:
```json
{
  "listingId": "listing_id"
}
```

**Response**:
```json
{
  "success": true,
  "ebayListingId": "123456789",
  "url": "https://ebay.com/itm/123456789"
}
```

**Errors**:
- `400`: Missing eBay connection
- `500`: eBay API error

---

#### DELETE /api/marketplace/ebay/disconnect
Disconnect eBay account.

**Auth Required**: Yes  
**Premium Only**: No

**Response**:
```json
{
  "success": true
}
```

---

### Etsy API

(Similar structure to eBay API)

#### Endpoints:
- `GET /api/marketplace/etsy/auth`
- `GET /api/marketplace/etsy/callback`
- `GET /api/marketplace/etsy/status`
- `POST /api/marketplace/etsy/post`
- `DELETE /api/marketplace/etsy/disconnect`

---

### Reverb API

#### POST /api/marketplace/reverb/connect
Connect Reverb account with API key.

**Auth Required**: Yes  
**Premium Only**: No

**Request Body**:
```json
{
  "apiToken": "reverb_api_token"
}
```

**Response**:
```json
{
  "success": true,
  "connected": true
}
```

---

#### GET /api/marketplace/reverb/status
Check Reverb connection status.

**Auth Required**: Yes

**Response**:
```json
{
  "connected": true
}
```

---

#### POST /api/marketplace/reverb/post
Post musical instrument listing to Reverb.

**Auth Required**: Yes

**Request Body**:
```json
{
  "listingId": "listing_id"
}
```

**Response**:
```json
{
  "success": true,
  "reverbListingId": "reverb_id",
  "url": "https://reverb.com/item/..."
}
```

---

#### DELETE /api/marketplace/reverb/disconnect
Disconnect Reverb account.

**Auth Required**: Yes

**Response**:
```json
{
  "success": true
}
```

---

### Market Research API

#### POST /api/marketplace/research
Fetch market data for an item.

**Auth Required**: Yes  
**Premium Only**: Premium features only

**Request Body**:
```json
{
  "query": "Vintage Gibson Les Paul 1959",
  "category": "Musical Instruments",
  "condition": "Very Good"
}
```

**Response**:
```json
{
  "averagePrice": 250000.00,
  "priceRange": {
    "low": 200000,
    "high": 350000
  },
  "competitorCount": 12,
  "trendingScore": 85.5,
  "bestDayToList": "Sunday",
  "seasonalTrend": "increasing"
}
```

---

## 🔌 Extension API

### POST /api/extension/auth/verify
Verify extension authentication token.

**Auth Required**: Extension token (header: `X-Extension-Token`)  
**Premium Only**: No

**Request Body**:
```json
{
  "userId": "user_id",
  "sessionToken": "session_token"
}
```

**Response**:
```json
{
  "valid": true,
  "userId": "user_id",
  "subscriptionTier": "PRO"
}
```

---

### GET /api/extension/listings
Get all listings for extension.

**Auth Required**: Extension token  
**Premium Only**: No

**Query Parameters**:
- `status`: Filter by status (optional)

**Response**:
```json
[
  {
    "id": "listing_id",
    "title": "Item Title",
    "price": 29.99,
    "photos": [
      {
        "url": "https://...",
        "isPrimary": true
      }
    ],
    "platformData": {
      "mercari": {...},
      "poshmark": {...}
    }
  }
]
```

---

### POST /api/extension/schedule
Schedule a post for specific time.

**Auth Required**: Extension token  
**Premium Only**: Yes

**Request Body**:
```json
{
  "listingId": "listing_id",
  "platforms": ["mercari", "poshmark"],
  "scheduledTime": "2025-10-15T18:00:00Z",
  "useAITime": false
}
```

**Response**:
```json
{
  "success": true,
  "scheduledPostId": "scheduled_id"
}
```

---

### POST /api/extension/listings/[id]/posted
Mark listing as posted on platform.

**Auth Required**: Extension token  
**Premium Only**: No

**Request Body**:
```json
{
  "platform": "mercari",
  "platformListingId": "mercari_id",
  "url": "https://mercari.com/item/..."
}
```

**Response**:
```json
{
  "success": true,
  "listing": {...}
}
```

---

## 👤 User API

### GET /api/user/preferences
Get user preferences.

**Auth Required**: Yes  
**Premium Only**: No

**Response**:
```json
{
  "defaultFulfillmentType": "shipping",
  "defaultWillingToShip": true,
  "defaultOkForLocals": false,
  "defaultLocation": "Chicago, IL",
  "conditionReportMode": "all"
}
```

---

### POST /api/user/preferences
Update user preferences.

**Auth Required**: Yes  
**Premium Only**: No

**Request Body**:
```json
{
  "defaultFulfillmentType": "local",
  "defaultLocation": "New York, NY"
}
```

**Response**:
```json
{
  "success": true,
  "preferences": {...}
}
```

---

### GET /api/user/costs
Get cost tracking data.

**Auth Required**: Yes  
**Premium Only**: No

**Response**:
```json
{
  "totalTokensUsed": 50000,
  "totalApiCost": 25.00,
  "totalStorageCost": 1.50,
  "listingBreakdown": [
    {
      "listingId": "id",
      "title": "Item",
      "tokensUsed": 1200,
      "cost": 0.06
    }
  ]
}
```

---

## 💳 Stripe API

### POST /api/stripe/checkout
Create Stripe checkout session.

**Auth Required**: Yes  
**Premium Only**: No (this is how users upgrade)

**Request Body**:
```json
{
  "priceId": "price_1234",
  "tier": "PRO"
}
```

**Response**:
```json
{
  "url": "https://checkout.stripe.com/..."
}
```

---

### POST /api/stripe/portal
Get Stripe customer portal URL.

**Auth Required**: Yes  
**Premium Only**: Subscribers only

**Response**:
```json
{
  "url": "https://billing.stripe.com/..."
}
```

---

### POST /api/stripe/webhook
Handle Stripe webhook events.

**Auth Required**: Stripe signature (header: `stripe-signature`)

**Handled Events**:
- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

---

## 🔍 Search API

### GET /api/search
Search listings (buyer marketplace).

**Auth Required**: No  
**Premium Only**: No

**Query Parameters**:
- `q`: Search query
- `category`: Category filter
- `condition`: Condition filter
- `minPrice`, `maxPrice`: Price range
- `location`: Location filter
- `sort`: Sort order (relevance, price_asc, price_desc, quality)

**Response**:
```json
{
  "results": [
    {
      "id": "listing_id",
      "title": "Item Title",
      "price": 29.99,
      "condition": "Very Good",
      "location": "Chicago, IL",
      "thumbnailUrl": "https://...",
      "qualityScore": 0.85,
      "highlightedFacets": ["authenticated", "complete"]
    }
  ],
  "total": 125,
  "page": 1,
  "perPage": 20
}
```

---

## 🔔 Notifications API

### POST /api/notifications/[id]/resolve
Mark notification as resolved.

**Auth Required**: Yes  
**Premium Only**: No

**Response**:
```json
{
  "success": true
}
```

---

## 🧪 Testing API

### GET /api/chips
Get dynamic chip suggestions (internal).

**Auth Required**: Yes  
**Premium Only**: No

**Query Parameters**:
- `category`: Chip category
- `itemCategory`: Item category context

**Response**:
```json
{
  "suggestions": [
    "Power Supply",
    "Manual",
    "Original Box"
  ]
}
```

---

## 🔒 Auth API

### POST /api/signup
Register new user.

**Auth Required**: No  
**Premium Only**: No

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "fullName": "John Doe"
}
```

**Response**:
```json
{
  "success": true,
  "userId": "user_id"
}
```

**Errors**:
- `400`: Email already exists
- `400`: Invalid password (min 8 chars)

---

### POST /api/auth/[...nextauth]
NextAuth.js authentication handler.

**Endpoints**:
- `POST /api/auth/signin/credentials`: Sign in with email/password
- `POST /api/auth/signout`: Sign out
- `GET /api/auth/session`: Get current session
- `GET /api/auth/csrf`: Get CSRF token

See [NextAuth.js docs](https://next-auth.js.org/) for full API.

---

## 📊 Rate Limits

### Free Tier:
- Listings API: Unlimited reads, 100 writes/day
- Photos API: 50 uploads/day
- AI Analysis: 4 premium analyses per account (lifetime)
- Marketplace APIs: As per marketplace limits

### Premium Tier:
- All APIs: Higher limits
- AI Analysis: Unlimited

---

## 🚨 Error Codes

- `400`: Bad Request (invalid input)
- `401`: Unauthorized (no session)
- `402`: Payment Required (premium feature, no credits)
- `403`: Forbidden (not resource owner)
- `404`: Not Found
- `429`: Too Many Requests (rate limit)
- `500`: Internal Server Error

---

**Last Updated**: 2025-10-14  
**Maintained By**: All agents and developers

---

## 🤖 Agent Automation API

All routes require authentication and respect the `AGENT_MODE=1` feature flag. See `docs/AGENT_API.md` for the localhost service contract.

### POST /api/agent/start
- **Purpose:** Mint a single-use JWS for the Electron agent and persist an `AgentSession` record.
- **Request Body:**
  ```json
  {
    "url": "https://poshmark.com/create-listing",
    "actions": ["open", "fill", "upload", "click"],
    "device": { "id": "optional", "os": "macOS", "name": "Laptop" }
  }
  ```
- **Response:**
  ```json
  {
    "token": "<jwt>",
    "expiresAt": "2025-10-15T18:45:00.000Z",
    "session": {
      "id": "cls...",
      "consentState": "pending",
      "domain": "poshmark.com",
      "actions": ["open", "fill", "upload", "click"]
    }
  }
  ```

### POST /api/agent/run
- **Purpose:** Mint a token, start a localhost session, and optionally execute recipe steps through the SDK.
- **Request Body:**
  ```json
  {
    "url": "https://www.mercari.com/sell/",
    "actions": ["open", "fill", "upload", "click"],
    "steps": [
      { "type": "open", "url": "https://www.mercari.com/sell/" },
      { "type": "fill", "items": [{ "selector": "input[name=title]", "text": "Sample" }] },
      { "type": "click", "selector": "button[type=submit]" },
      { "type": "wait", "event": "PUBLISHED", "timeoutMs": 20000 }
    ],
    "device": { "os": "Windows", "name": "Desktop" }
  }
  ```
- **Response:**
  ```json
  {
    "session": {
      "id": "cls...",
      "agentSessionId": "f4a5...",
      "consent": "pending",
      "expiresAt": "2025-10-15T18:45:00.000Z"
    }
  }
  ```

### GET /api/agent/events/:jobId
- **Purpose:** Proxy Server-Sent Events from the localhost agent to authenticated clients.
- **Notes:** Resolves the job via Prisma; returns `404` if session not found or owned by another user.

### POST /api/agent/strategy
- **Purpose:** Determine posting pipeline (`agent`, `api`, or `extension`) for a given domain.
- **Request Body:** `{ "domain": "poshmark.com" }`
- **Response:** `{ "strategy": "agent" }`
