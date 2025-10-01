
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { uploadFile } from '@/lib/s3';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Get user to check listing limit
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check free tier limit
    if (user.subscriptionTier === 'FREE' && user.listingCount >= 4) {
      return NextResponse.json(
        { error: 'Free tier limit reached. Upgrade to continue listing.' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const photo = formData.get('photo') as File;
    const theGist = formData.get('theGist') as string;

    if (!photo) {
      return NextResponse.json({ error: 'Photo is required' }, { status: 400 });
    }

    // Upload photo to S3
    const buffer = Buffer.from(await photo.arrayBuffer());
    const fileName = `listings/${Date.now()}-${photo.name}`;
    const cloudStoragePath = await uploadFile(buffer, fileName);

    // Create listing
    const listing = await prisma.listing.create({
      data: {
        userId,
        theGist: theGist || null,
        status: 'DRAFT',
      },
    });

    // Create photo record
    await prisma.photo.create({
      data: {
        listingId: listing.id,
        cloudStoragePath,
        order: 0,
        isPrimary: true,
      },
    });

    // Increment user listing count
    await prisma.user.update({
      where: { id: userId },
      data: { listingCount: user.listingCount + 1 },
    });

    return NextResponse.json({
      success: true,
      listingId: listing.id,
    });
  } catch (error: any) {
    console.error('Create listing error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to create listing' },
      { status: 500 }
    );
  }
}
