
/**
 * Etsy OAuth - Initiate authorization flow
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/lib/auth";
import { getEtsyAuthUrl } from '@/lib/etsy-service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Generate state for CSRF protection (also used as PKCE code_verifier)
    const state = `${userId}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Store state in session/cookie for verification in callback
    // For now, encoding userId in state for simplicity
    const authUrl = getEtsyAuthUrl(state);

    return NextResponse.json({ authUrl, state });
  } catch (error: any) {
    console.error('Etsy auth error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to initiate Etsy authorization' },
      { status: 500 }
    );
  }
}
