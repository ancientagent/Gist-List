
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { reverbAPI } from "@/lib/services/reverb-api";

const prisma = new PrismaClient();

/**
 * POST /api/marketplace/reverb/post
 * Post a listing to Reverb
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { listingId } = await request.json();

    if (!listingId) {
      return NextResponse.json({ error: "Listing ID required" }, { status: 400 });
    }

    // Get user and subscription tier
    const user = await prisma.user.findUnique({
      where: { id: (session.user as any).id },
      select: { subscriptionTier: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check rate limits
    const rateLimited = await reverbAPI.checkRateLimit(
      (session.user as any).id,
      "listing_create",
      user.subscriptionTier
    );

    if (rateLimited) {
      return NextResponse.json(
        { error: "Monthly Reverb listing limit reached. Upgrade to Premium for unlimited listings." },
        { status: 429 }
      );
    }

    // Get listing
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: { photos: true },
    });

    if (!listing || listing.userId !== (session.user as any).id) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    // Prepare Reverb listing data
    const reverbListing = {
      make: listing.brand || "Generic",
      model: listing.model || listing.title || "Unknown",
      title: listing.title || "Untitled Item",
      description: listing.description || "",
      price: listing.price || 0,
      condition: listing.condition || "Good",
      categories: [], // TODO: Map categories
      photos: listing.photos
        .map((p) => p.cdnUrl || p.cloudStoragePath)
        .filter((url): url is string => !!url), // Filter out null/undefined
    };

    // Post to Reverb
    const result = await reverbAPI.createListing((session.user as any).id, reverbListing);

    // Update listing with Reverb ID
    await prisma.listing.update({
      where: { id: listingId },
      data: {
        reverbListingId: result.listingId,
        status: "POSTED",
        postedAt: new Date(),
      },
    });

    // Track usage
    await reverbAPI.trackUsage((session.user as any).id, "listing_create");

    return NextResponse.json({
      success: true,
      listingId: result.listingId,
      message: "Successfully posted to Reverb!",
    });
  } catch (error: any) {
    console.error("Reverb posting error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
