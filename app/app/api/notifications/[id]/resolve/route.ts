
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
    const notificationId = params.id;

    // Verify ownership through listing
    const notification = await prisma.aINotification.findFirst({
      where: {
        id: notificationId,
        listing: {
          userId,
        },
      },
    });

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    // Mark as resolved
    await prisma.aINotification.update({
      where: { id: notificationId },
      data: { resolved: true },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Resolve notification error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to resolve notification' },
      { status: 500 }
    );
  }
}
