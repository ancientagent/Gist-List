
/**
 * Post listing to Etsy
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/lib/auth";
import { createEtsyListing } from '@/lib/etsy-service';
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();
    const { listingId } = body;

    if (!listingId) {
      return NextResponse.json({ error: 'Listing ID required' }, { status: 400 });
    }

    // Get listing from database
    const listing = await prisma.listing.findUnique({
      where: { id: listingId, userId },
      include: { photos: true },
    });

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    // Check if user has premium tier or within free platform limit
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    const tier = user?.subscriptionTier || 'FREE';
    const isPremium = tier === 'BASIC' || tier === 'PRO';

    // For free users, check if they've already posted to 3 platforms
    if (!isPremium) {
      const platformDataCount = await prisma.platformData.count({
        where: {
          listingId,
          posted: true,
        },
      });

      if (platformDataCount >= 3) {
        return NextResponse.json(
          {
            error: 'Free tier limited to 3 platforms per listing. Upgrade to post to more!',
            requiresUpgrade: true,
          },
          { status: 403 }
        );
      }
    }

    // Get photo URLs
    const imageUrls = listing.photos
      .sort((a: any, b: any) => a.order - b.order)
      .map((photo: any) => photo.cdnUrl || photo.cloudStoragePath)
      .filter(Boolean) as string[];

    // Prepare tags from listing
    const tags = listing.tags?.slice(0, 13) || []; // Etsy max 13 tags

    // Create Etsy listing
    const etsyListing = await createEtsyListing(userId, {
      title: listing.title || 'Untitled Item',
      description: listing.description || '',
      price: listing.price || 0,
      quantity: 1,
      tags,
      imageUrls,
    });

    // Update listing with Etsy listing ID
    await prisma.listing.update({
      where: { id: listingId },
      data: {
        etsyListingId: etsyListing.listing_id.toString(),
      },
    });

    // Create or update platform data
    await prisma.platformData.upsert({
      where: {
        listingId_platform: {
          listingId,
          platform: 'etsy',
        },
      },
      create: {
        listingId,
        platform: 'etsy',
        platformListingId: etsyListing.listing_id.toString(),
        posted: true,
        postedAt: new Date(),
        customFields: JSON.stringify({
          state: etsyListing.state,
          url: etsyListing.url,
        }),
      },
      update: {
        platformListingId: etsyListing.listing_id.toString(),
        posted: true,
        postedAt: new Date(),
        customFields: JSON.stringify({
          state: etsyListing.state,
          url: etsyListing.url,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      etsyListingId: etsyListing.listing_id,
      url: etsyListing.url,
      state: etsyListing.state,
      message: 'Posted to Etsy as draft. Visit Etsy to publish!',
    });
  } catch (error: any) {
    console.error('Etsy post error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to post to Etsy' },
      { status: 500 }
    );
  }
}
