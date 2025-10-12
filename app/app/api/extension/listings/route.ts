
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'ACTIVE';

    // Get listings with all necessary data
    const listings = await prisma.listing.findMany({
      where: { 
        userId,
        status: status === 'all' ? undefined : status,
        itemIdentified: true, // Only get analyzed listings
      },
      include: {
        photos: {
          orderBy: { order: 'asc' },
        },
        platformData: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Format for extension
    const formattedListings = listings.map(listing => ({
      id: listing.id,
      title: listing.title || '',
      description: listing.description || '',
      theGist: listing.theGist || '',
      price: listing.price || 0,
      condition: listing.condition || 'used',
      conditionNotes: listing.conditionNotes || '',
      
      // Item details
      brand: listing.brand || '',
      model: listing.model || '',
      year: listing.year || '',
      color: listing.color || '',
      material: listing.material || '',
      size: listing.size || '',
      
      // Category and tags
      category: listing.category || 'general',
      tags: listing.tags || [],
      searchTags: listing.searchTags || [],
      
      // Shipping info
      fulfillmentType: listing.fulfillmentType || 'shipping',
      willingToShip: listing.willingToShip,
      okForLocals: listing.okForLocals,
      weight: listing.weight,
      dimensions: listing.dimensions,
      shippingCostEst: listing.shippingCostEst,
      location: listing.location || '',
      
      // Market insights
      bestPostTime: listing.bestPostTime || '',
      marketInsights: listing.marketInsights || '',
      
      // Premium features
      usePremium: listing.usePremium,
      premiumFacts: listing.premiumFacts || '',
      usefulLinks: listing.usefulLinks || '',
      
      // Platform recommendations
      recommendedPlatforms: listing.recommendedPlatforms || [],
      qualifiedPlatforms: listing.qualifiedPlatforms || [],
      
      // Images
      images: listing.photos.map(photo => photo.cdnUrl || photo.cloudStoragePath),
      
      // Platform-specific data
      platformData: listing.platformData.reduce((acc, pd) => {
        acc[pd.platform] = {
          customFields: pd.customFields ? JSON.parse(pd.customFields) : {},
          exported: pd.exported,
          posted: pd.posted,
          platformListingId: pd.platformListingId,
        };
        return acc;
      }, {} as Record<string, any>),
      
      // Metadata
      createdAt: listing.createdAt.getTime(),
      updatedAt: listing.updatedAt.getTime(),
    }));

    return NextResponse.json({
      success: true,
      listings: formattedListings,
      count: formattedListings.length,
    });
  } catch (error: any) {
    console.error('Extension listings fetch error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch listings' },
      { status: 500 }
    );
  }
}
