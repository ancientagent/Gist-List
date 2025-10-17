import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const session = await getServerSession(authOptions);
    const sessionUserId = (session?.user as any)?.id as string | undefined;

    const {
      listingId,
      eventType,
      metadata,
      userId: bodyUserId,
    }: {
      listingId?: string;
      eventType?: string;
      metadata?: Record<string, unknown> | null;
      userId?: string;
    } = body ?? {};

    if (!listingId || typeof listingId !== 'string') {
      return NextResponse.json({ error: 'listingId is required' }, { status: 400 });
    }

    if (!eventType || typeof eventType !== 'string') {
      return NextResponse.json({ error: 'eventType is required' }, { status: 400 });
    }

    const userId = bodyUserId ?? sessionUserId;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.telemetryEvent.create({
      data: {
        userId,
        listingId,
        eventType,
        metadata:
          metadata && Object.keys(metadata).length > 0
            ? (metadata as Prisma.JsonObject)
            : Prisma.JsonNull,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Telemetry] Failed to record event', error);
    return NextResponse.json({ error: 'Failed to record telemetry' }, { status: 500 });
  }
}
