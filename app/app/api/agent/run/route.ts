import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  registerAgentDevice,
  mintAgentSession,
  resolvePostingStrategy,
  getAgentClient,
  runAgentJob,
  linkRemoteSession,
  markConsentState,
  type AgentJobStep,
} from '@/lib/agent';
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
    const steps: AgentJobStep[] = Array.isArray(body.steps) ? body.steps : [];

    if (!url || !actions.length) {
      return NextResponse.json({ error: 'INVALID_REQUEST' }, { status: 400 });
    }

    if (!device?.os || !device?.name) {
      return NextResponse.json({ error: 'INVALID_DEVICE' }, { status: 400 });
    }

    const domain = (body.domain as string | undefined) ?? new URL(url).hostname;
    if (resolvePostingStrategy(domain) !== 'agent') {
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

    const client = getAgentClient();
    const remote = await client.startSession({ token, url, actions: actions as AgentAction[] });

    await linkRemoteSession(record.id, remote.sessionId);
    if (remote.consent === 'allowed') {
      await markConsentState(record.id, 'allowed');
    } else if (remote.consent === 'denied') {
      await markConsentState(record.id, 'denied');
    }

    if (steps.length) {
      try {
        await runAgentJob({ sessionId: remote.sessionId, steps });
        await markConsentState(record.id, 'allowed');
      } catch (error) {
        console.error('Agent run error', error);
        return NextResponse.json({
          error: 'AGENT_RUN_FAILED',
          session: {
            id: record.id,
            agentSessionId: remote.sessionId,
            consent: remote.consent,
          },
        }, { status: 500 });
      }
    }

    return NextResponse.json({
      session: {
        id: record.id,
        agentSessionId: remote.sessionId,
        consent: remote.consent,
        expiresAt: expiresAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Agent run route error', error);
    return NextResponse.json({ error: 'AGENT_RUN_FAILED' }, { status: 500 });
  }
}
