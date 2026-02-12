import type { NextRequest } from 'next/server';
import { invokeOpenCodeEndpoint } from '@/lib/opencode';

export const runtime = 'nodejs';

function parseAutostart(searchParams: URLSearchParams): boolean {
  const value = searchParams.get('autostart')?.trim().toLowerCase();
  return value === '1' || value === 'true';
}

async function parseJsonBody(request: NextRequest): Promise<unknown> {
  const text = await request.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error('Request body must be valid JSON.');
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const autostart = parseAutostart(searchParams);
    const result = await invokeOpenCodeEndpoint({
      path: '/pty',
      method: 'GET',
      ensureRunning: autostart
    });

    return Response.json(
      {
        request: {
          path: '/pty',
          method: 'GET'
        },
        result
      },
      { status: result.ok ? 200 : result.status || 502 }
    );
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : 'Unknown PTY list error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const autostart = parseAutostart(searchParams);
    const body = await parseJsonBody(request);

    const result = await invokeOpenCodeEndpoint({
      path: '/pty',
      method: 'POST',
      body,
      ensureRunning: autostart
    });

    return Response.json(
      {
        request: {
          path: '/pty',
          method: 'POST',
          body
        },
        result
      },
      { status: result.ok ? 200 : result.status || 502 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'Request body must be valid JSON.') {
      return Response.json(
        {
          error: error.message
        },
        { status: 400 }
      );
    }

    return Response.json(
      {
        error: error instanceof Error ? error.message : 'Unknown PTY create error'
      },
      { status: 500 }
    );
  }
}
