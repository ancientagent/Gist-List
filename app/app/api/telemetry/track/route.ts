import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  logTelemetryEvent,
  type TelemetryEventType,
} from '@/lib/telemetry';

interface TelemetryRequestBody {
  listingId?: string;
  eventType?: TelemetryEventType;
  metadata?: Record<string, unknown> | null;
}

const isTelemetryEventType = (
  value: string,
): value is TelemetryEventType => {
  return (
    [
      'photo_request',
      'photo_uploaded',
      'photo_verified',
      'condition_verified',
      'facet_value_computed',
      'price_updated',
      'price_accept',
      'photo_reject',
      'quickfacts_insert',
      'notification_tap',
      'chip_select',
    ] as const
  ).includes(value as TelemetryEventType);
};

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any)?.id;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as TelemetryRequestBody | null;

  if (!body) {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 },
    );
  }

  const { listingId, eventType, metadata } = body;

  if (typeof listingId !== 'string' || listingId.length === 0) {
    return NextResponse.json(
      { error: 'listingId is required' },
      { status: 400 },
    );
  }

  if (typeof eventType !== 'string' || !isTelemetryEventType(eventType)) {
    return NextResponse.json(
      { error: 'eventType is invalid' },
      { status: 400 },
    );
  }

  await logTelemetryEvent({
    userId,
    listingId,
    eventType,
    metadata:
      metadata && typeof metadata === 'object'
        ? metadata
        : undefined,
  });

  return NextResponse.json({ success: true });
}
