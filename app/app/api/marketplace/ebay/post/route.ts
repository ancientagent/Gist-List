
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { ebayAPI } from "@/lib/services/ebay-api";

const prisma = new PrismaClient();

/**
 * POST /api/marketplace/ebay/post
 * Post a listing to eBay
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
    const rateLimited = await ebayAPI.checkRateLimit(
      (session.user as any).id,
      "listing_create",
      user.subscriptionTier
    );

    if (rateLimited) {
      return NextResponse.json(
        { error: "Monthly eBay listing limit reached. Upgrade to Premium for unlimited listings." },
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

    // Prepare eBay listing data
    const ebayListing = {
      title: listing.title || "Untitled Item",
      description: listing.description || "",
      price: listing.price || 0,
      condition: listing.condition || "Good",
      category_id: "default", // TODO: Map category
      images: listing.photos.map((p) => p.cdnUrl || p.cloudStoragePath),
    };

    // Post to eBay
    const result = await ebayAPI.createListing((session.user as any).id, ebayListing);

    // Update listing with eBay ID
    await prisma.listing.update({
      where: { id: listingId },
      data: {
        ebayListingId: result.itemId,
        status: "POSTED",
        postedAt: new Date(),
      },
    });

    // Track usage
    await ebayAPI.trackUsage((session.user as any).id, "listing_create");

    return NextResponse.json({
      success: true,
      itemId: result.itemId,
      message: "Successfully posted to eBay!",
    });
  } catch (error: any) {
    console.error("eBay posting error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
