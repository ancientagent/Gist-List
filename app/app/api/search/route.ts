
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

interface SearchParams {
  query?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  condition?: string;
  location?: string;
  radius?: number;
  sortBy?: "relevance" | "price_low" | "price_high" | "newest";
  page?: number;
  limit?: number;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const params: SearchParams = {
      query: searchParams.get("query") || undefined,
      category: searchParams.get("category") || undefined,
      minPrice: searchParams.get("minPrice")
        ? parseFloat(searchParams.get("minPrice")!)
        : undefined,
      maxPrice: searchParams.get("maxPrice")
        ? parseFloat(searchParams.get("maxPrice")!)
        : undefined,
      condition: searchParams.get("condition") || undefined,
      location: searchParams.get("location") || undefined,
      radius: searchParams.get("radius")
        ? parseInt(searchParams.get("radius")!)
        : undefined,
      sortBy:
        (searchParams.get("sortBy") as SearchParams["sortBy"]) || "relevance",
      page: searchParams.get("page") ? parseInt(searchParams.get("page")!) : 1,
      limit: searchParams.get("limit")
        ? parseInt(searchParams.get("limit")!)
        : 20,
    };

    // Build where clause
    const where: any = {
      status: "ACTIVE",
      isPublic: true,
    };

    // Text search using SearchIndex
    if (params.query) {
      where.searchIndex = {
        OR: [
          { searchableTitle: { contains: params.query, mode: "insensitive" } },
          {
            searchableDescription: {
              contains: params.query,
              mode: "insensitive",
            },
          },
          { searchableTags: { contains: params.query, mode: "insensitive" } },
          {
            searchableCategory: { contains: params.query, mode: "insensitive" },
          },
        ],
      };
    }

    // Category filter
    if (params.category) {
      where.category = params.category;
    }

    // Price range
    if (params.minPrice !== undefined || params.maxPrice !== undefined) {
      where.price = {};
      if (params.minPrice !== undefined) {
        where.price.gte = params.minPrice;
      }
      if (params.maxPrice !== undefined) {
        where.price.lte = params.maxPrice;
      }
    }

    // Condition filter
    if (params.condition) {
      where.condition = params.condition;
    }

    // Location filter (simplified - in production, use geospatial queries)
    if (params.location) {
      where.location = { contains: params.location, mode: "insensitive" };
    }

    // Build orderBy
    let orderBy: any = {};
    switch (params.sortBy) {
      case "price_low":
        orderBy = { price: "asc" };
        break;
      case "price_high":
        orderBy = { price: "desc" };
        break;
      case "newest":
        orderBy = { createdAt: "desc" };
        break;
      case "relevance":
      default:
        // For relevance, we'll use a combination of factors
        orderBy = [
          { searchIndex: { overallGrade: "desc" } },
          { createdAt: "desc" },
        ];
        break;
    }

    // Calculate pagination
    const skip = ((params.page || 1) - 1) * (params.limit || 20);
    const take = params.limit || 20;

    // Execute query
    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        orderBy,
        skip,
        take,
        include: {
          searchIndex: true,
          photos: {
            where: { isPrimary: true },
            take: 1,
          },
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      }),
      prisma.listing.count({ where }),
    ]);

    // Format response
    const results = listings.map((listing: any) => ({
      id: listing.id,
      title: listing.title,
      description: listing.description,
      price: listing.price,
      condition: listing.condition,
      category: listing.category,
      location: listing.location,
      primaryPhoto: listing.photos[0]?.thumbnailUrl || listing.photos[0]?.url,
      seller: {
        id: listing.user.id,
        name: listing.user.fullName || listing.user.email,
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
    }));

    return NextResponse.json({
      results,
      pagination: {
        page: params.page || 1,
        limit: params.limit || 20,
        total,
        totalPages: Math.ceil(total / (params.limit || 20)),
      },
      filters: params,
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Failed to search listings" },
      { status: 500 }
    );
  }
}
