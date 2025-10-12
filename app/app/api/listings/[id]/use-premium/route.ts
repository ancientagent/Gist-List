
// This route is deprecated - premium is now handled via the usePremium checkbox
import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({ error: 'This endpoint is deprecated' }, { status: 410 });
}
