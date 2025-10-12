
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * GET /api/marketplace/ebay/status
 * Check if eBay is connected and usage stats
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const credential = await prisma.ebayCredential.findUnique({
      where: { userId: (session.user as any).id },
    });

    const user = await prisma.user.findUnique({
      where: { id: (session.user as any).id },
      select: { subscriptionTier: true },
    });

    // Get current month's usage
    const month = new Date().toISOString().slice(0, 7);
    const usage = await prisma.apiUsage.findUnique({
      where: {
        userId_platform_action_month: {
          userId: (session.user as any).id,
          platform: "ebay",
          action: "listing_create",
          month,
        },
      },
    });

    const limits: Record<string, number> = {
      FREE: 50,
      PREMIUM: 999999,
    };

    const tier = user?.subscriptionTier || "FREE";
    const limit = limits[tier];
    const used = usage?.count || 0;

    return NextResponse.json({
      connected: !!credential,
      ebayUserId: credential?.ebayUserId,
      usage: {
        used,
        limit,
        remaining: Math.max(0, limit - used),
        unlimited: tier === "PREMIUM",
      },
      tier,
    });
  } catch (error: any) {
    console.error("eBay status error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
