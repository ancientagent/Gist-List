
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { ebayAPI } from "@/lib/services/ebay-api";

const prisma = new PrismaClient();

/**
 * POST /api/marketplace/research
 * Get market research data for a listing
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { listingId, query } = await request.json();

    if (!listingId || !query) {
      return NextResponse.json(
        { error: "Listing ID and search query required" },
        { status: 400 }
      );
    }

    // Check if we already have recent data (< 24 hours old)
    const existingResearch = await prisma.marketResearch.findUnique({
      where: { listingId },
    });

    if (existingResearch) {
      const ageHours =
        (Date.now() - existingResearch.dataFetchedAt.getTime()) / (1000 * 60 * 60);

      if (ageHours < 24) {
        return NextResponse.json({
          success: true,
          data: existingResearch,
          cached: true,
        });
      }
    }

    // Fetch fresh market data from eBay
    const marketData = await ebayAPI.getMarketResearch(query);

    // Store in database
    const research = await prisma.marketResearch.upsert({
      where: { listingId },
      update: {
        averagePrice: marketData.averagePrice,
        medianPrice: marketData.medianPrice,
        lowPrice: marketData.lowPrice,
        highPrice: marketData.highPrice,
        competitorCount: marketData.competitorCount,
        trendingScore: marketData.trendingScore,
        dataFetchedAt: new Date(),
      },
      create: {
        listingId,
        averagePrice: marketData.averagePrice,
        medianPrice: marketData.medianPrice,
        lowPrice: marketData.lowPrice,
        highPrice: marketData.highPrice,
        competitorCount: marketData.competitorCount,
        trendingScore: marketData.trendingScore,
        platform: "ebay",
      },
    });

    return NextResponse.json({
      success: true,
      data: research,
      cached: false,
    });
  } catch (error: any) {
    console.error("Market research error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
