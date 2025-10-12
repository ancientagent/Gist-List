
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ebayAPI } from "@/lib/services/ebay-api";

/**
 * GET /api/marketplace/ebay/auth
 * Initiate eBay OAuth flow
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const authUrl = ebayAPI.getAuthUrl((session.user as any).id);

    return NextResponse.json({ authUrl });
  } catch (error: any) {
    console.error("eBay auth error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
