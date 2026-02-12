#!/usr/bin/env node

const baseUrl = (process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3000').replace(/\/+$/, '');
const queryText = process.env.SMOKE_QUERY || 'Run a one-line local smoke-check acknowledgment.';

const summary = {
  passed: 0,
  failed: 0,
  warnings: 0,
  notes: []
};

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function markPass(message) {
  summary.passed += 1;
  summary.notes.push(`PASS: ${message}`);
}

function markWarn(message) {
  summary.warnings += 1;
  summary.notes.push(`WARN: ${message}`);
}

function markFail(message) {
  summary.failed += 1;
  summary.notes.push(`FAIL: ${message}`);
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function requireFields(payload, fields, label) {
  if (!isRecord(payload)) {
    throw new Error(`${label} must be a JSON object.`);
  }
  for (const field of fields) {
    if (!hasOwn(payload, field)) {
      throw new Error(`${label} missing required field "${field}".`);
    }
  }
}

async function fetchJson(path, init = {}, label) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      Accept: 'application/json',
      ...(init.headers || {})
    },
    ...init
  });
  const payload = await readJson(response);
  if (!response.ok) {
    const message =
      isRecord(payload) && typeof payload.error === 'string'
        ? payload.error
        : `${label} returned HTTP ${response.status}`;
    throw new Error(message);
  }
  return payload;
}

async function loadStatusPayload() {
  const payload = await fetchJson('/api/opencode/status', {}, '/api/opencode/status');
  requireFields(payload, ['running', 'host', 'port', 'apiUrl'], '/api/opencode/status');
  return payload;
}

async function checkStatus() {
  const payload = await loadStatusPayload();
  markPass('/api/opencode/status contract');
  return payload;
}

async function checkSessionsList() {
  const payload = await fetchJson('/api/opencode/sessions', {}, '/api/opencode/sessions');
  requireFields(payload, ['running', 'host', 'port', 'started', 'count', 'sessions'], '/api/opencode/sessions');
  if (!Array.isArray(payload.sessions)) {
    throw new Error('/api/opencode/sessions field "sessions" must be an array.');
  }
  markPass('/api/opencode/sessions list contract');
  return payload;
}

async function checkMonitor() {
  const payload = await fetchJson('/api/opencode/monitor', {}, '/api/opencode/monitor');
  requireFields(payload, ['status', 'sessions', 'permissions', 'questions', 'openapi', 'errors'], '/api/opencode/monitor');
  markPass('/api/opencode/monitor contract');
  return payload;
}

async function checkEventsStream() {
  const controller = new AbortController();
  const response = await fetch(`${baseUrl}/api/opencode/events?scope=both&autostart=0`, {
    signal: controller.signal,
    headers: {
      Accept: 'text/event-stream'
    }
  });

  if (!response.ok) {
    throw new Error(`/api/opencode/events returned HTTP ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/event-stream')) {
    throw new Error('/api/opencode/events did not return text/event-stream content type.');
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('/api/opencode/events response stream body is missing.');
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let sawReady = false;
  const started = Date.now();

  while (!sawReady && Date.now() - started < 10_000) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    if (buffer.includes('event: ready')) {
      sawReady = true;
      break;
    }
  }

  controller.abort();
  try {
    await reader.cancel();
  } catch {
    // ignore reader cancel errors after abort
  }

  if (!sawReady) {
    throw new Error('/api/opencode/events stream did not emit a ready event within 10s.');
  }

  markPass('/api/opencode/events stream ready event');
}

function isQueryContract(payload) {
  if (!isRecord(payload)) return false;
  const required = ['id', 'query', 'status', 'sessionId', 'answer', 'sources', 'metadata', 'timestamp'];
  return required.every((field) => hasOwn(payload, field));
}

async function prepareAutostartAssertionStatus(initialStatus) {
  if (!isRecord(initialStatus) || initialStatus.running !== true) {
    return initialStatus;
  }

  const disposeResponse = await fetch(`${baseUrl}/api/opencode/control`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      path: '/global/dispose',
      method: 'POST',
      autostart: false
    })
  });
  const disposePayload = await readJson(disposeResponse);
  if (!disposeResponse.ok) {
    markWarn('OpenCode was already running and could not be disposed before query autostart assertion.');
    return initialStatus;
  }

  for (let attempt = 0; attempt < 20; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 350));
    const status = await loadStatusPayload();
    if (status.running === false) {
      markPass('Prepared stopped OpenCode state before /api/query autostart assertion');
      return status;
    }
  }

  if (isRecord(disposePayload) && typeof disposePayload.text === 'string' && disposePayload.text.trim()) {
    markWarn('Dispose request succeeded but status stayed running; autostart assertion will be best-effort.');
  } else {
    markWarn('Unable to confirm stopped OpenCode state before query autostart assertion.');
  }

  return initialStatus;
}

async function checkQueryAndSessionVisibility(statusBeforeQuery) {
  const response = await fetch(`${baseUrl}/api/query`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: queryText })
  });
  const payload = await readJson(response);

  if (!isQueryContract(payload)) {
    throw new Error('/api/query did not return the expected compatibility contract.');
  }

  markPass('/api/query compatibility contract');

  const metadata = isRecord(payload.metadata) ? payload.metadata : null;
  const opencode = metadata && isRecord(metadata.opencode) ? metadata.opencode : null;
  if (opencode && typeof opencode.started === 'boolean') {
    markPass('metadata.opencode.started present');
  } else {
    markWarn('metadata.opencode.started not present in query response.');
  }

  if (isRecord(statusBeforeQuery) && statusBeforeQuery.running === false) {
    if (opencode && opencode.started === true) {
      markPass('/api/query reports OpenCode autostart from stopped state');
    } else {
      const statusAfterQuery = await loadStatusPayload();
      if (statusAfterQuery.running === true) {
        markPass('/api/query left OpenCode running after starting from stopped state');
      } else {
        markWarn('Could not verify /api/query autostart from stopped state.');
      }
    }
  } else {
    markWarn('Skipped strict /api/query autostart assertion because OpenCode was already running.');
  }

  if (!response.ok) {
    markWarn(`/api/query returned HTTP ${response.status}; continuing with best-effort visibility checks.`);
  }

  if (typeof payload.sessionId !== 'string' || payload.sessionId.trim() === '') {
    markWarn('query response missing sessionId; skipping detail visibility assertion.');
    return;
  }

  const detail = await fetchJson(
    `/api/opencode/sessions?sessionId=${encodeURIComponent(payload.sessionId)}`,
    {},
    '/api/opencode/sessions detail'
  );

  requireFields(
    detail,
    ['running', 'host', 'port', 'started', 'session', 'messages', 'messageCount', 'latestMessageAt', 'activeToolCalls'],
    '/api/opencode/sessions detail'
  );
  markPass('session detail visibility for query-created session');
}

async function main() {
  console.log(`Running OpenCode web API smoke checks against ${baseUrl}`);
  const initialStatus = await checkStatus();
  const statusForQueryCheck = await prepareAutostartAssertionStatus(initialStatus);
  await checkSessionsList();
  await checkMonitor();
  await checkEventsStream();
  await checkQueryAndSessionVisibility(statusForQueryCheck);

  console.log('');
  for (const note of summary.notes) {
    console.log(note);
  }

  console.log('');
  console.log(`Summary: ${summary.passed} passed, ${summary.warnings} warnings, ${summary.failed} failed`);
  if (summary.failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  markFail(error instanceof Error ? error.message : 'Unknown smoke-check error');
  console.log('');
  for (const note of summary.notes) {
    console.log(note);
  }
  console.log('');
  console.log(`Summary: ${summary.passed} passed, ${summary.warnings} warnings, ${summary.failed} failed`);
  process.exitCode = 1;
});
