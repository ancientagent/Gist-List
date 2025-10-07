
// Stripe checkout session API

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createCheckoutSession, SUBSCRIPTION_PRICES } from '@/lib/stripe-config';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const email = session.user.email || '';
    const body = await request.json();
    const { tier } = body; // 'BASIC' or 'PRO'

    if (!tier || !['BASIC', 'PRO'].includes(tier)) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }

    const priceId = tier === 'BASIC' 
      ? SUBSCRIPTION_PRICES.BASIC_MONTHLY 
      : SUBSCRIPTION_PRICES.PRO_MONTHLY;

    const baseUrl = request.headers.get('origin') || 'https://gistlist.abacusai.app';
    const successUrl = `${baseUrl}/dashboard?upgrade=success`;
    const cancelUrl = `${baseUrl}/dashboard?upgrade=cancel`;

    const checkoutSession = await createCheckoutSession(
      userId,
      email,
      priceId,
      successUrl,
      cancelUrl
    );

    if (!checkoutSession) {
      return NextResponse.json(
        { error: 'Failed to create checkout session' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
    });
  } catch (error: any) {
    console.error('Checkout session error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
