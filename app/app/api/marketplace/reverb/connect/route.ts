
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * POST /api/marketplace/reverb/connect
 * Connect Reverb account with API token
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { apiToken } = await request.json();

    if (!apiToken) {
      return NextResponse.json({ error: "API token required" }, { status: 400 });
    }

    // Validate token by making a test API call
    const testResponse = await fetch("https://api.reverb.com/api/my/account", {
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Accept-Version": "3.0",
      },
    });

    if (!testResponse.ok) {
      return NextResponse.json(
        { error: "Invalid Reverb API token" },
        { status: 400 }
      );
    }

    // Store credentials
    await prisma.reverbCredential.upsert({
      where: { userId: (session.user as any).id },
      update: { apiToken },
      create: {
        userId: (session.user as any).id,
        apiToken,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Reverb connected successfully!",
    });
  } catch (error: any) {
    console.error("Reverb connect error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
