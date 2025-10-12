
/**
 * Check Etsy connection status
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Check if user has Etsy credentials
    const credential = await prisma.etsyCredential.findUnique({
      where: { userId },
    });

    if (!credential) {
      return NextResponse.json({
        connected: false,
        message: 'Etsy not connected',
      });
    }

    // Check if token is still valid
    const now = new Date();
    const isExpired = now >= credential.expiresAt;

    return NextResponse.json({
      connected: true,
      shopName: credential.shopName,
      etsyShopId: credential.etsyShopId,
      tokenExpired: isExpired,
      expiresAt: credential.expiresAt,
    });
  } catch (error: any) {
    console.error('Etsy status error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check Etsy status' },
      { status: 500 }
    );
  }
}
