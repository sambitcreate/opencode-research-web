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

async function parseJsonBody(request: NextRequest): Promise<unknown> {
  const text = await request.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error('Request body must be valid JSON.');
  }
}

async function resolvePtyId(context: RouteContext): Promise<string> {
  const params = await context.params;
  const ptyId = decodeURIComponent(params.ptyId || '').trim();
  if (!ptyId) {
    throw new Error('PTY id is required.');
  }
  return ptyId;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const autostart = parseAutostart(searchParams);
    const ptyId = await resolvePtyId(context);
    const body = await parseJsonBody(request);
    const path = `/pty/${encodeURIComponent(ptyId)}`;

    const result = await invokeOpenCodeEndpoint({
      path,
      method: 'PATCH',
      body,
      ensureRunning: autostart
    });

    return Response.json(
      {
        request: {
          path,
          method: 'PATCH',
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
    if (error instanceof Error && error.message === 'PTY id is required.') {
      return Response.json(
        {
          error: error.message
        },
        { status: 400 }
      );
    }

    return Response.json(
      {
        error: error instanceof Error ? error.message : 'Unknown PTY update error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const autostart = parseAutostart(searchParams);
    const ptyId = await resolvePtyId(context);
    const path = `/pty/${encodeURIComponent(ptyId)}`;

    const result = await invokeOpenCodeEndpoint({
      path,
      method: 'DELETE',
      ensureRunning: autostart
    });

    return Response.json(
      {
        request: {
          path,
          method: 'DELETE'
        },
        result
      },
      { status: result.ok ? 200 : result.status || 502 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'PTY id is required.') {
      return Response.json(
        {
          error: error.message
        },
        { status: 400 }
      );
    }

    return Response.json(
      {
        error: error instanceof Error ? error.message : 'Unknown PTY delete error'
      },
      { status: 500 }
    );
  }
}
