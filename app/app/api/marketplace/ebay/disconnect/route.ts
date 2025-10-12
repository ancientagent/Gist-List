
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * DELETE /api/marketplace/ebay/disconnect
 * Disconnect eBay account
 */
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.ebayCredential.delete({
      where: { userId: (session.user as any).id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("eBay disconnect error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
