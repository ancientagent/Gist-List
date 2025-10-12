
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const REVERB_API_URL = "https://api.reverb.com/api";

export interface ReverbListing {
  make: string;
  model: string;
  title: string;
  description: string;
  price: number;
  condition: string;
  categories: string[];
  photos: string[];
  shipping?: {
    local: boolean;
    regions: string[];
  };
}

export class ReverbAPIService {
  /**
   * Get API token for user
   */
  private async getApiToken(userId: string): Promise<string> {
    const credential = await prisma.reverbCredential.findUnique({
      where: { userId },
    });

    if (!credential) {
      throw new Error("Reverb not connected for this user");
    }

    return credential.apiToken;
  }

  /**
   * Create listing on Reverb
   */
  async createListing(userId: string, listing: ReverbListing): Promise<{ listingId: string }> {
    const apiToken = await this.getApiToken(userId);

    const response = await fetch(`${REVERB_API_URL}/listings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiToken}`,
        "Accept-Version": "3.0",
      },
      body: JSON.stringify({
        make: listing.make,
        model: listing.model,
        title: listing.title,
        description: listing.description,
        price: {
          amount: listing.price.toFixed(2),
          currency: "USD",
        },
        condition: {
          uuid: this.mapCondition(listing.condition),
        },
        categories: listing.categories.map((id) => ({ uuid: id })),
        photos: listing.photos.map((url, index) => ({
          _link: url,
          position: index,
        })),
        shipping: {
          local: listing.shipping?.local || false,
          regions: listing.shipping?.regions || [],
        },
        publish: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Reverb listing creation failed: ${error}`);
    }

    const data = await response.json();
    return { listingId: data.listing.id };
  }

  /**
   * Get instrument value/market data
   */
  async getInstrumentValue(make: string, model: string): Promise<{
    averagePrice: number;
    lowPrice: number;
    highPrice: number;
    listingCount: number;
  }> {
    // Use public search API (no auth required)
    const query = `${make} ${model}`;
    const response = await fetch(
      `${REVERB_API_URL}/listings/all?query=${encodeURIComponent(query)}&per_page=50`
    );

    if (!response.ok) {
      throw new Error("Reverb market research failed");
    }

    const data = await response.json();
    const prices = data.listings
      .map((item: any) => parseFloat(item.price.amount))
      .filter((price: number) => !isNaN(price));

    if (prices.length === 0) {
      throw new Error("No market data found");
    }

    prices.sort((a: number, b: number) => a - b);

    return {
      averagePrice: prices.reduce((sum: number, p: number) => sum + p, 0) / prices.length,
      lowPrice: prices[0],
      highPrice: prices[prices.length - 1],
      listingCount: prices.length,
    };
  }

  /**
   * Map generic condition to Reverb condition UUID
   */
  private mapCondition(condition: string): string {
    const mapping: Record<string, string> = {
      "Brand New": "brand-new",
      "Like New": "mint",
      "Very Good": "excellent",
      Good: "very-good",
      Fair: "good",
      Poor: "fair",
    };

    return mapping[condition] || "good";
  }

  /**
   * Track API usage
   */
  async trackUsage(userId: string, action: string): Promise<void> {
    const month = new Date().toISOString().slice(0, 7);

    await prisma.apiUsage.upsert({
      where: {
        userId_platform_action_month: {
          userId,
          platform: "reverb",
          action,
          month,
        },
      },
      update: {
        count: { increment: 1 },
      },
      create: {
        userId,
        platform: "reverb",
        action,
        month,
        count: 1,
      },
    });
  }

  /**
   * Check rate limits
   */
  async checkRateLimit(userId: string, action: string, tier: string): Promise<boolean> {
    const month = new Date().toISOString().slice(0, 7);

    const usage = await prisma.apiUsage.findUnique({
      where: {
        userId_platform_action_month: {
          userId,
          platform: "reverb",
          action,
          month,
        },
      },
    });

    const limits: Record<string, number> = {
      FREE: 25,
      PREMIUM: 999999,
    };

    const limit = limits[tier] || limits.FREE;
    return (usage?.count || 0) >= limit;
  }
}

export const reverbAPI = new ReverbAPIService();
