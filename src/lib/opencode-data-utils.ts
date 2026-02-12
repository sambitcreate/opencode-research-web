import type { OpenCodeSessionMessage, OpenCodeSessionSummary } from './opencode';

type JsonRecord = Record<string, unknown>;

function clampInteger(value: number | undefined, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.round(value)));
}

export function extractSessionId(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as JsonRecord;

  if (typeof record.id === 'string') return record.id;
  const session = record.session;
  if (session && typeof session === 'object') {
    const sessionRecord = session as JsonRecord;
    if (typeof sessionRecord.id === 'string') return sessionRecord.id;
  }

  return null;
}

export function collectTextFragments(value: unknown, bucket: string[] = []): string[] {
  if (!value || typeof value !== 'object') return bucket;

  if (Array.isArray(value)) {
    for (const entry of value) collectTextFragments(entry, bucket);
    return bucket;
  }

  const record = value as JsonRecord;
  const directStringFields = ['text', 'delta', 'content', 'output_text', 'answer'];
  for (const field of directStringFields) {
    const item = record[field];
    if (typeof item === 'string') {
      const trimmed = item.trim();
      if (trimmed) bucket.push(trimmed);
    }
  }

  if (Array.isArray(record.parts)) {
    for (const part of record.parts) {
      if (!part || typeof part !== 'object') continue;
      const partRecord = part as JsonRecord;
      if (partRecord.type === 'text' && typeof partRecord.text === 'string') {
        const trimmed = partRecord.text.trim();
        if (trimmed) bucket.push(trimmed);
      }
    }
  }

  for (const nested of Object.values(record)) {
    if (nested && typeof nested === 'object') {
      collectTextFragments(nested, bucket);
    }
  }

  return bucket;
}

export function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const deduped: string[] = [];

  for (const value of values) {
    const normalized = value.trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    deduped.push(normalized);
  }

  return deduped;
}

export function asRecord(value: unknown): JsonRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as JsonRecord;
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function parseEpochMs(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null;
  return Math.round(value);
}

export function toIsoFromEpochMs(value: unknown): string | null {
  const epochMs = parseEpochMs(value);
  if (!epochMs) return null;
  return new Date(epochMs).toISOString();
}

export function toNonNegativeInteger(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
}

export function normalizeRole(value: unknown): OpenCodeSessionMessage['role'] {
  if (value === 'assistant' || value === 'user' || value === 'system' || value === 'tool') {
    return value;
  }
  return 'unknown';
}

export function mapSessionSummary(value: unknown): (OpenCodeSessionSummary & { sortKey: number }) | null {
  const record = asRecord(value);
  if (!record || typeof record.id !== 'string') return null;

  const time = asRecord(record.time);
  const summary = asRecord(record.summary);
  const createdEpoch = parseEpochMs(time?.created);
  const updatedEpoch = parseEpochMs(time?.updated);
  const sortKey = updatedEpoch ?? createdEpoch ?? 0;

  return {
    id: record.id,
    slug: typeof record.slug === 'string' ? record.slug : null,
    title: typeof record.title === 'string' && record.title.trim() ? record.title : 'Untitled session',
    directory: typeof record.directory === 'string' ? record.directory : null,
    version: typeof record.version === 'string' ? record.version : null,
    parentId:
      typeof record.parentID === 'string'
        ? record.parentID
        : typeof record.parentId === 'string'
          ? record.parentId
          : null,
    createdAt: toIsoFromEpochMs(time?.created),
    updatedAt: toIsoFromEpochMs(time?.updated),
    additions: toNonNegativeInteger(summary?.additions),
    deletions: toNonNegativeInteger(summary?.deletions),
    filesChanged: toNonNegativeInteger(summary?.files),
    sortKey
  };
}

export function stripSortKey(session: OpenCodeSessionSummary & { sortKey: number }): OpenCodeSessionSummary {
  return {
    id: session.id,
    slug: session.slug,
    title: session.title,
    directory: session.directory,
    version: session.version,
    parentId: session.parentId ?? null,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    additions: session.additions,
    deletions: session.deletions,
    filesChanged: session.filesChanged
  };
}

export function normalizeSessionId(sessionId: string): string {
  const normalizedSessionId = sessionId.trim();
  if (!normalizedSessionId.startsWith('ses_')) {
    throw new Error('Invalid OpenCode session id.');
  }
  return normalizedSessionId;
}

export function mapSessionMessages(value: unknown): OpenCodeSessionMessage[] {
  const rawMessages = asArray(value);
  const mapped = rawMessages
    .map((entry, index) => {
      const record = asRecord(entry);
      if (!record) return null;

      const info = asRecord(record.info);
      const messageTime = asRecord(info?.time);
      const parts = asArray(record.parts);
      const normalizedParts: JsonRecord[] = [];
      const partTypes: string[] = [];
      const textBlocks: string[] = [];
      let hasRunningToolCall = false;

      for (const part of parts) {
        const partRecord = asRecord(part);
        if (!partRecord) continue;
        normalizedParts.push(partRecord);

        const partType = typeof partRecord.type === 'string' ? partRecord.type : null;
        if (partType) partTypes.push(partType);

        if (partType === 'text' && typeof partRecord.text === 'string') {
          const trimmed = partRecord.text.trim();
          if (trimmed) textBlocks.push(trimmed);
        }

        if (partType === 'tool') {
          const state = asRecord(partRecord.state);
          const status = typeof state?.status === 'string' ? state.status : null;
          if (status === 'running') hasRunningToolCall = true;

          const tool = typeof partRecord.tool === 'string' ? partRecord.tool : null;
          if (tool || status) {
            textBlocks.push(`[tool ${tool || 'unknown'}: ${status || 'unknown'}]`);
          }
        }
      }

      const mergedText = uniqueStrings(textBlocks).join('\n\n').trim();
      const preview = mergedText.length > 1800 ? `${mergedText.slice(0, 1800)}...` : mergedText;

      return {
        id:
          typeof info?.id === 'string'
            ? info.id
            : typeof record.id === 'string'
              ? record.id
              : `message-${index + 1}`,
        role: normalizeRole(info?.role),
        createdAt: toIsoFromEpochMs(messageTime?.created),
        text: preview,
        partTypes: uniqueStrings(partTypes),
        hasRunningToolCall,
        parts: normalizedParts,
        order: index
      };
    })
    .filter((entry): entry is OpenCodeSessionMessage & { order: number } => entry !== null);

  mapped.sort((left, right) => {
    const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : Number.NaN;
    const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : Number.NaN;

    if (Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime !== rightTime) {
      return leftTime - rightTime;
    }

    return left.order - right.order;
  });

  return mapped.map((message) => ({
    id: message.id,
    role: message.role,
    createdAt: message.createdAt,
    text: message.text,
    partTypes: message.partTypes,
    hasRunningToolCall: message.hasRunningToolCall,
    parts: message.parts
  }));
}

export function buildSessionListPath(options?: {
  limit?: number;
  roots?: boolean;
  start?: string;
  search?: string;
  passthroughLimit?: boolean;
}): string {
  const limit = clampInteger(options?.limit, 40, 1, 200);
  const hasRootsFilter = typeof options?.roots === 'boolean';
  const hasStartFilter = typeof options?.start === 'string' && options.start.trim().length > 0;
  const hasSearchFilter = typeof options?.search === 'string' && options.search.trim().length > 0;
  const shouldPassthroughLimit = options?.passthroughLimit === true;

  if (!hasRootsFilter && !hasStartFilter && !hasSearchFilter && !shouldPassthroughLimit) {
    return '/session';
  }

  const params = new URLSearchParams();
  params.set('limit', String(limit));
  if (typeof options?.roots === 'boolean') {
    params.set('roots', options.roots ? '1' : '0');
  }
  if (typeof options?.start === 'string' && options.start.trim()) {
    params.set('start', options.start.trim());
  }
  if (typeof options?.search === 'string' && options.search.trim()) {
    params.set('search', options.search.trim());
  }
  const query = params.toString();
  return query ? `/session?${query}` : '/session';
}

export function hasDiffMarkerInMessage(message: OpenCodeSessionMessage | null): boolean {
  if (!message) return false;
  const text = message.text.toLowerCase();
  if (text.includes('diff') || text.includes('patch')) return true;

  return message.parts.some((part) => {
    const partType = typeof part.type === 'string' ? part.type.toLowerCase() : '';
    const tool = typeof part.tool === 'string' ? part.tool.toLowerCase() : '';
    return (
      partType.includes('diff') ||
      partType.includes('patch') ||
      tool.includes('diff') ||
      tool.includes('patch') ||
      tool.includes('edit')
    );
  });
}

export function createTimelinePreview(text: string): string {
  const flattened = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' ');
  if (!flattened) return '(empty)';
  return flattened.length > 220 ? `${flattened.slice(0, 220)}...` : flattened;
}

export function stringifyCompact(value: unknown, limit = 900): string {
  try {
    const text = JSON.stringify(value, null, 2);
    return text.length > limit ? `${text.slice(0, limit)}...` : text;
  } catch {
    return String(value);
  }
}

export function formatMessageForTranscript(
  message: OpenCodeSessionMessage,
  options: { thinking: boolean; toolDetails: boolean; assistantMetadata: boolean }
): string[] {
  const bodyLines: string[] = [];

  for (const part of message.parts) {
    const partType = typeof part.type === 'string' ? part.type : '';

    if (partType === 'text' && typeof part.text === 'string' && part.text.trim()) {
      bodyLines.push(part.text.trim());
      continue;
    }

    if ((partType === 'thinking' || partType === 'reasoning') && options.thinking && typeof part.text === 'string' && part.text.trim()) {
      bodyLines.push(`> Thinking: ${part.text.trim()}`);
      continue;
    }

    if (partType === 'tool' && options.toolDetails) {
      const toolName = typeof part.tool === 'string' ? part.tool : 'unknown';
      const state = asRecord(part.state);
      const status = typeof state?.status === 'string' ? state.status : 'unknown';
      bodyLines.push(`- Tool: \`${toolName}\` (${status})`);
      const args = part.args ?? part.input;
      if (args !== undefined) {
        bodyLines.push('```json');
        bodyLines.push(stringifyCompact(args));
        bodyLines.push('```');
      }
      const output = part.output ?? part.result;
      if (output !== undefined) {
        bodyLines.push('```json');
        bodyLines.push(stringifyCompact(output));
        bodyLines.push('```');
      }
      continue;
    }
  }

  if (bodyLines.length === 0 && message.text.trim()) {
    bodyLines.push(message.text.trim());
  }

  if (bodyLines.length === 0) {
    bodyLines.push('_No renderable content extracted._');
  }

  if (options.assistantMetadata) {
    bodyLines.push('');
    bodyLines.push(`_partTypes: ${message.partTypes.join(', ') || 'none'}_`);
    bodyLines.push(`_runningToolCall: ${message.hasRunningToolCall ? 'yes' : 'no'}_`);
  }

  return bodyLines;
}

export function parseSseEventData(value: string): unknown {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed === '[DONE]') return trimmed;

  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return trimmed;
  }
}

export function parseOpenCodeSseBlock(block: string): { event: string | null; id: string | null; data: unknown } | null {
  const lines = block
    .split('\n')
    .map((line) => line.trimEnd())
    .filter(Boolean);

  if (lines.length === 0) return null;

  let event: string | null = null;
  let id: string | null = null;
  const dataLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith(':')) continue;

    if (line.startsWith('event:')) {
      const value = line.slice(6).trim();
      event = value || null;
      continue;
    }
    if (line.startsWith('id:')) {
      const value = line.slice(3).trim();
      id = value || null;
      continue;
    }
    if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trimStart());
    }
  }

  if (dataLines.length === 0) return null;
  const data = parseSseEventData(dataLines.join('\n'));
  if (data === '[DONE]') return null;

  return {
    event,
    id,
    data
  };
}

export function extractSources(text: string): string[] {
  const matches = text.match(/https?:\/\/[^\s)\]]+/gi) || [];
  return uniqueStrings(matches);
}

export function sanitizeAnswer(text: string): string {
  const blocks = text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  const metaPattern =
    /\b(The user\b|This request\b|This is a .*request|I(?:'ll| will| am| was| should| can| responded| made sure)\b|My response should\b|Let me\b)\b/i;

  const filtered = blocks.filter((block) => {
    return !metaPattern.test(block);
  });

  return (filtered.length > 0 ? filtered : blocks).join('\n\n').trim();
}

export function buildResearchPrompt(query: string): string {
  return [
    'You are a research assistant for a localhost app.',
    'Return only the final answer for the user.',
    'Do not include internal reasoning or planning statements.',
    'Do not repeat content.',
    'Use this format exactly:',
    '1. <first key finding>',
    '2. <second key finding>',
    '3. <third key finding>',
    'Sources:',
    '- <url 1>',
    '- <url 2>',
    '- <url 3>',
    '',
    `Research question: ${query}`
  ].join('\n');
}

export function findConfidenceScore(value: unknown): number | null {
  if (!value || typeof value !== 'object') return null;
  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = findConfidenceScore(entry);
      if (found !== null) return found;
    }
    return null;
  }

  const record = value as JsonRecord;
  for (const key of ['confidenceScore', 'confidence', 'score']) {
    const candidate = record[key];
    if (typeof candidate === 'number' && Number.isFinite(candidate)) {
      const score = candidate <= 1 ? candidate * 100 : candidate;
      return Math.max(0, Math.min(100, Math.round(score)));
    }
  }

  for (const nested of Object.values(record)) {
    const found = findConfidenceScore(nested);
    if (found !== null) return found;
  }

  return null;
}
