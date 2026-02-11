import { spawn, type ChildProcess } from 'node:child_process';
import net from 'node:net';

type JsonRecord = Record<string, unknown>;

type CommandSpec = {
  command: string;
  args: string[];
  shell: boolean;
  display: string;
};

type OpenCodeManager = {
  process: ChildProcess | null;
  startupPromise: Promise<void> | null;
  command: string | null;
  startedAt: number | null;
  lastError: string | null;
  logs: string[];
};

const DEFAULT_OPENAPI_ENDPOINTS = [
  '/global/health',
  '/global/event',
  '/global/config',
  '/global/dispose',
  '/auth/{providerID}',
  '/project',
  '/project/current',
  '/project/{projectID}',
  '/pty',
  '/pty/{ptyID}',
  '/pty/{ptyID}/connect',
  '/config',
  '/config/providers',
  '/experimental/tool/ids',
  '/experimental/tool',
  '/experimental/worktree',
  '/experimental/worktree/reset',
  '/experimental/resource',
  '/session',
  '/session/status',
  '/session/{sessionID}',
  '/session/{sessionID}/children',
  '/session/{sessionID}/todo',
  '/session/{sessionID}/init',
  '/session/{sessionID}/fork',
  '/session/{sessionID}/abort',
  '/session/{sessionID}/share',
  '/session/{sessionID}/diff',
  '/session/{sessionID}/summarize',
  '/session/{sessionID}/message',
  '/session/{sessionID}/message/{messageID}',
  '/session/{sessionID}/message/{messageID}/part/{partID}',
  '/session/{sessionID}/prompt_async',
  '/session/{sessionID}/command',
  '/session/{sessionID}/shell',
  '/session/{sessionID}/revert',
  '/session/{sessionID}/unrevert',
  '/session/{sessionID}/permissions/{permissionID}',
  '/permission/{requestID}/reply',
  '/permission',
  '/question',
  '/question/{requestID}/reply',
  '/question/{requestID}/reject',
  '/provider',
  '/provider/auth',
  '/provider/{providerID}/oauth/authorize',
  '/provider/{providerID}/oauth/callback',
  '/find',
  '/find/file',
  '/find/symbol',
  '/file',
  '/file/content',
  '/file/status',
  '/mcp',
  '/mcp/{name}/auth',
  '/mcp/{name}/auth/callback',
  '/mcp/{name}/auth/authenticate',
  '/mcp/{name}/connect',
  '/mcp/{name}/disconnect',
  '/tui/append-prompt',
  '/tui/open-help',
  '/tui/open-sessions',
  '/tui/open-themes',
  '/tui/open-models',
  '/tui/submit-prompt',
  '/tui/clear-prompt',
  '/tui/execute-command',
  '/tui/show-toast',
  '/tui/publish',
  '/tui/select-session',
  '/tui/control/next',
  '/tui/control/response',
  '/instance/dispose',
  '/path',
  '/vcs',
  '/command',
  '/log',
  '/agent',
  '/skill',
  '/lsp',
  '/formatter',
  '/event'
] as const;

export type OpenCodeHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type OpenCodeEndpointDefinition = {
  path: string;
  methods: OpenCodeHttpMethod[];
  operationIds: string[];
};

export type OpenCodeInvocationResult = {
  ok: boolean;
  status: number;
  contentType: string;
  data: unknown;
  text: string;
};

export type OpenCodeOpenApiSnapshot = {
  source: 'live' | 'fallback';
  title: string;
  version: string;
  endpointCount: number;
  endpoints: OpenCodeEndpointDefinition[];
};

export type OpenCodePermissionRequest = Record<string, unknown>;
export type OpenCodeQuestionRequest = Record<string, unknown>;
export type OpenCodeSessionStatusMap = Record<string, unknown>;

export type OpenCodeMonitorSnapshot = {
  status: OpenCodeStatus;
  sessions: OpenCodeSessionList;
  sessionStatus: OpenCodeSessionStatusMap;
  permissions: OpenCodePermissionRequest[];
  questions: OpenCodeQuestionRequest[];
  providers: unknown;
  commands: unknown;
  agents: unknown;
  skills: unknown;
  pathInfo: unknown;
  vcsInfo: unknown;
  openapi: OpenCodeOpenApiSnapshot;
  errors: string[];
};

type ResearchPayload = {
  sessionId: string;
  answer: string;
  sources: string[];
  confidenceScore: number;
};

export type OpenCodeStatus = {
  running: boolean;
  host: string;
  port: number;
  lastError: string | null;
  command: string;
  startedAt: string | null;
  recentLogs: string[];
};

export type OpenCodeSessionSummary = {
  id: string;
  slug: string | null;
  title: string;
  directory: string | null;
  version: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  additions: number;
  deletions: number;
  filesChanged: number;
};

export type OpenCodeSessionList = {
  running: boolean;
  host: string;
  port: number;
  started: boolean;
  count: number;
  sessions: OpenCodeSessionSummary[];
};

export type OpenCodeSessionMessage = {
  id: string;
  role: 'assistant' | 'user' | 'system' | 'tool' | 'unknown';
  createdAt: string | null;
  text: string;
  partTypes: string[];
  hasRunningToolCall: boolean;
  parts: JsonRecord[];
};

export type OpenCodeSessionDetail = {
  running: boolean;
  host: string;
  port: number;
  started: boolean;
  session: OpenCodeSessionSummary;
  messages: OpenCodeSessionMessage[];
  messageCount: number;
  latestMessageAt: string | null;
  activeToolCalls: number;
};

function safeParseInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getHost(): string {
  return process.env.OPENCODE_HOST?.trim() || '127.0.0.1';
}

function getPort(): number {
  return safeParseInt(process.env.OPENCODE_PORT, 4096);
}

function getStartupTimeoutMs(): number {
  return safeParseInt(process.env.OPENCODE_STARTUP_TIMEOUT_MS, 25_000);
}

function getBaseUrl(): string {
  const configured = process.env.OPENCODE_API_URL?.trim();
  if (configured) {
    return configured.replace(/\/+$/, '');
  }
  return `http://${getHost()}:${getPort()}`;
}

function buildCommandSpec(): CommandSpec {
  const customCommand = process.env.OPENCODE_COMMAND?.trim();
  if (customCommand) {
    return {
      command: customCommand,
      args: [],
      shell: true,
      display: customCommand
    };
  }

  const args = ['serve', '--hostname', getHost(), '--port', String(getPort())];
  const authToken = process.env.OPENCODE_AUTH_TOKEN?.trim();
  if (authToken) args.push('--auth-token', authToken);

  const model = process.env.OPENCODE_MODEL?.trim();
  if (model) args.push('--model', model);

  return {
    command: 'opencode',
    args,
    shell: false,
    display: `opencode ${args.join(' ')}`
  };
}

function getManager(): OpenCodeManager {
  const globalState = globalThis as typeof globalThis & {
    __opencodeManager?: OpenCodeManager;
  };

  if (!globalState.__opencodeManager) {
    globalState.__opencodeManager = {
      process: null,
      startupPromise: null,
      command: null,
      startedAt: null,
      lastError: null,
      logs: []
    };
  }

  return globalState.__opencodeManager;
}

function appendLog(message: string): void {
  const manager = getManager();
  const line = `${new Date().toISOString()} ${message}`.slice(0, 700);
  manager.logs.push(line);
  if (manager.logs.length > 120) manager.logs.shift();
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function isPortOpen(host: string, port: number): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const socket = net.createConnection({ host, port });
    let finished = false;

    const done = (value: boolean) => {
      if (finished) return;
      finished = true;
      socket.destroy();
      resolve(value);
    };

    socket.setTimeout(500);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
  });
}

async function waitForPort(host: string, port: number, timeoutMs: number): Promise<void> {
  const started = Date.now();
  while (Date.now() - started <= timeoutMs) {
    if (await isPortOpen(host, port)) return;
    await delay(250);
  }
  throw new Error(`OpenCode failed to start on ${host}:${port} within ${timeoutMs}ms`);
}

function getAuthHeaders(): Record<string, string> {
  const token = process.env.OPENCODE_AUTH_TOKEN?.trim();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function extractSessionId(value: unknown): string | null {
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

function collectTextFragments(value: unknown, bucket: string[] = []): string[] {
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

function uniqueStrings(values: string[]): string[] {
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

function asRecord(value: unknown): JsonRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as JsonRecord;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function parseEpochMs(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null;
  return Math.round(value);
}

function toIsoFromEpochMs(value: unknown): string | null {
  const epochMs = parseEpochMs(value);
  if (!epochMs) return null;
  return new Date(epochMs).toISOString();
}

function toNonNegativeInteger(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
}

function normalizeRole(value: unknown): OpenCodeSessionMessage['role'] {
  if (value === 'assistant' || value === 'user' || value === 'system' || value === 'tool') {
    return value;
  }
  return 'unknown';
}

function mapSessionSummary(value: unknown): (OpenCodeSessionSummary & { sortKey: number }) | null {
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
    createdAt: toIsoFromEpochMs(time?.created),
    updatedAt: toIsoFromEpochMs(time?.updated),
    additions: toNonNegativeInteger(summary?.additions),
    deletions: toNonNegativeInteger(summary?.deletions),
    filesChanged: toNonNegativeInteger(summary?.files),
    sortKey
  };
}

function mapSessionMessages(value: unknown): OpenCodeSessionMessage[] {
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

function extractSources(text: string): string[] {
  const matches = text.match(/https?:\/\/[^\s)\]]+/gi) || [];
  return uniqueStrings(matches);
}

function sanitizeAnswer(text: string): string {
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

function buildResearchPrompt(query: string): string {
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

function findConfidenceScore(value: unknown): number | null {
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

async function parseSsePayload(response: Response): Promise<{ raw: unknown[]; text: string }> {
  const reader = response.body?.getReader();
  if (!reader) return { raw: [], text: '' };

  const decoder = new TextDecoder();
  let buffered = '';
  let stop = false;
  const events: unknown[] = [];

  while (!stop) {
    const { done, value } = await reader.read();
    if (done) break;

    buffered += decoder.decode(value, { stream: true });

    while (true) {
      const separator = buffered.indexOf('\n\n');
      if (separator === -1) break;

      const block = buffered.slice(0, separator);
      buffered = buffered.slice(separator + 2);

      const data = block
        .split('\n')
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trim())
        .join('\n')
        .trim();

      if (!data) continue;
      if (data === '[DONE]') {
        stop = true;
        break;
      }

      try {
        events.push(JSON.parse(data));
      } catch {
        events.push(data);
      }
    }
  }

  const text = uniqueStrings(collectTextFragments(events)).join('\n\n').trim();
  return { raw: events, text };
}

async function parseResponseBody(response: Response): Promise<{ raw: unknown; text: string }> {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('text/event-stream')) {
    return parseSsePayload(response);
  }

  const textBody = await response.text();
  if (!textBody.trim()) return { raw: {}, text: '' };

  try {
    const parsed = JSON.parse(textBody) as unknown;
    const text = uniqueStrings(collectTextFragments(parsed)).join('\n\n').trim();
    return { raw: parsed, text };
  } catch {
    return { raw: textBody, text: textBody.trim() };
  }
}

function normalizeApiPath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed) {
    throw new Error('OpenCode API path is required.');
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    throw new Error('OpenCode API path must be relative (for example, /session).');
  }

  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

async function requestOpenCodeRaw(path: string, init: RequestInit, timeoutMs = 60_000): Promise<Response> {
  const normalizedPath = normalizeApiPath(path);
  const headers = new Headers(init.headers);
  for (const [key, value] of Object.entries(getAuthHeaders())) {
    if (!headers.has(key)) headers.set(key, value);
  }

  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return fetchWithTimeout(`${getBaseUrl()}${normalizedPath}`, { ...init, headers }, timeoutMs);
}

async function requestOpenCode(path: string, init: RequestInit, timeoutMs = 60_000): Promise<Response> {
  const normalizedPath = normalizeApiPath(path);
  const response = await requestOpenCodeRaw(normalizedPath, init, timeoutMs);
  if (response.ok) return response;

  const errorDetails = (await response.text()).slice(0, 900);
  throw new Error(`OpenCode request failed (${response.status}) on ${normalizedPath}: ${errorDetails}`);
}

export async function ensureOpenCodeServer(): Promise<{
  started: boolean;
  host: string;
  port: number;
  command: string;
}> {
  const host = getHost();
  const port = getPort();
  const manager = getManager();

  if (await isPortOpen(host, port)) {
    return {
      started: false,
      host,
      port,
      command: manager.command || buildCommandSpec().display
    };
  }

  if (manager.startupPromise) {
    await manager.startupPromise;
    return {
      started: false,
      host,
      port,
      command: manager.command || buildCommandSpec().display
    };
  }

  const spec = buildCommandSpec();
  manager.command = spec.display;
  manager.lastError = null;
  manager.startedAt = Date.now();
  appendLog(`Launching OpenCode with: ${spec.display}`);

  const child = spawn(spec.command, spec.args, {
    shell: spec.shell,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  manager.process = child;

  child.stdout?.on('data', (chunk: Buffer) => {
    appendLog(`[stdout] ${chunk.toString().trim()}`);
  });

  child.stderr?.on('data', (chunk: Buffer) => {
    appendLog(`[stderr] ${chunk.toString().trim()}`);
  });

  child.once('error', (error) => {
    manager.lastError = error.message;
    appendLog(`Process error: ${error.message}`);
  });

  child.once('exit', (code, signal) => {
    manager.process = null;
    if (code !== 0) {
      manager.lastError = `OpenCode exited unexpectedly (code=${code ?? 'null'} signal=${signal ?? 'none'})`;
      appendLog(manager.lastError);
    } else {
      appendLog('OpenCode process exited');
    }
  });

  const startupPromise = (async () => {
    const timeoutMs = getStartupTimeoutMs();
    const startupFailure = new Promise<never>((_, reject) => {
      child.once('exit', (code, signal) => {
        reject(
          new Error(
            `OpenCode exited before startup (code=${code ?? 'null'} signal=${signal ?? 'none'}).`
          )
        );
      });
      child.once('error', (error) => {
        reject(error);
      });
    });

    await Promise.race([waitForPort(host, port, timeoutMs), startupFailure]);
  })();

  manager.startupPromise = startupPromise;

  try {
    await startupPromise;
    appendLog(`OpenCode is reachable at ${host}:${port}`);
    return {
      started: true,
      host,
      port,
      command: spec.display
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown startup failure';
    manager.lastError = message;
    appendLog(`Startup failed: ${message}`);
    throw error;
  } finally {
    manager.startupPromise = null;
  }
}

async function sendResearchPrompt(query: string): Promise<ResearchPayload> {
  const sessionResponse = await requestOpenCode('/session', {
    method: 'POST',
    body: JSON.stringify({})
  });

  const sessionPayload = await parseResponseBody(sessionResponse);
  const sessionId = extractSessionId(sessionPayload.raw);
  if (!sessionId) {
    throw new Error('OpenCode did not return a valid session id.');
  }

  const messageResponse = await requestOpenCode(
    `/session/${encodeURIComponent(sessionId)}/message`,
    {
      method: 'POST',
      body: JSON.stringify({
        parts: [{ type: 'text', text: buildResearchPrompt(query) }],
        stream: false
      })
    },
    safeParseInt(process.env.OPENCODE_QUERY_TIMEOUT_MS, 120_000)
  );

  const messagePayload = await parseResponseBody(messageResponse);
  const answer = sanitizeAnswer(messagePayload.text || 'OpenCode returned no text output.');
  const sources = extractSources(answer);
  const confidenceScore = findConfidenceScore(messagePayload.raw) ?? (sources.length > 0 ? 86 : 72);

  return {
    sessionId,
    answer,
    sources,
    confidenceScore
  };
}

function clampInteger(value: number | undefined, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.round(value)));
}

export async function getOpenCodeSessions(options?: {
  limit?: number;
  ensureRunning?: boolean;
}): Promise<OpenCodeSessionList> {
  const host = getHost();
  const port = getPort();
  const ensureRunning = options?.ensureRunning === true;
  const limit = clampInteger(options?.limit, 40, 1, 200);
  let started = false;

  if (ensureRunning) {
    const startup = await ensureOpenCodeServer();
    started = startup.started;
  }

  const running = await isPortOpen(host, port);
  if (!running) {
    return {
      running: false,
      host,
      port,
      started,
      count: 0,
      sessions: []
    };
  }

  const sessionResponse = await requestOpenCode(
    '/session',
    {
      method: 'GET'
    },
    safeParseInt(process.env.OPENCODE_STATUS_TIMEOUT_MS, 25_000)
  );

  const sessionPayload = await parseResponseBody(sessionResponse);
  const mapped = asArray(sessionPayload.raw)
    .map((entry) => mapSessionSummary(entry))
    .filter((entry): entry is OpenCodeSessionSummary & { sortKey: number } => entry !== null);

  mapped.sort((left, right) => right.sortKey - left.sortKey);

  return {
    running: true,
    host,
    port,
    started,
    count: mapped.length,
    sessions: mapped.slice(0, limit).map((session) => ({
      id: session.id,
      slug: session.slug,
      title: session.title,
      directory: session.directory,
      version: session.version,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      additions: session.additions,
      deletions: session.deletions,
      filesChanged: session.filesChanged
    }))
  };
}

export async function getOpenCodeSessionDetail(
  sessionId: string,
  options?: {
    messageLimit?: number;
    ensureRunning?: boolean;
  }
): Promise<OpenCodeSessionDetail> {
  const host = getHost();
  const port = getPort();
  const ensureRunning = options?.ensureRunning === true;
  const messageLimit = clampInteger(options?.messageLimit, 120, 1, 500);
  const normalizedSessionId = sessionId.trim();

  if (!normalizedSessionId.startsWith('ses_')) {
    throw new Error('Invalid OpenCode session id.');
  }

  let started = false;
  if (ensureRunning) {
    const startup = await ensureOpenCodeServer();
    started = startup.started;
  }

  if (!(await isPortOpen(host, port))) {
    throw new Error(`OpenCode is not reachable at ${host}:${port}.`);
  }

  const [sessionResponse, messagesResponse] = await Promise.all([
    requestOpenCode(`/session/${encodeURIComponent(normalizedSessionId)}`, {
      method: 'GET'
    }),
    requestOpenCode(
      `/session/${encodeURIComponent(normalizedSessionId)}/message`,
      {
        method: 'GET'
      },
      safeParseInt(process.env.OPENCODE_STATUS_TIMEOUT_MS, 25_000)
    )
  ]);

  const [sessionPayload, messagesPayload] = await Promise.all([
    parseResponseBody(sessionResponse),
    parseResponseBody(messagesResponse)
  ]);

  const mappedSession = mapSessionSummary(sessionPayload.raw);
  if (!mappedSession) {
    throw new Error(`OpenCode did not return a valid session payload for ${normalizedSessionId}.`);
  }

  const allMessages = mapSessionMessages(messagesPayload.raw);
  const visibleMessages = allMessages.slice(Math.max(0, allMessages.length - messageLimit));
  const latestMessageAt = visibleMessages[visibleMessages.length - 1]?.createdAt || mappedSession.updatedAt;
  const session: OpenCodeSessionSummary = {
    id: mappedSession.id,
    slug: mappedSession.slug,
    title: mappedSession.title,
    directory: mappedSession.directory,
    version: mappedSession.version,
    createdAt: mappedSession.createdAt,
    updatedAt: mappedSession.updatedAt,
    additions: mappedSession.additions,
    deletions: mappedSession.deletions,
    filesChanged: mappedSession.filesChanged
  };

  return {
    running: true,
    host,
    port,
    started,
    session,
    messages: visibleMessages,
    messageCount: allMessages.length,
    latestMessageAt,
    activeToolCalls: visibleMessages.filter((message) => message.hasRunningToolCall).length
  };
}

export async function runResearchQuery(query: string): Promise<{
  sessionId: string;
  answer: string;
  sources: string[];
  confidenceScore: number;
  opencode: {
    host: string;
    port: number;
    started: boolean;
    command: string;
  };
  processingTime: number;
}> {
  const startedAt = Date.now();
  const opencode = await ensureOpenCodeServer();
  const payload = await sendResearchPrompt(query);
  const processingTime = Math.max(1, Math.round((Date.now() - startedAt) / 1000));

  return {
    ...payload,
    opencode: {
      host: opencode.host,
      port: opencode.port,
      started: opencode.started,
      command: opencode.command
    },
    processingTime
  };
}

export async function getOpenCodeStatus(): Promise<OpenCodeStatus> {
  const host = getHost();
  const port = getPort();
  const manager = getManager();

  return {
    running: await isPortOpen(host, port),
    host,
    port,
    lastError: manager.lastError,
    command: manager.command || buildCommandSpec().display,
    startedAt: manager.startedAt ? new Date(manager.startedAt).toISOString() : null,
    recentLogs: manager.logs.slice(-20)
  };
}

function normalizeMethod(method: string | undefined): OpenCodeHttpMethod {
  const normalized = (method || 'GET').toUpperCase();
  if (normalized === 'GET' || normalized === 'POST' || normalized === 'PUT' || normalized === 'PATCH' || normalized === 'DELETE') {
    return normalized;
  }
  throw new Error(`Unsupported OpenCode method: ${method}`);
}

function isOpenCodeMethod(value: string): value is OpenCodeHttpMethod {
  return value === 'GET' || value === 'POST' || value === 'PUT' || value === 'PATCH' || value === 'DELETE';
}

function asJsonRecord(value: unknown): JsonRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as JsonRecord;
}

function fallbackOpenApiSnapshot(): OpenCodeOpenApiSnapshot {
  return {
    source: 'fallback',
    title: 'OpenCode API (fallback)',
    version: 'unknown',
    endpointCount: DEFAULT_OPENAPI_ENDPOINTS.length,
    endpoints: DEFAULT_OPENAPI_ENDPOINTS.map((path) => ({
      path,
      methods: [],
      operationIds: []
    }))
  };
}

function parseOpenApiSnapshot(document: unknown): OpenCodeOpenApiSnapshot | null {
  const root = asJsonRecord(document);
  if (!root) return null;
  const paths = asJsonRecord(root.paths);
  if (!paths) return null;

  const endpoints: OpenCodeEndpointDefinition[] = [];
  for (const [path, definition] of Object.entries(paths)) {
    const operations = asJsonRecord(definition);
    if (!operations) continue;

    const methods: OpenCodeHttpMethod[] = [];
    const operationIds: string[] = [];

    for (const [methodKey, operationValue] of Object.entries(operations)) {
      const upperMethod = methodKey.toUpperCase();
      if (
        upperMethod !== 'GET' &&
        upperMethod !== 'POST' &&
        upperMethod !== 'PUT' &&
        upperMethod !== 'PATCH' &&
        upperMethod !== 'DELETE'
      ) {
        continue;
      }

      methods.push(upperMethod);
      const operationRecord = asJsonRecord(operationValue);
      if (typeof operationRecord?.operationId === 'string' && operationRecord.operationId.trim()) {
        operationIds.push(operationRecord.operationId);
      }
    }

    endpoints.push({
      path,
      methods: uniqueStrings(methods).filter((method): method is OpenCodeHttpMethod => isOpenCodeMethod(method)),
      operationIds: uniqueStrings(operationIds)
    });
  }

  endpoints.sort((left, right) => left.path.localeCompare(right.path));

  const info = asJsonRecord(root.info);
  return {
    source: 'live',
    title: typeof info?.title === 'string' && info.title.trim() ? info.title : 'OpenCode API',
    version: typeof info?.version === 'string' && info.version.trim() ? info.version : 'unknown',
    endpointCount: endpoints.length,
    endpoints
  };
}

export async function invokeOpenCodeEndpoint(input: {
  path: string;
  method?: string;
  body?: unknown;
  timeoutMs?: number;
  ensureRunning?: boolean;
  parseSsePayload?: boolean;
}): Promise<OpenCodeInvocationResult> {
  if (input.ensureRunning) {
    await ensureOpenCodeServer();
  }

  const method = normalizeMethod(input.method);
  const hasBody = input.body !== undefined && method !== 'GET';
  const response = await requestOpenCodeRaw(
    input.path,
    {
      method,
      body: hasBody ? JSON.stringify(input.body) : undefined
    },
    clampInteger(input.timeoutMs, 60_000, 1_000, 300_000)
  );

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('text/event-stream') && input.parseSsePayload !== true) {
    return {
      ok: response.ok,
      status: response.status,
      contentType,
      data: null,
      text: '[event-stream omitted]'
    };
  }

  const payload = await parseResponseBody(response);
  return {
    ok: response.ok,
    status: response.status,
    contentType,
    data: payload.raw,
    text: payload.text
  };
}

export async function invokeOpenCodeJson<T = unknown>(input: {
  path: string;
  method?: string;
  body?: unknown;
  timeoutMs?: number;
  ensureRunning?: boolean;
}): Promise<T> {
  const response = await invokeOpenCodeEndpoint(input);
  if (response.ok) return response.data as T;
  throw new Error(`OpenCode request failed (${response.status}) on ${input.path}: ${response.text.slice(0, 900)}`);
}

export async function getOpenCodeOpenApi(options?: {
  ensureRunning?: boolean;
}): Promise<OpenCodeOpenApiSnapshot> {
  const ensureRunning = options?.ensureRunning === true;
  if (ensureRunning) {
    await ensureOpenCodeServer();
  }

  if (!(await isPortOpen(getHost(), getPort()))) {
    return fallbackOpenApiSnapshot();
  }

  const candidates = ['/doc', '/openapi.json', '/openapi'];
  for (const path of candidates) {
    try {
      const response = await requestOpenCodeRaw(
        path,
        {
          method: 'GET',
          headers: {
            Accept: 'application/json'
          }
        },
        safeParseInt(process.env.OPENCODE_STATUS_TIMEOUT_MS, 25_000)
      );

      if (!response.ok) continue;
      const text = await response.text();
      if (!text.trim()) continue;

      let parsed: unknown = text;
      try {
        parsed = JSON.parse(text) as unknown;
      } catch {
        continue;
      }

      const snapshot = parseOpenApiSnapshot(parsed);
      if (snapshot) return snapshot;
    } catch {
      // Keep trying other candidates.
    }
  }

  return fallbackOpenApiSnapshot();
}

export async function getOpenCodeSessionStatusMap(options?: {
  ensureRunning?: boolean;
}): Promise<OpenCodeSessionStatusMap> {
  const ensureRunning = options?.ensureRunning === true;
  if (ensureRunning) {
    await ensureOpenCodeServer();
  }
  if (!(await isPortOpen(getHost(), getPort()))) return {};

  try {
    const status = await invokeOpenCodeJson<OpenCodeSessionStatusMap>({
      path: '/session/status',
      method: 'GET'
    });
    return asJsonRecord(status) ? status : {};
  } catch {
    return {};
  }
}

export async function getOpenCodePermissions(options?: {
  ensureRunning?: boolean;
}): Promise<OpenCodePermissionRequest[]> {
  const ensureRunning = options?.ensureRunning === true;
  if (ensureRunning) {
    await ensureOpenCodeServer();
  }
  if (!(await isPortOpen(getHost(), getPort()))) return [];

  try {
    const payload = await invokeOpenCodeJson<unknown>({
      path: '/permission',
      method: 'GET'
    });
    return asArray(payload).map((entry) => asJsonRecord(entry)).filter((entry): entry is JsonRecord => entry !== null);
  } catch {
    return [];
  }
}

export async function getOpenCodeQuestions(options?: {
  ensureRunning?: boolean;
}): Promise<OpenCodeQuestionRequest[]> {
  const ensureRunning = options?.ensureRunning === true;
  if (ensureRunning) {
    await ensureOpenCodeServer();
  }
  if (!(await isPortOpen(getHost(), getPort()))) return [];

  try {
    const payload = await invokeOpenCodeJson<unknown>({
      path: '/question',
      method: 'GET'
    });
    return asArray(payload).map((entry) => asJsonRecord(entry)).filter((entry): entry is JsonRecord => entry !== null);
  } catch {
    return [];
  }
}

export async function getOpenCodeMonitorSnapshot(options?: {
  ensureRunning?: boolean;
  sessionLimit?: number;
}): Promise<OpenCodeMonitorSnapshot> {
  const ensureRunning = options?.ensureRunning === true;
  const sessionLimit = clampInteger(options?.sessionLimit, 80, 1, 200);
  if (ensureRunning) {
    await ensureOpenCodeServer();
  }

  const errors: string[] = [];
  const [status, sessions, sessionStatus, permissions, questions, providers, commands, agents, skills, pathInfo, vcsInfo, openapi] =
    await Promise.all([
      getOpenCodeStatus(),
      getOpenCodeSessions({ limit: sessionLimit }),
      getOpenCodeSessionStatusMap(),
      getOpenCodePermissions(),
      getOpenCodeQuestions(),
      invokeOpenCodeEndpoint({ path: '/provider', method: 'GET' }),
      invokeOpenCodeEndpoint({ path: '/command', method: 'GET' }),
      invokeOpenCodeEndpoint({ path: '/agent', method: 'GET' }),
      invokeOpenCodeEndpoint({ path: '/skill', method: 'GET' }),
      invokeOpenCodeEndpoint({ path: '/path', method: 'GET' }),
      invokeOpenCodeEndpoint({ path: '/vcs', method: 'GET' }),
      getOpenCodeOpenApi()
    ]);

  const providerPayload = providers.ok ? providers.data : null;
  const commandsPayload = commands.ok ? commands.data : null;
  const agentsPayload = agents.ok ? agents.data : null;
  const skillsPayload = skills.ok ? skills.data : null;
  const pathPayload = pathInfo.ok ? pathInfo.data : null;
  const vcsPayload = vcsInfo.ok ? vcsInfo.data : null;

  const optionalResponses = [
    ['/provider', providers],
    ['/command', commands],
    ['/agent', agents],
    ['/skill', skills],
    ['/path', pathInfo],
    ['/vcs', vcsInfo]
  ] as const;

  for (const [path, response] of optionalResponses) {
    if (!response.ok) {
      errors.push(`${path} failed (${response.status})`);
    }
  }

  return {
    status,
    sessions,
    sessionStatus,
    permissions,
    questions,
    providers: providerPayload,
    commands: commandsPayload,
    agents: agentsPayload,
    skills: skillsPayload,
    pathInfo: pathPayload,
    vcsInfo: vcsPayload,
    openapi,
    errors
  };
}
