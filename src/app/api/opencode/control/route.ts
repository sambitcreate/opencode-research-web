import type { NextRequest } from 'next/server';
import { invokeOpenCodeEndpoint } from '@/lib/opencode';

export const runtime = 'nodejs';

type ControlPayload = {
  path: string;
  method?: string;
  body?: unknown;
  timeoutMs?: number;
  autostart?: boolean;
  parseSsePayload?: boolean;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as unknown;
    if (!isObject(payload)) {
      return Response.json(
        {
          error: 'Request body must be an object.'
        },
        { status: 400 }
      );
    }

    const body = payload as ControlPayload;
    if (!body.path || typeof body.path !== 'string') {
      return Response.json(
        {
          error: 'Field "path" is required and must be a string.'
        },
        { status: 400 }
      );
    }

    const result = await invokeOpenCodeEndpoint({
      path: body.path,
      method: typeof body.method === 'string' ? body.method : 'GET',
      body: body.body,
      timeoutMs: typeof body.timeoutMs === 'number' ? body.timeoutMs : undefined,
      ensureRunning: body.autostart === true,
      parseSsePayload: body.parseSsePayload === true
    });

    return Response.json(result, {
      status: result.ok ? 200 : result.status || 502
    });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : 'Unknown OpenCode control error'
      },
      { status: 500 }
    );
  }
}
