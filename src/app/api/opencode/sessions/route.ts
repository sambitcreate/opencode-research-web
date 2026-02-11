import type { NextRequest } from 'next/server';
import {
  getOpenCodeSessionDetail,
  getOpenCodeSessions,
  type OpenCodeSessionDetailInclude
} from '@/lib/opencode';

export const runtime = 'nodejs';

function parsePositiveInteger(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function parseBoolean(value: string | null): boolean | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === '1' || normalized === 'true') return true;
  if (normalized === '0' || normalized === 'false') return false;
  return undefined;
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
  try {
    const searchParams = new URL(request.url).searchParams;
    const sessionId = searchParams.get('sessionId')?.trim() || '';
    const autostart = searchParams.get('autostart') === '1';
    const limitParam = searchParams.get('limit');
    const limit = parsePositiveInteger(limitParam, 40);
    const messageLimit = parsePositiveInteger(searchParams.get('messageLimit'), 120);
    const roots = parseBoolean(searchParams.get('roots'));
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
    return Response.json(
      {
        error: error instanceof Error ? error.message : 'Unknown OpenCode session error'
      },
      { status: 500 }
    );
  }
}
