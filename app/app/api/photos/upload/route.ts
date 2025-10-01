

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

    const formData = await request.formData();
    const photo = formData.get('photo') as File;
    const listingId = formData.get('listingId') as string;
    const isRetake = formData.get('isRetake') === 'true';
    const photoId = formData.get('photoId') as string | null;

    if (!photo || !listingId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Upload photo to S3
    const buffer = Buffer.from(await photo.arrayBuffer());
    const fileName = `listings/${Date.now()}-${photo.name}`;
    const cloudStoragePath = await uploadFile(buffer, fileName);

    if (isRetake && photoId) {
      // Update existing photo
      await prisma.photo.update({
        where: { id: photoId },
        data: { cloudStoragePath },
      });
    } else {
      // Create new photo
      const maxOrder = await prisma.photo.findFirst({
        where: { listingId },
        orderBy: { order: 'desc' },
        select: { order: true },
      });

      await prisma.photo.create({
        data: {
          listingId,
          cloudStoragePath,
          order: (maxOrder?.order ?? -1) + 1,
          isPrimary: false,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Photo upload error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to upload photo' },
      { status: 500 }
    );
  }
}
