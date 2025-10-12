
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Get scheduled posts
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    const scheduledPosts = await prisma.scheduledPost.findMany({
      where: { userId },
      include: {
        listing: {
          include: {
            photos: {
              where: { isPrimary: true },
              take: 1,
            },
          },
        },
      },
      orderBy: { scheduledTime: 'asc' },
    });

    return NextResponse.json({
      success: true,
      scheduledPosts: scheduledPosts.map(sp => ({
        id: sp.id,
        listingId: sp.listingId,
        platforms: sp.platforms,
        scheduledTime: sp.scheduledTime.getTime(),
        status: sp.status,
        useAITime: sp.useAITime,
        listing: {
          id: sp.listing.id,
          title: sp.listing.title,
          price: sp.listing.price,
          primaryImage: sp.listing.photos[0]?.cdnUrl || sp.listing.photos[0]?.cloudStoragePath,
        },
        createdAt: sp.createdAt.getTime(),
      })),
    });
  } catch (error: any) {
    console.error('Get scheduled posts error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch scheduled posts' },
      { status: 500 }
    );
  }
}

// Create scheduled post
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();
    const { listingId, platforms, scheduledTime, useAITime } = body;

    // Check if user has premium access
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionTier: true },
    });

    if (user?.subscriptionTier === 'FREE') {
      return NextResponse.json(
        { error: 'Scheduled posting is a premium feature' },
        { status: 403 }
      );
    }

    // Verify listing belongs to user
    const listing = await prisma.listing.findFirst({
      where: { id: listingId, userId },
    });

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    // Parse scheduled time
    let postTime = new Date(scheduledTime);
    
    // If using AI recommended time and listing has bestPostTime
    if (useAITime && listing.bestPostTime) {
      // Parse AI recommended time (format: "Tuesday 6-8 PM")
      // For now, we'll just use the provided time
      // TODO: Implement smart parsing of bestPostTime
      postTime = new Date(scheduledTime);
    }

    // Create scheduled post
    const scheduledPost = await prisma.scheduledPost.create({
      data: {
        userId,
        listingId,
        platforms,
        scheduledTime: postTime,
        useAITime: useAITime || false,
        status: 'PENDING',
      },
    });

    return NextResponse.json({
      success: true,
      scheduledPost: {
        id: scheduledPost.id,
        scheduledTime: scheduledPost.scheduledTime.getTime(),
        platforms: scheduledPost.platforms,
      },
    });
  } catch (error: any) {
    console.error('Schedule post error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to schedule post' },
      { status: 500 }
    );
  }
}

// Delete scheduled post
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { searchParams } = new URL(request.url);
    const scheduleId = searchParams.get('id');

    if (!scheduleId) {
      return NextResponse.json({ error: 'Schedule ID required' }, { status: 400 });
    }

    // Verify scheduled post belongs to user
    const scheduledPost = await prisma.scheduledPost.findFirst({
      where: { id: scheduleId, userId },
    });

    if (!scheduledPost) {
      return NextResponse.json({ error: 'Scheduled post not found' }, { status: 404 });
    }

    // Delete scheduled post
    await prisma.scheduledPost.delete({
      where: { id: scheduleId },
    });

    return NextResponse.json({
      success: true,
      message: 'Scheduled post deleted',
    });
  } catch (error: any) {
    console.error('Delete scheduled post error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to delete scheduled post' },
      { status: 500 }
    );
  }
}
