import type { TelemetryEvent } from '@prisma/client';

export type TelemetryEventType =
  | 'photo_request'
  | 'photo_uploaded'
  | 'photo_verified'
  | 'condition_verified'
  | 'facet_value_computed'
  | 'price_updated'
  | 'price_accept'
  | 'photo_reject'
  | 'quickfacts_insert'
  | 'notification_tap'
  | 'chip_select';

export interface TelemetryEventInput {
  listingId: string;
  eventType: TelemetryEventType;
  metadata?: Record<string, unknown> | null;
}

interface ServerTelemetryEventInput extends TelemetryEventInput {
  userId: string;
}

const isServer = typeof window === 'undefined';

let prismaClient: typeof import('@/lib/db')['prisma'] | null = null;

const getPrisma = async () => {
  if (!prismaClient) {
    const { prisma } = await import('@/lib/db');
    prismaClient = prisma;
  }
  return prismaClient;
};

const normalizeMetadata = (
  metadata?: Record<string, unknown> | null,
): TelemetryEvent['metadata'] => {
  if (!metadata) {
    return undefined;
  }

  try {
    return JSON.parse(JSON.stringify(metadata));
  } catch {
    return undefined;
  }
};

export const logTelemetryEvent = async (
  input: ServerTelemetryEventInput | TelemetryEventInput,
): Promise<void> => {
  try {
    const metadata = normalizeMetadata(input.metadata);

    if (isServer) {
      const serverPayload = input as ServerTelemetryEventInput;

      if (!serverPayload.userId) {
        console.warn('Telemetry logging skipped: missing userId on server.');
        return;
      }

      const prisma = await getPrisma();
      const telemetryClient = (prisma as any).telemetryEvent;

      if (!telemetryClient?.create) {
        return;
      }

      await telemetryClient.create({
        data: {
          userId: serverPayload.userId,
          listingId: serverPayload.listingId,
          eventType: serverPayload.eventType,
          metadata,
        },
      });
      return;
    }

    void fetch('/api/telemetry/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        listingId: input.listingId,
        eventType: input.eventType,
        metadata,
      }),
    }).catch((error) => {
      console.error('Telemetry logging failed:', error);
    });
  } catch (error) {
    console.error('Telemetry logging failed:', error);
  }
};
