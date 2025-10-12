
/**
 * API endpoint to trigger search index reindexing
 * 
 * POST /api/listings/reindex
 * - Reindex specific listing(s) or all listings
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { reindexListing, reindexListings, reindexAllListings } from '@/lib/search-indexing';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { listingId, listingIds, reindexAll } = body;

    // Reindex all listings (admin operation)
    if (reindexAll) {
      await reindexAllListings();
      return NextResponse.json({
        success: true,
        message: 'Full reindex initiated',
      });
    }

    // Reindex multiple listings
    if (listingIds && Array.isArray(listingIds)) {
      await reindexListings(listingIds);
      return NextResponse.json({
        success: true,
        message: `Reindexed ${listingIds.length} listings`,
      });
    }

    // Reindex single listing
    if (listingId) {
      const result = await reindexListing(listingId);
      
      if (!result) {
        return NextResponse.json(
          { error: 'Failed to reindex listing' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        listing: {
          id: listingId,
          gradeScore: result.gradeScore,
          verifiedCount: result.verifiedCount,
          totalTargets: result.totalTargets,
        },
      });
    }

    return NextResponse.json(
      { error: 'Invalid request: provide listingId, listingIds, or reindexAll' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[API] Reindex error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
