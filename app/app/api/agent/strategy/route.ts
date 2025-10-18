import { NextRequest, NextResponse } from 'next/server';
import { resolvePostingStrategy } from '@/lib/agent';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const domain: string | undefined = body.domain;
  const strategy = resolvePostingStrategy(domain ?? null);
  return NextResponse.json({ strategy });
}
