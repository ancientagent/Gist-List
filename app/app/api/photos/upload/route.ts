

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { uploadFile } from '@/lib/s3';



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

    // Check condition only (don't reset description or other fields)
    const conditionCheck = await checkConditionOnly(buffer);

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

    // Update listing with new condition notes only
    if (conditionCheck.conditionNotes) {
      await prisma.listing.update({
        where: { id: listingId },
        data: {
          conditionNotes: conditionCheck.conditionNotes,
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
