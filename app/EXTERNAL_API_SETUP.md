
# External API Integration Setup Guide

This guide explains how to set up optional external API integrations for Gist List.

## 🎯 Overview

Gist List supports optional integrations with:
1. **Stripe** - Payment processing & subscriptions
2. **eBay API** - Real-time market data & auto-listing
3. **Facebook Marketplace** - Auto-listing via Graph API

All integrations are OPTIONAL. The app works fully without them.

---

## 💳 1. Stripe Integration

### Purpose
- Accept subscription payments (Basic/Pro tiers)
- Manage customer billing
- Handle recurring payments

### Setup Steps

#### 1. Create Stripe Account
1. Go to https://stripe.com
2. Sign up for a free account
3. Complete business verification

#### 2. Get API Keys
1. Go to https://dashboard.stripe.com/apikeys
2. Copy your **Publishable Key** (starts with `pk_test_`)
3. Copy your **Secret Key** (starts with `sk_test_`)

#### 3. Create Products & Prices
1. Go to https://dashboard.stripe.com/products
2. Create "Basic Subscription":
   - Name: Gist List Basic
   - Price: $9.99/month
   - Recurring: Monthly
   - Copy the **Price ID** (starts with `price_`)
3. Create "Pro Subscription":
   - Name: Gist List Pro
   - Price: $19.99/month
   - Recurring: Monthly
   - Copy the **Price ID**

#### 4. Set Up Webhook
1. Go to https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. URL: `https://your-domain.com/api/stripe/webhook`
4. Events to send:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copy the **Webhook Secret** (starts with `whsec_`)

#### 5. Add to Environment Variables
```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_BASIC_PRICE_ID=price_...
STRIPE_PRO_PRICE_ID=price_...
```

#### 6. Test Payment Flow
1. Restart your app
2. Go to subscription upgrade page
3. Use test card: `4242 4242 4242 4242`
4. Expiry: Any future date
5. CVC: Any 3 digits
6. Verify subscription created in Stripe Dashboard

### Testing
- **Test Mode**: Use test API keys during development
- **Live Mode**: Switch to live keys for production
- **Test Cards**: https://stripe.com/docs/testing

---

## 🛒 2. eBay API Integration

### Purpose
- Fetch real-time sold listing prices
- Get current market demand data
- Auto-list items to eBay (optional)

### Setup Steps

#### 1. Create eBay Developer Account
1. Go to https://developer.ebay.com
2. Sign up for free developer account
3. Verify your email

#### 2. Create Application
1. Go to https://developer.ebay.com/my/keys
2. Click "Create a keyset"
3. Choose environment:
   - **Sandbox**: For testing
   - **Production**: For live data
4. Copy your:
   - **App ID** (Client ID)
   - **Cert ID** (Client Secret)

#### 3. Set Redirect URI
1. In application settings
2. Add redirect URI:
   - `https://your-domain.com/api/ebay/callback`
3. Save changes

#### 4. Request API Access
1. Go to application settings
2. Request access to:
   - **Finding API** (for market research)
   - **Trading API** (for listing items)
3. Wait for approval (usually instant for Finding API)

#### 5. Add to Environment Variables
```env
EBAY_CLIENT_ID=your_app_id_here
EBAY_CLIENT_SECRET=your_cert_id_here
EBAY_REDIRECT_URI=https://your-domain.com/api/ebay/callback
```

#### 6. Implement OAuth Flow (Required for Trading API)
```typescript
// See lib/ebay-api.ts for implementation example
```

### Current Status
- **Placeholder code exists** in `lib/ebay-api.ts`
- **To implement**: OAuth flow + API calls
- **Documentation**: https://developer.ebay.com/api-docs/

### Rate Limits
- Finding API: 5,000 calls/day (free)
- Trading API: Based on eBay seller tier

---

## 📘 3. Facebook Marketplace API

### Purpose
- Auto-list items to Facebook Marketplace
- Manage listings programmatically

### Setup Steps

#### 1. Create Facebook Developer Account
1. Go to https://developers.facebook.com
2. Sign up with your Facebook account
3. Complete developer registration

#### 2. Create Facebook App
1. Click "Create App"
2. Choose "Business" type
3. Fill in app details
4. Create app

#### 3. Add Marketplace Product
1. In app dashboard, click "Add Product"
2. Select "Marketplace"
3. Follow setup wizard

#### 4. Get Page Access Token
1. Go to Graph API Explorer: https://developers.facebook.com/tools/explorer
2. Select your app
3. Get Page Access Token:
   - Click "Get Token" → "Get Page Access Token"
   - Select your Facebook Page
   - Grant permissions:
     - `pages_manage_metadata`
     - `pages_manage_posts`
     - `marketplace_management`
4. Copy the Access Token

#### 5. Convert to Long-Lived Token
```bash
curl -X GET "https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=YOUR_APP_ID&client_secret=YOUR_APP_SECRET&fb_exchange_token=YOUR_SHORT_TOKEN"
```

#### 6. Add to Environment Variables
```env
FACEBOOK_ACCESS_TOKEN=your_long_lived_token
FACEBOOK_PAGE_ID=your_page_id
```

### Current Status
- **Placeholder code exists** in `lib/facebook-api.ts`
- **To implement**: Full Graph API integration
- **Documentation**: https://developers.facebook.com/docs/marketplace/

### Important Notes
- Requires Facebook Business verification
- Access tokens expire (need refresh flow)
- Review process required before going live

---

## 🚀 Quick Start (No External APIs)

The app works fully without any external APIs:

✅ **What Works:**
- AI image analysis (uses Abacus.AI API - already configured)
- Cost tracking
- Profit calculation
- Image compression
- All listing features
- Free tier (unlimited posts)

❌ **What Requires External APIs:**
- Stripe: Paid subscriptions
- eBay: Real-time market data
- Facebook: Auto-listing

---

## 🔒 Security Best Practices

1. **Never commit API keys to Git**
   - Use `.env` files (already in `.gitignore`)
   - Use environment variables in production

2. **Use test/sandbox keys during development**
   - Stripe: Test mode keys
   - eBay: Sandbox environment
   - Facebook: Development mode

3. **Rotate keys regularly**
   - Especially if exposed
   - Set up alerts for suspicious activity

4. **Validate webhooks**
   - Verify Stripe webhook signatures
   - Check eBay notification authenticity

---

## 📊 Cost Comparison

| Service | Free Tier | Paid Tier | Cost Type |
|---------|-----------|-----------|-----------|
| Abacus.AI | ✅ (already configured) | Pay-per-token | $0.075-0.30 per 1M tokens |
| Stripe | ✅ | 2.9% + $0.30 per transaction | Pay-per-transaction |
| eBay API | ✅ (Finding: 5K calls/day) | Trading: Seller tier-based | Free or seller-tier-based |
| Facebook | ✅ | No API fees | Free (but listing fees may apply) |

---

## 🆘 Troubleshooting

### Stripe Issues
- **"Invalid API Key"**: Check that you're using the right key (test vs live)
- **Webhook failures**: Verify webhook secret and endpoint URL
- **Test payments failing**: Use test card `4242 4242 4242 4242`

### eBay Issues
- **"Invalid credentials"**: Check App ID and Cert ID
- **"Access denied"**: Verify API access was granted
- **Rate limit exceeded**: Wait or upgrade to higher tier

### Facebook Issues
- **"Invalid access token"**: Regenerate long-lived token
- **"Permission denied"**: Grant required permissions in Graph API Explorer
- **"Page not found"**: Verify Page ID is correct

---

## 📚 Additional Resources

- [Stripe Documentation](https://stripe.com/docs)
- [eBay Developer Portal](https://developer.ebay.com/develop)
- [Facebook Graph API](https://developers.facebook.com/docs/graph-api)
- [Gist List Support](mailto:support@abacus.ai)

---

## ✅ Integration Checklist

- [ ] Read this guide
- [ ] Decide which integrations you need
- [ ] Create accounts for chosen services
- [ ] Get API credentials
- [ ] Add to `.env` file
- [ ] Test in development
- [ ] Deploy to production
- [ ] Monitor usage and costs

---

**Remember:** All external API integrations are optional. The core Gist List features work perfectly without them!
