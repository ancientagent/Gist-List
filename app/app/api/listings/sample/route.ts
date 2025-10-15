
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// Sample brief descriptions for testing
const sampleDescriptions = [
  'vintage Canon camera',
  'leather jacket',
  'Nike Air Jordan sneakers',
  'vintage vinyl record player',
  'MacBook Pro laptop',
  'designer handbag',
  'antique pocket watch',
  'gaming console',
  'acoustic guitar',
  'rare Pokemon card',
];

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if theGist was provided in the request body
    let description: string;
    try {
      const body = await request.json();
      description = body.theGist || sampleDescriptions[Math.floor(Math.random() * sampleDescriptions.length)];
    } catch {
      // If no body or parsing fails, use random sample
      description = sampleDescriptions[Math.floor(Math.random() * sampleDescriptions.length)];
    }

    // Create a listing with just the brief description (theGist)
    const sampleListing = await prisma.listing.create({
      data: {
        userId: user.id,
        theGist: description,
        status: 'DRAFT',
      },
    });

    // Trigger AI analysis by calling the analyze endpoint
    // This happens in the background so we can return immediately
    try {
      fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/listings/${sampleListing.id}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          theGist: description,
          confidence: 0,
          skipImageAnalysis: true, // No photo for sample
        }),
      }).catch(err => {
        console.error('Background analysis failed:', err);
      });
    } catch (error) {
      console.error('Failed to trigger background analysis:', error);
    }

    return NextResponse.json({ listingId: sampleListing.id, ...sampleListing });
  } catch (error) {
    console.error('Error creating sample listing:', error);
    return NextResponse.json(
      { error: 'Failed to create sample listing' },
      { status: 500 }
    );
  }
}
