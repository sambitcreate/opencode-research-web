import type { NextRequest } from 'next/server';
import { getOpenCodeMonitorSnapshot } from '@/lib/opencode';

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
    const autostart = searchParams.get('autostart') === '1';
    const sessionLimit = parsePositiveInteger(searchParams.get('sessionLimit'), 80);

    const snapshot = await getOpenCodeMonitorSnapshot({
      ensureRunning: autostart,
      sessionLimit
    });

    return Response.json(snapshot);
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : 'Unknown OpenCode monitor error'
      },
      { status: 500 }
    );
  }
}
