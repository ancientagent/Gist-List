

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

    // Get user and listing
    const [user, listing] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.listing.findUnique({ where: { id: listingId } }),
    ]);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!listing || listing.userId !== userId) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    // Check if user has premium posts remaining
    const premiumPostsUsed = user.premiumPostsUsed || 0;
    const premiumPostsTotal = user.premiumPostsTotal || 4;

    if (premiumPostsUsed >= premiumPostsTotal) {
      return NextResponse.json(
        { error: 'Premium upgrades exhausted' },
        { status: 403 }
      );
    }

    // Update listing to use premium
    await prisma.listing.update({
      where: { id: listingId },
      data: { usePremium: true },
    });

    // Increment user's premium posts used
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { premiumPostsUsed: premiumPostsUsed + 1 },
    });

    return NextResponse.json({
      success: true,
      premiumPostsUsed: updatedUser.premiumPostsUsed,
      premiumPostsTotal: updatedUser.premiumPostsTotal,
    });
  } catch (error: any) {
    console.error('Premium upgrade error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to activate premium features' },
      { status: 500 }
    );
  }
}
