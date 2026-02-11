import type { NextRequest } from 'next/server';
import { getOpenCodeSessionDetail, getOpenCodeSessions } from '@/lib/opencode';

export const runtime = 'nodejs';

function parsePositiveInteger(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const sessionId = searchParams.get('sessionId')?.trim() || '';
    const autostart = searchParams.get('autostart') === '1';
    const limit = parsePositiveInteger(searchParams.get('limit'), 40);
    const messageLimit = parsePositiveInteger(searchParams.get('messageLimit'), 120);

    if (sessionId) {
      const detail = await getOpenCodeSessionDetail(sessionId, {
        ensureRunning: autostart,
        messageLimit
      });
      return Response.json(detail);
    }

    const sessions = await getOpenCodeSessions({
      ensureRunning: autostart,
      limit
    });

    return Response.json(sessions);
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : 'Unknown OpenCode session error'
      },
      { status: 500 }
    );
  }
}
