
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

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
    const { platform, platformListingId, url } = body;

    // Verify listing belongs to user
    const listing = await prisma.listing.findFirst({
      where: { id: listingId, userId },
    });

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    // Update platform data
    await prisma.platformData.upsert({
      where: {
        listingId_platform: {
          listingId,
          platform,
        },
      },
      update: {
        posted: true,
        postedAt: new Date(),
        platformListingId: platformListingId || null,
      },
      create: {
        listingId,
        platform,
        posted: true,
        postedAt: new Date(),
        platformListingId: platformListingId || null,
        customFields: '{}',
      },
    });

    // Check if posted to all selected platforms
    const platformDataCount = await prisma.platformData.count({
      where: {
        listingId,
        posted: true,
      },
    });

    // If posted to at least one platform, update listing status
    if (platformDataCount > 0) {
      await prisma.listing.update({
        where: { id: listingId },
        data: {
          status: 'POSTED',
          postedAt: listing.postedAt || new Date(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Listing marked as posted',
    });
  } catch (error: any) {
    console.error('Mark posted error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to mark as posted' },
      { status: 500 }
    );
  }
}
