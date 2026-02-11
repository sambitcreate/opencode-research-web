import type { NextRequest } from 'next/server';
import { getOpenCodeSessionTimeline } from '@/lib/opencode';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{
    sessionId: string;
  }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const autostart = searchParams.get('autostart') === '1';
    const params = await context.params;
    const sessionId = decodeURIComponent(params.sessionId || '').trim();

    if (!sessionId) {
      return Response.json(
        {
          error: 'Session id is required.'
        },
        { status: 400 }
      );
    }

    const timeline = await getOpenCodeSessionTimeline(sessionId, {
      ensureRunning: autostart
    });

    return Response.json(timeline);
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : 'Unknown OpenCode timeline error'
      },
      { status: 500 }
    );
  }
}
