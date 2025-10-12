
/**
 * Etsy OAuth - Handle authorization callback
 */

import { NextRequest, NextResponse } from 'next/server';
import { exchangeEtsyCode, getEtsyShop } from '@/lib/etsy-service';
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/listings?error=etsy_auth_failed', request.url)
      );
    }

    // Extract userId from state
    const userId = state.split('-')[0];

    if (!userId) {
      return NextResponse.redirect(
        new URL('/listings?error=invalid_state', request.url)
      );
    }

    // Exchange code for tokens
    const tokens = await exchangeEtsyCode(code, state); // Using state as code_verifier

    // Get user's Etsy shop info
    const shop = await getEtsyShop(tokens.access_token, userId);

    if (!shop) {
      return NextResponse.redirect(
        new URL('/listings?error=no_etsy_shop', request.url)
      );
    }

    // Store credentials in database
    await prisma.etsyCredential.upsert({
      where: { userId },
      create: {
        userId,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        etsyUserId: userId,
        etsyShopId: shop.shop_id.toString(),
        shopName: shop.shop_name,
      },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        etsyShopId: shop.shop_id.toString(),
        shopName: shop.shop_name,
      },
    });

    // Redirect to listings page with success
    return NextResponse.redirect(
      new URL('/listings?etsy_connected=true', request.url)
    );
  } catch (error: any) {
    console.error('Etsy callback error:', error);
    return NextResponse.redirect(
      new URL(`/listings?error=${encodeURIComponent(error.message)}`, request.url)
    );
  }
}
