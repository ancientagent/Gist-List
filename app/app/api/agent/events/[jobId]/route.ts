import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getAgentClient } from '@/lib/agent';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: { jobId: string } }) {
  if (process.env.AGENT_MODE !== '1') {
    return new Response('Agent mode disabled', { status: 404 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const userId = (session.user as any).id as string;
  const record = await prisma.agentSession.findUnique({ where: { id: params.jobId } });
  if (!record || record.userId !== userId || !record.agentSessionId) {
    return new Response('Not found', { status: 404 });
  }

  const encoder = new TextEncoder();
  const client = getAgentClient();
  const abortController = new AbortController();

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode('retry: 5000\n\n'));
      client
        .stream(
          record.agentSessionId!,
          event => {
            const payload = JSON.stringify(event);
            controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
          },
          abortController.signal,
        )
        .then(() => controller.close())
        .catch(error => {
          console.error('Agent SSE proxy error', error);
          controller.error(error);
        });
    },
    cancel() {
      abortController.abort();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
