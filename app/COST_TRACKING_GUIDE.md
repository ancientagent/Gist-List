
# Cost Tracking & Profit Estimation Guide

## Overview

Gist List now includes comprehensive cost tracking and profit estimation features to help you understand your expenses and maximize profitability.

## Features Implemented

### 1. 💰 Cost Tracking

**What's Tracked:**
- **LLM API Usage**: Token consumption for AI analysis (input + output tokens)
- **S3 Storage**: Photo storage costs (per GB/month + data transfer)
- **Per-Listing Costs**: Individual breakdown for each item
- **User-Level Aggregation**: Total costs across all listings

**Database Fields Added:**
- `User.totalTokensUsed`, `totalApiCost`, `totalStorageCost`, `totalStorageBytes`
- `Listing.tokensUsed`, `apiCost`, `storageCost`, `storageBytes`
- `Photo.originalSizeBytes`, `compressedSizeBytes`

**Cost Dashboard:**
- Access at `/costs`
- View total costs, avg per listing, AI vs storage breakdown
- See recent listings with individual costs

### 2. 📉 Image Compression

**Automatic Compression:**
- All uploaded photos are automatically compressed using Sharp
- Default settings: Max 1920x1920px, 85% quality, JPEG format
- Typical savings: 60-80% file size reduction

**Benefits:**
- Lower storage costs
- Faster uploads/downloads
- Better user experience

**Implementation:**
- `lib/image-compression.ts`: Compression utilities
- `lib/s3.ts`: Updated with `uploadFileWithCompression()`
- Tracks both original and compressed sizes

### 3. 📊 Profit Calculator

**Features:**
- **Platform-Specific Calculations**: Different fee structures for each marketplace
- **Comprehensive Breakdown**: Platform fees, payment processing, shipping, GistList costs
- **ROI & Margin**: Return on investment and profit margin percentages
- **Best Platform Recommendation**: Automatically suggests the most profitable platform

**Platform Fees (Built-in):**
- eBay: 12.9% + 2.9% + $0.30
- Mercari: 12.9% + 2.9% + $0.30
- Poshmark: 20% (includes processing)
- Facebook Marketplace: FREE
- OfferUp: 12.9% + 2.9% + $0.30
- Craigslist: FREE
- Nextdoor: FREE
- Reverb: 5% + 2.7% + $0.30
- Vinted: FREE (buyer pays)

**How to Use:**
1. Go to any listing detail page
2. Scroll to "Profit Calculator" section
3. Enter your purchase price
4. Click "Calculate"
5. View profit breakdown by platform

### 4. 💳 Stripe Integration (Optional)

**Subscription Management:**
- Free Tier: Unlimited posts, 4 free premium analyses
- Basic ($9.99/mo): 20 premium posts/month
- Pro ($19.99/mo): Unlimited premium posts + API access

**Setup Required:**
1. Create Stripe account at https://stripe.com
2. Get API keys from Dashboard
3. Create products & prices
4. Add to `.env`:
   ```
   STRIPE_SECRET_KEY=sk_...
   STRIPE_PUBLISHABLE_KEY=pk_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   STRIPE_BASIC_PRICE_ID=price_...
   STRIPE_PRO_PRICE_ID=price_...
   ```

**API Routes:**
- `/api/stripe/checkout` - Create checkout session
- `/api/stripe/portal` - Customer portal access
- `/api/stripe/webhook` - Handle Stripe events

### 5. 🛍️ External API Integrations (Placeholders)

**eBay API** (`lib/ebay-api.ts`):
- Market data from completed listings
- Auto-listing capability (placeholder)
- Requires eBay developer account

**Facebook Marketplace** (`lib/facebook-api.ts`):
- Auto-listing via Graph API (placeholder)
- Requires Facebook Business account + OAuth

## API Endpoints

### Cost Tracking
```
GET /api/user/costs
```
Returns user's cost summary and recent listings.

### Profit Calculation
```
GET /api/listings/[id]/profit
```
Calculate profit for all platforms.

```
POST /api/listings/[id]/profit
Body: { "purchasePrice": 50.00 }
```
Update purchase price and recalculate profit.

## Cost Calculation Details

### LLM API Pricing
Based on Gemini 2.5 Flash via Abacus.AI:
- Input: $0.075 per 1M tokens
- Output: $0.30 per 1M tokens

### S3 Storage Pricing
- Storage: $0.023 per GB/month
- PUT requests: $0.005 per 1000
- GET requests: $0.0004 per 1000
- Data transfer: $0.09 per GB

### Token Estimation
- Text: ~1 token per 4 characters
- Images: 85-258 tokens depending on resolution

## Profit Calculation Formula

```
Net Profit = Selling Price 
           - Purchase Price 
           - Platform Fee 
           - Payment Processing Fee 
           - Shipping Cost 
           - GistList Cost

Profit Margin = (Net Profit / Selling Price) × 100%

ROI = (Net Profit / Purchase Price) × 100%
```

## UI Components

### `<CostDashboard />`
Full-page dashboard showing all cost metrics.

### `<ProfitCalculator />`
Interactive calculator for profit estimation.
Integrated into listing detail pages.

## Future Enhancements

- [ ] Real-time eBay market data integration
- [ ] Auto-listing to multiple platforms
- [ ] Cost alerts and budgets
- [ ] Profit trend analytics
- [ ] Bulk profit calculation
- [ ] Export cost reports (CSV/PDF)
- [ ] Tax estimation

## Notes

- All costs are tracked automatically
- Image compression saves ~70% storage costs
- Profit calculator works for all qualified platforms
- Free tier users get full cost tracking
- Stripe integration is optional

## Support

For questions about cost tracking:
1. Check the Cost Dashboard at `/costs`
2. Review individual listing costs in listing detail
3. Contact support@abacus.ai for billing questions
