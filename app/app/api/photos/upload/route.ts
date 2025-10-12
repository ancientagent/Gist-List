

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { uploadFileWithCompression } from '@/lib/s3';
import { logTelemetryEvent } from '@/lib/telemetry';
import { reindexListing } from '@/lib/search-index';
export const dynamic = 'force-dynamic';

// Check condition only for new/retaken photos
async function checkConditionOnly(imageBuffer: Buffer): Promise<{
  conditionNotes: string | null;
}> {
  try {
    const base64Image = imageBuffer.toString('base64');
    
    const messages = [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${base64Image}`,
            },
          },
          {
            type: 'text',
            text: `You are a professional item condition inspector. Analyze ONLY the condition of this item.

Look for:
- Physical damage (scratches, dents, cracks, chips)
- Wear and tear
- Dirt, stains, or discoloration
- Missing parts
- Overall cleanliness

Provide a brief condition assessment in plain text (2-3 sentences). Focus on what you observe and any improvements the seller could make.

Respond with raw text only. No JSON, no markdown.`,
          },
        ],
      },
    ];

    const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.ABACUSAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages,
        max_tokens: 150,
      }),
    });

    if (!response.ok) {
      return { conditionNotes: null };
    }

    const data = await response.json();
    const conditionNotes = data.choices?.[0]?.message?.content || null;
    
    return { conditionNotes };
  } catch (error) {
    console.error('Condition check error:', error);
    return { conditionNotes: null };
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const photo = formData.get('photo') as File | null;
    const listingId = (formData.get('listingId') as string | null) ?? null;
    const isRetake = formData.get('isRetake') === 'true';
    const existingPhotoId = (formData.get('photoId') as string | null) ?? null;
    const notificationId = (formData.get('notificationId') as string | null) ?? null;
    const requirement = (formData.get('requirement') as string | null) ?? null;
    const facetTag = (formData.get('facetTag') as string | null) ?? null;

    if (!photo || !listingId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { userId: true },
    });

    if (!listing || listing.userId !== (session.user as any).id) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    const buffer = Buffer.from(await photo.arrayBuffer());
    const fileName = `listings/${Date.now()}-${photo.name}`;
    const uploadResult = await uploadFileWithCompression(buffer, fileName);

    console.log(`📦 Additional photo compressed: ${uploadResult.originalSize} → ${uploadResult.compressedSize} bytes (${uploadResult.savingsPercent.toFixed(1)}% savings)`);

    const mode = notificationId ? 'workflow' : 'gallery';

    if (mode === 'workflow') {
      const maxOrder = await prisma.photo.findFirst({
        where: { listingId },
        orderBy: { order: 'desc' },
        select: { order: true },
      });

      const created = await prisma.photo.create({
        data: {
          listingId,
          cloudStoragePath: uploadResult.key,
          order: (maxOrder?.order ?? -1) + 1,
          isPrimary: false,
          originalSizeBytes: uploadResult.originalSize,
          compressedSizeBytes: uploadResult.compressedSize,
          requirement,
          facetTag,
          status: 'pending',
          notificationId,
        },
        select: { id: true, status: true },
      });

      await logTelemetryEvent({
        userId: listing.userId,
        listingId,
        eventType: 'photo_uploaded',
        metadata: {
          mode,
          photoId: created.id,
          requirement,
          facetTag,
          notificationId,
        },
      });

      return NextResponse.json({
        photoId: created.id,
        status: created.status,
      });
    }

    // Existing gallery flow (retake/additional photos)
    if (isRetake && existingPhotoId) {
      await prisma.photo.update({
        where: { id: existingPhotoId },
        data: {
          cloudStoragePath: uploadResult.key,
          originalSizeBytes: uploadResult.originalSize,
          compressedSizeBytes: uploadResult.compressedSize,
        },
      });

      await logTelemetryEvent({
        userId: listing.userId,
        listingId,
        eventType: 'photo_uploaded',
        metadata: {
          mode: 'retake',
          photoId: existingPhotoId,
        },
      });
    } else {
      const maxOrder = await prisma.photo.findFirst({
        where: { listingId },
        orderBy: { order: 'desc' },
        select: { order: true },
      });

      const created = await prisma.photo.create({
        data: {
          listingId,
          cloudStoragePath: uploadResult.key,
          order: (maxOrder?.order ?? -1) + 1,
          isPrimary: false,
          originalSizeBytes: uploadResult.originalSize,
          compressedSizeBytes: uploadResult.compressedSize,
        },
        select: { id: true },
      });

      await logTelemetryEvent({
        userId: listing.userId,
        listingId,
        eventType: 'photo_uploaded',
        metadata: {
          mode: 'gallery',
          photoId: created.id,
        },
      });
    }

    const conditionCheck = await checkConditionOnly(buffer);

    if (conditionCheck.conditionNotes) {
      await prisma.listing.update({
        where: { id: listingId },
        data: {
          conditionNotes: conditionCheck.conditionNotes,
        },
      });

      await reindexListing(listingId);
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
