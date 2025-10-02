
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
        notifications: { orderBy: { createdAt: 'desc' } },
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

    return NextResponse.json(listing);
  } catch (error: any) {
    console.error('Update listing error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to update listing' },
      { status: 500 }
    );
  }
}
