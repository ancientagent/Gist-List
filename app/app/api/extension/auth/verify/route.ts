
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ 
        authenticated: false, 
        error: 'Not authenticated' 
      }, { status: 401 });
    }

    const userId = (session.user as any).id;
    
    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        subscriptionTier: true,
        premiumPostsUsed: true,
        premiumPostsTotal: true,
      },
    });

    if (!user) {
      return NextResponse.json({ 
        authenticated: false, 
        error: 'User not found' 
      }, { status: 404 });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        subscriptionTier: user.subscriptionTier,
        isPremium: user.subscriptionTier === 'PREMIUM' || user.subscriptionTier === 'PRO',
        premiumPostsRemaining: user.premiumPostsTotal - user.premiumPostsUsed,
      },
    });
  } catch (error: any) {
    console.error('Extension auth verification error:', error);
    return NextResponse.json(
      { authenticated: false, error: error?.message || 'Verification failed' },
      { status: 500 }
    );
  }
}
