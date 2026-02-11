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

async function requestOpenCode(path: string, init: RequestInit, timeoutMs = 60_000): Promise<Response> {
  const headers = new Headers(init.headers);
  for (const [key, value] of Object.entries(getAuthHeaders())) {
    if (!headers.has(key)) headers.set(key, value);
  }

  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetchWithTimeout(`${getBaseUrl()}${path}`, { ...init, headers }, timeoutMs);
  if (response.ok) return response;

  const errorDetails = (await response.text()).slice(0, 900);
  throw new Error(`OpenCode request failed (${response.status}) on ${path}: ${errorDetails}`);
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
