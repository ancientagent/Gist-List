
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { ebayAPI } from "@/lib/services/ebay-api";

const prisma = new PrismaClient();

/**
 * GET /api/marketplace/ebay/callback
 * Handle eBay OAuth callback
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const userId = searchParams.get("state"); // We passed userId as state

    if (!code || !userId) {
      return NextResponse.redirect(
        new URL("/dashboard?error=ebay_auth_failed", request.url)
      );
    }

    // Exchange code for tokens
    const tokens = await ebayAPI.exchangeCodeForTokens(code);

    // Store credentials
    await prisma.ebayCredential.upsert({
      where: { userId },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        ebayUserId: userId, // TODO: Get actual eBay user ID from API
      },
      create: {
        userId,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        ebayUserId: userId,
      },
    });

    // Redirect back to dashboard with success message
    return NextResponse.redirect(
      new URL("/dashboard?connected=ebay", request.url)
    );
  } catch (error: any) {
    console.error("eBay callback error:", error);
    return NextResponse.redirect(
      new URL("/dashboard?error=ebay_connection_failed", request.url)
    );
  }
}
