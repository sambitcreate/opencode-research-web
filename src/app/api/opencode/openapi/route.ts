import type { NextRequest } from 'next/server';
import { getOpenCodeOpenApi } from '@/lib/opencode';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const autostart = searchParams.get('autostart') === '1';
    const snapshot = await getOpenCodeOpenApi({ ensureRunning: autostart });
    return Response.json(snapshot);
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : 'Unknown OpenCode OpenAPI error'
      },
      { status: 500 }
    );
  }
}
