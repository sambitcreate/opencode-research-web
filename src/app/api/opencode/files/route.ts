import type { NextRequest } from 'next/server';
import { invokeOpenCodeEndpoint } from '@/lib/opencode';

export const runtime = 'nodejs';

type FilesMode = 'findText' | 'findFile' | 'list' | 'content' | 'status';

const MODE_PATHS: Record<FilesMode, string> = {
  findText: '/find',
  findFile: '/find/file',
  list: '/file',
  content: '/file/content',
  status: '/file/status'
};

function isMode(value: string): value is FilesMode {
  return value === 'findText' || value === 'findFile' || value === 'list' || value === 'content' || value === 'status';
}

function buildForwardPath(mode: FilesMode, searchParams: URLSearchParams): string {
  const forward = new URLSearchParams();
  for (const [key, value] of searchParams.entries()) {
    if (key === 'mode' || key === 'autostart') continue;
    forward.append(key, value);
  }

  const query = forward.toString();
  return query ? `${MODE_PATHS[mode]}?${query}` : MODE_PATHS[mode];
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const modeRaw = searchParams.get('mode')?.trim() || '';
    if (!isMode(modeRaw)) {
      return Response.json(
        {
          error: 'Invalid files mode.',
          details: {
            allowedModes: ['findText', 'findFile', 'list', 'content', 'status']
          }
        },
        { status: 400 }
      );
    }

    const autostart = searchParams.get('autostart') === '1';
    const path = buildForwardPath(modeRaw, searchParams);

    const result = await invokeOpenCodeEndpoint({
      path,
      method: 'GET',
      ensureRunning: autostart
    });

    return Response.json(
      {
        mode: modeRaw,
        request: {
          path,
          method: 'GET'
        },
        result
      },
      { status: result.ok ? 200 : result.status || 502 }
    );
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : 'Unknown files route error'
      },
      { status: 500 }
    );
  }
}
