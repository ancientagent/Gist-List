
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

    const listings = await prisma.listing.findMany({
      where: { userId },
      include: {
        photos: {
          where: { isPrimary: true },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(listings);
  } catch (error: any) {
    console.error('Fetch listings error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch listings' },
      { status: 500 }
    );
  }
}
