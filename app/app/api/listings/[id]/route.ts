
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Convert gradeScore (0-1) to letter grade
 */
function convertScoreToGrade(score: number): string {
  if (score >= 0.9) return "A";
  if (score >= 0.8) return "B";
  if (score >= 0.7) return "C";
  if (score >= 0.6) return "D";
  return "F";
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    const listing = await prisma.listing.findUnique({
      where: { id: params.id },
      include: {
        photos: {
          orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        },
        notifications: {
          where: { resolved: false },
          orderBy: { createdAt: "desc" },
        },
        searchIndex: true,
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            subscriptionTier: true,
            premiumPostsUsed: true,
            premiumPostsTotal: true,
          },
        },
      },
    });

    if (!listing) {
      return NextResponse.json(
        { error: "Listing not found" },
        { status: 404 }
      );
    }

    // Check if requesting user is the owner
    const isOwner = userId && userId === listing.userId;

    // If owner, return full listing data for editing
    if (isOwner) {
      // Filter notifications based on subscription tier
      // Free users: Only ALERT and QUESTION notifications
      // Premium users: All notifications including INSIGHT
      const isPremium = listing.user.subscriptionTier === 'premium';
      const filteredNotifications = listing.notifications.filter((n: any) => {
        if (n.type === 'INSIGHT' && !isPremium) {
          return false; // Hide insights from free users
        }
        return true;
      });

      return NextResponse.json({
        ...listing,
        notifications: filteredNotifications,
        user: {
          subscriptionTier: listing.user.subscriptionTier,
          premiumPostsUsed: listing.user.premiumPostsUsed,
          premiumPostsTotal: listing.user.premiumPostsTotal,
        },
      });
    }

    // If not owner, return minimal public marketplace view
    const response = {
      id: listing.id,
      title: listing.title,
      description: listing.description,
      price: listing.price,
      condition: listing.condition,
      category: listing.category,
      location: listing.location,
      photos: listing.photos.map((photo: any) => ({
        id: photo.id,
        url: photo.url,
        thumbnailUrl: photo.thumbnailUrl,
        isPrimary: photo.isPrimary,
      })),
      seller: {
        id: listing.user.id,
        name: listing.user.fullName || listing.user.email,
        email: listing.user.email,
      },
      grades: listing.searchIndex
        ? {
            overall: convertScoreToGrade(listing.searchIndex.gradeScore),
            gradeScore: listing.searchIndex.gradeScore,
            verifiedCount: (listing.searchIndex.gradeSignals as any)?.verifiedFacetCount || 0,
            totalTargets: (listing.searchIndex.gradeSignals as any)?.totalFacetTargets || 0,
          }
        : null,
      createdAt: listing.createdAt,
      updatedAt: listing.updatedAt,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching listing:", error);
    return NextResponse.json(
      { error: "Failed to fetch listing" },
      { status: 500 }
    );
  }
}
