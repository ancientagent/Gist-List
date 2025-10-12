
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET - Load user's custom chips
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        chips: {
          orderBy: [
            { useCount: 'desc' },
            { updatedAt: 'desc' },
          ],
        },
      },
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Group chips by category
    const groupedChips: Record<string, any[]> = {};
    
    for (const chip of user.chips) {
      if (!groupedChips[chip.category]) {
        groupedChips[chip.category] = [];
      }
      
      groupedChips[chip.category].push({
        text: chip.text,
        category: chip.category,
        itemCategories: chip.itemCategory ? [chip.itemCategory] : undefined,
        useCount: chip.useCount,
      });
    }
    
    return NextResponse.json(groupedChips);
  } catch (error: any) {
    console.error('Error loading chips:', error);
    return NextResponse.json(
      { error: 'Failed to load chips', details: error.message },
      { status: 500 }
    );
  }
}

// POST - Save or update a chip
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const { category, text, itemCategory } = await request.json();
    
    if (!category || !text) {
      return NextResponse.json(
        { error: 'Missing required fields: category, text' },
        { status: 400 }
      );
    }
    
    // Upsert the chip (create or increment useCount)
    const chip = await prisma.userChip.upsert({
      where: {
        userId_category_text_itemCategory: {
          userId: user.id,
          category,
          text,
          itemCategory: itemCategory || null,
        },
      },
      create: {
        userId: user.id,
        category,
        text,
        itemCategory: itemCategory || null,
        useCount: 1,
      },
      update: {
        useCount: {
          increment: 1,
        },
        updatedAt: new Date(),
      },
    });
    
    return NextResponse.json({ success: true, chip });
  } catch (error: any) {
    console.error('Error saving chip:', error);
    return NextResponse.json(
      { error: 'Failed to save chip', details: error.message },
      { status: 500 }
    );
  }
}
