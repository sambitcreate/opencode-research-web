import type { NextRequest } from 'next/server';
import { invokeOpenCodeEndpoint } from '@/lib/opencode';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{
    ptyId: string;
  }>;
};

function parseAutostart(searchParams: URLSearchParams): boolean {
  const value = searchParams.get('autostart')?.trim().toLowerCase();
  return value === '1' || value === 'true';
}

function inferLikelyUpgrade(result: {
  status: number;
  contentType: string;
  text: string;
}): boolean {
  const contentType = result.contentType.toLowerCase();
  const body = result.text.toLowerCase();
  if (result.status === 101 || result.status === 426) return true;
  if (contentType.includes('websocket')) return true;
  return body.includes('upgrade') || body.includes('websocket');
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const autostart = parseAutostart(searchParams);
    const params = await context.params;
    const ptyId = decodeURIComponent(params.ptyId || '').trim();

    if (!ptyId) {
      return Response.json(
        {
          error: 'PTY id is required.'
        },
        { status: 400 }
      );
    }

    const path = `/pty/${encodeURIComponent(ptyId)}/connect`;
    const result = await invokeOpenCodeEndpoint({
      path,
      method: 'GET',
      ensureRunning: autostart
    });

    const likelyUpgrade = inferLikelyUpgrade(result);

    return Response.json({
      request: {
        path,
        method: 'GET',
        autostart
      },
      probe: result,
      feasibility: {
        likelyWebSocketOrUpgradeEndpoint: likelyUpgrade,
        routeHandlerTransparentProxy: false,
        reason:
          'Next.js route handlers do not expose a raw upgrade socket for transparent PTY websocket proxying.',
        recommendation:
          'Use a dedicated websocket server/process (or edge/runtime that supports upgrade passthrough) and keep this route for diagnostics.'
      }
    });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : 'Unknown PTY connect feasibility error'
      },
      { status: 500 }
    );
  }
}
