import type { NextRequest } from 'next/server';
import { getOpenCodeMonitorSnapshot, type OpenCodeMonitorInclude } from '@/lib/opencode';

export const runtime = 'nodejs';

function parsePositiveInteger(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function parseIncludes(value: string | null): OpenCodeMonitorInclude[] {
  if (!value) return [];
  const allowed = new Set<OpenCodeMonitorInclude>([
    'providers',
    'agents',
    'skills',
    'commands',
    'path',
    'vcs',
    'mcp',
    'lsp',
    'formatter',
    'projects',
    'config',
    'openapi'
  ]);

  const parsed = value
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry): entry is OpenCodeMonitorInclude => allowed.has(entry as OpenCodeMonitorInclude));

  return Array.from(new Set(parsed));
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const autostart = searchParams.get('autostart') === '1';
    const sessionLimit = parsePositiveInteger(searchParams.get('sessionLimit'), 80);
    const include = parseIncludes(searchParams.get('include'));

    const snapshot = await getOpenCodeMonitorSnapshot({
      ensureRunning: autostart,
      sessionLimit,
      include
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
