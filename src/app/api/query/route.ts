import type { NextRequest } from 'next/server';
import { getOpenCodeStatus, runResearchQuery } from '@/lib/opencode';

export const runtime = 'nodejs';

type QueryResponseShape = {
  id: string;
  query: string;
  status: 'completed' | 'failed';
  sessionId: string;
  answer: string;
  sources: string[];
  metadata: {
    sources: number;
    processingTime: number;
    confidenceScore: number;
    opencode: unknown;
    error?: {
      code: string;
      message: string;
    };
  };
  timestamp: string;
};

function buildQueryResponse(input: {
  query: string;
  status: QueryResponseShape['status'];
  sessionId: string;
  answer: string;
  sources: string[];
  processingTime: number;
  confidenceScore: number;
  opencode: unknown;
  error?: {
    code: string;
    message: string;
  };
}): QueryResponseShape {
  return {
    id: `result_${Date.now()}`,
    query: input.query,
    status: input.status,
    sessionId: input.sessionId,
    answer: input.answer,
    sources: input.sources,
    metadata: {
      sources: input.sources.length,
      processingTime: input.processingTime,
      confidenceScore: input.confidenceScore,
      opencode: input.opencode,
      ...(input.error ? { error: input.error } : {})
    },
    timestamp: new Date().toISOString()
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function extractErrorString(error: unknown, key: string): string | null {
  const record = asRecord(error);
  if (!record) return null;
  const value = record[key];
  return typeof value === 'string' && value.trim() ? value : null;
}

function extractErrorNumber(error: unknown, key: string): number | null {
  const record = asRecord(error);
  if (!record) return null;
  const value = record[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function extractErrorOpenCode(error: unknown): QueryResponseShape['metadata']['opencode'] | null {
  const record = asRecord(error);
  if (!record) return null;
  const opencode = asRecord(record.opencode);
  if (!opencode) return null;
  const host = typeof opencode.host === 'string' ? opencode.host : null;
  const port = typeof opencode.port === 'number' ? opencode.port : null;
  const started = typeof opencode.started === 'boolean' ? opencode.started : null;
  const command = typeof opencode.command === 'string' ? opencode.command : null;
  if (!host || port === null || started === null || !command) return null;
  return {
    host,
    port,
    started,
    command
  };
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as { query?: unknown };
    const query = typeof payload?.query === 'string' ? payload.query : '';

    if (!query) {
      const response = buildQueryResponse({
        query: '',
        status: 'failed',
        sessionId: '',
        answer: '',
        sources: [],
        processingTime: 0,
        confidenceScore: 0,
        opencode: null,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Query is required'
        }
      });
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const result = await runResearchQuery(query);
    const response = buildQueryResponse({
      query,
      status: 'completed',
      sessionId: result.sessionId,
      answer: result.answer,
      sources: result.sources,
      processingTime: result.processingTime,
      confidenceScore: result.confidenceScore,
      opencode: result.opencode
    });

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const sessionId = extractErrorString(error, 'sessionId') ?? '';
    const processingTime = extractErrorNumber(error, 'processingTime') ?? 0;
    const opencodeFromError = extractErrorOpenCode(error);
    const opencodeStatus = opencodeFromError
      ? opencodeFromError
      : await getOpenCodeStatus()
          .then((status) => ({
            host: status.host,
            port: status.port,
            started: status.running,
            command: status.command
          }))
          .catch(() => null);
    console.error('Query processing error:', error);
    const response = buildQueryResponse({
      query: '',
      status: 'failed',
      sessionId,
      answer: '',
      sources: [],
      processingTime,
      confidenceScore: 0,
      opencode: opencodeStatus,
      error: {
        code: 'QUERY_PROCESSING_ERROR',
        message
      }
    });
    return new Response(JSON.stringify(response), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
