
// API route for profit calculation

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { calculateProfitForAllPlatforms, getBestPlatformByProfit } from '@/lib/profit-calculator';
import { reindexListing } from '@/lib/search-index';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const listingId = params.id;

    // Get listing
    const listing = await prisma.listing.findUnique({
      where: { id: listingId, userId },
      include: {
        photos: true,
      },
    });

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    const sellingPrice = listing.price || 0;
    const purchasePrice = listing.purchasePrice || 0;
    const shippingCost = listing.shippingCostEst || 0;
    const gistListCost = (listing.apiCost || 0) + (listing.storageCost || 0);
    
    // Calculate profit for all qualified platforms
    const platforms = listing.qualifiedPlatforms || listing.recommendedPlatforms || [];
    const profitBreakdowns = calculateProfitForAllPlatforms(
      sellingPrice,
      purchasePrice,
      platforms,
      shippingCost,
      gistListCost
    );

    // Get best platform
    const bestPlatform = getBestPlatformByProfit(profitBreakdowns);

    return NextResponse.json({
      listing: {
        id: listing.id,
        title: listing.title,
        sellingPrice,
        purchasePrice,
        shippingCost,
        gistListCost,
      },
      profitBreakdowns,
      bestPlatform,
    });
  } catch (error: any) {
    console.error('Calculate profit error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to calculate profit' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const listingId = params.id;
    const body = await request.json();
    const { purchasePrice } = body;

    if (purchasePrice === undefined) {
      return NextResponse.json({ error: 'Purchase price required' }, { status: 400 });
    }

    // Update listing with purchase price and recalculate profit
    const listing = await prisma.listing.findUnique({
      where: { id: listingId, userId },
    });

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    const sellingPrice = listing.price || 0;
    const shippingCost = listing.shippingCostEst || 0;
    const gistListCost = (listing.apiCost || 0) + (listing.storageCost || 0);
    
    // Calculate profit for recommended platforms
    const platforms = listing.recommendedPlatforms || [];
    const profitBreakdowns = calculateProfitForAllPlatforms(
      sellingPrice,
      purchasePrice,
      platforms,
      shippingCost,
      gistListCost
    );

    const bestPlatform = getBestPlatformByProfit(profitBreakdowns);
    const estimatedProfit = bestPlatform?.profit.netProfit || 0;
    const profitMargin = bestPlatform?.profit.profitMargin || 0;

    // Update listing
    await prisma.listing.update({
      where: { id: listingId },
      data: {
        purchasePrice,
        estimatedProfit,
        profitMargin,
      },
    });

    await reindexListing(listingId);

    return NextResponse.json({
      success: true,
      purchasePrice,
      estimatedProfit,
      profitMargin,
      profitBreakdowns,
      bestPlatform,
    });
  } catch (error: any) {
    console.error('Update purchase price error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to update purchase price' },
      { status: 500 }
    );
  }
}
