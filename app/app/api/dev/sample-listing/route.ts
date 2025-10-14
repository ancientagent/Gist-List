
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Development-only endpoint to create sample listings
export async function POST(req: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Not available in production' },
      { status: 403 }
    );
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Sample data for testing
    const sampleItems = [
      {
        title: 'Vintage Sony Walkman WM-D6C Professional Cassette Recorder',
        description: 'Classic professional-grade portable cassette recorder from the 1980s. Features metal tape compatibility, Dolby B and C noise reduction, and excellent sound quality. Perfect for collectors and audiophiles.',
        category: 'Electronics',
        condition: 'GOOD',
        price: 450.00,
        isPremiumItem: true,
        specialClass: 'Vintage',
      },
      {
        title: 'Nike Air Jordan 1 Retro High OG - University Blue',
        description: 'Air Jordan 1 High in University Blue colorway, Size 10.5, gently worn with original box. Classic basketball sneaker with iconic design and premium leather construction.',
        category: 'Footwear',
        condition: 'VERY_GOOD',
        price: 225.00,
        isPremiumItem: true,
        specialClass: 'Collectible',
      },
      {
        title: 'Vintage Pyrex Pink Gooseberry Cinderella Mixing Bowl Set',
        description: 'Complete set of 4 vintage Pyrex mixing bowls in the rare Pink Gooseberry pattern. Includes 441, 442, 443, and 444 sizes. Excellent condition with minimal wear. Great for collectors or daily use.',
        category: 'Home & Kitchen',
        condition: 'EXCELLENT',
        price: 180.00,
        isPremiumItem: true,
        specialClass: 'Vintage',
      },
      {
        title: 'Apple MacBook Pro 13" M1 2020 - 16GB RAM, 512GB SSD',
        description: 'MacBook Pro with M1 chip, 16GB unified memory, 512GB SSD. Space Gray color. Includes original box and charger. Excellent battery health. Perfect for professionals and students.',
        category: 'Computers',
        condition: 'LIKE_NEW',
        price: 950.00,
        isPremiumItem: false,
        specialClass: null,
      },
      {
        title: 'Patagonia Better Sweater Fleece Jacket - Men\'s Large, Navy',
        description: 'Classic Patagonia Better Sweater in navy blue, size Large. Full-zip fleece jacket with sweater-knit face and soft fleece interior. Minimal wear, great condition.',
        category: 'Clothing',
        condition: 'VERY_GOOD',
        price: 65.00,
        isPremiumItem: false,
        specialClass: null,
      },
    ];

    // Pick a random sample item
    const sample = sampleItems[Math.floor(Math.random() * sampleItems.length)];

    // Create listing with sample data
    const listing = await prisma.listing.create({
      data: {
        userId: user.id,
        title: sample.title,
        description: sample.description,
        category: sample.category,
        condition: sample.condition,
        price: sample.price,
        theGist: `DEV SAMPLE: ${sample.title}`,
        confidence: 0.95,
        isPremiumItem: sample.isPremiumItem,
        specialClass: sample.specialClass,
        // Platform recommendations
        recommendedPlatforms: ['eBay', 'Mercari', 'Poshmark'],
        qualifiedPlatforms: ['eBay', 'Mercari', 'Poshmark', 'Facebook', 'OfferUp'],
        // Mock market insights
        marketInsights: sample.isPremiumItem
          ? `This ${sample.specialClass?.toLowerCase()} item typically commands premium prices due to its rarity and collectibility. Consider listing on specialized platforms.`
          : 'Popular item with steady demand. Price competitively for quick sale.',
        premiumFacts: sample.isPremiumItem
          ? 'Items in this category have shown strong appreciation over time. Collectors actively seek these pieces.'
          : null,
        tokensUsed: 0,
        apiCost: 0,
        status: 'DRAFT',
      },
    });

    return NextResponse.json({
      success: true,
      listingId: listing.id,
      message: 'Sample listing created',
    });
  } catch (error: any) {
    console.error('Sample listing creation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create sample listing' },
      { status: 500 }
    );
  }
}
