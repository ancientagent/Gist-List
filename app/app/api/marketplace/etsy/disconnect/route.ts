
/**
 * Disconnect Etsy account
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Delete Etsy credentials
    await prisma.etsyCredential.delete({
      where: { userId },
    });

    return NextResponse.json({
      success: true,
      message: 'Etsy disconnected successfully',
    });
  } catch (error: any) {
    console.error('Etsy disconnect error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to disconnect Etsy' },
      { status: 500 }
    );
  }
}
