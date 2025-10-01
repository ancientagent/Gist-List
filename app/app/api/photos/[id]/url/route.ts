
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { downloadFile } from '@/lib/s3';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const photoId = params.id;

    // Get photo with listing ownership check
    const photo = await prisma.photo.findFirst({
      where: {
        id: photoId,
        listing: {
          userId,
        },
      },
    });

    if (!photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    // Get signed URL
    const url = await downloadFile(photo.cloudStoragePath);

    return NextResponse.json({ url });
  } catch (error: any) {
    console.error('Photo URL error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to get photo URL' },
      { status: 500 }
    );
  }
}
