
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { uploadFile } from '@/lib/s3';
import { queueReindex } from '@/lib/search-indexing';

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

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let formData;
    try {
      formData = await request.formData();
    } catch (error) {
      console.error('FormData parsing error:', error);
      return NextResponse.json({ error: 'Invalid request format' }, { status: 400 });
    }

    const photo = formData.get('photo') as File;
    const theGist = formData.get('theGist') as string;

    if (!photo) {
      return NextResponse.json({ error: 'Photo is required' }, { status: 400 });
    }

    // Validate photo file
    if (!photo.type || !photo.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Invalid file type. Please upload an image.' }, { status: 400 });
    }

    // Convert to buffer with validation
    let buffer: Buffer;
    try {
      const arrayBuffer = await photo.arrayBuffer();
      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        throw new Error('Empty image file');
      }
      buffer = Buffer.from(arrayBuffer);
      console.log(`📸 Received photo: ${buffer.length} bytes, type: ${photo.type}`);
    } catch (error) {
      console.error('Buffer conversion error:', error);
      return NextResponse.json({ error: 'Failed to process image file' }, { status: 400 });
    }

    // Upload photo to S3 with compression
    const fileName = `listings/${Date.now()}-${photo.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    
    let uploadResult;
    try {
      const { uploadFileWithCompression } = await import('@/lib/s3');
      uploadResult = await uploadFileWithCompression(buffer, fileName);
      console.log(`📦 Image compressed: ${uploadResult.originalSize} → ${uploadResult.compressedSize} bytes (${uploadResult.savingsPercent.toFixed(1)}% savings)`);
    } catch (error: any) {
      console.error('Upload error:', error);
      return NextResponse.json({ 
        error: `Failed to upload image: ${error?.message || 'Unknown error'}` 
      }, { status: 500 });
    }

    // Quick AI confidence check
    let aiCheck;
    try {
      aiCheck = await quickConfidenceCheck(buffer, theGist || '');
      console.log(`🤖 AI check complete: confidence=${aiCheck.confidence}, identified=${aiCheck.itemIdentified}`);
    } catch (error: any) {
      console.error('AI check error:', error);
      // Continue with default values if AI check fails
      aiCheck = {
        confidence: 0.5,
        itemIdentified: true,
        imageQualityIssue: null,
      };
    }

    // Create listing with storage tracking
    const listing = await prisma.listing.create({
      data: {
        userId,
        theGist: theGist || null,
        status: 'DRAFT',
        confidence: aiCheck.confidence,
        itemIdentified: aiCheck.itemIdentified,
        imageQualityIssue: aiCheck.imageQualityIssue,
        storageBytes: uploadResult.compressedSize,
      },
    });

    console.log(`✅ Listing created: ${listing.id}`);

    // Create photo record with size tracking
    await prisma.photo.create({
      data: {
        listingId: listing.id,
        cloudStoragePath: uploadResult.key,
        order: 0,
        isPrimary: true,
        originalSizeBytes: uploadResult.originalSize,
        compressedSizeBytes: uploadResult.compressedSize,
      },
    });

    // Increment user listing count
    await prisma.user.update({
      where: { id: userId },
      data: { listingCount: user.listingCount + 1 },
    });

    // Trigger initial search indexing
    queueReindex(listing.id, 'listing_created').catch((err) => {
      console.error('[SearchIndex] Failed to queue initial reindex:', err);
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
    console.error('Error stack:', error?.stack);
    return NextResponse.json(
      { 
        error: error?.message || 'Failed to create listing',
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    );
  }
}
