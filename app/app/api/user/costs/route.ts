
// API route for user cost tracking

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { calculateListingCost } from '@/lib/cost-calculator';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Get user with cost data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        totalTokensUsed: true,
        totalStorageBytes: true,
        totalApiCost: true,
        totalStorageCost: true,
        listingCount: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get per-listing cost breakdown
    const listings = await prisma.listing.findMany({
      where: { userId },
      select: {
        id: true,
        title: true,
        tokensUsed: true,
        storageBytes: true,
        apiCost: true,
        storageCost: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 20, // Last 20 listings
    });

    const totalCost = (user.totalApiCost || 0) + (user.totalStorageCost || 0);
    const avgCostPerListing = user.listingCount > 0 ? totalCost / user.listingCount : 0;

    return NextResponse.json({
      summary: {
        totalTokensUsed: user.totalTokensUsed || 0,
        totalStorageBytes: user.totalStorageBytes?.toString() || '0',
        totalApiCost: user.totalApiCost || 0,
        totalStorageCost: user.totalStorageCost || 0,
        totalCost,
        listingCount: user.listingCount,
        avgCostPerListing,
      },
      recentListings: listings.map(listing => ({
        id: listing.id,
        title: listing.title || 'Untitled',
        tokensUsed: listing.tokensUsed || 0,
        storageBytes: listing.storageBytes || 0,
        apiCost: listing.apiCost || 0,
        storageCost: listing.storageCost || 0,
        totalCost: (listing.apiCost || 0) + (listing.storageCost || 0),
        createdAt: listing.createdAt,
      })),
    });
  } catch (error: any) {
    console.error('Get costs error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to get costs' },
      { status: 500 }
    );
  }
}
