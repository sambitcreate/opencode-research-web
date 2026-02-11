'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  Clock3,
  Database,
  History,
  Link2,
  LoaderCircle,
  MoonStar,
  RefreshCw,
  Search,
  SendHorizontal,
  Server
} from 'lucide-react';

type QueryResult = {
  id: string;
  query: string;
  status: string;
  sessionId?: string;
  answer?: string;
  sources?: string[];
  timestamp: string;
  metadata: {
    sources: number;
    processingTime: number;
    confidenceScore: number;
    opencode?: {
      host: string;
      port: number;
      started: boolean;
      command: string;
    };
  };
};

type OpenCodeStatus = {
  running: boolean;
  host: string;
  port: number;
  lastError: string | null;
  command: string;
  startedAt: string | null;
};

type OpenCodeSessionSummary = {
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

type OpenCodeSessionsResponse = {
  running: boolean;
  host: string;
  port: number;
  started: boolean;
  count: number;
  sessions: OpenCodeSessionSummary[];
};

type OpenCodeSessionMessage = {
  id: string;
  role: 'assistant' | 'user' | 'system' | 'tool' | 'unknown';
  createdAt: string | null;
  text: string;
  partTypes: string[];
  hasRunningToolCall: boolean;
};

type OpenCodeSessionDetail = {
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

const QUERY_PRESETS = [
  'Track the latest advances in battery recycling in the US and summarize risks.',
  'Compare local LLM frameworks for offline research workflows on Linux.',
  'Analyze 5 credible sources on sleep and productivity and build a concise brief.'
];

const EMPTY_SESSIONS: OpenCodeSessionSummary[] = [];

function formatDateTime(value: string | null): string {
  if (!value) return 'unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'unknown';
  return date.toLocaleString();
}

function formatRelativeTime(value: string | null): string {
  if (!value) return 'unknown';

  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return 'unknown';

  const seconds = Math.round((timestamp - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  const absoluteSeconds = Math.abs(seconds);

  if (absoluteSeconds < 60) return formatter.format(seconds, 'second');

  const minutes = Math.round(seconds / 60);
  if (Math.abs(minutes) < 60) return formatter.format(minutes, 'minute');

  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return formatter.format(hours, 'hour');

  const days = Math.round(hours / 24);
  return formatter.format(days, 'day');
}

function roleTone(role: OpenCodeSessionMessage['role']): string {
  if (role === 'assistant') return 'border-cyan-300/35 bg-cyan-950/35 text-cyan-100';
  if (role === 'user') return 'border-emerald-300/35 bg-emerald-950/35 text-emerald-100';
  if (role === 'system') return 'border-amber-300/35 bg-amber-950/35 text-amber-100';
  if (role === 'tool') return 'border-violet-300/35 bg-violet-950/35 text-violet-100';
  return 'border-slate-300/25 bg-slate-900/40 text-slate-200';
}

export default function ResearchPage() {
  const [query, setQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<QueryResult[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [engine, setEngine] = useState<OpenCodeStatus | null>(null);
  const [engineState, setEngineState] = useState<'checking' | 'offline' | 'booting' | 'ready' | 'error'>(
    'checking'
  );
  const [error, setError] = useState<string | null>(null);

  const [sessionList, setSessionList] = useState<OpenCodeSessionsResponse | null>(null);
  const [sessionDetail, setSessionDetail] = useState<OpenCodeSessionDetail | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isSessionListLoading, setIsSessionListLoading] = useState(false);
  const [isSessionDetailLoading, setIsSessionDetailLoading] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const refreshStatus = async () => {
    try {
      const response = await fetch('/api/opencode/status', { cache: 'no-store' });
      if (!response.ok) throw new Error('Failed to fetch OpenCode status');
      const data = (await response.json()) as OpenCodeStatus;
      setEngine(data);
      setEngineState(data.running ? 'ready' : 'offline');
    } catch (statusError) {
      setEngineState('error');
      setError(statusError instanceof Error ? statusError.message : 'Unable to load OpenCode status');
    }
  };

  const refreshSessions = async (options?: { silent?: boolean }) => {
    if (!options?.silent) setIsSessionListLoading(true);

    try {
      const response = await fetch('/api/opencode/sessions?limit=60', { cache: 'no-store' });
      const data = (await response.json()) as OpenCodeSessionsResponse | { error?: string };

      if (!response.ok) {
        throw new Error((data as { error?: string }).error || 'Failed to load OpenCode sessions');
      }

      const snapshot = data as OpenCodeSessionsResponse;
      setSessionList(snapshot);
      setSessionError(null);
      setActiveSessionId((current) => {
        if (current && snapshot.sessions.some((session) => session.id === current)) return current;
        return snapshot.sessions[0]?.id || null;
      });

      if (snapshot.sessions.length === 0) {
        setSessionDetail(null);
      }
    } catch (sessionsErr) {
      setSessionError(sessionsErr instanceof Error ? sessionsErr.message : 'Unable to load session list');
    } finally {
      if (!options?.silent) setIsSessionListLoading(false);
    }
  };

  const refreshSessionDetail = async (sessionId: string, options?: { silent?: boolean }) => {
    if (!sessionId) return;
    if (!options?.silent) setIsSessionDetailLoading(true);

    try {
      const response = await fetch(
        `/api/opencode/sessions?sessionId=${encodeURIComponent(sessionId)}&messageLimit=120`,
        { cache: 'no-store' }
      );
      const data = (await response.json()) as OpenCodeSessionDetail | { error?: string };

      if (!response.ok) {
        throw new Error((data as { error?: string }).error || `Failed to load session ${sessionId}`);
      }

      setSessionDetail(data as OpenCodeSessionDetail);
      setSessionError(null);
    } catch (detailErr) {
      setSessionError(detailErr instanceof Error ? detailErr.message : 'Unable to load session detail');
    } finally {
      if (!options?.silent) setIsSessionDetailLoading(false);
    }
  };

  useEffect(() => {
    void refreshStatus();
    void refreshSessions();

    const timer = setInterval(() => {
      void refreshStatus();
      void refreshSessions({ silent: true });
    }, 15000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!activeSessionId) {
      setSessionDetail(null);
      return;
    }

    void refreshSessionDetail(activeSessionId);
    const timer = setInterval(() => void refreshSessionDetail(activeSessionId, { silent: true }), 12000);
    return () => clearInterval(timer);
  }, [activeSessionId]);

  const statusLabel = useMemo(() => {
    if (engineState === 'checking') return 'Checking local OpenCode engine...';
    if (engineState === 'offline') return 'Engine offline (will auto-start on research)';
    if (engineState === 'booting') return 'Booting local OpenCode instance...';
    if (engineState === 'error') return 'Unable to confirm OpenCode status';
    return 'Engine connected and ready';
  }, [engineState]);

  const sessions = sessionList?.sessions ?? EMPTY_SESSIONS;
  const selectedSession = useMemo(() => {
    if (!activeSessionId) return null;
    return sessions.find((session) => session.id === activeSessionId) || null;
  }, [activeSessionId, sessions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!query.trim()) return;

    setIsProcessing(true);
    setError(null);
    setEngineState('booting');
    setResults((prev) => prev.slice(0, 1));

    try {
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });

      const data = (await response.json()) as QueryResult | { error?: string };
      if (!response.ok) {
        throw new Error((data as { error?: string }).error || 'Failed to process research query');
      }

      const result = data as QueryResult;
      setResults([result]);
      setHistory((prev) => [query, ...prev.filter((item) => item !== query)].slice(0, 10));
      setEngineState('ready');
      if (result.sessionId) setActiveSessionId(result.sessionId);
      void refreshSessions();
    } catch (queryError) {
      setEngineState('error');
      setError(queryError instanceof Error ? queryError.message : 'Failed to process query');
    } finally {
      setIsProcessing(false);
      void refreshStatus();
    }
  };

  const handleSessionRefresh = () => {
    void refreshSessions();
    if (activeSessionId) {
      void refreshSessionDetail(activeSessionId);
    }
  };

  return (
    <div className="night-shell min-h-screen">
      <div className="night-backdrop pointer-events-none">
        <div className="night-stars night-stars-slow" />
        <div className="night-stars night-stars-fast" />
        <div className="night-moon-glow" />
        <div className="night-grid" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-8 md:py-12">
        <header className="mb-8 rounded-3xl border border-sky-200/20 bg-slate-900/65 p-6 shadow-[0_18px_50px_rgba(2,6,23,0.55)] backdrop-blur">
          <div className="mb-3 flex items-center gap-3 text-sky-200">
            <MoonStar className="h-7 w-7" />
            <span className="text-sm tracking-[0.2em] uppercase">Sleepy Research Lab</span>
          </div>
          <h1 className="text-3xl font-semibold text-slate-50 md:text-5xl">OpenCode Night Shift</h1>
          <p className="mt-3 max-w-3xl text-slate-200/85">
            Ask a research question and the app will wake a local OpenCode instance on this machine,
            run the query, and return a structured answer with source links.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <aside className="space-y-5">
            <section className="night-panel p-5">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium tracking-wide text-slate-100">
                    Research Query
                  </label>
                  <textarea
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="What do you want to investigate tonight?"
                    className="h-40 w-full resize-none rounded-2xl border border-sky-200/25 bg-slate-950/55 p-4 text-slate-100 placeholder:text-slate-300/45 focus:border-cyan-300/75 focus:outline-none"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  {QUERY_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setQuery(preset)}
                      className="rounded-full border border-sky-200/25 bg-slate-900/70 px-3 py-1 text-xs text-slate-200 transition hover:border-cyan-300/65 hover:text-cyan-100"
                    >
                      Load Prompt
                    </button>
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={!query.trim() || isProcessing}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-cyan-200/50 bg-cyan-300/85 px-6 py-3 font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <LoaderCircle className="h-5 w-5 animate-spin" />
                      Running Research...
                    </>
                  ) : (
                    <>
                      <SendHorizontal className="h-5 w-5" />
                      Start Research
                    </>
                  )}
                </button>
              </form>
            </section>

            <section className="night-panel p-5">
              <h2 className="mb-4 flex items-center gap-2 font-medium text-slate-50">
                <Server className="h-5 w-5 text-cyan-200" />
                Engine Status
              </h2>

              <div className="space-y-2 text-sm text-slate-200/90">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      engineState === 'ready'
                        ? 'bg-emerald-400'
                        : engineState === 'booting'
                          ? 'bg-amber-300 animate-pulse'
                          : engineState === 'error'
                            ? 'bg-rose-400'
                            : 'bg-slate-400'
                    }`}
                  />
                  <span>{statusLabel}</span>
                </div>

                <div className="rounded-xl border border-sky-200/15 bg-slate-950/45 p-3">
                  <p className="text-xs tracking-wide text-slate-300/75 uppercase">Endpoint</p>
                  <p className="mt-1 font-mono text-cyan-100">
                    {engine ? `${engine.host}:${engine.port}` : '127.0.0.1:4096'}
                  </p>
                </div>

                <div className="rounded-xl border border-sky-200/15 bg-slate-950/45 p-3">
                  <p className="text-xs tracking-wide text-slate-300/75 uppercase">Launch Command</p>
                  <p className="mt-1 font-mono text-[12px] text-slate-200/80">
                    {engine?.command || 'opencode serve --hostname 127.0.0.1 --port 4096'}
                  </p>
                </div>

                <div className="rounded-xl border border-sky-200/15 bg-slate-950/45 p-3">
                  <p className="text-xs tracking-wide text-slate-300/75 uppercase">Tracked Sessions</p>
                  <p className="mt-1 font-mono text-cyan-100">{sessionList?.count ?? 0}</p>
                </div>

                {engine?.lastError && (
                  <div className="rounded-xl border border-rose-300/25 bg-rose-950/45 p-3 text-rose-200">
                    {engine.lastError}
                  </div>
                )}
              </div>
            </section>

            {history.length > 0 && (
              <section className="night-panel p-5">
                <h2 className="mb-3 flex items-center gap-2 font-medium text-slate-50">
                  <History className="h-5 w-5 text-cyan-200" />
                  Recent Queries
                </h2>
                <div className="flex flex-wrap gap-2">
                  {history.map((entry) => (
                    <button
                      key={entry}
                      type="button"
                      onClick={() => setQuery(entry)}
                      className="rounded-full border border-sky-200/20 bg-slate-900/70 px-3 py-1 text-xs text-slate-100 transition hover:border-cyan-300/60"
                    >
                      {entry}
                    </button>
                  ))}
                </div>
              </section>
            )}
          </aside>

          <main className="night-panel min-h-[620px] p-6 md:p-7">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-medium text-slate-50">
                <Search className="h-5 w-5 text-cyan-200" />
                Research Results
              </h2>
              {results.length > 0 && (
                <span className="rounded-full border border-sky-200/20 bg-slate-900/70 px-3 py-1 text-xs text-slate-200">
                  {results.length} result
                </span>
              )}
            </div>

            {error && (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-300/25 bg-rose-950/40 p-3 text-rose-100">
                <AlertCircle className="mt-0.5 h-5 w-5" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            {!isProcessing && results.length === 0 && (
              <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-sky-200/15 bg-slate-950/35 px-6 text-center">
                <MoonStar className="mb-4 h-14 w-14 text-cyan-200/70" />
                <p className="text-xl text-slate-50">No research run yet</p>
                <p className="mt-2 max-w-xl text-sm text-slate-200/70">
                  Start a query and the app will launch OpenCode locally if it is not already running.
                </p>
              </div>
            )}

            {isProcessing && (
              <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-sky-200/15 bg-slate-950/35 text-center">
                <LoaderCircle className="mb-4 h-12 w-12 animate-spin text-cyan-200" />
                <p className="text-slate-100">Running local research pipeline...</p>
                <p className="mt-2 text-sm text-slate-300/75">
                  Initializing OpenCode instance and submitting your prompt.
                </p>
              </div>
            )}

            {results.length > 0 && (
              <div className="space-y-4">
                {results.map((result) => (
                  <article
                    key={result.id}
                    className="rounded-2xl border border-sky-200/20 bg-slate-950/45 p-5 shadow-[0_0_0_1px_rgba(103,232,249,0.06)]"
                  >
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <p className="font-mono text-xs text-cyan-100">{result.id}</p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-100">
                        <span className="rounded-full border border-sky-200/20 px-2 py-1">
                          {result.metadata.confidenceScore}% confidence
                        </span>
                        <span className="rounded-full border border-sky-200/20 px-2 py-1">
                          Session {result.sessionId || 'n/a'}
                        </span>
                      </div>
                    </div>

                    <p className="mb-4 text-sm text-slate-200/80">{result.query}</p>

                    <div className="mb-4 grid gap-2 text-xs text-slate-200/75 sm:grid-cols-3">
                      <div className="flex items-center gap-2 rounded-xl border border-sky-200/15 bg-slate-900/60 px-3 py-2">
                        <Database className="h-4 w-4 text-cyan-200" />
                        <span>{result.metadata.sources} sources</span>
                      </div>
                      <div className="flex items-center gap-2 rounded-xl border border-sky-200/15 bg-slate-900/60 px-3 py-2">
                        <Clock3 className="h-4 w-4 text-cyan-200" />
                        <span>{result.metadata.processingTime}s runtime</span>
                      </div>
                      <div className="flex items-center gap-2 rounded-xl border border-sky-200/15 bg-slate-900/60 px-3 py-2">
                        <Server className="h-4 w-4 text-cyan-200" />
                        <span>
                          {result.metadata.opencode?.started ? 'Engine started now' : 'Engine already running'}
                        </span>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-sky-200/20 bg-slate-950/70 p-4">
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-100">
                        {result.answer || 'No answer text returned by OpenCode.'}
                      </p>
                    </div>

                    {result.sources && result.sources.length > 0 && (
                      <div className="mt-4">
                        <p className="mb-2 text-xs tracking-wide text-slate-300/75 uppercase">Detected Sources</p>
                        <div className="space-y-2">
                          {result.sources.map((source) => (
                            <a
                              key={source}
                              href={source}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-2 break-all rounded-lg border border-sky-200/15 bg-slate-900/55 px-3 py-2 text-sm text-cyan-100 hover:border-cyan-300/65"
                            >
                              <Link2 className="h-4 w-4 shrink-0" />
                              <span>{source}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}

            <section className="mt-8 rounded-2xl border border-sky-200/20 bg-slate-950/45 p-4 md:p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h3 className="flex items-center gap-2 font-medium text-slate-50">
                  <Activity className="h-5 w-5 text-cyan-200" />
                  OpenCode Session Monitor
                </h3>

                <button
                  type="button"
                  onClick={handleSessionRefresh}
                  disabled={isSessionListLoading || isSessionDetailLoading}
                  className="inline-flex items-center gap-2 rounded-full border border-sky-200/25 bg-slate-900/65 px-3 py-1.5 text-xs text-slate-100 transition hover:border-cyan-300/65 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${
                      isSessionListLoading || isSessionDetailLoading ? 'animate-spin' : ''
                    }`}
                  />
                  Refresh
                </button>
              </div>

              {sessionError && (
                <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-300/25 bg-rose-950/40 p-3 text-rose-100">
                  <AlertCircle className="mt-0.5 h-5 w-5" />
                  <p className="text-sm">{sessionError}</p>
                </div>
              )}

              <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
                <div className="max-h-[430px] space-y-2 overflow-y-auto pr-1">
                  {isSessionListLoading && sessions.length === 0 && (
                    <div className="rounded-xl border border-sky-200/20 bg-slate-900/55 px-3 py-4 text-center text-sm text-slate-300">
                      Loading sessions...
                    </div>
                  )}

                  {!isSessionListLoading && sessions.length === 0 && (
                    <div className="rounded-xl border border-sky-200/20 bg-slate-900/55 px-3 py-4 text-center text-sm text-slate-300">
                      No OpenCode sessions found yet.
                    </div>
                  )}

                  {sessions.map((session) => (
                    <button
                      key={session.id}
                      type="button"
                      onClick={() => setActiveSessionId(session.id)}
                      className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                        activeSessionId === session.id
                          ? 'border-cyan-300/55 bg-cyan-950/25'
                          : 'border-sky-200/20 bg-slate-900/55 hover:border-cyan-300/40'
                      }`}
                    >
                      <p className="line-clamp-2 text-sm font-medium text-slate-100">{session.title}</p>
                      <p className="mt-1 font-mono text-[11px] text-cyan-100/90">{session.id}</p>
                      <p className="mt-2 text-[11px] text-slate-300/85">
                        Updated {formatRelativeTime(session.updatedAt || session.createdAt)}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-300/80">
                        <span className="rounded-full border border-sky-200/20 px-2 py-0.5">
                          {session.filesChanged} files
                        </span>
                        <span className="rounded-full border border-sky-200/20 px-2 py-0.5">
                          +{session.additions} / -{session.deletions}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="rounded-xl border border-sky-200/20 bg-slate-950/70 p-4">
                  {!activeSessionId && (
                    <div className="flex min-h-[250px] items-center justify-center text-sm text-slate-300">
                      Select a session to inspect OpenCode activity.
                    </div>
                  )}

                  {activeSessionId && isSessionDetailLoading && !sessionDetail && (
                    <div className="flex min-h-[250px] items-center justify-center gap-2 text-sm text-slate-300">
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      Loading session details...
                    </div>
                  )}

                  {activeSessionId && sessionDetail && sessionDetail.session.id === activeSessionId && (
                    <div>
                      <div className="mb-4 rounded-xl border border-sky-200/20 bg-slate-900/55 p-3">
                        <p className="text-sm font-medium text-slate-100">{sessionDetail.session.title}</p>
                        <p className="mt-1 font-mono text-xs text-cyan-100">{sessionDetail.session.id}</p>
                        <div className="mt-3 grid gap-2 text-xs text-slate-300 sm:grid-cols-2">
                          <p>Created: {formatDateTime(sessionDetail.session.createdAt)}</p>
                          <p>Updated: {formatDateTime(sessionDetail.session.updatedAt)}</p>
                          <p>Total messages: {sessionDetail.messageCount}</p>
                          <p>Active tool calls: {sessionDetail.activeToolCalls}</p>
                        </div>
                        {selectedSession?.directory && (
                          <p className="mt-3 break-all font-mono text-[11px] text-slate-300/85">
                            {selectedSession.directory}
                          </p>
                        )}
                      </div>

                      <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
                        {sessionDetail.messages.length === 0 && (
                          <div className="rounded-xl border border-sky-200/20 bg-slate-900/55 px-3 py-4 text-center text-sm text-slate-300">
                            No messages available for this session.
                          </div>
                        )}

                        {sessionDetail.messages.map((message) => (
                          <article
                            key={message.id}
                            className="rounded-xl border border-sky-200/20 bg-slate-900/55 p-3"
                          >
                            <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px]">
                              <span className={`rounded-full border px-2 py-0.5 uppercase ${roleTone(message.role)}`}>
                                {message.role}
                              </span>
                              <span className="text-slate-300/85">{formatRelativeTime(message.createdAt)}</span>
                              {message.hasRunningToolCall && (
                                <span className="rounded-full border border-amber-300/35 bg-amber-950/35 px-2 py-0.5 text-amber-100">
                                  running tool
                                </span>
                              )}
                            </div>

                            {message.text ? (
                              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-100">
                                {message.text}
                              </p>
                            ) : (
                              <p className="text-sm text-slate-300/80">No text payload.</p>
                            )}

                            {message.partTypes.length > 0 && (
                              <p className="mt-2 font-mono text-[11px] text-slate-300/75">
                                parts: {message.partTypes.join(', ')}
                              </p>
                            )}
                          </article>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
