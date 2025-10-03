
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

    // Get user and listing
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    const listing = await prisma.listing.findUnique({
      where: { id: listingId, userId },
    });

    if (!user || !listing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Check if user has premium posts available
    const remainingPosts = user.premiumPostsTotal - user.premiumPostsUsed;
    
    if (user.subscriptionTier === 'FREE' && remainingPosts <= 0) {
      return NextResponse.json(
        { error: 'No premium posts remaining. Please upgrade or purchase more.' },
        { status: 403 }
      );
    }

    // Mark listing as using premium post
    await prisma.listing.update({
      where: { id: listingId },
      data: { usedPremiumPost: true },
    });

    // Increment user's premium posts used (only for free tier)
    if (user.subscriptionTier === 'FREE') {
      await prisma.user.update({
        where: { id: userId },
        data: { premiumPostsUsed: user.premiumPostsUsed + 1 },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Premium post activation error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to activate premium post' },
      { status: 500 }
    );
  }
}
