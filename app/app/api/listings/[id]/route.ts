
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { queueReindex, shouldReindex } from '@/lib/search-indexing';

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

    const listing = await prisma.listing.findUnique({
      where: { id: listingId, userId },
      include: {
        photos: { orderBy: { order: 'asc' } },
        notifications: { 
          where: { resolved: false },
          orderBy: { createdAt: 'desc' }
        },
        user: {
          select: {
            subscriptionTier: true,
            premiumPostsUsed: true,
            premiumPostsTotal: true,
          }
        }
      },
    });

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    return NextResponse.json(listing);
  } catch (error: any) {
    console.error('Fetch listing error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch listing' },
      { status: 500 }
    );
  }
}

export async function PATCH(
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
    const data = await request.json();

    // Verify ownership
    const existing = await prisma.listing.findUnique({
      where: { id: listingId, userId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    // Update listing
    const listing = await prisma.listing.update({
      where: { id: listingId },
      data: {
        theGist: data.theGist ?? undefined,
        title: data.title ?? undefined,
        description: data.description ?? undefined,
        price: data.price ?? undefined,
        condition: data.condition ?? undefined,
        conditionNotes: data.conditionNotes ?? undefined,
        brand: data.brand ?? undefined,
        model: data.model ?? undefined,
        year: data.year ?? undefined,
        color: data.color ?? undefined,
        material: data.material ?? undefined,
        size: data.size ?? undefined,
        category: data.category ?? undefined,
        fulfillmentType: data.fulfillmentType ?? undefined,
        willingToShip: data.willingToShip ?? undefined,
        okForLocals: data.okForLocals ?? undefined,
        weight: data.weight ?? undefined,
        dimensions: data.dimensions ?? undefined,
        shippingCostEst: data.shippingCostEst ?? undefined,
        location: data.location ?? undefined,
        meetupPreference: data.meetupPreference ?? undefined,
        recommendedPlatforms: data.recommendedPlatforms ?? undefined,
        qualifiedPlatforms: data.qualifiedPlatforms ?? undefined,
        status: data.status ?? undefined,
      },
    });

    // Trigger search reindexing if relevant fields changed
    if (shouldReindex(data)) {
      queueReindex(listingId, 'listing_updated').catch((err) => {
        console.error('[SearchIndex] Failed to queue reindex:', err);
      });
    }

    // Auto-save shipping/location preferences for future listings
    if (data.fulfillmentType || data.willingToShip !== undefined || data.okForLocals !== undefined ||
        data.weight || data.dimensions || data.location || data.meetupPreference) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          ...(data.fulfillmentType && { defaultFulfillmentType: data.fulfillmentType }),
          ...(data.willingToShip !== undefined && { defaultWillingToShip: data.willingToShip }),
          ...(data.okForLocals !== undefined && { defaultOkForLocals: data.okForLocals }),
          ...(data.weight && { defaultWeight: data.weight }),
          ...(data.dimensions && { defaultDimensions: data.dimensions }),
          ...(data.location && { defaultLocation: data.location }),
          ...(data.meetupPreference && { defaultMeetupPreference: data.meetupPreference }),
        },
      });
    }

    return NextResponse.json(listing);
  } catch (error: any) {
    console.error('Update listing error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to update listing' },
      { status: 500 }
    );
  }
}
