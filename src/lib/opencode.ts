import { spawn, type ChildProcess } from 'node:child_process';
import net from 'node:net';
import {
  assessOpenCodeCompatibility,
  fallbackOpenApiSnapshot,
  parseOpenApiSnapshot
} from './opencode-openapi-compat';
import {
  asArray,
  buildResearchPrompt,
  buildSessionListPath,
  collectTextFragments,
  createTimelinePreview,
  extractSessionId,
  extractSources,
  findConfidenceScore,
  formatMessageForTranscript,
  hasDiffMarkerInMessage,
  mapSessionMessages,
  mapSessionSummary,
  normalizeSessionId,
  parseOpenCodeSseBlock,
  sanitizeAnswer,
  stripSortKey,
  uniqueStrings
} from './opencode-data-utils';

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

export type OpenCodeCompatibilityMethodMismatch = {
  path: string;
  requiredMethods: OpenCodeHttpMethod[];
  availableMethods: OpenCodeHttpMethod[];
  missingMethods: OpenCodeHttpMethod[];
  required: boolean;
};

export type OpenCodeCompatibilitySnapshot = {
  status: 'pass' | 'warn' | 'fail' | 'unverified';
  checkedAt: string;
  source: OpenCodeOpenApiSnapshot['source'];
  requiredRuleCount: number;
  recommendedRuleCount: number;
  missingRequiredEndpoints: string[];
  missingRecommendedEndpoints: string[];
  methodMismatches: OpenCodeCompatibilityMethodMismatch[];
  notes: string[];
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
  mcp?: unknown;
  lsp?: unknown;
  formatter?: unknown;
  projects?: {
    list: unknown;
    current: unknown;
  };
  config?: {
    local: unknown;
    global: unknown;
  };
  compatibility?: OpenCodeCompatibilitySnapshot;
  openapi: OpenCodeOpenApiSnapshot;
  errors: string[];
};

export type OpenCodeMonitorInclude =
  | 'providers'
  | 'agents'
  | 'skills'
  | 'commands'
  | 'path'
  | 'vcs'
  | 'mcp'
  | 'lsp'
  | 'formatter'
  | 'projects'
  | 'config'
  | 'compatibility'
  | 'openapi';

type ResearchPayload = {
  sessionId: string;
  answer: string;
  sources: string[];
  confidenceScore: number;
};

type OpenCodeResearchError = Error & {
  sessionId?: string;
  opencode?: {
    host: string;
    port: number;
    started: boolean;
    command: string;
  };
  processingTime?: number;
};

export type OpenCodeStatus = {
  running: boolean;
  host: string;
  port: number;
  apiUrl: string;
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
  parentId?: string | null;
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
  todo?: unknown;
  diff?: unknown;
  children?: OpenCodeSessionSummary[];
};

export type OpenCodeSessionDetailInclude = 'messages' | 'todo' | 'diff' | 'children';

export type OpenCodeTimelineAssistantState = 'running' | 'complete' | 'none';

export type OpenCodeSessionTimelineEntry = {
  messageId: string;
  createdAt: string | null;
  preview: string;
  assistantMessageId: string | null;
  assistantState: OpenCodeTimelineAssistantState;
  hasDiffMarker: boolean;
};

export type OpenCodeSessionTimeline = {
  running: boolean;
  host: string;
  port: number;
  started: boolean;
  sessionId: string;
  count: number;
  entries: OpenCodeSessionTimelineEntry[];
};

export type OpenCodeSessionTranscript = {
  running: boolean;
  host: string;
  port: number;
  started: boolean;
  sessionId: string;
  title: string;
  generatedAt: string;
  messageCount: number;
  options: {
    thinking: boolean;
    toolDetails: boolean;
    assistantMetadata: boolean;
  };
  markdown: string;
};

export type OpenCodeSseSource = 'instance' | 'global';

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


export { assessOpenCodeCompatibility, parseOpenCodeSseBlock };

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

export async function openOpenCodeEventStream(input: {
  source: OpenCodeSseSource;
  ensureRunning?: boolean;
  signal?: AbortSignal;
}): Promise<Response> {
  if (input.ensureRunning) {
    await ensureOpenCodeServer();
  }

  const path = input.source === 'global' ? '/global/event' : '/event';
  const headers = new Headers({
    Accept: 'text/event-stream',
    'Cache-Control': 'no-cache'
  });

  for (const [key, value] of Object.entries(getAuthHeaders())) {
    if (!headers.has(key)) headers.set(key, value);
  }

  return fetch(`${getBaseUrl()}${normalizeApiPath(path)}`, {
    method: 'GET',
    headers,
    signal: input.signal
  });
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

  let messageResponse: Response;
  try {
    messageResponse = await requestOpenCode(
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
  } catch (error) {
    const wrapped = new Error(
      error instanceof Error ? error.message : 'OpenCode message request failed.'
    ) as OpenCodeResearchError;
    wrapped.sessionId = sessionId;
    throw wrapped;
  }

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
  roots?: boolean;
  start?: string;
  search?: string;
  passthroughLimit?: boolean;
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

  const sessionPath = buildSessionListPath({
    limit,
    roots: options?.roots,
    start: options?.start,
    search: options?.search,
    passthroughLimit: options?.passthroughLimit
  });

  const sessionResponse = await requestOpenCode(
    sessionPath,
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
    sessions: mapped.slice(0, limit).map((session) => stripSortKey(session))
  };
}

async function fetchSessionAndMessages(normalizedSessionId: string): Promise<{
  session: OpenCodeSessionSummary & { sortKey: number };
  messages: OpenCodeSessionMessage[];
}> {
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

  return {
    session: mappedSession,
    messages: mapSessionMessages(messagesPayload.raw)
  };
}

export async function getOpenCodeSessionDetail(
  sessionId: string,
  options?: {
    messageLimit?: number;
    ensureRunning?: boolean;
    include?: OpenCodeSessionDetailInclude[];
  }
): Promise<OpenCodeSessionDetail> {
  const host = getHost();
  const port = getPort();
  const ensureRunning = options?.ensureRunning === true;
  const messageLimit = clampInteger(options?.messageLimit, 120, 1, 500);
  const normalizedSessionId = normalizeSessionId(sessionId);

  let started = false;
  if (ensureRunning) {
    const startup = await ensureOpenCodeServer();
    started = startup.started;
  }

  if (!(await isPortOpen(host, port))) {
    throw new Error(`OpenCode is not reachable at ${host}:${port}.`);
  }

  const payload = await fetchSessionAndMessages(normalizedSessionId);
  const allMessages = payload.messages;
  const visibleMessages = allMessages.slice(Math.max(0, allMessages.length - messageLimit));
  const latestMessageAt = visibleMessages[visibleMessages.length - 1]?.createdAt || payload.session.updatedAt;
  const detail: OpenCodeSessionDetail = {
    running: true,
    host,
    port,
    started,
    session: stripSortKey(payload.session),
    messages: visibleMessages,
    messageCount: allMessages.length,
    latestMessageAt,
    activeToolCalls: visibleMessages.filter((message) => message.hasRunningToolCall).length
  };

  const includeSet = new Set(options?.include ?? []);
  const includeTodo = includeSet.has('todo');
  const includeDiff = includeSet.has('diff');
  const includeChildren = includeSet.has('children');

  if (includeTodo || includeDiff || includeChildren) {
    const [todoResponse, diffResponse, childrenResponse] = await Promise.all([
      includeTodo
        ? invokeOpenCodeEndpoint({
            path: `/session/${encodeURIComponent(normalizedSessionId)}/todo`,
            method: 'GET'
          })
        : Promise.resolve<OpenCodeInvocationResult | null>(null),
      includeDiff
        ? invokeOpenCodeEndpoint({
            path: `/session/${encodeURIComponent(normalizedSessionId)}/diff`,
            method: 'GET'
          })
        : Promise.resolve<OpenCodeInvocationResult | null>(null),
      includeChildren
        ? invokeOpenCodeEndpoint({
            path: `/session/${encodeURIComponent(normalizedSessionId)}/children`,
            method: 'GET'
          })
        : Promise.resolve<OpenCodeInvocationResult | null>(null)
    ]);

    if (includeTodo) {
      detail.todo = todoResponse?.ok ? todoResponse.data : null;
    }
    if (includeDiff) {
      detail.diff = diffResponse?.ok ? diffResponse.data : null;
    }
    if (includeChildren) {
      const mappedChildren = asArray(childrenResponse?.ok ? childrenResponse.data : [])
        .map((entry) => mapSessionSummary(entry))
        .filter((entry): entry is OpenCodeSessionSummary & { sortKey: number } => entry !== null)
        .sort((left, right) => right.sortKey - left.sortKey)
        .map((child) => stripSortKey(child));
      detail.children = mappedChildren;
    }
  }

  return detail;
}

export async function getOpenCodeSessionTimeline(
  sessionId: string,
  options?: {
    ensureRunning?: boolean;
  }
): Promise<OpenCodeSessionTimeline> {
  const host = getHost();
  const port = getPort();
  const ensureRunning = options?.ensureRunning === true;
  const normalizedSessionId = normalizeSessionId(sessionId);

  let started = false;
  if (ensureRunning) {
    const startup = await ensureOpenCodeServer();
    started = startup.started;
  }

  if (!(await isPortOpen(host, port))) {
    throw new Error(`OpenCode is not reachable at ${host}:${port}.`);
  }

  const payload = await fetchSessionAndMessages(normalizedSessionId);
  const entries: OpenCodeSessionTimelineEntry[] = [];

  for (let index = 0; index < payload.messages.length; index += 1) {
    const message = payload.messages[index];
    if (message.role !== 'user') continue;

    let assistant: OpenCodeSessionMessage | null = null;
    for (let nextIndex = index + 1; nextIndex < payload.messages.length; nextIndex += 1) {
      const candidate = payload.messages[nextIndex];
      if (candidate.role === 'assistant' || candidate.role === 'tool') {
        assistant = candidate;
        break;
      }
    }

    entries.push({
      messageId: message.id,
      createdAt: message.createdAt,
      preview: createTimelinePreview(message.text),
      assistantMessageId: assistant?.id ?? null,
      assistantState: assistant ? (assistant.hasRunningToolCall ? 'running' : 'complete') : 'none',
      hasDiffMarker: hasDiffMarkerInMessage(assistant)
    });
  }

  return {
    running: true,
    host,
    port,
    started,
    sessionId: normalizedSessionId,
    count: entries.length,
    entries
  };
}

export async function getOpenCodeSessionTranscript(
  sessionId: string,
  options?: {
    ensureRunning?: boolean;
    thinking?: boolean;
    toolDetails?: boolean;
    assistantMetadata?: boolean;
  }
): Promise<OpenCodeSessionTranscript> {
  const host = getHost();
  const port = getPort();
  const ensureRunning = options?.ensureRunning === true;
  const normalizedSessionId = normalizeSessionId(sessionId);

  let started = false;
  if (ensureRunning) {
    const startup = await ensureOpenCodeServer();
    started = startup.started;
  }

  if (!(await isPortOpen(host, port))) {
    throw new Error(`OpenCode is not reachable at ${host}:${port}.`);
  }

  const payload = await fetchSessionAndMessages(normalizedSessionId);
  const effectiveOptions = {
    thinking: options?.thinking === true,
    toolDetails: options?.toolDetails === true,
    assistantMetadata: options?.assistantMetadata === true
  };
  const generatedAt = new Date().toISOString();
  const lines: string[] = [
    `# Transcript: ${payload.session.title}`,
    '',
    `- Session ID: \`${normalizedSessionId}\``,
    `- Generated: ${generatedAt}`,
    `- Messages: ${payload.messages.length}`,
    ''
  ];

  payload.messages.forEach((message, index) => {
    const timestamp = message.createdAt ? ` (${message.createdAt})` : '';
    lines.push(`## ${index + 1}. ${message.role.toUpperCase()}${timestamp}`);
    lines.push('');
    lines.push(...formatMessageForTranscript(message, effectiveOptions));
    lines.push('');
  });

  const markdown = lines.join('\n').trim();

  return {
    running: true,
    host,
    port,
    started,
    sessionId: normalizedSessionId,
    title: payload.session.title,
    generatedAt,
    messageCount: payload.messages.length,
    options: effectiveOptions,
    markdown
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
  try {
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
  } catch (error) {
    const wrapped =
      error instanceof Error ? (error as OpenCodeResearchError) : (new Error('Unknown research error.') as OpenCodeResearchError);
    wrapped.opencode = {
      host: opencode.host,
      port: opencode.port,
      started: opencode.started,
      command: opencode.command
    };
    wrapped.processingTime = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    throw wrapped;
  }
}

export async function getOpenCodeStatus(): Promise<OpenCodeStatus> {
  const host = getHost();
  const port = getPort();
  const apiUrl = getBaseUrl();
  const manager = getManager();

  return {
    running: await isPortOpen(host, port),
    host,
    port,
    apiUrl,
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

function asJsonRecord(value: unknown): JsonRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as JsonRecord;
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

async function invokeOptionalOpenCodeEndpoint(path: string): Promise<OpenCodeInvocationResult | null> {
  try {
    return await invokeOpenCodeEndpoint({
      path,
      method: 'GET'
    });
  } catch {
    return null;
  }
}

export async function getOpenCodeMonitorSnapshot(options?: {
  ensureRunning?: boolean;
  sessionLimit?: number;
  permissionLimit?: number;
  questionLimit?: number;
  include?: OpenCodeMonitorInclude[];
}): Promise<OpenCodeMonitorSnapshot> {
  const ensureRunning = options?.ensureRunning === true;
  const sessionLimit = clampInteger(options?.sessionLimit, 80, 1, 200);
  const permissionLimit = clampInteger(options?.permissionLimit, 80, 1, 250);
  const questionLimit = clampInteger(options?.questionLimit, 80, 1, 250);
  const includeSet = new Set(options?.include ?? []);
  const includeRequested = (key: OpenCodeMonitorInclude, defaultsToIncluded: boolean): boolean => {
    if (includeSet.size === 0) return defaultsToIncluded;
    return includeSet.has(key);
  };

  const includeProviders = includeRequested('providers', true);
  const includeCommands = includeRequested('commands', true);
  const includeAgents = includeRequested('agents', true);
  const includeSkills = includeRequested('skills', true);
  const includePath = includeRequested('path', true);
  const includeVcs = includeRequested('vcs', true);
  const includeMcp = includeRequested('mcp', false);
  const includeLsp = includeRequested('lsp', false);
  const includeFormatter = includeRequested('formatter', false);
  const includeProjects = includeRequested('projects', false);
  const includeConfig = includeRequested('config', false);
  const includeCompatibility = includeRequested('compatibility', false);
  const includeOpenApi = includeRequested('openapi', true);

  if (ensureRunning) {
    await ensureOpenCodeServer();
  }

  const errors: string[] = [];
  const [
    status,
    sessions,
    sessionStatus,
    permissions,
    questions,
    providers,
    commands,
    agents,
    skills,
    pathInfo,
    vcsInfo,
    mcp,
    lsp,
    formatter,
    projectList,
    projectCurrent,
    configLocal,
    configGlobal,
    openapi
  ] = await Promise.all([
    getOpenCodeStatus(),
    getOpenCodeSessions({ limit: sessionLimit }),
    getOpenCodeSessionStatusMap(),
    getOpenCodePermissions(),
    getOpenCodeQuestions(),
    includeProviders ? invokeOptionalOpenCodeEndpoint('/provider') : Promise.resolve<OpenCodeInvocationResult | null>(null),
    includeCommands ? invokeOptionalOpenCodeEndpoint('/command') : Promise.resolve<OpenCodeInvocationResult | null>(null),
    includeAgents ? invokeOptionalOpenCodeEndpoint('/agent') : Promise.resolve<OpenCodeInvocationResult | null>(null),
    includeSkills ? invokeOptionalOpenCodeEndpoint('/skill') : Promise.resolve<OpenCodeInvocationResult | null>(null),
    includePath ? invokeOptionalOpenCodeEndpoint('/path') : Promise.resolve<OpenCodeInvocationResult | null>(null),
    includeVcs ? invokeOptionalOpenCodeEndpoint('/vcs') : Promise.resolve<OpenCodeInvocationResult | null>(null),
    includeMcp ? invokeOptionalOpenCodeEndpoint('/mcp') : Promise.resolve<OpenCodeInvocationResult | null>(null),
    includeLsp ? invokeOptionalOpenCodeEndpoint('/lsp') : Promise.resolve<OpenCodeInvocationResult | null>(null),
    includeFormatter ? invokeOptionalOpenCodeEndpoint('/formatter') : Promise.resolve<OpenCodeInvocationResult | null>(null),
    includeProjects ? invokeOptionalOpenCodeEndpoint('/project') : Promise.resolve<OpenCodeInvocationResult | null>(null),
    includeProjects ? invokeOptionalOpenCodeEndpoint('/project/current') : Promise.resolve<OpenCodeInvocationResult | null>(null),
    includeConfig ? invokeOptionalOpenCodeEndpoint('/config') : Promise.resolve<OpenCodeInvocationResult | null>(null),
    includeConfig ? invokeOptionalOpenCodeEndpoint('/global/config') : Promise.resolve<OpenCodeInvocationResult | null>(null),
    includeOpenApi || includeCompatibility ? getOpenCodeOpenApi() : Promise.resolve(fallbackOpenApiSnapshot())
  ]);

  const optionalResponses = [
    ['/provider', providers],
    ['/command', commands],
    ['/agent', agents],
    ['/skill', skills],
    ['/path', pathInfo],
    ['/vcs', vcsInfo],
    ['/mcp', mcp],
    ['/lsp', lsp],
    ['/formatter', formatter],
    ['/project', projectList],
    ['/project/current', projectCurrent],
    ['/config', configLocal],
    ['/global/config', configGlobal]
  ] as const;

  for (const [path, response] of optionalResponses) {
    if (response && !response.ok) {
      errors.push(`${path} failed (${response.status})`);
    }
  }

  const snapshot: OpenCodeMonitorSnapshot = {
    status,
    sessions,
    sessionStatus,
    permissions: permissions.slice(0, permissionLimit),
    questions: questions.slice(0, questionLimit),
    providers: providers && providers.ok ? providers.data : null,
    commands: commands && commands.ok ? commands.data : null,
    agents: agents && agents.ok ? agents.data : null,
    skills: skills && skills.ok ? skills.data : null,
    pathInfo: pathInfo && pathInfo.ok ? pathInfo.data : null,
    vcsInfo: vcsInfo && vcsInfo.ok ? vcsInfo.data : null,
    openapi,
    errors
  };

  if (includeMcp) {
    snapshot.mcp = mcp && mcp.ok ? mcp.data : null;
  }
  if (includeLsp) {
    snapshot.lsp = lsp && lsp.ok ? lsp.data : null;
  }
  if (includeFormatter) {
    snapshot.formatter = formatter && formatter.ok ? formatter.data : null;
  }
  if (includeProjects) {
    snapshot.projects = {
      list: projectList && projectList.ok ? projectList.data : null,
      current: projectCurrent && projectCurrent.ok ? projectCurrent.data : null
    };
  }
  if (includeConfig) {
    snapshot.config = {
      local: configLocal && configLocal.ok ? configLocal.data : null,
      global: configGlobal && configGlobal.ok ? configGlobal.data : null
    };
  }
  if (includeCompatibility) {
    snapshot.compatibility = assessOpenCodeCompatibility(openapi);
  }

  return snapshot;
}
