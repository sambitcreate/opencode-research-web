export type OpenCodeHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type OpenCodeControlResponse = {
  ok: boolean;
  status: number;
  contentType: string;
  data: unknown;
  text: string;
};

type QueryValue = string | number | boolean | null | undefined;

type QueryParams = Record<string, QueryValue>;

type ControlRequest = {
  path: string;
  method?: OpenCodeHttpMethod;
  body?: unknown;
  timeoutMs?: number;
  parseSsePayload?: boolean;
  autostart?: boolean;
};

type SessionDetailOptions = {
  messageLimit?: number;
  include?: string[];
  autostart?: boolean;
};

type SessionTimelineOptions = {
  autostart?: boolean;
};

type SessionTranscriptOptions = {
  autostart?: boolean;
  thinking?: boolean;
  toolDetails?: boolean;
  assistantMetadata?: boolean;
};

type MonitorSnapshotOptions = {
  sessionLimit?: number;
  include?: string[];
  autostart?: boolean;
};

type SystemSnapshotOptions = {
  include?: string[];
  autostart?: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isControlResponse(value: unknown): value is OpenCodeControlResponse {
  if (!isRecord(value)) return false;
  return (
    typeof value.ok === 'boolean' &&
    typeof value.status === 'number' &&
    typeof value.contentType === 'string' &&
    typeof value.text === 'string'
  );
}

function toErrorMessage(payload: unknown, fallback: string): string {
  if (!isRecord(payload)) return fallback;

  if (typeof payload.error === 'string' && payload.error.trim()) {
    return payload.error;
  }

  const nestedError = isRecord(payload.error) ? payload.error : null;
  if (nestedError && typeof nestedError.message === 'string' && nestedError.message.trim()) {
    return nestedError.message;
  }

  if (typeof payload.message === 'string' && payload.message.trim()) {
    return payload.message;
  }

  return fallback;
}

function buildQueryString(query?: QueryParams): string {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined) continue;
    if (typeof value === 'boolean') {
      params.set(key, value ? '1' : '0');
      continue;
    }
    params.set(key, String(value));
  }

  const encoded = params.toString();
  return encoded ? `?${encoded}` : '';
}

async function parseJsonPayload(response: Response): Promise<unknown> {
  try {
    return (await response.json()) as unknown;
  } catch {
    return null;
  }
}

async function requestJson<T>(
  path: string,
  options: {
    query?: QueryParams;
    init?: RequestInit;
    fallbackError: string;
  }
): Promise<T> {
  const response = await fetch(`${path}${buildQueryString(options.query)}`, {
    cache: 'no-store',
    ...options.init
  });
  const payload = await parseJsonPayload(response);

  if (!response.ok) {
    throw new Error(toErrorMessage(payload, options.fallbackError));
  }

  return payload as T;
}

export async function callOpenCodeControl(input: ControlRequest): Promise<OpenCodeControlResponse> {
  const response = await fetch('/api/opencode/control', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      path: input.path,
      method: input.method ?? 'GET',
      body: input.body,
      timeoutMs: input.timeoutMs,
      parseSsePayload: input.parseSsePayload === true,
      autostart: input.autostart === true
    })
  });

  const payload = await parseJsonPayload(response);
  if (isControlResponse(payload)) {
    return payload;
  }

  throw new Error(toErrorMessage(payload, `OpenCode control request failed with status ${response.status}`));
}

export async function fetchOpenCodeMonitorSnapshot<T>(input?: MonitorSnapshotOptions): Promise<T> {
  return requestJson<T>('/api/opencode/monitor', {
    query: {
      sessionLimit: input?.sessionLimit,
      include: input?.include?.join(','),
      autostart: input?.autostart
    },
    fallbackError: 'Failed to fetch OpenCode monitor snapshot.'
  });
}

export async function fetchOpenCodeSessionDetail<T>(
  sessionId: string,
  options?: SessionDetailOptions
): Promise<T> {
  return requestJson<T>('/api/opencode/sessions', {
    query: {
      sessionId,
      messageLimit: options?.messageLimit,
      include: options?.include?.join(','),
      autostart: options?.autostart
    },
    fallbackError: `Failed to load session ${sessionId}.`
  });
}

export async function fetchOpenCodeSessionTimeline<T>(
  sessionId: string,
  options?: SessionTimelineOptions
): Promise<T> {
  return requestJson<T>(`/api/opencode/session/${encodeURIComponent(sessionId)}/timeline`, {
    query: {
      autostart: options?.autostart
    },
    fallbackError: `Failed to load session timeline for ${sessionId}.`
  });
}

export async function fetchOpenCodeSessionTranscript<T>(
  sessionId: string,
  options?: SessionTranscriptOptions
): Promise<T> {
  return requestJson<T>(`/api/opencode/session/${encodeURIComponent(sessionId)}/transcript`, {
    query: {
      autostart: options?.autostart,
      thinking: options?.thinking,
      toolDetails: options?.toolDetails,
      assistantMetadata: options?.assistantMetadata
    },
    fallbackError: `Failed to load session transcript for ${sessionId}.`
  });
}

export async function fetchOpenCodeFiles<T>(params: URLSearchParams): Promise<T> {
  const query = params.toString();
  const path = query ? `/api/opencode/files?${query}` : '/api/opencode/files';
  return requestJson<T>(path, {
    fallbackError: 'Files request failed.'
  });
}

export async function fetchOpenCodeSystemSnapshot<T>(options?: SystemSnapshotOptions): Promise<T> {
  return requestJson<T>('/api/opencode/system', {
    query: {
      include: options?.include?.join(','),
      autostart: options?.autostart
    },
    fallbackError: 'Failed to load system snapshot.'
  });
}
