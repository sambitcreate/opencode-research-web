import type { NextRequest } from 'next/server';
import { getOpenCodeSessionTranscript } from '@/lib/opencode';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{
    sessionId: string;
  }>;
};

function parseBooleanFlag(value: string | null): boolean {
  const normalized = value?.trim().toLowerCase();
  return normalized === '1' || normalized === 'true';
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const autostart = parseBooleanFlag(searchParams.get('autostart'));
    const thinking = parseBooleanFlag(searchParams.get('thinking'));
    const toolDetails = parseBooleanFlag(searchParams.get('toolDetails'));
    const assistantMetadata = parseBooleanFlag(searchParams.get('assistantMetadata'));
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

    const transcript = await getOpenCodeSessionTranscript(sessionId, {
      ensureRunning: autostart,
      thinking,
      toolDetails,
      assistantMetadata
    });

    return Response.json(transcript);
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : 'Unknown OpenCode transcript error'
      },
      { status: 500 }
    );
  }
}
