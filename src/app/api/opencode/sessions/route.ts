import type { NextRequest } from 'next/server';
import {
  getOpenCodeSessionDetail,
  getOpenCodeSessions,
  getOpenCodeStatus,
  type OpenCodeSessionDetailInclude
} from '@/lib/opencode';
import { parseAutostartParam, parseOptionalBooleanParam } from '@/lib/opencode-route-utils';

export const runtime = 'nodejs';

function parsePositiveInteger(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function parseIncludes(value: string | null): OpenCodeSessionDetailInclude[] {
  if (!value) return [];
  const allowed = new Set<OpenCodeSessionDetailInclude>(['messages', 'todo', 'diff', 'children']);
  const parsed = value
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry): entry is OpenCodeSessionDetailInclude => allowed.has(entry as OpenCodeSessionDetailInclude));
  return Array.from(new Set(parsed));
}

export async function GET(request: NextRequest) {
  const searchParams = new URL(request.url).searchParams;
  const sessionId = searchParams.get('sessionId')?.trim() || '';
  try {
    const autostart = parseAutostartParam(searchParams);
    const limitParam = searchParams.get('limit');
    const limit = parsePositiveInteger(limitParam, 40);
    const messageLimit = parsePositiveInteger(searchParams.get('messageLimit'), 120);
    const roots = parseOptionalBooleanParam(searchParams.get('roots'));
    const start = searchParams.get('start')?.trim() || '';
    const search = searchParams.get('search')?.trim() || '';
    const includes = parseIncludes(searchParams.get('include'));

    if (sessionId) {
      const detail = await getOpenCodeSessionDetail(sessionId, {
        ensureRunning: autostart,
        messageLimit,
        include: includes
      });
      return Response.json(detail);
    }

    const sessions = await getOpenCodeSessions({
      ensureRunning: autostart,
      limit,
      roots,
      start: start || undefined,
      search: search || undefined,
      passthroughLimit: limitParam !== null
    });

    return Response.json(sessions);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown OpenCode session error';
    if (!sessionId) {
      const status = await getOpenCodeStatus().catch(() => ({
        running: false,
        host: process.env.OPENCODE_HOST?.trim() || '127.0.0.1',
        port: Number.parseInt(process.env.OPENCODE_PORT ?? '4096', 10) || 4096
      }));

      return Response.json(
        {
          running: status.running,
          host: status.host,
          port: status.port,
          started: false,
          count: 0,
          sessions: [],
          error: errorMessage
        },
        { status: 500 }
      );
    }

    return Response.json(
      {
        error: errorMessage
      },
      { status: 500 }
    );
  }
}
