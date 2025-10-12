
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// eBay API Configuration
const EBAY_CONFIG = {
  sandbox: {
    authUrl: "https://auth.sandbox.ebay.com/oauth2/authorize",
    tokenUrl: "https://api.sandbox.ebay.com/identity/v1/oauth2/token",
    apiUrl: "https://api.sandbox.ebay.com",
  },
  production: {
    authUrl: "https://auth.ebay.com/oauth2/authorize",
    tokenUrl: "https://api.ebay.com/identity/v1/oauth2/token",
    apiUrl: "https://api.ebay.com",
  },
};

const ENV = process.env.EBAY_ENVIRONMENT || "sandbox";
const config = EBAY_CONFIG[ENV as keyof typeof EBAY_CONFIG];

export interface EbayTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface EbayListing {
  title: string;
  description: string;
  price: number;
  condition: string;
  category_id: string;
  images: string[];
  shipping?: {
    type: string;
    cost: number;
  };
}

export class EbayAPIService {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor() {
    this.clientId = process.env.EBAY_CLIENT_ID || "";
    this.clientSecret = process.env.EBAY_CLIENT_SECRET || "";
    this.redirectUri = process.env.EBAY_REDIRECT_URI || "";

    if (!this.clientId || !this.clientSecret) {
      console.warn("eBay API credentials not configured");
    }
  }

  /**
   * Generate OAuth authorization URL
   */
  getAuthUrl(userId: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: "code",
      scope: [
        "https://api.ebay.com/oauth/api_scope",
        "https://api.ebay.com/oauth/api_scope/sell.account",
        "https://api.ebay.com/oauth/api_scope/sell.inventory",
      ].join(" "),
      state: userId, // Pass userId for callback
    });

    return `${config.authUrl}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access/refresh tokens
   */
  async exchangeCodeForTokens(code: string): Promise<EbayTokens> {
    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64");

    const response = await fetch(config.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${auth}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: this.redirectUri,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`eBay token exchange failed: ${error}`);
    }

    return response.json();
  }

  /**
   * Refresh expired access token
   */
  async refreshAccessToken(refreshToken: string): Promise<EbayTokens> {
    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64");

    const response = await fetch(config.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${auth}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`eBay token refresh failed: ${error}`);
    }

    return response.json();
  }

  /**
   * Get valid access token for user (auto-refresh if needed)
   */
  async getAccessToken(userId: string): Promise<string> {
    const credential = await prisma.ebayCredential.findUnique({
      where: { userId },
    });

    if (!credential) {
      throw new Error("eBay not connected for this user");
    }

    // Check if token is expired or will expire in next 5 minutes
    const expiresIn = credential.expiresAt.getTime() - Date.now();
    if (expiresIn < 5 * 60 * 1000) {
      // Refresh token
      const tokens = await this.refreshAccessToken(credential.refreshToken);
      
      // Update credentials
      await prisma.ebayCredential.update({
        where: { userId },
        data: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        },
      });

      return tokens.access_token;
    }

    return credential.accessToken;
  }

  /**
   * Create listing on eBay
   */
  async createListing(userId: string, listing: EbayListing): Promise<{ itemId: string }> {
    const accessToken = await this.getAccessToken(userId);

    // Use eBay Trading API to create listing
    const response = await fetch(`${config.apiUrl}/sell/inventory/v1/inventory_item`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        product: {
          title: listing.title,
          description: listing.description,
          aspects: {
            Brand: ["Generic"],
          },
          imageUrls: listing.images,
        },
        condition: this.mapCondition(listing.condition),
        availability: {
          shipToLocationAvailability: {
            quantity: 1,
          },
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`eBay listing creation failed: ${error}`);
    }

    const data = await response.json();
    return { itemId: data.sku };
  }

  /**
   * Get market research data for an item
   */
  async getMarketResearch(query: string): Promise<{
    averagePrice: number;
    medianPrice: number;
    lowPrice: number;
    highPrice: number;
    competitorCount: number;
    trendingScore: number;
  }> {
    const accessToken = await this.getAccessToken("system"); // Use app token for public API

    // Use eBay Finding API to search completed listings
    const response = await fetch(
      `${config.apiUrl}/buy/browse/v1/item_summary/search?q=${encodeURIComponent(query)}&limit=50&filter=conditionIds:{1000|1500|2000|2500|3000}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Market research failed");
    }

    const data = await response.json();
    const prices = data.itemSummaries?.map((item: any) => parseFloat(item.price.value)) || [];

    if (prices.length === 0) {
      throw new Error("No market data found");
    }

    prices.sort((a: number, b: number) => a - b);

    return {
      averagePrice: prices.reduce((sum: number, p: number) => sum + p, 0) / prices.length,
      medianPrice: prices[Math.floor(prices.length / 2)],
      lowPrice: prices[0],
      highPrice: prices[prices.length - 1],
      competitorCount: prices.length,
      trendingScore: Math.random() * 100, // TODO: Implement actual trending calculation
    };
  }

  /**
   * Map generic condition to eBay condition ID
   */
  private mapCondition(condition: string): string {
    const mapping: Record<string, string> = {
      "Brand New": "NEW",
      "Like New": "LIKE_NEW",
      "Very Good": "VERY_GOOD",
      "Good": "GOOD",
      Fair: "ACCEPTABLE",
      Poor: "FOR_PARTS_OR_NOT_WORKING",
    };

    return mapping[condition] || "USED_ACCEPTABLE";
  }

  /**
   * Track API usage for rate limiting
   */
  async trackUsage(userId: string, action: string): Promise<void> {
    const month = new Date().toISOString().slice(0, 7); // YYYY-MM

    await prisma.apiUsage.upsert({
      where: {
        userId_platform_action_month: {
          userId,
          platform: "ebay",
          action,
          month,
        },
      },
      update: {
        count: { increment: 1 },
      },
      create: {
        userId,
        platform: "ebay",
        action,
        month,
        count: 1,
      },
    });
  }

  /**
   * Check if user has exceeded rate limits
   */
  async checkRateLimit(userId: string, action: string, tier: string): Promise<boolean> {
    const month = new Date().toISOString().slice(0, 7);

    const usage = await prisma.apiUsage.findUnique({
      where: {
        userId_platform_action_month: {
          userId,
          platform: "ebay",
          action,
          month,
        },
      },
    });

    const limits: Record<string, number> = {
      FREE: 50,
      PREMIUM: 999999, // Unlimited
    };

    const limit = limits[tier] || limits.FREE;
    return (usage?.count || 0) >= limit;
  }
}

export const ebayAPI = new EbayAPIService();
