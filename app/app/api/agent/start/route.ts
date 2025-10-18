import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { registerAgentDevice, mintAgentSession, resolvePostingStrategy } from '@/lib/agent';
import type { AgentAction } from '@gister/agent-sdk';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (process.env.AGENT_MODE !== '1') {
    return NextResponse.json({ error: 'AGENT_MODE_DISABLED' }, { status: 409 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const url: string | undefined = body.url;
    const actions: string[] = Array.isArray(body.actions) ? body.actions : [];
    const device = body.device as { id?: string; os?: string; name?: string };

    if (!url || !actions.length) {
      return NextResponse.json({ error: 'INVALID_REQUEST' }, { status: 400 });
    }

    if (!device?.os || !device?.name) {
      return NextResponse.json({ error: 'INVALID_DEVICE' }, { status: 400 });
    }

    const domain = (body.domain as string | undefined) ?? new URL(url).hostname;
    const strategy = resolvePostingStrategy(domain);
    if (strategy !== 'agent') {
      return NextResponse.json({ error: 'UNSUPPORTED_DOMAIN' }, { status: 400 });
    }

    const userId = (session.user as any).id as string;
    const deviceRecord = await registerAgentDevice(userId, {
      id: device.id,
      os: device.os,
      name: device.name,
      healthySites: body.healthySites,
      jsonPolicy: body.jsonPolicy,
    });

    const { token, expiresAt, record } = await mintAgentSession({
      userId,
      deviceId: deviceRecord.id,
      domain,
      actions: actions as AgentAction[],
    });

    return NextResponse.json({
      token,
      expiresAt: expiresAt.toISOString(),
      session: {
        id: record.id,
        consentState: record.consentState,
        domain: record.domain,
        actions: record.actions,
      },
    });
  } catch (error: any) {
    console.error('Agent start error', error);
    return NextResponse.json({ error: 'AGENT_START_FAILED' }, { status: 500 });
  }
}
