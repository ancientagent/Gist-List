
import { NextRequest, NextResponse } from "next/server";
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
    const listing = await prisma.listing.findUnique({
      where: { id: params.id },
      include: {
        photos: {
          orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        },
        searchIndex: true,
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
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

    // Format response
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
