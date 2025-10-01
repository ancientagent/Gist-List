
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { downloadFile } from '@/lib/s3';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const listingId = params.id;

  try {
    // Get listing with photos
    const listing = await prisma.listing.findUnique({
      where: { id: listingId, userId },
      include: { photos: { orderBy: { order: 'asc' } } },
    });

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    if (!listing.photos?.[0]) {
      return NextResponse.json({ error: 'No photo found' }, { status: 400 });
    }

    // Get signed URL for the photo
    const photoUrl = await downloadFile(listing.photos[0].cloudStoragePath);

    // Fetch the image and convert to base64
    const imageResponse = await fetch(photoUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');

    // Call LLM API with streaming
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
            text: `You are an expert resale assistant. Analyze this image and identify the item.

${listing.theGist ? `User notes: "${listing.theGist}"` : ''}

Provide a JSON response with the following structure:
{
  "itemIdentified": true or false,
  "confidence": 0.0 to 1.0,
  "category": "category name",
  "title": "optimized listing title",
  "description": "comprehensive description",
  "condition": "New/Like New/Good/Fair/Poor",
  "tags": ["tag1", "tag2"],
  "recommendedPlatforms": ["platform1", "platform2"],
  "qualifiedPlatforms": ["platform1", "platform2", "platform3"],
  "avgMarketPrice": estimated price as number or null,
  "suggestedPriceMin": number or null,
  "suggestedPriceMax": number or null,
  "needsMoreInfo": true/false,
  "questionsForUser": ["question1", "question2"] or []
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
        model: 'gpt-4.1-mini',
        messages,
        stream: true,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      throw new Error('AI analysis failed');
    }

    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        const encoder = new TextEncoder();
        let buffer = '';
        let partialRead = '';

        try {
          while (true) {
            const { done, value } = await reader!.read();
            if (done) break;

            partialRead += decoder.decode(value, { stream: true });
            let lines = partialRead.split('\n');
            partialRead = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') {
                  // Parse final result
                  try {
                    const finalResult = JSON.parse(buffer);
                    
                    // Update listing in database
                    await prisma.listing.update({
                      where: { id: listingId },
                      data: {
                        itemIdentified: finalResult.itemIdentified ?? false,
                        confidence: finalResult.confidence ?? 0,
                        category: finalResult.category ?? null,
                        title: finalResult.title ?? null,
                        description: finalResult.description ?? null,
                        condition: finalResult.condition ?? null,
                        tags: finalResult.tags ?? [],
                        recommendedPlatforms: finalResult.recommendedPlatforms ?? [],
                        qualifiedPlatforms: finalResult.qualifiedPlatforms ?? [],
                        avgMarketPrice: finalResult.avgMarketPrice ?? null,
                        suggestedPriceMin: finalResult.suggestedPriceMin ?? null,
                        suggestedPriceMax: finalResult.suggestedPriceMax ?? null,
                      },
                    });

                    // Create notifications if needed
                    if (finalResult.needsMoreInfo && finalResult.questionsForUser?.length > 0) {
                      for (const question of finalResult.questionsForUser) {
                        await prisma.aINotification.create({
                          data: {
                            listingId,
                            type: 'PREFERENCE',
                            message: question,
                          },
                        });
                      }
                    }

                    const finalData = JSON.stringify({
                      status: 'completed',
                      result: finalResult,
                    });
                    controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));
                  } catch (e) {
                    console.error('Error parsing final result:', e);
                  }
                  controller.close();
                  return;
                }

                try {
                  const parsed = JSON.parse(data);
                  buffer += parsed.choices?.[0]?.delta?.content || '';
                  
                  const progressData = JSON.stringify({
                    status: 'processing',
                    message: 'Analyzing image...',
                  });
                  controller.enqueue(encoder.encode(`data: ${progressData}\n\n`));
                } catch (e) {
                  // Skip invalid JSON
                }
              }
            }
          }
        } catch (error) {
          console.error('Stream error:', error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: error?.message || 'Analysis failed' },
      { status: 500 }
    );
  }
}
