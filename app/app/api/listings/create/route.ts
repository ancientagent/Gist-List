
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { uploadFile } from '@/lib/s3';

export const dynamic = 'force-dynamic';

// Quick AI confidence check
async function quickConfidenceCheck(imageBuffer: Buffer, theGist: string): Promise<{
  confidence: number;
  itemIdentified: boolean;
  imageQualityIssue: string | null;
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
            text: `You are a quick image quality and item identification checker. 
${theGist ? `User notes: "${theGist}"` : ''}

Perform a QUICK check:
1. Is the image blurry, too dark, too bright, or unrecognizable?
2. Can you identify what type of item this is?
3. How confident are you in your identification (0.0 to 1.0)?

Provide ONLY a JSON response:
{
  "confidence": 0.0 to 1.0,
  "itemIdentified": true or false,
  "imageQualityIssue": null or "specific issue: blurry/poor lighting/too dark/unrecognizable/need better angle"
}

Respond with raw JSON only. No markdown, no code blocks.`,
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
        model: 'gemini-2.5-flash',
        messages,
        max_tokens: 200,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      throw new Error('AI check failed');
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    const result = JSON.parse(content);
    
    return {
      confidence: result.confidence ?? 0,
      itemIdentified: result.itemIdentified ?? false,
      imageQualityIssue: result.imageQualityIssue ?? null,
    };
  } catch (error) {
    console.error('Quick confidence check error:', error);
    // Return neutral values on error
    return {
      confidence: 0.5,
      itemIdentified: true,
      imageQualityIssue: null,
    };
  }
}

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

    // Quick AI confidence check
    const aiCheck = await quickConfidenceCheck(buffer, theGist || '');

    // Create listing
    const listing = await prisma.listing.create({
      data: {
        userId,
        theGist: theGist || null,
        status: 'DRAFT',
        confidence: aiCheck.confidence,
        itemIdentified: aiCheck.itemIdentified,
        imageQualityIssue: aiCheck.imageQualityIssue,
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
      confidence: aiCheck.confidence,
      itemIdentified: aiCheck.itemIdentified,
      imageQualityIssue: aiCheck.imageQualityIssue,
    });
  } catch (error: any) {
    console.error('Create listing error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to create listing' },
      { status: 500 }
    );
  }
}
