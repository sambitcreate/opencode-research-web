'use client';

import NextLink from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertCircle,
  AtSign,
  CheckCircle2,
  Command,
  Cpu,
  Database,
  FileCode2,
  FileImage,
  FilePlus2,
  KeyRound,
  LoaderCircle,
  Link,
  MonitorCog,
  Moon,
  Palette,
  RefreshCw,
  RotateCw,
  Search,
  SendHorizontal,
  Server,
  PlugZap,
  Sun,
  TerminalSquare,
  X
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  callOpenCodeControl,
  createOpenCodePty,
  deleteOpenCodePty,
  fetchOpenCodeFiles,
  fetchOpenCodeMonitorSnapshot,
  fetchOpenCodePtyList,
  fetchOpenCodeSessionDetail,
  fetchOpenCodeSessionTimeline,
  fetchOpenCodeSessionTranscript,
  fetchOpenCodeSystemSnapshot,
  updateOpenCodePty
} from '@/lib/opencode-api-client';
import { createOpenCodeDebugEvent, useOpenCodeMonitorStore } from '@/lib/opencode-monitor/store';
import { cn } from '@/lib/utils';
import * as monitorPageShared from '@/lib/opencode-monitor-page-shared';
import type {
  OpenCodeSessionMessage,
  OpenCodeSessionDetail,
  OpenCodeSessionTimeline,
  OpenCodeSessionTranscript,
  OpenCodeHttpMethod,
  OpenCodeFilesMode,
  OpenCodeFilesResponse,
  OpenCodeSystemSnapshotResponse,
  OpenCodePtyRouteResponse,
  OpenCodeMonitorSnapshot,
  OpenCodeControlResponse,
  PtyStreamState,
  ColorScheme,
  ResolvedScheme,
  ComposerMode,
  ComposerMentionCategory,
  ComposerSuggestion,
  ComposerAttachment,
  CommandPaletteAction,
} from '@/lib/opencode-monitor-page-shared';

const {
  EMPTY_SESSIONS,
  EMPTY_OPENAPI_ENDPOINTS,
  DEFAULT_API_METHODS,
  MONITOR_POLL_MS_DISCONNECTED,
  MONITOR_POLL_MS_CONNECTED,
  SESSION_POLL_MS_DISCONNECTED,
  SESSION_POLL_MS_CONNECTED,
  THEME_DEFINITIONS,
  SESSION_OPERATION_DEFINITIONS,
  TUI_SHORTCUTS,
  TUI_COMMAND_CHOICES,
  COMPOSER_ATTACHMENT_LIMIT,
  COMPOSER_ATTACHMENT_MAX_BYTES,
  COMPOSER_TEXT_SNIPPET_LIMIT,
  COMPOSER_IMAGE_DATA_URL_LIMIT,
  COMPOSER_SUGGESTION_LIMIT,
  PTY_OUTPUT_CHAR_LIMIT,
  PTY_RECONNECT_BASE_MS,
  PTY_RECONNECT_MAX_MS,
  COMPOSER_MODE_OPTIONS,
  COMPOSER_SLASH_OPTIONS,
  FILE_MODE_OPTIONS,
  toUniqueStrings,
  formatBytes,
  fileSignature,
  isTextAttachment,
  readFileAsDataUrl,
  collectStringFields,
  collectLikelyFilePaths,
  extractComposerToken,
  appendRawQueryParams,
  summarizeDraftDiff,
  asRecord,
  prettyJson,
  extractString,
  extractIdentifier,
  summarizeRuntimeService,
  summarizePermissionContext,
  summarizeQuestionContext,
  extractProviderOptions,
  extractMcpServers,
  extractPtySessions,
  parseEventJson,
  findSessionId,
  resolveEventRefreshScope,
  resolvePtySocketUrl,
  decodePtyFrame,
  summarizeTodoItems,
  summarizeDiff,
  summarizeSessionUsage,
  resolveSessionPath,
  formatDateTime,
  formatRelativeTime,
  roleTone,
  toThemeStyle,
} = monitorPageShared;

type OpenCodeMonitorShellMode = 'dashboard' | 'settings';

type OpenCodeMonitorShellProps = {
  mode?: OpenCodeMonitorShellMode;
};

export default function OpenCodeMonitorShell({ mode = 'dashboard' }: OpenCodeMonitorShellProps) {
  const isSettingsView = mode === 'settings';
  const {
    state: monitorStore,
    setEngineState,
    setMonitorError,
    setIsMonitorLoading,
    setSessionDetail,
    setSessionTimeline,
    setActiveSessionId,
    setIsSessionDetailLoading,
    setSessionError,
    setSessionSearch,
    setIsTimelineLoading,
    setTimelineError,
    setEventDebugFilter,
    setEventDebugEvents,
    applyMonitorSnapshot,
    applyEventUpdate
  } = useOpenCodeMonitorStore();
  const {
    monitor,
    engine,
    engineState,
    monitorError,
    isMonitorLoading,
    sessionDetail,
    sessionTimeline,
    activeSessionId,
    isSessionDetailLoading,
    sessionError,
    sessionSearch,
    isTimelineLoading,
    timelineError,
    eventConnectionState,
    eventConnectionError,
    eventDebugFilter,
    eventDebugEvents
  } = monitorStore;

  const [newSessionTitle, setNewSessionTitle] = useState('');
  const [newSessionParent, setNewSessionParent] = useState('');
  const [quickPrompt, setQuickPrompt] = useState('');
  const [composerMode, setComposerMode] = useState<ComposerMode>('prompt-sync');
  const [composerCommand, setComposerCommand] = useState('review');
  const [composerShellAgent, setComposerShellAgent] = useState('');
  const [composerAttachments, setComposerAttachments] = useState<ComposerAttachment[]>([]);
  const [composerCaretPosition, setComposerCaretPosition] = useState(0);
  const [composerSuggestionIndex, setComposerSuggestionIndex] = useState(0);
  const [selectedProviderId, setSelectedProviderId] = useState('');
  const [selectedModelId, setSelectedModelId] = useState('');
  const [selectedModelVariant, setSelectedModelVariant] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [selectedMcpName, setSelectedMcpName] = useState('');
  const [providerApiKey, setProviderApiKey] = useState('');
  const [providerOAuthCode, setProviderOAuthCode] = useState('');
  const [providerOAuthState, setProviderOAuthState] = useState('');
  const [providerAuthMethods, setProviderAuthMethods] = useState<string[]>([]);
  const [mcpAuthPayload, setMcpAuthPayload] = useState('{}');
  const [isProviderModalOpen, setIsProviderModalOpen] = useState(false);
  const [isRuntimeControlBusy, setIsRuntimeControlBusy] = useState(false);
  const [runtimeControlError, setRuntimeControlError] = useState<string | null>(null);
  const [runtimeControlResult, setRuntimeControlResult] = useState<OpenCodeControlResponse | null>(null);

  const [sessionOperationId, setSessionOperationId] = useState<string>(SESSION_OPERATION_DEFINITIONS[0]?.id ?? '');
  const [sessionOperationBody, setSessionOperationBody] = useState<string>(SESSION_OPERATION_DEFINITIONS[0]?.template ?? '{}');
  const [operationResult, setOperationResult] = useState<OpenCodeControlResponse | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [sessionShareUrl, setSessionShareUrl] = useState<string | null>(null);
  const [isOperationRunning, setIsOperationRunning] = useState(false);

  const [permissionMessages, setPermissionMessages] = useState<Record<string, string>>({});
  const [questionReplies, setQuestionReplies] = useState<Record<string, string>>({});
  const [tuiCommand, setTuiCommand] = useState<string>(TUI_COMMAND_CHOICES[0] ?? 'agent_cycle');

  const [apiPath, setApiPath] = useState('/global/health');
  const [apiMethod, setApiMethod] = useState<OpenCodeHttpMethod>('GET');
  const [apiBody, setApiBody] = useState('{}');
  const [apiResponse, setApiResponse] = useState<OpenCodeControlResponse | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isApiRunning, setIsApiRunning] = useState(false);

  const [fileMode, setFileMode] = useState<OpenCodeFilesMode>('findText');
  const [fileRoot, setFileRoot] = useState('');
  const [filePathTarget, setFilePathTarget] = useState('');
  const [fileQuery, setFileQuery] = useState('');
  const [fileExtraParams, setFileExtraParams] = useState('');
  const [fileResponse, setFileResponse] = useState<OpenCodeFilesResponse | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isFileRunning, setIsFileRunning] = useState(false);

  const [systemSnapshot, setSystemSnapshot] = useState<OpenCodeSystemSnapshotResponse | null>(null);
  const [isSystemSnapshotLoading, setIsSystemSnapshotLoading] = useState(false);
  const [systemSnapshotError, setSystemSnapshotError] = useState<string | null>(null);
  const [projectUpdateBody, setProjectUpdateBody] = useState('{\n  "id": ""\n}');
  const [selectedProjectCandidate, setSelectedProjectCandidate] = useState('');

  const [worktreeRequestBody, setWorktreeRequestBody] = useState('{\n  "name": "feature-worktree"\n}');
  const [worktreeResetBody, setWorktreeResetBody] = useState('{\n  "name": "feature-worktree"\n}');
  const [worktreeListResult, setWorktreeListResult] = useState<OpenCodeControlResponse | null>(null);
  const [worktreeActionResult, setWorktreeActionResult] = useState<OpenCodeControlResponse | null>(null);
  const [worktreeError, setWorktreeError] = useState<string | null>(null);
  const [isWorktreeBusy, setIsWorktreeBusy] = useState(false);

  const [ptyCreateBody, setPtyCreateBody] = useState('{\n  "title": "Local Shell",\n  "command": "zsh",\n  "args": []\n}');
  const [ptyUpdateBody, setPtyUpdateBody] = useState('{\n  "title": "Renamed PTY"\n}');
  const [selectedPtyId, setSelectedPtyId] = useState('');
  const [ptyListResponse, setPtyListResponse] = useState<OpenCodePtyRouteResponse | null>(null);
  const [ptyActionResponse, setPtyActionResponse] = useState<OpenCodePtyRouteResponse | null>(null);
  const [ptyError, setPtyError] = useState<string | null>(null);
  const [isPtyBusy, setIsPtyBusy] = useState(false);
  const [ptyStreamState, setPtyStreamState] = useState<PtyStreamState>('idle');
  const [ptyStreamError, setPtyStreamError] = useState<string | null>(null);
  const [ptyStreamOutput, setPtyStreamOutput] = useState('');
  const [ptyStreamInput, setPtyStreamInput] = useState('');
  const [ptyStreamCursor, setPtyStreamCursor] = useState<number | null>(null);
  const [ptyResizeCols, setPtyResizeCols] = useState('120');
  const [ptyResizeRows, setPtyResizeRows] = useState('36');
  const [ptyAutoConnect, setPtyAutoConnect] = useState(true);
  const [ptyAutoReconnect, setPtyAutoReconnect] = useState(true);
  const [ptyReconnectAttempt, setPtyReconnectAttempt] = useState(0);
  const [ptyConnectTick, setPtyConnectTick] = useState(0);

  const [configLocalBase, setConfigLocalBase] = useState('{}');
  const [configGlobalBase, setConfigGlobalBase] = useState('{}');
  const [configLocalDraft, setConfigLocalDraft] = useState('{}');
  const [configGlobalDraft, setConfigGlobalDraft] = useState('{}');
  const [configApplyMethod, setConfigApplyMethod] = useState<OpenCodeHttpMethod>('PATCH');
  const [confirmApplyLocalConfig, setConfirmApplyLocalConfig] = useState(false);
  const [confirmApplyGlobalConfig, setConfirmApplyGlobalConfig] = useState(false);
  const [isConfigBusy, setIsConfigBusy] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const [configActionResult, setConfigActionResult] = useState<OpenCodeControlResponse | null>(null);

  const [themeId, setThemeId] = useState<string>('oc-1');
  const [colorScheme, setColorScheme] = useState<ColorScheme>('system');
  const [systemPrefersDark, setSystemPrefersDark] = useState(true);
  const [isTranscriptRunning, setIsTranscriptRunning] = useState(false);
  const [transcriptError, setTranscriptError] = useState<string | null>(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [commandPaletteQuery, setCommandPaletteQuery] = useState('');
  const [commandPaletteIndex, setCommandPaletteIndex] = useState(0);

  const activeSessionIdRef = useRef<string | null>(null);
  const refreshMonitorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshSessionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const composerTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const composerAttachmentInputRef = useRef<HTMLInputElement | null>(null);
  const commandPaletteInputRef = useRef<HTMLInputElement | null>(null);
  const ptySocketRef = useRef<WebSocket | null>(null);
  const ptyReconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ptyReconnectAttemptRef = useRef(0);
  const ptyManualCloseSocketRef = useRef<WebSocket | null>(null);
  const ptyCursorRef = useRef(0);
  const ptyActiveSessionRef = useRef('');
  const ptyOutputViewportRef = useRef<HTMLPreElement | null>(null);
  const selectedPtyIdRef = useRef('');
  const ptyAutoConnectRef = useRef(ptyAutoConnect);
  const ptyAutoReconnectRef = useRef(ptyAutoReconnect);

  const callControl = useCallback(
    async (input: {
      path: string;
      method?: OpenCodeHttpMethod;
      body?: unknown;
      timeoutMs?: number;
      parseSsePayload?: boolean;
    }): Promise<OpenCodeControlResponse> => {
      return callOpenCodeControl({
        path: input.path,
        method: input.method,
        body: input.body,
        timeoutMs: input.timeoutMs,
        parseSsePayload: input.parseSsePayload,
        autostart: true
      });
    },
    []
  );

  const openCommandPalette = useCallback(() => {
    setIsCommandPaletteOpen(true);
    setCommandPaletteQuery('');
    setCommandPaletteIndex(0);
  }, []);

  const closeCommandPalette = useCallback(() => {
    setIsCommandPaletteOpen(false);
    setCommandPaletteQuery('');
    setCommandPaletteIndex(0);
  }, []);

  const refreshMonitor = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) setIsMonitorLoading(true);

    try {
      const snapshot = await fetchOpenCodeMonitorSnapshot<OpenCodeMonitorSnapshot>({
        sessionLimit: 120,
        permissionLimit: 80,
        questionLimit: 80,
        autostart: false,
        include: [
          'providers',
          'agents',
          'skills',
          'commands',
          'path',
          'vcs',
          'mcp',
          'lsp',
          'formatter',
          'config',
          'compatibility',
          'openapi'
        ]
      });
      applyMonitorSnapshot(snapshot);
    } catch (error) {
      setMonitorError(error instanceof Error ? error.message : 'Unable to load monitor snapshot.');
      setEngineState('error');
    } finally {
      if (!options?.silent) setIsMonitorLoading(false);
    }
  }, [applyMonitorSnapshot, setEngineState, setIsMonitorLoading, setMonitorError]);

  const refreshSessionDetail = useCallback(async (sessionId: string, options?: { silent?: boolean }) => {
    if (!sessionId) return;
    if (!options?.silent) setIsSessionDetailLoading(true);

    try {
      const payload = await fetchOpenCodeSessionDetail<OpenCodeSessionDetail>(sessionId, {
        messageLimit: 160,
        include: ['messages', 'todo', 'diff', 'children'],
        autostart: false
      });
      setSessionDetail(payload);
      setSessionError(null);
    } catch (error) {
      setSessionError(error instanceof Error ? error.message : 'Unable to load session detail.');
    } finally {
      if (!options?.silent) setIsSessionDetailLoading(false);
    }
  }, [setIsSessionDetailLoading, setSessionDetail, setSessionError]);

  const refreshSessionTimeline = useCallback(async (sessionId: string, options?: { silent?: boolean }) => {
    if (!sessionId) return;
    if (!options?.silent) setIsTimelineLoading(true);

    try {
      const payload = await fetchOpenCodeSessionTimeline<OpenCodeSessionTimeline>(sessionId, {
        autostart: false
      });
      setSessionTimeline(payload);
      setTimelineError(null);
    } catch (error) {
      setTimelineError(error instanceof Error ? error.message : 'Unable to load timeline.');
    } finally {
      if (!options?.silent) setIsTimelineLoading(false);
    }
  }, [setIsTimelineLoading, setSessionTimeline, setTimelineError]);

  const pushDebugEvent = useCallback(
    (
      event: Omit<ReturnType<typeof createOpenCodeDebugEvent>, 'id' | 'timestamp'>
    ) => {
      applyEventUpdate({
        debugEvent: createOpenCodeDebugEvent(event)
      });
    },
    [applyEventUpdate]
  );

  const scheduleMonitorRefreshFromEvent = useCallback(
    (eventType: string, payload: unknown) => {
      const refreshScope = resolveEventRefreshScope(eventType);
      if (refreshScope === 'none') return;

      if ((refreshScope === 'monitor' || refreshScope === 'monitor-session') && !refreshMonitorTimerRef.current) {
        refreshMonitorTimerRef.current = setTimeout(() => {
          refreshMonitorTimerRef.current = null;
          void refreshMonitor({ silent: true });
        }, 550);
      }

      if (refreshScope !== 'monitor-session') return;

      const targetSessionId = findSessionId(payload) || activeSessionIdRef.current;
      if (!targetSessionId) return;

      if (refreshSessionTimerRef.current) {
        clearTimeout(refreshSessionTimerRef.current);
      }
      refreshSessionTimerRef.current = setTimeout(() => {
        refreshSessionTimerRef.current = null;
        void refreshSessionDetail(targetSessionId, { silent: true });
        void refreshSessionTimeline(targetSessionId, { silent: true });
      }, 700);
    },
    [refreshMonitor, refreshSessionDetail, refreshSessionTimeline]
  );

  useEffect(() => {
    const savedTheme = window.localStorage.getItem('opencode-ui-theme');
    if (savedTheme && THEME_DEFINITIONS.some((theme) => theme.id === savedTheme)) {
      setThemeId(savedTheme);
    }

    const savedScheme = window.localStorage.getItem('opencode-ui-color-scheme');
    if (savedScheme === 'system' || savedScheme === 'light' || savedScheme === 'dark') {
      setColorScheme(savedScheme);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem('opencode-ui-theme', themeId);
  }, [themeId]);

  useEffect(() => {
    window.localStorage.setItem('opencode-ui-color-scheme', colorScheme);
  }, [colorScheme]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const updatePreference = () => setSystemPrefersDark(media.matches);
    updatePreference();
    media.addEventListener('change', updatePreference);
    return () => media.removeEventListener('change', updatePreference);
  }, []);

  useEffect(() => {
    activeSessionIdRef.current = activeSessionId;
  }, [activeSessionId]);

  useEffect(() => {
    setSessionShareUrl(null);
  }, [activeSessionId]);

  useEffect(() => {
    selectedPtyIdRef.current = selectedPtyId;
  }, [selectedPtyId]);

  useEffect(() => {
    ptyAutoConnectRef.current = ptyAutoConnect;
  }, [ptyAutoConnect]);

  useEffect(() => {
    ptyAutoReconnectRef.current = ptyAutoReconnect;
  }, [ptyAutoReconnect]);

  useEffect(() => {
    if (ptyAutoReconnect) return;
    if (!ptyReconnectTimerRef.current) return;
    clearTimeout(ptyReconnectTimerRef.current);
    ptyReconnectTimerRef.current = null;
  }, [ptyAutoReconnect]);

  useEffect(() => {
    const viewport = ptyOutputViewportRef.current;
    if (!viewport) return;
    viewport.scrollTop = viewport.scrollHeight;
  }, [ptyStreamOutput]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if ((event.metaKey || event.ctrlKey) && key === 'k') {
        event.preventDefault();
        openCommandPalette();
        return;
      }
      if (isCommandPaletteOpen && event.key === 'Escape') {
        event.preventDefault();
        closeCommandPalette();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closeCommandPalette, isCommandPaletteOpen, openCommandPalette]);

  useEffect(() => {
    if (!isCommandPaletteOpen) return;
    const timer = setTimeout(() => {
      commandPaletteInputRef.current?.focus();
    }, 0);
    return () => clearTimeout(timer);
  }, [isCommandPaletteOpen]);

  useEffect(() => {
    setCommandPaletteIndex(0);
  }, [commandPaletteQuery]);

  useEffect(() => {
    let disposed = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let source: EventSource | null = null;

    const clearReconnect = () => {
      if (!reconnectTimer) return;
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    };

    const connect = () => {
      if (disposed) return;
      applyEventUpdate({
        connectionState: 'connecting',
        connectionError: null
      });

      source = new EventSource('/api/opencode/events?scope=both&autostart=0');

      source.addEventListener('ready', (event) => {
        const payload = parseEventJson(event.data);
        applyEventUpdate({
          connectionState: 'connected',
          connectionError: null,
          debugEvent: createOpenCodeDebugEvent({
            streamEvent: 'ready',
            source: 'bridge',
            seq: null,
            eventType: 'ready',
            sessionId: null,
            payload
          })
        });
      });

      source.addEventListener('source_open', (event) => {
        const payload = parseEventJson(event.data);
        const record = asRecord(payload);
        const sourceLabel = extractString(record || {}, ['source']) as 'instance' | 'global' | null;
        pushDebugEvent({
          streamEvent: 'source_open',
          source: sourceLabel === 'global' ? 'global' : sourceLabel === 'instance' ? 'instance' : 'bridge',
          seq: null,
          eventType: 'source_open',
          sessionId: null,
          payload
        });
      });

      source.addEventListener('event', (event) => {
        const payload = parseEventJson(event.data);
        const record = asRecord(payload);
        const sourceLabel = extractString(record || {}, ['source']) as 'instance' | 'global' | null;
        const seqRaw = record ? record.seq : null;
        const seq = typeof seqRaw === 'number' && Number.isFinite(seqRaw) ? seqRaw : null;
        const eventType = (extractString(record || {}, ['event']) || 'message').toLowerCase();
        const nestedPayload = record?.data ?? payload;

        pushDebugEvent({
          streamEvent: 'event',
          source: sourceLabel === 'global' ? 'global' : sourceLabel === 'instance' ? 'instance' : 'bridge',
          seq,
          eventType,
          sessionId: findSessionId(nestedPayload),
          payload: nestedPayload
        });

        scheduleMonitorRefreshFromEvent(eventType, nestedPayload);
      });

      source.addEventListener('source_error', (event) => {
        const payload = parseEventJson(event.data);
        const record = asRecord(payload);
        const sourceLabel = extractString(record || {}, ['source']) as 'instance' | 'global' | null;
        pushDebugEvent({
          streamEvent: 'source_error',
          source: sourceLabel === 'global' ? 'global' : sourceLabel === 'instance' ? 'instance' : 'bridge',
          seq: null,
          eventType: 'source_error',
          sessionId: null,
          payload
        });
      });

      source.addEventListener('complete', (event) => {
        const payload = parseEventJson(event.data);
        pushDebugEvent({
          streamEvent: 'complete',
          source: 'bridge',
          seq: null,
          eventType: 'complete',
          sessionId: null,
          payload
        });
      });

      source.onerror = () => {
        applyEventUpdate({
          connectionState: 'error',
          connectionError: 'Event stream disconnected. Using polling fallback and retrying.',
          debugEvent: createOpenCodeDebugEvent({
            streamEvent: 'error',
            source: 'bridge',
            seq: null,
            eventType: 'connection_error',
            sessionId: null,
            payload: { message: 'Event stream disconnected.' }
          })
        });

        source?.close();
        source = null;
        clearReconnect();
        reconnectTimer = setTimeout(() => {
          connect();
        }, 3000);
      };
    };

    connect();

    return () => {
      disposed = true;
      clearReconnect();
      source?.close();
      source = null;
    };
  }, [applyEventUpdate, pushDebugEvent, scheduleMonitorRefreshFromEvent]);

  useEffect(() => {
    void refreshMonitor();
    const timer = setInterval(() => {
      void refreshMonitor({ silent: true });
    }, eventConnectionState === 'connected' ? MONITOR_POLL_MS_CONNECTED : MONITOR_POLL_MS_DISCONNECTED);
    return () => clearInterval(timer);
  }, [eventConnectionState, refreshMonitor]);

  useEffect(() => {
    if (!activeSessionId) {
      setSessionDetail(null);
      setSessionTimeline(null);
      setTranscriptError(null);
      return;
    }
    void refreshSessionDetail(activeSessionId);
    void refreshSessionTimeline(activeSessionId);
    const timer = setInterval(() => {
      void refreshSessionDetail(activeSessionId, { silent: true });
      void refreshSessionTimeline(activeSessionId, { silent: true });
    }, eventConnectionState === 'connected' ? SESSION_POLL_MS_CONNECTED : SESSION_POLL_MS_DISCONNECTED);
    return () => clearInterval(timer);
  }, [activeSessionId, eventConnectionState, refreshSessionDetail, refreshSessionTimeline, setSessionDetail, setSessionTimeline]);

  useEffect(() => {
    return () => {
      if (refreshMonitorTimerRef.current) clearTimeout(refreshMonitorTimerRef.current);
      if (refreshSessionTimerRef.current) clearTimeout(refreshSessionTimerRef.current);
    };
  }, []);

  const sessions = monitor?.sessions.sessions ?? EMPTY_SESSIONS;
  const permissions = monitor?.permissions ?? [];
  const questions = monitor?.questions ?? [];

  const filteredSessions = useMemo(() => {
    const query = sessionSearch.trim().toLowerCase();
    if (!query) return sessions;
    return sessions.filter((session) => {
      return (
        session.title.toLowerCase().includes(query) ||
        session.id.toLowerCase().includes(query) ||
        (session.slug || '').toLowerCase().includes(query) ||
        (session.directory || '').toLowerCase().includes(query)
      );
    });
  }, [sessionSearch, sessions]);

  const selectedSession = useMemo(() => {
    if (!activeSessionId) return null;
    return sessions.find((session) => session.id === activeSessionId) || null;
  }, [activeSessionId, sessions]);

  const selectedSessionStatus = useMemo(() => {
    if (!activeSessionId) return null;
    return asRecord(monitor?.sessionStatus?.[activeSessionId]) ?? null;
  }, [activeSessionId, monitor?.sessionStatus]);

  const todoSummary = useMemo(() => summarizeTodoItems(sessionDetail?.todo), [sessionDetail?.todo]);
  const diffSummary = useMemo(() => summarizeDiff(sessionDetail?.diff), [sessionDetail?.diff]);
  const usageSummary = useMemo(() => summarizeSessionUsage(selectedSessionStatus), [selectedSessionStatus]);
  const lspSummary = useMemo(() => summarizeRuntimeService(monitor?.lsp), [monitor?.lsp]);
  const formatterSummary = useMemo(() => summarizeRuntimeService(monitor?.formatter), [monitor?.formatter]);
  const configSummary = useMemo(() => {
    const local = monitor?.config?.local;
    const global = monitor?.config?.global;
    const pluginCandidates = toUniqueStrings(
      [
        ...collectStringFields(local, ['plugin', 'plugins', 'name', 'id']),
        ...collectStringFields(global, ['plugin', 'plugins', 'name', 'id'])
      ].filter((entry) => entry.length <= 80),
      24
    );
    return {
      hasLocal: local !== undefined && local !== null,
      hasGlobal: global !== undefined && global !== null,
      pluginCount: pluginCandidates.length
    };
  }, [monitor?.config?.global, monitor?.config?.local]);
  const compatibilitySummary = useMemo(() => {
    const report = monitor?.compatibility;
    if (!report) {
      return {
        status: 'unverified' as const,
        requiredIssues: 0,
        recommendedIssues: 0,
        mismatchCount: 0,
        note: 'compatibility report not requested'
      };
    }

    const requiredMismatches = report.methodMismatches.filter((mismatch) => mismatch.required).length;
    const recommendedMismatches = report.methodMismatches.filter((mismatch) => !mismatch.required).length;

    return {
      status: report.status,
      requiredIssues: report.missingRequiredEndpoints.length + requiredMismatches,
      recommendedIssues: report.missingRecommendedEndpoints.length + recommendedMismatches,
      mismatchCount: report.methodMismatches.length,
      note: report.notes[0] ?? ''
    };
  }, [monitor?.compatibility]);

  const agentCandidates = useMemo(() => {
    const values = collectStringFields(monitor?.agents, ['id', 'name', 'slug', 'title', 'agentID']);
    return toUniqueStrings(
      values.filter((value) => value.length <= 80 && !value.includes('{') && !value.includes('[')),
      64
    );
  }, [monitor?.agents]);

  const mcpResourceCandidates = useMemo(() => {
    const values = collectStringFields(monitor?.mcp, ['name', 'uri', 'title', 'id', 'resource']);
    return toUniqueStrings(
      values.filter((value) => value.length <= 160 && !value.includes('\n') && !value.includes('{')),
      80
    );
  }, [monitor?.mcp]);

  const providerOptions = useMemo(() => {
    return extractProviderOptions(monitor?.providers);
  }, [monitor?.providers]);

  const mcpServers = useMemo(() => {
    return extractMcpServers(monitor?.mcp);
  }, [monitor?.mcp]);

  const fileMentionCandidates = useMemo(() => {
    const sessionMessages = sessionDetail?.messages ?? [];
    const fromMessages = collectLikelyFilePaths(sessionMessages);
    return toUniqueStrings(fromMessages, 80);
  }, [sessionDetail?.messages]);

  const selectedProviderOption = useMemo(() => {
    return providerOptions.find((provider) => provider.id === selectedProviderId) ?? null;
  }, [providerOptions, selectedProviderId]);

  const selectedModelOption = useMemo(() => {
    if (selectedProviderOption) {
      return selectedProviderOption.models.find((model) => model.id === selectedModelId) ?? null;
    }
    for (const provider of providerOptions) {
      const model = provider.models.find((candidate) => candidate.id === selectedModelId);
      if (model) return model;
    }
    return null;
  }, [providerOptions, selectedModelId, selectedProviderOption]);

  const selectedModelVariants = useMemo(() => selectedModelOption?.variants ?? [], [selectedModelOption]);

  const selectedMcpServer = useMemo(() => {
    return mcpServers.find((server) => server.name === selectedMcpName) ?? null;
  }, [mcpServers, selectedMcpName]);

  useEffect(() => {
    if (providerOptions.length === 0) {
      if (selectedProviderId) setSelectedProviderId('');
      return;
    }
    if (providerOptions.some((provider) => provider.id === selectedProviderId)) return;
    setSelectedProviderId(providerOptions[0].id);
  }, [providerOptions, selectedProviderId]);

  useEffect(() => {
    if (!selectedProviderOption) return;
    if (selectedProviderOption.models.length === 0) {
      if (selectedModelId) setSelectedModelId('');
      return;
    }
    if (selectedProviderOption.models.some((model) => model.id === selectedModelId)) return;
    setSelectedModelId(selectedProviderOption.models[0].id);
  }, [selectedModelId, selectedProviderOption]);

  useEffect(() => {
    if (selectedModelVariants.length === 0) {
      if (selectedModelVariant) setSelectedModelVariant('');
      return;
    }
    if (selectedModelVariants.includes(selectedModelVariant)) return;
    setSelectedModelVariant(selectedModelVariants[0]);
  }, [selectedModelVariant, selectedModelVariants]);

  useEffect(() => {
    if (agentCandidates.length === 0) {
      if (selectedAgentId) setSelectedAgentId('');
      return;
    }
    if (agentCandidates.includes(selectedAgentId)) return;
    setSelectedAgentId(agentCandidates[0]);
  }, [agentCandidates, selectedAgentId]);

  useEffect(() => {
    if (mcpServers.length === 0) {
      if (selectedMcpName) setSelectedMcpName('');
      return;
    }
    if (mcpServers.some((server) => server.name === selectedMcpName)) return;
    setSelectedMcpName(mcpServers[0].name);
  }, [mcpServers, selectedMcpName]);

  const activeComposerToken = useMemo(() => {
    return extractComposerToken(quickPrompt, composerCaretPosition);
  }, [composerCaretPosition, quickPrompt]);

  const composerSuggestions = useMemo<ComposerSuggestion[]>(() => {
    if (!activeComposerToken) return [];

    if (activeComposerToken.trigger === '/') {
      const query = activeComposerToken.value.trim().toLowerCase();
      return COMPOSER_SLASH_OPTIONS.filter((option) => {
        if (!query) return true;
        return option.label.toLowerCase().includes(query);
      })
        .slice(0, COMPOSER_SUGGESTION_LIMIT)
        .map((option) => ({
          id: option.id,
          kind: 'slash',
          label: option.label,
          detail: option.detail,
          replacement: '',
          mode: option.mode
        }));
    }

    const normalizedQuery = activeComposerToken.value.trim().toLowerCase();
    const categoryHints: Array<{ category: ComposerMentionCategory; label: string; detail: string }> = [
      { category: 'file', label: '@file:', detail: 'Insert a file reference mention' },
      { category: 'agent', label: '@agent:', detail: 'Insert an agent mention' },
      { category: 'mcp', label: '@mcp:', detail: 'Insert an MCP resource mention' }
    ];
    const suggestions: ComposerSuggestion[] = [];

    if (!normalizedQuery || (!normalizedQuery.includes(':') && normalizedQuery.length <= 12)) {
      for (const hint of categoryHints) {
        if (normalizedQuery && !hint.category.startsWith(normalizedQuery) && !hint.label.startsWith(`@${normalizedQuery}`)) {
          continue;
        }
        suggestions.push({
          id: `mention-root-${hint.category}`,
          kind: 'mention',
          label: hint.label,
          detail: hint.detail,
          replacement: hint.label,
          mentionCategory: hint.category
        });
      }
    }

    const [rawCategory = '', rawQuery = ''] = normalizedQuery.split(':', 2);
    const search = rawQuery.trim();

    if (rawCategory === 'file') {
      for (const candidate of fileMentionCandidates) {
        if (search && !candidate.toLowerCase().includes(search)) continue;
        suggestions.push({
          id: `mention-file-${candidate}`,
          kind: 'mention',
          label: candidate,
          detail: 'file',
          replacement: `@file:${candidate}`,
          value: candidate,
          mentionCategory: 'file'
        });
        if (suggestions.length >= COMPOSER_SUGGESTION_LIMIT) break;
      }
    }

    if (rawCategory === 'agent') {
      for (const candidate of agentCandidates) {
        if (search && !candidate.toLowerCase().includes(search)) continue;
        suggestions.push({
          id: `mention-agent-${candidate}`,
          kind: 'mention',
          label: candidate,
          detail: 'agent',
          replacement: `@agent:${candidate}`,
          value: candidate,
          mentionCategory: 'agent'
        });
        if (suggestions.length >= COMPOSER_SUGGESTION_LIMIT) break;
      }
    }

    if (rawCategory === 'mcp') {
      for (const candidate of mcpResourceCandidates) {
        if (search && !candidate.toLowerCase().includes(search)) continue;
        suggestions.push({
          id: `mention-mcp-${candidate}`,
          kind: 'mention',
          label: candidate,
          detail: 'mcp',
          replacement: `@mcp:${candidate}`,
          value: candidate,
          mentionCategory: 'mcp'
        });
        if (suggestions.length >= COMPOSER_SUGGESTION_LIMIT) break;
      }
    }

    return suggestions.slice(0, COMPOSER_SUGGESTION_LIMIT);
  }, [activeComposerToken, agentCandidates, fileMentionCandidates, mcpResourceCandidates]);

  const selectedComposerSuggestion = useMemo(() => {
    if (composerSuggestions.length === 0) return null;
    return composerSuggestions[Math.min(composerSuggestionIndex, composerSuggestions.length - 1)] ?? null;
  }, [composerSuggestionIndex, composerSuggestions]);

  const composerModeDetails = useMemo(() => {
    return COMPOSER_MODE_OPTIONS.find((option) => option.mode === composerMode) ?? COMPOSER_MODE_OPTIONS[0];
  }, [composerMode]);

  const composerPlaceholder = useMemo(() => {
    if (!activeSessionId) return 'Select a session to use the composer.';
    if (composerMode === 'prompt-sync') return 'Write a prompt for the selected session...';
    if (composerMode === 'prompt-async') return 'Write an async prompt for background execution...';
    if (composerMode === 'command') return 'Optional command arguments/context...';
    return 'Enter shell command to run in session context...';
  }, [activeSessionId, composerMode]);

  const composerSubmitLabel = useMemo(() => {
    if (composerMode === 'command') return 'Run Command';
    if (composerMode === 'shell') return 'Run Shell';
    if (composerMode === 'prompt-async') return 'Send Async';
    return 'Send Prompt';
  }, [composerMode]);

  const composerCanSubmit = useMemo(() => {
    if (!activeSessionId || isOperationRunning) return false;

    if (composerMode === 'command') {
      return composerCommand.trim().length > 0;
    }

    if (composerMode === 'shell') {
      return quickPrompt.trim().length > 0;
    }

    return quickPrompt.trim().length > 0 || composerAttachments.length > 0;
  }, [activeSessionId, composerAttachments.length, composerCommand, composerMode, isOperationRunning, quickPrompt]);

  const runtimeControlsLocked = isRuntimeControlBusy || isOperationRunning;
  const configControlsLocked = isConfigBusy || runtimeControlsLocked;

  const localConfigDiff = useMemo(() => summarizeDraftDiff(configLocalBase, configLocalDraft), [configLocalBase, configLocalDraft]);
  const globalConfigDiff = useMemo(
    () => summarizeDraftDiff(configGlobalBase, configGlobalDraft),
    [configGlobalBase, configGlobalDraft]
  );

  useEffect(() => {
    if (composerMode !== 'shell') return;
    if (composerShellAgent.trim()) return;
    if (agentCandidates.length === 0) return;
    setComposerShellAgent(agentCandidates[0]);
  }, [agentCandidates, composerMode, composerShellAgent]);

  useEffect(() => {
    setComposerSuggestionIndex(0);
  }, [activeComposerToken?.trigger, activeComposerToken?.value]);

  const filteredDebugEvents = useMemo(() => {
    if (eventDebugFilter === 'all') return eventDebugEvents;
    return eventDebugEvents.filter((entry) => entry.source === eventDebugFilter);
  }, [eventDebugEvents, eventDebugFilter]);

  const selectedOperation = useMemo(() => {
    return SESSION_OPERATION_DEFINITIONS.find((item) => item.id === sessionOperationId) || null;
  }, [sessionOperationId]);

  useEffect(() => {
    if (selectedOperation) {
      setSessionOperationBody(selectedOperation.template);
    }
  }, [selectedOperation]);

  const openApiEndpoints = useMemo(() => monitor?.openapi?.endpoints ?? EMPTY_OPENAPI_ENDPOINTS, [monitor]);
  useEffect(() => {
    if (openApiEndpoints.length === 0) return;
    if (openApiEndpoints.some((endpoint) => endpoint.path === apiPath)) return;
    setApiPath(openApiEndpoints[0].path);
  }, [apiPath, openApiEndpoints]);

  const selectedEndpoint = useMemo(() => {
    return openApiEndpoints.find((endpoint) => endpoint.path === apiPath) || null;
  }, [apiPath, openApiEndpoints]);

  const selectedApiMethods = useMemo(() => {
    if (!selectedEndpoint || selectedEndpoint.methods.length === 0) return DEFAULT_API_METHODS;
    return selectedEndpoint.methods;
  }, [selectedEndpoint]);

  const selectedFileMode = useMemo(() => {
    return FILE_MODE_OPTIONS.find((option) => option.mode === fileMode) ?? FILE_MODE_OPTIONS[0];
  }, [fileMode]);

  const fileModeUsesQuery = fileMode === 'findText' || fileMode === 'findFile';
  const fileModeUsesPath = fileMode === 'list' || fileMode === 'content' || fileMode === 'status';

  const projectListSection = useMemo(() => {
    return systemSnapshot?.sections?.project ?? null;
  }, [systemSnapshot?.sections]);

  const projectCurrentSection = useMemo(() => {
    return systemSnapshot?.sections?.['project/current'] ?? null;
  }, [systemSnapshot?.sections]);

  const projectCandidates = useMemo(() => {
    return toUniqueStrings(
      [
        ...collectStringFields(projectListSection?.data, ['id', 'projectID', 'projectId', 'name', 'title', 'path']),
        ...collectStringFields(projectCurrentSection?.data, ['id', 'projectID', 'projectId', 'name', 'title', 'path'])
      ].filter((value) => value.length <= 220),
      120
    );
  }, [projectCurrentSection?.data, projectListSection?.data]);

  const ptySessions = useMemo(() => {
    return extractPtySessions(ptyListResponse?.result?.data);
  }, [ptyListResponse?.result?.data]);

  const selectedPtySession = useMemo(() => {
    if (!selectedPtyId) return null;
    return ptySessions.find((session) => session.id === selectedPtyId) ?? null;
  }, [ptySessions, selectedPtyId]);

  const ptyStreamApiUrl = monitor?.status.apiUrl ?? engine?.apiUrl ?? null;
  const ptyStreamHost = monitor?.status.host || engine?.host || '';
  const ptyStreamPort = monitor?.status.port ?? engine?.port ?? null;

  useEffect(() => {
    if (projectCandidates.length === 0) {
      if (selectedProjectCandidate) setSelectedProjectCandidate('');
      return;
    }
    if (projectCandidates.includes(selectedProjectCandidate)) return;
    setSelectedProjectCandidate(projectCandidates[0]);
  }, [projectCandidates, selectedProjectCandidate]);

  useEffect(() => {
    if (ptySessions.length === 0) {
      if (selectedPtyId) setSelectedPtyId('');
      return;
    }
    if (ptySessions.some((session) => session.id === selectedPtyId)) return;
    setSelectedPtyId(ptySessions[0].id);
  }, [ptySessions, selectedPtyId]);

  useEffect(() => {
    if (!selectedApiMethods.includes(apiMethod)) {
      setApiMethod(selectedApiMethods[0] || 'GET');
    }
  }, [apiMethod, selectedApiMethods]);

  const resolvedScheme: ResolvedScheme = useMemo(() => {
    if (colorScheme === 'system') return systemPrefersDark ? 'dark' : 'light';
    return colorScheme;
  }, [colorScheme, systemPrefersDark]);

  const activeTheme = useMemo(() => {
    return THEME_DEFINITIONS.find((theme) => theme.id === themeId) || THEME_DEFINITIONS[0];
  }, [themeId]);

  const themeStyle = useMemo(() => {
    const palette = resolvedScheme === 'dark' ? activeTheme.dark : activeTheme.light;
    return toThemeStyle(palette);
  }, [activeTheme, resolvedScheme]);

  const statusLabel = useMemo(() => {
    if (engineState === 'checking') return 'Checking local OpenCode engine...';
    if (engineState === 'offline') return 'Engine offline (auto-starts on control requests).';
    if (engineState === 'booting') return 'Dispatching operation to OpenCode...';
    if (engineState === 'error') return 'Unable to confirm OpenCode status.';
    return 'Engine connected and ready.';
  }, [engineState]);

  const cycleScheme = () => {
    setColorScheme((current) => {
      if (current === 'system') return 'light';
      if (current === 'light') return 'dark';
      return 'system';
    });
  };

  const schemeButtonLabel =
    colorScheme === 'system' ? 'System Scheme' : colorScheme === 'light' ? 'Light Scheme' : 'Dark Scheme';

  const handleRefresh = () => {
    void refreshMonitor();
    if (activeSessionId) {
      void refreshSessionDetail(activeSessionId);
      void refreshSessionTimeline(activeSessionId);
    }
  };

  const handleCreateSession = async () => {
    setIsOperationRunning(true);
    setOperationError(null);
    setEngineState('booting');

    try {
      const payload: Record<string, unknown> = {};
      if (newSessionTitle.trim()) payload.title = newSessionTitle.trim();
      if (newSessionParent.trim()) payload.parentID = newSessionParent.trim();

      const response = await callControl({
        path: '/session',
        method: 'POST',
        body: payload
      });
      setOperationResult(response);
      if (!response.ok) {
        throw new Error(response.text || 'OpenCode failed to create the session.');
      }

      const createdSession = asRecord(response.data);
      const createdSessionId = createdSession ? extractString(createdSession, ['id']) : null;
      if (createdSessionId) setActiveSessionId(createdSessionId);

      setNewSessionTitle('');
      setNewSessionParent('');
      await refreshMonitor({ silent: true });
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : 'Failed to create session.');
      setEngineState('error');
    } finally {
      setIsOperationRunning(false);
      void refreshMonitor({ silent: true });
    }
  };

  const handleComposerAttachmentSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(event.target.files ?? []);
    if (incoming.length === 0) return;

    setComposerAttachments((current) => {
      const next = [...current];
      const seen = new Set(next.map((entry) => entry.id));
      for (const file of incoming) {
        if (next.length >= COMPOSER_ATTACHMENT_LIMIT) break;
        const id = fileSignature(file);
        if (seen.has(id)) continue;
        next.push({ id, file });
        seen.add(id);
      }
      return next;
    });

    event.target.value = '';
  }, []);

  const handleRemoveComposerAttachment = useCallback((attachmentId: string) => {
    setComposerAttachments((current) => current.filter((entry) => entry.id !== attachmentId));
  }, []);

  const handleComposerInputChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setQuickPrompt(event.target.value);
    setComposerCaretPosition(event.target.selectionStart ?? event.target.value.length);
  }, []);

  const handleComposerSelectionChange = useCallback((event: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const nextPosition = event.currentTarget.selectionStart ?? 0;
    setComposerCaretPosition(nextPosition);
  }, []);

  const applyComposerSuggestion = useCallback(
    (suggestion: ComposerSuggestion) => {
      if (!activeComposerToken) return;

      const before = quickPrompt.slice(0, activeComposerToken.start);
      const after = quickPrompt.slice(activeComposerToken.end);
      const suffix = suggestion.kind === 'slash' ? '' : ' ';
      const replacement = `${suggestion.replacement}${suffix}`;
      const nextPrompt = `${before}${replacement}${after}`;
      const nextCaret = before.length + replacement.length;

      setQuickPrompt(nextPrompt);
      setComposerCaretPosition(nextCaret);
      setComposerSuggestionIndex(0);

      if (suggestion.mode) {
        setComposerMode(suggestion.mode);
      }
      if (suggestion.mentionCategory === 'agent' && suggestion.value) {
        setComposerShellAgent(suggestion.value);
      }

      requestAnimationFrame(() => {
        const textarea = composerTextareaRef.current;
        if (!textarea) return;
        textarea.focus();
        textarea.setSelectionRange(nextCaret, nextCaret);
      });
    },
    [activeComposerToken, quickPrompt]
  );

  const buildComposerAttachmentContext = useCallback(async (): Promise<string> => {
    if (composerAttachments.length === 0) return '';

    const blocks: string[] = ['Attached file context:'];
    for (const attachment of composerAttachments) {
      const file = attachment.file;
      const descriptor = `${file.name} (${file.type || 'application/octet-stream'}, ${formatBytes(file.size)})`;

      if (file.size > COMPOSER_ATTACHMENT_MAX_BYTES) {
        blocks.push(`- ${descriptor} [omitted: larger than ${formatBytes(COMPOSER_ATTACHMENT_MAX_BYTES)}]`);
        continue;
      }

      if (isTextAttachment(file)) {
        try {
          const fullText = await file.text();
          const snippet = fullText.slice(0, COMPOSER_TEXT_SNIPPET_LIMIT);
          blocks.push(`- ${descriptor}`);
          blocks.push('```text');
          blocks.push(snippet || '(empty file)');
          if (fullText.length > snippet.length) {
            blocks.push(`... truncated ${fullText.length - snippet.length} characters`);
          }
          blocks.push('```');
          continue;
        } catch (error) {
          blocks.push(`- ${descriptor} [read failed: ${error instanceof Error ? error.message : 'unknown error'}]`);
          continue;
        }
      }

      if (file.type.startsWith('image/')) {
        try {
          const dataUrl = await readFileAsDataUrl(file);
          const snippet = dataUrl.slice(0, COMPOSER_IMAGE_DATA_URL_LIMIT);
          blocks.push(`- ${descriptor}`);
          blocks.push(
            `image_data_url: ${snippet}${dataUrl.length > snippet.length ? '... [truncated to keep request compact]' : ''}`
          );
          continue;
        } catch (error) {
          blocks.push(`- ${descriptor} [image read failed: ${error instanceof Error ? error.message : 'unknown error'}]`);
          continue;
        }
      }

      blocks.push(`- ${descriptor} [binary attachment metadata only]`);
    }

    return blocks.join('\n');
  }, [composerAttachments]);

  const handleSendPrompt = useCallback(async () => {
    if (!activeSessionId) return;

    const trimmedPrompt = quickPrompt.trim();
    if (composerMode === 'command' && !composerCommand.trim()) return;
    if (composerMode === 'shell' && !trimmedPrompt) return;
    if (composerMode !== 'command' && composerMode !== 'shell' && !trimmedPrompt && composerAttachments.length === 0) return;

    if (composerMode === 'shell' && composerAttachments.length > 0) {
      setOperationError('Attachments are currently supported for prompt/command mode only.');
      return;
    }

    setIsOperationRunning(true);
    setOperationError(null);
    setEngineState('booting');

    try {
      const attachmentContext = await buildComposerAttachmentContext();
      let response: OpenCodeControlResponse;

      if (composerMode === 'prompt-sync' || composerMode === 'prompt-async') {
        const promptText = [trimmedPrompt, attachmentContext].filter(Boolean).join('\n\n').trim();
        const path =
          composerMode === 'prompt-async'
            ? `/session/${encodeURIComponent(activeSessionId)}/prompt_async`
            : `/session/${encodeURIComponent(activeSessionId)}/message`;

        response = await callControl({
          path,
          method: 'POST',
          body: {
            parts: [{ type: 'text', text: promptText }]
          }
        });
      } else if (composerMode === 'command') {
        const argumentText = [trimmedPrompt, attachmentContext].filter(Boolean).join('\n\n').trim();
        const body: Record<string, unknown> = { command: composerCommand.trim() };
        if (argumentText) body.arguments = argumentText;
        response = await callControl({
          path: `/session/${encodeURIComponent(activeSessionId)}/command`,
          method: 'POST',
          body
        });
      } else {
        const body: Record<string, unknown> = { command: trimmedPrompt };
        if (composerShellAgent.trim()) body.agent = composerShellAgent.trim();
        response = await callControl({
          path: `/session/${encodeURIComponent(activeSessionId)}/shell`,
          method: 'POST',
          body
        });
      }

      setOperationResult(response);
      if (!response.ok) {
        throw new Error(response.text || 'OpenCode composer action failed.');
      }

      setQuickPrompt('');
      setComposerCaretPosition(0);
      setComposerSuggestionIndex(0);
      setComposerAttachments([]);

      await Promise.all([
        refreshMonitor({ silent: true }),
        refreshSessionDetail(activeSessionId, { silent: true }),
        refreshSessionTimeline(activeSessionId, { silent: true })
      ]);
      setEngineState('ready');
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : 'Composer submission failed.');
      setEngineState('error');
    } finally {
      setIsOperationRunning(false);
    }
  }, [
    activeSessionId,
    buildComposerAttachmentContext,
    callControl,
    composerAttachments.length,
    composerCommand,
    composerMode,
    composerShellAgent,
    quickPrompt,
    refreshMonitor,
    refreshSessionDetail,
    refreshSessionTimeline,
    setEngineState
  ]);

  const handleComposerKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        void handleSendPrompt();
        return;
      }

      if (composerSuggestions.length === 0) return;

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setComposerSuggestionIndex((current) => (current + 1) % composerSuggestions.length);
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setComposerSuggestionIndex((current) => (current - 1 + composerSuggestions.length) % composerSuggestions.length);
        return;
      }

      if ((event.key === 'Enter' && !event.shiftKey) || event.key === 'Tab') {
        if (!selectedComposerSuggestion) return;
        event.preventDefault();
        applyComposerSuggestion(selectedComposerSuggestion);
        return;
      }

      if (event.key === 'Escape') {
        setComposerSuggestionIndex(0);
      }
    },
    [applyComposerSuggestion, composerSuggestions, handleSendPrompt, selectedComposerSuggestion]
  );

  const runRuntimeControl = useCallback(
    async (
      request: {
        path: string;
        method?: OpenCodeHttpMethod;
        body?: unknown;
      },
      options?: { refreshSession?: boolean }
    ): Promise<OpenCodeControlResponse | null> => {
      if (isOperationRunning) {
        setRuntimeControlError('Another session operation is currently running. Try again in a moment.');
        return null;
      }

      setIsRuntimeControlBusy(true);
      setRuntimeControlError(null);
      setEngineState('booting');

      try {
        const response = await callControl({
          path: request.path,
          method: request.method,
          body: request.body
        });
        setRuntimeControlResult(response);
        if (!response.ok) {
          throw new Error(response.text || `Request failed (${request.path}).`);
        }

        await refreshMonitor({ silent: true });
        if (options?.refreshSession && activeSessionId) {
          await Promise.all([
            refreshSessionDetail(activeSessionId, { silent: true }),
            refreshSessionTimeline(activeSessionId, { silent: true })
          ]);
        }
        setEngineState('ready');
        return response;
      } catch (error) {
        setRuntimeControlError(error instanceof Error ? error.message : 'Runtime request failed.');
        setEngineState('error');
        return null;
      } finally {
        setIsRuntimeControlBusy(false);
      }
    },
    [activeSessionId, callControl, isOperationRunning, refreshMonitor, refreshSessionDetail, refreshSessionTimeline, setEngineState]
  );

  const handleFetchProviderAuthMethods = useCallback(async () => {
    const response = await runRuntimeControl({ path: '/provider/auth', method: 'GET' });
    if (!response?.ok) return;

    const methods = toUniqueStrings(
      collectStringFields(response.data, ['id', 'name', 'type', 'method', 'label', 'providerID', 'providerId']),
      40
    );
    setProviderAuthMethods(methods);
  }, [runRuntimeControl]);

  const handleProviderOAuthAuthorize = useCallback(async () => {
    if (!selectedProviderId) {
      setRuntimeControlError('Select a provider first.');
      return;
    }

    await runRuntimeControl({
      path: `/provider/${encodeURIComponent(selectedProviderId)}/oauth/authorize`,
      method: 'POST',
      body: {}
    });
  }, [runRuntimeControl, selectedProviderId]);

  const handleProviderOAuthCallback = useCallback(async () => {
    if (!selectedProviderId) {
      setRuntimeControlError('Select a provider first.');
      return;
    }
    if (!providerOAuthCode.trim()) {
      setRuntimeControlError('Enter an OAuth callback code before sending callback.');
      return;
    }

    const body: Record<string, unknown> = {
      code: providerOAuthCode.trim()
    };
    if (providerOAuthState.trim()) body.state = providerOAuthState.trim();

    await runRuntimeControl({
      path: `/provider/${encodeURIComponent(selectedProviderId)}/oauth/callback`,
      method: 'POST',
      body
    });
  }, [providerOAuthCode, providerOAuthState, runRuntimeControl, selectedProviderId]);

  const handleProviderApiKeySave = useCallback(async () => {
    if (!selectedProviderId) {
      setRuntimeControlError('Select a provider first.');
      return;
    }
    if (!providerApiKey.trim()) {
      setRuntimeControlError('Enter an API key before saving.');
      return;
    }

    await runRuntimeControl({
      path: `/auth/${encodeURIComponent(selectedProviderId)}`,
      method: 'POST',
      body: {
        apiKey: providerApiKey.trim(),
        key: providerApiKey.trim()
      }
    });
  }, [providerApiKey, runRuntimeControl, selectedProviderId]);

  const handleApplySessionModel = useCallback(async () => {
    if (!activeSessionId) {
      setRuntimeControlError('Select a session before applying provider/model.');
      return;
    }
    if (!selectedProviderId || !selectedModelId) {
      setRuntimeControlError('Select provider and model first.');
      return;
    }

    const body: Record<string, unknown> = {
      providerID: selectedProviderId,
      modelID: selectedModelId
    };
    if (selectedModelVariant.trim()) {
      body.variantID = selectedModelVariant.trim();
      body.modelVariantID = selectedModelVariant.trim();
    }

    await runRuntimeControl(
      {
        path: `/session/${encodeURIComponent(activeSessionId)}/init`,
        method: 'POST',
        body
      },
      { refreshSession: true }
    );
  }, [activeSessionId, runRuntimeControl, selectedModelId, selectedModelVariant, selectedProviderId]);

  const handleUseSelectedAgent = useCallback(() => {
    const nextAgent = selectedAgentId.trim();
    if (!nextAgent) return;
    setComposerMode('shell');
    setComposerShellAgent(nextAgent);
  }, [selectedAgentId]);

  const handleCycleAgentLocal = useCallback(() => {
    if (agentCandidates.length === 0) return;
    const currentIndex = Math.max(0, agentCandidates.indexOf(selectedAgentId));
    const nextIndex = (currentIndex + 1) % agentCandidates.length;
    const nextAgent = agentCandidates[nextIndex];
    setSelectedAgentId(nextAgent);
    setComposerMode('shell');
    setComposerShellAgent(nextAgent);
  }, [agentCandidates, selectedAgentId]);

  const handleCycleAgentRemote = useCallback(async () => {
    await runRuntimeControl({
      path: '/tui/execute-command',
      method: 'POST',
      body: { command: 'agent_cycle' }
    });
  }, [runRuntimeControl]);

  const handleMcpConnect = useCallback(async () => {
    if (!selectedMcpName) {
      setRuntimeControlError('Select an MCP server first.');
      return;
    }
    await runRuntimeControl({
      path: `/mcp/${encodeURIComponent(selectedMcpName)}/connect`,
      method: 'POST',
      body: {}
    });
  }, [runRuntimeControl, selectedMcpName]);

  const handleMcpDisconnect = useCallback(async () => {
    if (!selectedMcpName) {
      setRuntimeControlError('Select an MCP server first.');
      return;
    }
    await runRuntimeControl({
      path: `/mcp/${encodeURIComponent(selectedMcpName)}/disconnect`,
      method: 'POST',
      body: {}
    });
  }, [runRuntimeControl, selectedMcpName]);

  const handleMcpAuthenticate = useCallback(async () => {
    if (!selectedMcpName) {
      setRuntimeControlError('Select an MCP server first.');
      return;
    }

    let body: unknown = {};
    const payload = mcpAuthPayload.trim();
    if (payload) {
      try {
        body = JSON.parse(payload) as unknown;
      } catch {
        setRuntimeControlError('MCP auth payload must be valid JSON.');
        return;
      }
    }

    await runRuntimeControl({
      path: `/mcp/${encodeURIComponent(selectedMcpName)}/auth/authenticate`,
      method: 'POST',
      body
    });
  }, [mcpAuthPayload, runRuntimeControl, selectedMcpName]);

  const handleRunSessionOperation = async () => {
    if (!selectedOperation || !activeSessionId) return;
    setIsOperationRunning(true);
    setOperationError(null);
    setEngineState('booting');

    try {
      let parsedBody: unknown = undefined;
      const bodyText = sessionOperationBody.trim();
      if (bodyText) {
        parsedBody = JSON.parse(bodyText) as unknown;
      } else if (selectedOperation.requiresBody) {
        parsedBody = {};
      }

      const response = await callControl({
        path: resolveSessionPath(selectedOperation.path, activeSessionId),
        method: selectedOperation.method,
        body: parsedBody
      });
      setOperationResult(response);
      if (!response.ok) {
        throw new Error(response.text || `${selectedOperation.label} failed.`);
      }

      if (selectedOperation.id === 'session-delete') {
        setActiveSessionId(null);
        setSessionDetail(null);
        setSessionTimeline(null);
      }

      await refreshMonitor({ silent: true });
      if (activeSessionId && selectedOperation.id !== 'session-delete') {
        await Promise.all([
          refreshSessionDetail(activeSessionId, { silent: true }),
          refreshSessionTimeline(activeSessionId, { silent: true })
        ]);
      }
      setEngineState('ready');
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : 'Session operation failed.');
      setEngineState('error');
    } finally {
      setIsOperationRunning(false);
    }
  };

  const runSessionQuickAction = useCallback(
    async (input: {
      label: string;
      method: OpenCodeHttpMethod;
      path: string;
      body?: unknown;
      clearActiveSession?: boolean;
      onSuccess?: (response: OpenCodeControlResponse) => void | Promise<void>;
    }) => {
      if (!activeSessionId) return;
      setIsOperationRunning(true);
      setOperationError(null);
      setEngineState('booting');

      try {
        const response = await callControl({
          path: input.path,
          method: input.method,
          body: input.body
        });
        setOperationResult(response);
        if (!response.ok) {
          throw new Error(response.text || `${input.label} failed.`);
        }

        if (input.clearActiveSession) {
          setActiveSessionId(null);
          setSessionDetail(null);
          setSessionTimeline(null);
        }

        await refreshMonitor({ silent: true });
        if (!input.clearActiveSession) {
          await Promise.all([
            refreshSessionDetail(activeSessionId, { silent: true }),
            refreshSessionTimeline(activeSessionId, { silent: true })
          ]);
        }
        if (input.onSuccess) {
          await input.onSuccess(response);
        }
        setEngineState('ready');
      } catch (error) {
        setOperationError(error instanceof Error ? error.message : `${input.label} failed.`);
        setEngineState('error');
      } finally {
        setIsOperationRunning(false);
      }
    },
    [
      activeSessionId,
      callControl,
      refreshMonitor,
      refreshSessionDetail,
      refreshSessionTimeline,
      setActiveSessionId,
      setEngineState,
      setSessionDetail,
      setSessionTimeline
    ]
  );

  const handleRenameSession = useCallback(async () => {
    if (!activeSessionId) return;
    const currentTitle = sessionDetail?.session.id === activeSessionId ? sessionDetail.session.title : 'Session';
    const requestedTitle = window.prompt('Rename session', currentTitle || 'Session');
    if (requestedTitle === null) return;
    const title = requestedTitle.trim();
    if (!title) {
      setOperationError('Session title cannot be empty.');
      return;
    }

    await runSessionQuickAction({
      label: 'Rename session',
      method: 'PATCH',
      path: `/session/${encodeURIComponent(activeSessionId)}`,
      body: { title }
    });
  }, [activeSessionId, runSessionQuickAction, sessionDetail?.session.id, sessionDetail?.session.title]);

  const handleShareSession = useCallback(async () => {
    if (!activeSessionId) return;
    await runSessionQuickAction({
      label: 'Share session',
      method: 'POST',
      path: `/session/${encodeURIComponent(activeSessionId)}/share`,
      body: {},
      onSuccess: async (response) => {
        const candidates = collectStringFields(response.data, ['url', 'shareURL', 'shareUrl', 'link']);
        const urlCandidate =
          candidates.find((value) => value.startsWith('https://') || value.startsWith('http://')) || candidates[0] || null;
        if (!urlCandidate) return;
        setSessionShareUrl(urlCandidate);
        try {
          await navigator.clipboard.writeText(urlCandidate);
        } catch {
          // Keep the generated URL visible even if clipboard access is denied.
        }
      }
    });
  }, [activeSessionId, runSessionQuickAction]);

  const handleUnshareSession = useCallback(async () => {
    if (!activeSessionId) return;
    await runSessionQuickAction({
      label: 'Unshare session',
      method: 'DELETE',
      path: `/session/${encodeURIComponent(activeSessionId)}/share`,
      onSuccess: () => {
        setSessionShareUrl(null);
      }
    });
  }, [activeSessionId, runSessionQuickAction]);

  const handleSummarizeSession = useCallback(async () => {
    if (!activeSessionId) return;
    const body: Record<string, unknown> = {
      auto: false
    };
    if (selectedProviderId.trim()) body.providerID = selectedProviderId.trim();
    if (selectedModelId.trim()) body.modelID = selectedModelId.trim();
    if (selectedModelVariant.trim()) {
      body.variantID = selectedModelVariant.trim();
      body.modelVariantID = selectedModelVariant.trim();
    }

    await runSessionQuickAction({
      label: 'Summarize session',
      method: 'POST',
      path: `/session/${encodeURIComponent(activeSessionId)}/summarize`,
      body
    });
  }, [activeSessionId, runSessionQuickAction, selectedModelId, selectedModelVariant, selectedProviderId]);

  const handleDeleteSession = useCallback(async () => {
    if (!activeSessionId) return;
    const confirmed = window.confirm('Delete this session? This cannot be undone.');
    if (!confirmed) return;

    await runSessionQuickAction({
      label: 'Delete session',
      method: 'DELETE',
      path: `/session/${encodeURIComponent(activeSessionId)}`,
      clearActiveSession: true,
      onSuccess: () => {
        setSessionShareUrl(null);
      }
    });
  }, [activeSessionId, runSessionQuickAction]);

  const handleCopyShareLink = useCallback(async () => {
    if (!sessionShareUrl) return;
    try {
      await navigator.clipboard.writeText(sessionShareUrl);
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : 'Unable to copy share link.');
    }
  }, [sessionShareUrl]);

  const handleUndoSession = async () => {
    if (!activeSessionId) return;
    setIsOperationRunning(true);
    setOperationError(null);
    setEngineState('booting');

    try {
      const response = await callControl({
        path: `/session/${encodeURIComponent(activeSessionId)}/revert`,
        method: 'POST',
        body: {}
      });
      setOperationResult(response);
      if (!response.ok) {
        throw new Error(response.text || 'Undo failed.');
      }

      await Promise.all([
        refreshMonitor({ silent: true }),
        refreshSessionDetail(activeSessionId, { silent: true }),
        refreshSessionTimeline(activeSessionId, { silent: true })
      ]);
      setEngineState('ready');
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : 'Undo failed.');
      setEngineState('error');
    } finally {
      setIsOperationRunning(false);
    }
  };

  const handleRedoSession = async () => {
    if (!activeSessionId) return;
    setIsOperationRunning(true);
    setOperationError(null);
    setEngineState('booting');

    try {
      const response = await callControl({
        path: `/session/${encodeURIComponent(activeSessionId)}/unrevert`,
        method: 'POST'
      });
      setOperationResult(response);
      if (!response.ok) {
        throw new Error(response.text || 'Redo failed.');
      }

      await Promise.all([
        refreshMonitor({ silent: true }),
        refreshSessionDetail(activeSessionId, { silent: true }),
        refreshSessionTimeline(activeSessionId, { silent: true })
      ]);
      setEngineState('ready');
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : 'Redo failed.');
      setEngineState('error');
    } finally {
      setIsOperationRunning(false);
    }
  };

  const handleMessageFork = async (messageId: string) => {
    if (!activeSessionId || !messageId) return;
    setIsOperationRunning(true);
    setOperationError(null);
    setEngineState('booting');

    try {
      const response = await callControl({
        path: `/session/${encodeURIComponent(activeSessionId)}/fork`,
        method: 'POST',
        body: { messageID: messageId }
      });
      setOperationResult(response);
      if (!response.ok) {
        throw new Error(response.text || `Fork failed for message ${messageId}.`);
      }
      await refreshMonitor({ silent: true });
      await refreshSessionTimeline(activeSessionId, { silent: true });
      setEngineState('ready');
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : 'Fork failed.');
      setEngineState('error');
    } finally {
      setIsOperationRunning(false);
    }
  };

  const handleMessageRevert = async (messageId: string) => {
    if (!activeSessionId || !messageId) return;
    setIsOperationRunning(true);
    setOperationError(null);
    setEngineState('booting');

    try {
      const response = await callControl({
        path: `/session/${encodeURIComponent(activeSessionId)}/revert`,
        method: 'POST',
        body: { messageID: messageId }
      });
      setOperationResult(response);
      if (!response.ok) {
        throw new Error(response.text || `Revert failed for message ${messageId}.`);
      }
      await Promise.all([
        refreshMonitor({ silent: true }),
        refreshSessionDetail(activeSessionId, { silent: true }),
        refreshSessionTimeline(activeSessionId, { silent: true })
      ]);
      setEngineState('ready');
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : 'Revert failed.');
      setEngineState('error');
    } finally {
      setIsOperationRunning(false);
    }
  };

  const handleCopyMessage = async (message: OpenCodeSessionMessage) => {
    try {
      await navigator.clipboard.writeText(message.text || prettyJson(message.parts));
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : 'Unable to copy message.');
    }
  };

  const handleCopyTranscript = async () => {
    if (!activeSessionId) return;
    setIsTranscriptRunning(true);
    setTranscriptError(null);

    try {
      const transcript = await fetchOpenCodeSessionTranscript<OpenCodeSessionTranscript>(activeSessionId, {
        toolDetails: true,
        assistantMetadata: true
      });
      await navigator.clipboard.writeText(transcript.markdown);
    } catch (error) {
      setTranscriptError(error instanceof Error ? error.message : 'Unable to copy transcript.');
    } finally {
      setIsTranscriptRunning(false);
    }
  };

  const handleExportTranscript = async () => {
    if (!activeSessionId) return;
    setIsTranscriptRunning(true);
    setTranscriptError(null);

    try {
      const transcript = await fetchOpenCodeSessionTranscript<OpenCodeSessionTranscript>(activeSessionId, {
        toolDetails: true,
        assistantMetadata: true
      });
      const slug = (sessionDetail?.session.title || activeSessionId)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      const filename = `${slug || 'session'}-${new Date().toISOString().slice(0, 10)}.md`;
      const blob = new Blob([transcript.markdown], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setTranscriptError(error instanceof Error ? error.message : 'Unable to export transcript.');
    } finally {
      setIsTranscriptRunning(false);
    }
  };

  const handlePermissionReply = async (requestId: string, reply: 'once' | 'always' | 'reject') => {
    setIsOperationRunning(true);
    setOperationError(null);
    setEngineState('booting');
    try {
      const message = permissionMessages[requestId]?.trim();
      const body: Record<string, unknown> = { reply };
      if (message) body.message = message;

      const response = await callControl({
        path: `/permission/${encodeURIComponent(requestId)}/reply`,
        method: 'POST',
        body
      });
      setOperationResult(response);
      if (!response.ok) {
        throw new Error(response.text || `Permission response failed for ${requestId}.`);
      }

      await refreshMonitor({ silent: true });
      if (activeSessionId) {
        await Promise.all([
          refreshSessionDetail(activeSessionId, { silent: true }),
          refreshSessionTimeline(activeSessionId, { silent: true })
        ]);
      }
      setEngineState('ready');
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : 'Permission response failed.');
      setEngineState('error');
    } finally {
      setIsOperationRunning(false);
    }
  };

  const handleQuestionReply = async (requestId: string) => {
    setIsOperationRunning(true);
    setOperationError(null);
    setEngineState('booting');
    try {
      const text = questionReplies[requestId]?.trim() || '{"answers": []}';
      const body = JSON.parse(text) as unknown;
      const response = await callControl({
        path: `/question/${encodeURIComponent(requestId)}/reply`,
        method: 'POST',
        body
      });
      setOperationResult(response);
      if (!response.ok) {
        throw new Error(response.text || `Question reply failed for ${requestId}.`);
      }
      await refreshMonitor({ silent: true });
      if (activeSessionId) {
        await Promise.all([
          refreshSessionDetail(activeSessionId, { silent: true }),
          refreshSessionTimeline(activeSessionId, { silent: true })
        ]);
      }
      setEngineState('ready');
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : 'Question reply failed.');
      setEngineState('error');
    } finally {
      setIsOperationRunning(false);
    }
  };

  const handleQuestionReject = async (requestId: string) => {
    setIsOperationRunning(true);
    setOperationError(null);
    setEngineState('booting');
    try {
      const response = await callControl({
        path: `/question/${encodeURIComponent(requestId)}/reject`,
        method: 'POST'
      });
      setOperationResult(response);
      if (!response.ok) {
        throw new Error(response.text || `Question rejection failed for ${requestId}.`);
      }
      await refreshMonitor({ silent: true });
      if (activeSessionId) {
        await Promise.all([
          refreshSessionDetail(activeSessionId, { silent: true }),
          refreshSessionTimeline(activeSessionId, { silent: true })
        ]);
      }
      setEngineState('ready');
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : 'Question rejection failed.');
      setEngineState('error');
    } finally {
      setIsOperationRunning(false);
    }
  };

  const handleTuiShortcut = async (path: string) => {
    setIsOperationRunning(true);
    setOperationError(null);
    setEngineState('booting');
    try {
      const response = await callControl({
        path,
        method: 'POST'
      });
      setOperationResult(response);
      if (!response.ok) {
        throw new Error(response.text || `TUI shortcut failed (${path}).`);
      }
      await refreshMonitor({ silent: true });
      setEngineState('ready');
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : 'TUI shortcut failed.');
      setEngineState('error');
    } finally {
      setIsOperationRunning(false);
    }
  };

  const handleTuiCommand = async () => {
    setIsOperationRunning(true);
    setOperationError(null);
    setEngineState('booting');
    try {
      const response = await callControl({
        path: '/tui/execute-command',
        method: 'POST',
        body: {
          command: tuiCommand
        }
      });
      setOperationResult(response);
      if (!response.ok) {
        throw new Error(response.text || `TUI command failed (${tuiCommand}).`);
      }
      await refreshMonitor({ silent: true });
      setEngineState('ready');
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : 'TUI command failed.');
      setEngineState('error');
    } finally {
      setIsOperationRunning(false);
    }
  };

  const handleRunApiRequest = async () => {
    setIsApiRunning(true);
    setApiError(null);
    setEngineState('booting');

    try {
      let parsedBody: unknown = undefined;
      const bodyText = apiBody.trim();
      if (bodyText && apiMethod !== 'GET') {
        parsedBody = JSON.parse(bodyText) as unknown;
      } else if ((apiMethod === 'POST' || apiMethod === 'PATCH' || apiMethod === 'PUT') && !bodyText) {
        parsedBody = {};
      }

      const response = await callControl({
        path: apiPath,
        method: apiMethod,
        body: parsedBody
      });

      setApiResponse(response);
      if (!response.ok) {
        setApiError(response.text || `Request failed (${response.status}).`);
        setEngineState('error');
      } else {
        setEngineState('ready');
      }

      await refreshMonitor({ silent: true });
      if (activeSessionId) {
        await Promise.all([
          refreshSessionDetail(activeSessionId, { silent: true }),
          refreshSessionTimeline(activeSessionId, { silent: true })
        ]);
      }
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'API request failed.');
      setEngineState('error');
    } finally {
      setIsApiRunning(false);
    }
  };

  const handleRunFileRequest = async () => {
    setIsFileRunning(true);
    setFileError(null);
    setEngineState('booting');

    try {
      const params = new URLSearchParams();
      params.set('mode', fileMode);
      params.set('autostart', '1');

      const trimmedRoot = fileRoot.trim();
      const trimmedPath = filePathTarget.trim();
      const trimmedQuery = fileQuery.trim();

      if (trimmedRoot) {
        params.set('root', trimmedRoot);
      }

      if (fileModeUsesQuery && trimmedQuery) {
        params.set('q', trimmedQuery);
        params.set('query', trimmedQuery);
      }

      if (fileModeUsesPath) {
        const resolvedPath = trimmedPath || trimmedRoot;
        if (resolvedPath) {
          params.set('path', resolvedPath);
        }
      } else if (fileModeUsesQuery && trimmedRoot) {
        params.set('path', trimmedRoot);
      }

      appendRawQueryParams(params, fileExtraParams);

      const parsed = await fetchOpenCodeFiles<OpenCodeFilesResponse>(params);
      setFileResponse(parsed);
      if (!parsed.result.ok) {
        setFileError(parsed.result.text || `Request failed (${parsed.result.status}).`);
        setEngineState('error');
      } else {
        setEngineState('ready');
      }

      await refreshMonitor({ silent: true });
    } catch (error) {
      setFileError(error instanceof Error ? error.message : 'Unable to run files request.');
      setEngineState('error');
    } finally {
      setIsFileRunning(false);
    }
  };

  const refreshProjectSnapshot = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setIsSystemSnapshotLoading(true);
    }
    setSystemSnapshotError(null);

    try {
      const payload = await fetchOpenCodeSystemSnapshot<OpenCodeSystemSnapshotResponse>({
        include: ['project', 'project/current'],
        autostart: false
      });
      setSystemSnapshot(payload);
    } catch (error) {
      setSystemSnapshotError(error instanceof Error ? error.message : 'Unable to load project snapshot.');
    } finally {
      if (!options?.silent) {
        setIsSystemSnapshotLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void refreshProjectSnapshot({ silent: true });
  }, [refreshProjectSnapshot]);

  const handlePrefillProjectUpdate = () => {
    if (!selectedProjectCandidate.trim()) return;
    setProjectUpdateBody(
      `{
  "id": "${selectedProjectCandidate.replaceAll('"', '\\"')}"
}`
    );
  };

  const handleUpdateCurrentProject = useCallback(async () => {
    let body: unknown = {};
    const trimmed = projectUpdateBody.trim();
    if (trimmed) {
      try {
        body = JSON.parse(trimmed) as unknown;
      } catch {
        setSystemSnapshotError('Project update body must be valid JSON.');
        return;
      }
    }

    const result = await runRuntimeControl({
      path: '/project/current',
      method: 'POST',
      body
    });
    if (result?.ok) {
      await refreshProjectSnapshot({ silent: true });
    }
  }, [projectUpdateBody, refreshProjectSnapshot, runRuntimeControl]);

  const runWorktreeControl = useCallback(
    async (input: { path: string; method: OpenCodeHttpMethod; body?: unknown }): Promise<OpenCodeControlResponse | null> => {
      if (runtimeControlsLocked) {
        setWorktreeError('Another operation is in flight. Try again shortly.');
        return null;
      }

      setIsWorktreeBusy(true);
      setWorktreeError(null);
      setEngineState('booting');

      try {
        const response = await callControl({
          path: input.path,
          method: input.method,
          body: input.body
        });

        if (!response.ok) {
          throw new Error(response.text || `Worktree request failed (${response.status}).`);
        }

        setEngineState('ready');
        await refreshMonitor({ silent: true });
        return response;
      } catch (error) {
        setWorktreeError(error instanceof Error ? error.message : 'Worktree operation failed.');
        setEngineState('error');
        return null;
      } finally {
        setIsWorktreeBusy(false);
      }
    },
    [callControl, refreshMonitor, runtimeControlsLocked, setEngineState]
  );

  const refreshWorktreeList = useCallback(async () => {
    const response = await runWorktreeControl({
      path: '/experimental/worktree',
      method: 'GET'
    });
    if (response) {
      setWorktreeListResult(response);
    }
  }, [runWorktreeControl]);

  useEffect(() => {
    void refreshWorktreeList();
  }, [refreshWorktreeList]);

  const handleCreateWorktree = useCallback(async () => {
    let body: unknown = {};
    const trimmed = worktreeRequestBody.trim();
    if (trimmed) {
      try {
        body = JSON.parse(trimmed) as unknown;
      } catch {
        setWorktreeError('Create worktree payload must be valid JSON.');
        return;
      }
    }

    const response = await runWorktreeControl({
      path: '/experimental/worktree',
      method: 'POST',
      body
    });
    if (response) {
      setWorktreeActionResult(response);
      await refreshWorktreeList();
    }
  }, [refreshWorktreeList, runWorktreeControl, worktreeRequestBody]);

  const handleRemoveWorktree = useCallback(async () => {
    let body: unknown = {};
    const trimmed = worktreeRequestBody.trim();
    if (trimmed) {
      try {
        body = JSON.parse(trimmed) as unknown;
      } catch {
        setWorktreeError('Remove worktree payload must be valid JSON.');
        return;
      }
    }

    const response = await runWorktreeControl({
      path: '/experimental/worktree',
      method: 'DELETE',
      body
    });
    if (response) {
      setWorktreeActionResult(response);
      await refreshWorktreeList();
    }
  }, [refreshWorktreeList, runWorktreeControl, worktreeRequestBody]);

  const handleResetWorktree = useCallback(async () => {
    let body: unknown = {};
    const trimmed = worktreeResetBody.trim();
    if (trimmed) {
      try {
        body = JSON.parse(trimmed) as unknown;
      } catch {
        setWorktreeError('Reset worktree payload must be valid JSON.');
        return;
      }
    }

    const response = await runWorktreeControl({
      path: '/experimental/worktree/reset',
      method: 'POST',
      body
    });
    if (response) {
      setWorktreeActionResult(response);
      await refreshWorktreeList();
    }
  }, [refreshWorktreeList, runWorktreeControl, worktreeResetBody]);

  const refreshPtyList = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!options?.silent) {
        setIsPtyBusy(true);
      }
      setPtyError(null);

      try {
        const payload = await fetchOpenCodePtyList({ autostart: true });
        setPtyListResponse(payload);
      } catch (error) {
        setPtyError(error instanceof Error ? error.message : 'Failed to load PTY sessions.');
      } finally {
        if (!options?.silent) {
          setIsPtyBusy(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    void refreshPtyList({ silent: true });
  }, [refreshPtyList]);

  const clearPtyReconnectTimer = useCallback(() => {
    if (!ptyReconnectTimerRef.current) return;
    clearTimeout(ptyReconnectTimerRef.current);
    ptyReconnectTimerRef.current = null;
  }, []);

  const closePtySocket = useCallback(
    (manual = true) => {
      clearPtyReconnectTimer();
      const socket = ptySocketRef.current;
      ptySocketRef.current = null;
      if (!socket) return;
      if (manual) {
        ptyManualCloseSocketRef.current = socket;
      }
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close();
      }
    },
    [clearPtyReconnectTimer]
  );

  const appendPtyOutput = useCallback((chunk: string) => {
    if (!chunk) return;
    setPtyStreamOutput((current) => {
      const next = `${current}${chunk}`;
      if (next.length <= PTY_OUTPUT_CHAR_LIMIT) return next;
      return next.slice(next.length - PTY_OUTPUT_CHAR_LIMIT);
    });
  }, []);

  const openPtySocket = useCallback(
    (ptyId: string) => {
      if (!ptyId.trim()) {
        setPtyStreamState('idle');
        setPtyStreamError(null);
        return;
      }

      const wsUrl = resolvePtySocketUrl({
        ptyId,
        cursor: ptyCursorRef.current,
        apiUrl: ptyStreamApiUrl,
        host: ptyStreamHost,
        port: ptyStreamPort
      });
      if (!wsUrl) {
        setPtyStreamState('error');
        setPtyStreamError('Unable to resolve PTY websocket URL from engine host/port.');
        return;
      }

      closePtySocket(true);
      setPtyStreamState(ptyReconnectAttemptRef.current > 0 ? 'reconnecting' : 'connecting');
      if (ptyReconnectAttemptRef.current === 0) {
        setPtyStreamError(null);
      }

      let socket: WebSocket;
      try {
        socket = new WebSocket(wsUrl);
      } catch (error) {
        setPtyStreamState('error');
        setPtyStreamError(error instanceof Error ? error.message : 'Failed to create PTY websocket.');
        return;
      }

      socket.binaryType = 'arraybuffer';
      ptySocketRef.current = socket;
      ptyActiveSessionRef.current = ptyId;

      socket.onopen = () => {
        if (ptySocketRef.current !== socket) return;
        setPtyStreamState('connected');
        setPtyStreamError(null);
        ptyReconnectAttemptRef.current = 0;
        setPtyReconnectAttempt(0);
      };

      socket.onmessage = (event) => {
        void (async () => {
          if (typeof event.data === 'string') {
            appendPtyOutput(event.data);
            return;
          }

          let payload: ArrayBuffer | null = null;
          if (event.data instanceof ArrayBuffer) {
            payload = event.data;
          } else if (event.data instanceof Blob) {
            payload = await event.data.arrayBuffer();
          }
          if (!payload) return;

          const decoded = decodePtyFrame(payload);
          if (decoded.text) {
            appendPtyOutput(decoded.text);
          }
          if (decoded.cursor !== null) {
            ptyCursorRef.current = decoded.cursor;
            setPtyStreamCursor(decoded.cursor);
          }
        })();
      };

      socket.onerror = () => {
        if (ptySocketRef.current !== socket) return;
        setPtyStreamError('PTY stream websocket reported an error.');
      };

      socket.onclose = () => {
        if (ptySocketRef.current === socket) {
          ptySocketRef.current = null;
        }
        const wasManualClose = ptyManualCloseSocketRef.current === socket;
        if (wasManualClose) {
          ptyManualCloseSocketRef.current = null;
        }

        if (wasManualClose) {
          if (!ptyAutoConnectRef.current || selectedPtyIdRef.current !== ptyId) {
            setPtyStreamState('idle');
          }
          return;
        }

        if (!ptyAutoConnectRef.current || selectedPtyIdRef.current !== ptyId) {
          setPtyStreamState('idle');
          return;
        }

        if (!ptyAutoReconnectRef.current) {
          setPtyStreamState('error');
          setPtyStreamError('PTY stream disconnected.');
          return;
        }

        const nextAttempt = ptyReconnectAttemptRef.current + 1;
        ptyReconnectAttemptRef.current = nextAttempt;
        setPtyReconnectAttempt(nextAttempt);

        const delayMs = Math.min(PTY_RECONNECT_MAX_MS, PTY_RECONNECT_BASE_MS * 2 ** Math.max(0, nextAttempt - 1));
        setPtyStreamState('reconnecting');
        setPtyStreamError(`PTY stream disconnected. Reconnecting in ${Math.ceil(delayMs / 1000)}s.`);

        clearPtyReconnectTimer();
        ptyReconnectTimerRef.current = setTimeout(() => {
          if (!ptyAutoConnectRef.current || !ptyAutoReconnectRef.current || selectedPtyIdRef.current !== ptyId) {
            return;
          }
          setPtyConnectTick((current) => current + 1);
        }, delayMs);
      };
    },
    [appendPtyOutput, clearPtyReconnectTimer, closePtySocket, ptyStreamApiUrl, ptyStreamHost, ptyStreamPort]
  );

  useEffect(() => {
    if (!ptyAutoConnect) {
      closePtySocket(true);
      setPtyStreamState('idle');
      return;
    }
    if (!selectedPtyId) {
      closePtySocket(true);
      ptyActiveSessionRef.current = '';
      ptyCursorRef.current = 0;
      ptyReconnectAttemptRef.current = 0;
      setPtyReconnectAttempt(0);
      setPtyStreamCursor(null);
      setPtyStreamOutput('');
      setPtyStreamState('idle');
      setPtyStreamError(null);
      return;
    }

    if (!ptyStreamApiUrl?.trim() && (!ptyStreamHost.trim() || typeof ptyStreamPort !== 'number')) {
      setPtyStreamState('error');
      setPtyStreamError('OpenCode websocket endpoint unavailable. Refresh status/monitor and try again.');
      return;
    }

    const changedSession = ptyActiveSessionRef.current !== selectedPtyId;
    if (changedSession) {
      closePtySocket(true);
      ptyActiveSessionRef.current = selectedPtyId;
      ptyCursorRef.current = 0;
      ptyReconnectAttemptRef.current = 0;
      setPtyReconnectAttempt(0);
      setPtyStreamCursor(null);
      setPtyStreamOutput('');
      setPtyConnectTick((current) => current + 1);
      return;
    }

    const socket = ptySocketRef.current;
    const connected = !!socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING);
    if (!connected) {
      setPtyConnectTick((current) => current + 1);
    }
  }, [closePtySocket, ptyAutoConnect, ptyStreamApiUrl, ptyStreamHost, ptyStreamPort, selectedPtyId]);

  useEffect(() => {
    if (ptyConnectTick <= 0) return;
    if (!ptyAutoConnect) return;
    if (!selectedPtyId) return;
    const socket = ptySocketRef.current;
    const connectedToSelection =
      ptyActiveSessionRef.current === selectedPtyId &&
      !!socket &&
      (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING);
    if (connectedToSelection) return;
    openPtySocket(selectedPtyId);
  }, [openPtySocket, ptyAutoConnect, ptyConnectTick, selectedPtyId]);

  useEffect(() => {
    return () => {
      closePtySocket(true);
    };
  }, [closePtySocket]);

  const handleConnectPtyStream = useCallback(() => {
    if (!selectedPtyId.trim()) {
      setPtyStreamError('Select a PTY session before connecting.');
      return;
    }
    setPtyAutoConnect(true);
    setPtyStreamError(null);
    setPtyConnectTick((current) => current + 1);
  }, [selectedPtyId]);

  const handleDisconnectPtyStream = useCallback(() => {
    setPtyAutoConnect(false);
    closePtySocket(true);
    ptyReconnectAttemptRef.current = 0;
    setPtyReconnectAttempt(0);
    setPtyStreamState('idle');
    setPtyStreamError(null);
  }, [closePtySocket]);

  const handleClearPtyOutput = useCallback(() => {
    setPtyStreamOutput('');
  }, []);

  const handleSendPtyInput = useCallback(
    (appendNewline: boolean) => {
      const socket = ptySocketRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        setPtyStreamError('PTY stream is not connected.');
        return;
      }

      const payload = appendNewline ? `${ptyStreamInput}\n` : ptyStreamInput;
      if (!payload) return;

      socket.send(payload);
      setPtyStreamError(null);
      setPtyStreamInput('');
    },
    [ptyStreamInput]
  );

  const handleResizePty = useCallback(async () => {
    if (!selectedPtyId.trim()) {
      setPtyError('Select a PTY session before resizing.');
      return;
    }
    if (runtimeControlsLocked) {
      setPtyError('Another operation is in flight. Try again shortly.');
      return;
    }

    const cols = Number.parseInt(ptyResizeCols.trim(), 10);
    const rows = Number.parseInt(ptyResizeRows.trim(), 10);
    if (!Number.isFinite(cols) || !Number.isFinite(rows) || cols <= 0 || rows <= 0) {
      setPtyError('Resize requires positive integer values for cols and rows.');
      return;
    }

    setIsPtyBusy(true);
    setPtyError(null);
    setEngineState('booting');
    try {
      const payload = await updateOpenCodePty(
        selectedPtyId,
        {
          size: {
            cols,
            rows
          }
        },
        { autostart: true }
      );
      setPtyActionResponse(payload);
      if (!payload.result.ok) {
        throw new Error(payload.result.text || `Resize PTY failed (${payload.result.status}).`);
      }
      setEngineState('ready');
      await refreshPtyList({ silent: true });
      await refreshMonitor({ silent: true });
    } catch (error) {
      setPtyError(error instanceof Error ? error.message : 'Resize PTY failed.');
      setEngineState('error');
    } finally {
      setIsPtyBusy(false);
    }
  }, [ptyResizeCols, ptyResizeRows, refreshMonitor, refreshPtyList, runtimeControlsLocked, selectedPtyId, setEngineState]);

  const handleCreatePty = useCallback(async () => {
    if (runtimeControlsLocked) {
      setPtyError('Another operation is in flight. Try again shortly.');
      return;
    }

    let body: unknown = {};
    const trimmed = ptyCreateBody.trim();
    if (trimmed) {
      try {
        body = JSON.parse(trimmed) as unknown;
      } catch {
        setPtyError('Create PTY payload must be valid JSON.');
        return;
      }
    }

    setIsPtyBusy(true);
    setPtyError(null);
    setEngineState('booting');
    try {
      const payload = await createOpenCodePty(body, { autostart: true });
      setPtyActionResponse(payload);
      if (!payload.result.ok) {
        throw new Error(payload.result.text || `Create PTY failed (${payload.result.status}).`);
      }

      setEngineState('ready');
      await refreshPtyList({ silent: true });
      await refreshMonitor({ silent: true });

      const created = asRecord(payload.result.data);
      const createdId = created ? extractString(created, ['id', 'ptyID', 'ptyId']) : null;
      if (createdId) {
        setSelectedPtyId(createdId);
      }
    } catch (error) {
      setPtyError(error instanceof Error ? error.message : 'Create PTY failed.');
      setEngineState('error');
    } finally {
      setIsPtyBusy(false);
    }
  }, [ptyCreateBody, refreshMonitor, refreshPtyList, runtimeControlsLocked, setEngineState]);

  const handleUpdatePty = useCallback(async () => {
    if (!selectedPtyId.trim()) {
      setPtyError('Select a PTY session before updating.');
      return;
    }
    if (runtimeControlsLocked) {
      setPtyError('Another operation is in flight. Try again shortly.');
      return;
    }

    let body: unknown = {};
    const trimmed = ptyUpdateBody.trim();
    if (trimmed) {
      try {
        body = JSON.parse(trimmed) as unknown;
      } catch {
        setPtyError('Update PTY payload must be valid JSON.');
        return;
      }
    }

    setIsPtyBusy(true);
    setPtyError(null);
    setEngineState('booting');
    try {
      const payload = await updateOpenCodePty(selectedPtyId, body, { autostart: true });
      setPtyActionResponse(payload);
      if (!payload.result.ok) {
        throw new Error(payload.result.text || `Update PTY failed (${payload.result.status}).`);
      }
      setEngineState('ready');
      await refreshPtyList({ silent: true });
      await refreshMonitor({ silent: true });
    } catch (error) {
      setPtyError(error instanceof Error ? error.message : 'Update PTY failed.');
      setEngineState('error');
    } finally {
      setIsPtyBusy(false);
    }
  }, [ptyUpdateBody, refreshMonitor, refreshPtyList, runtimeControlsLocked, selectedPtyId, setEngineState]);

  const handleDeletePty = useCallback(async () => {
    if (!selectedPtyId.trim()) {
      setPtyError('Select a PTY session before deleting.');
      return;
    }
    if (runtimeControlsLocked) {
      setPtyError('Another operation is in flight. Try again shortly.');
      return;
    }

    const targetPtyId = selectedPtyId;
    if (targetPtyId === selectedPtyIdRef.current) {
      closePtySocket(true);
      setPtyStreamState('idle');
      setPtyStreamError(null);
    }
    setIsPtyBusy(true);
    setPtyError(null);
    setEngineState('booting');
    try {
      const payload = await deleteOpenCodePty(targetPtyId, { autostart: true });
      setPtyActionResponse(payload);
      if (!payload.result.ok) {
        throw new Error(payload.result.text || `Delete PTY failed (${payload.result.status}).`);
      }
      setEngineState('ready');
      await refreshPtyList({ silent: true });
      await refreshMonitor({ silent: true });
    } catch (error) {
      setPtyError(error instanceof Error ? error.message : 'Delete PTY failed.');
      setEngineState('error');
    } finally {
      setIsPtyBusy(false);
    }
  }, [closePtySocket, refreshMonitor, refreshPtyList, runtimeControlsLocked, selectedPtyId, setEngineState]);

  const refreshConfigEditor = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setIsConfigBusy(true);
    }
    setConfigError(null);

    try {
      const snapshot = await fetchOpenCodeSystemSnapshot<OpenCodeSystemSnapshotResponse>({
        include: ['config', 'global/config'],
        autostart: false
      });
      const localData = snapshot.sections?.config?.data ?? {};
      const globalData = snapshot.sections?.['global/config']?.data ?? {};
      const localText = prettyJson(localData);
      const globalText = prettyJson(globalData);
      setConfigLocalBase(localText);
      setConfigGlobalBase(globalText);
      setConfigLocalDraft(localText);
      setConfigGlobalDraft(globalText);
      setConfirmApplyLocalConfig(false);
      setConfirmApplyGlobalConfig(false);
    } catch (error) {
      setConfigError(error instanceof Error ? error.message : 'Unable to read config snapshot.');
    } finally {
      if (!options?.silent) {
        setIsConfigBusy(false);
      }
    }
  }, []);

  useEffect(() => {
    void refreshConfigEditor({ silent: true });
  }, [refreshConfigEditor]);

  const applyConfigDraft = useCallback(
    async (scope: 'local' | 'global') => {
      const draft = scope === 'local' ? configLocalDraft : configGlobalDraft;
      const confirmed = scope === 'local' ? confirmApplyLocalConfig : confirmApplyGlobalConfig;
      if (!confirmed) {
        setConfigError(`Confirm ${scope} config apply before submitting.`);
        return;
      }

      let parsedBody: unknown;
      try {
        parsedBody = JSON.parse(draft);
      } catch {
        setConfigError(`${scope} config draft must be valid JSON.`);
        return;
      }

      setIsConfigBusy(true);
      setConfigError(null);
      setEngineState('booting');

      try {
        const response = await callControl({
          path: scope === 'local' ? '/config' : '/global/config',
          method: configApplyMethod,
          body: parsedBody
        });
        setConfigActionResult(response);
        if (!response.ok) {
          throw new Error(response.text || `${scope} config update failed (${response.status}).`);
        }
        setEngineState('ready');
        await refreshMonitor({ silent: true });
        await refreshConfigEditor({ silent: true });
      } catch (error) {
        setConfigError(error instanceof Error ? error.message : `${scope} config update failed.`);
        setEngineState('error');
      } finally {
        setIsConfigBusy(false);
      }
    },
    [
      callControl,
      configApplyMethod,
      configGlobalDraft,
      configLocalDraft,
      confirmApplyGlobalConfig,
      confirmApplyLocalConfig,
      refreshConfigEditor,
      refreshMonitor,
      setEngineState
    ]
  );

  const commandPaletteActions: CommandPaletteAction[] = [
    {
      id: 'palette-refresh',
      label: 'Refresh monitor + session',
      hint: 'Reload monitor, session detail, and timeline',
      keywords: 'refresh monitor session timeline',
      run: handleRefresh
    },
    {
      id: 'palette-focus-composer',
      label: 'Focus composer',
      hint: 'Jump cursor to the advanced composer prompt box',
      keywords: 'composer focus prompt',
      run: () => {
        composerTextareaRef.current?.focus();
      }
    },
    {
      id: 'palette-submit-composer',
      label: 'Submit composer prompt',
      hint: 'Dispatch the current composer payload',
      keywords: 'composer send submit prompt',
      disabled: !composerCanSubmit,
      run: () => void handleSendPrompt()
    },
    {
      id: 'palette-clear-composer',
      label: 'Clear composer prompt',
      hint: 'Reset prompt text and attachment context',
      keywords: 'composer clear prompt reset',
      disabled: !quickPrompt.trim() && composerAttachments.length === 0,
      run: () => {
        setQuickPrompt('');
        setComposerAttachments([]);
        setComposerSuggestionIndex(0);
      }
    },
    {
      id: 'palette-create-session',
      label: 'Create session',
      hint: 'Create a new OpenCode session',
      keywords: 'session create new',
      disabled: isOperationRunning,
      run: () => void handleCreateSession()
    },
    {
      id: 'palette-undo-session',
      label: 'Undo session',
      hint: 'Run /session/:id/revert (undo)',
      keywords: 'session undo revert',
      disabled: !activeSessionId || isOperationRunning,
      run: () => void handleUndoSession()
    },
    {
      id: 'palette-redo-session',
      label: 'Redo session',
      hint: 'Run /session/:id/unrevert (redo)',
      keywords: 'session redo unrevert',
      disabled: !activeSessionId || isOperationRunning,
      run: () => void handleRedoSession()
    },
    ...(isSettingsView
      ? [
          {
            id: 'palette-pty-refresh',
            label: 'Refresh PTY list',
            hint: 'Reload PTY sessions in Terminal Dock',
            keywords: 'pty terminal refresh list',
            run: () => void refreshPtyList()
          },
          {
            id: 'palette-pty-connect',
            label: 'Connect PTY stream',
            hint: 'Open websocket stream for selected PTY',
            keywords: 'pty terminal connect stream',
            disabled: !selectedPtyId || ptyStreamState === 'connecting' || ptyStreamState === 'reconnecting',
            run: handleConnectPtyStream
          },
          {
            id: 'palette-pty-disconnect',
            label: 'Disconnect PTY stream',
            hint: 'Stop websocket stream for selected PTY',
            keywords: 'pty terminal disconnect stream',
            disabled: ptyStreamState === 'idle',
            run: handleDisconnectPtyStream
          },
          ...TUI_SHORTCUTS.map((shortcut) => ({
            id: `palette-tui-${shortcut.path}`,
            label: `TUI: ${shortcut.label}`,
            hint: shortcut.path,
            keywords: `tui ${shortcut.label.toLowerCase()} ${shortcut.path.toLowerCase()}`,
            disabled: isOperationRunning,
            run: () => void handleTuiShortcut(shortcut.path)
          })),
          {
            id: 'palette-tui-execute',
            label: `TUI execute: ${tuiCommand}`,
            hint: 'Execute current /tui/execute-command payload',
            keywords: `tui execute command ${tuiCommand.toLowerCase()}`,
            disabled: isOperationRunning,
            run: () => void handleTuiCommand()
          }
        ]
      : [])
  ];

  const filteredCommandPaletteActions = (() => {
    const query = commandPaletteQuery.trim().toLowerCase();
    if (!query) return commandPaletteActions;
    return commandPaletteActions.filter((action) => {
      const haystack = `${action.label} ${action.hint} ${action.keywords}`.toLowerCase();
      return haystack.includes(query);
    });
  })();

  const normalizedCommandPaletteIndex =
    filteredCommandPaletteActions.length === 0
      ? 0
      : Math.min(commandPaletteIndex, Math.max(0, filteredCommandPaletteActions.length - 1));

  const selectedCommandPaletteAction =
    filteredCommandPaletteActions.length > 0 ? filteredCommandPaletteActions[normalizedCommandPaletteIndex] : null;

  const runCommandPaletteAction = useCallback(
    (action: CommandPaletteAction | null) => {
      if (!action || action.disabled) return;
      closeCommandPalette();
      void Promise.resolve(action.run()).catch((error) => {
        setOperationError(error instanceof Error ? error.message : 'Command palette action failed.');
      });
    },
    [closeCommandPalette]
  );

  const handleCommandPaletteKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        if (filteredCommandPaletteActions.length === 0) return;
        setCommandPaletteIndex((current) => (current + 1) % filteredCommandPaletteActions.length);
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        if (filteredCommandPaletteActions.length === 0) return;
        setCommandPaletteIndex(
          (current) => (current - 1 + filteredCommandPaletteActions.length) % filteredCommandPaletteActions.length
        );
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        runCommandPaletteAction(selectedCommandPaletteAction);
      }
    },
    [filteredCommandPaletteActions.length, runCommandPaletteAction, selectedCommandPaletteAction]
  );

  useEffect(() => {
    if (filteredCommandPaletteActions.length === 0) {
      if (commandPaletteIndex !== 0) setCommandPaletteIndex(0);
      return;
    }
    if (commandPaletteIndex >= filteredCommandPaletteActions.length) {
      setCommandPaletteIndex(0);
    }
  }, [commandPaletteIndex, filteredCommandPaletteActions.length]);

  return (
    <div className="oc-app min-h-screen" style={themeStyle}>
      <div className="mx-auto w-full max-w-[1540px] px-4 py-5 md:px-6 md:py-7">
        <Card className="oc-panel relative overflow-hidden">
          <div className="oc-header-glow" />
          <CardHeader className="relative z-10 space-y-4 p-5 md:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <p className="oc-kicker flex items-center gap-2">
                  <Palette className="h-3.5 w-3.5" />
                  OpenCode Control Plane
                </p>
                <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-strong)] md:text-4xl">
                  {isSettingsView ? 'OpenCode Settings' : 'Full OpenCode Monitor'}
                </h1>
                <p className="max-w-3xl text-[13px] text-[var(--text-weak)] md:text-[14px]">
                  {isSettingsView
                    ? 'Operator/admin controls for providers, MCP, projects, worktrees, config, PTY, and raw API execution.'
                    : 'Focused research dashboard for sessions, prompts, timeline inspection, and event monitoring.'}
                </p>
              </div>

              {isSettingsView && (
                <div className="grid w-full gap-3 sm:grid-cols-2 lg:w-auto">
                  <div className="space-y-1.5">
                    <label className="oc-kicker block">Theme</label>
                    <select
                      value={themeId}
                      onChange={(event) => setThemeId(event.target.value)}
                      className="h-9 w-full rounded-lg border border-[var(--border-base)] bg-[var(--surface-raised)] px-3 text-[13px] text-[var(--text-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-selected)]/60"
                    >
                      {THEME_DEFINITIONS.map((theme) => (
                        <option key={theme.id} value={theme.id}>
                          {theme.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="oc-kicker block">Color Scheme</label>
                    <Button
                      variant="secondary"
                      className="h-9 w-full justify-start text-[12px]"
                      onClick={cycleScheme}
                      title={`Switch scheme (current: ${colorScheme})`}
                    >
                      {colorScheme === 'system' && <MonitorCog className="h-4 w-4" />}
                      {colorScheme === 'light' && <Sun className="h-4 w-4" />}
                      {colorScheme === 'dark' && <Moon className="h-4 w-4" />}
                      {schemeButtonLabel}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <NextLink
                href="/"
                className={cn(
                  'inline-flex h-8 items-center justify-center rounded-md border px-3 text-[12px] font-medium transition-colors',
                  !isSettingsView
                    ? 'border-transparent bg-[var(--button-primary)] text-[var(--button-primary-foreground)]'
                    : 'border-[var(--border-weak)] bg-[var(--surface-raised)] text-[var(--text-base)] hover:bg-[var(--surface-hover)]'
                )}
              >
                dashboard
              </NextLink>
              <NextLink
                href="/settings"
                className={cn(
                  'inline-flex h-8 items-center justify-center rounded-md border px-3 text-[12px] font-medium transition-colors',
                  isSettingsView
                    ? 'border-transparent bg-[var(--button-primary)] text-[var(--button-primary-foreground)]'
                    : 'border-[var(--border-weak)] bg-[var(--surface-raised)] text-[var(--text-base)] hover:bg-[var(--surface-hover)]'
                )}
              >
                settings
              </NextLink>
              <Badge
                className={cn(
                  engineState === 'ready' && 'border-[var(--success-border)] bg-[var(--success-soft)] text-[var(--success)]',
                  engineState === 'booting' &&
                    'border-[var(--warning-border)] bg-[var(--warning-soft)] text-[var(--warning)]',
                  (engineState === 'offline' || engineState === 'checking') &&
                    'border-[var(--border-weak)] bg-[var(--surface-base)] text-[var(--text-weak)]',
                  engineState === 'error' && 'border-[var(--critical-border)] bg-[var(--critical-soft)] text-[var(--critical)]'
                )}
              >
                <span
                  className={cn(
                    'mr-1.5 inline-block h-1.5 w-1.5 rounded-full',
                    engineState === 'ready' && 'bg-[var(--success)]',
                    engineState === 'booting' && 'animate-pulse bg-[var(--warning)]',
                    (engineState === 'offline' || engineState === 'checking') && 'bg-[var(--text-weaker)]',
                    engineState === 'error' && 'bg-[var(--critical)]'
                  )}
                />
                {statusLabel}
              </Badge>
              <Badge>Theme: {activeTheme.name}</Badge>
              <Badge>Resolved: {resolvedScheme}</Badge>
              {engine?.startedAt && <Badge>Started {formatRelativeTime(engine.startedAt)}</Badge>}
              <Badge>{sessions.length} sessions</Badge>
              <Badge>{permissions.length} permissions</Badge>
              <Badge>{questions.length} questions</Badge>
              <Badge
                className={cn(
                  eventConnectionState === 'connected' &&
                    'border-[var(--success-border)] bg-[var(--success-soft)] text-[var(--success)]',
                  eventConnectionState === 'connecting' &&
                    'border-[var(--warning-border)] bg-[var(--warning-soft)] text-[var(--warning)]',
                  eventConnectionState === 'error' &&
                    'border-[var(--critical-border)] bg-[var(--critical-soft)] text-[var(--critical)]'
                )}
              >
                events: {eventConnectionState}
              </Badge>
              <Badge>{eventDebugEvents.length} event log</Badge>
              <Button size="sm" variant="secondary" onClick={openCommandPalette}>
                <Command className="h-3.5 w-3.5" />
                command palette
              </Button>
              <Badge>Ctrl/Cmd + K</Badge>
            </div>
          </CardHeader>
        </Card>

        <div className="mt-4 grid gap-4 xl:grid-cols-[390px_minmax(0,1fr)]">
          <aside className="space-y-4">
            {isSettingsView && (
              <Card className="oc-panel">
              <CardHeader className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="flex items-center gap-2">
                    <Server className="h-4 w-4 text-[var(--accent)]" />
                    Engine Snapshot
                  </CardTitle>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={isMonitorLoading || isSessionDetailLoading}
                  >
                    <RefreshCw className={cn('h-3.5 w-3.5', (isMonitorLoading || isSessionDetailLoading) && 'animate-spin')} />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-[12px]">
                <div className="rounded-lg border border-[var(--border-weak)] bg-[var(--surface-base)] p-3">
                  <p className="oc-kicker">Endpoint</p>
                  <p className="oc-mono mt-1 break-all text-[12px] text-[var(--text-strong)]">
                    {engine ? `${engine.host}:${engine.port}` : '127.0.0.1:4096'}
                  </p>
                </div>

                <div className="rounded-lg border border-[var(--border-weak)] bg-[var(--surface-base)] p-3">
                  <p className="oc-kicker">Startup Command</p>
                  <p className="oc-mono mt-1 break-all text-[12px] text-[var(--text-base)]">
                    {engine?.command || 'opencode serve --hostname 127.0.0.1 --port 4096'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="rounded-lg border border-[var(--border-weak)] bg-[var(--surface-base)] p-2.5">
                    <p className="oc-kicker">OpenAPI</p>
                    <p className="oc-mono mt-1 text-[var(--text-strong)]">
                      {monitor?.openapi?.endpointCount ?? 0} endpoints
                    </p>
                  </div>
                  <div className="rounded-lg border border-[var(--border-weak)] bg-[var(--surface-base)] p-2.5">
                    <p className="oc-kicker">Source</p>
                    <p className="oc-mono mt-1 text-[var(--text-strong)]">{monitor?.openapi?.source ?? 'unknown'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="rounded-lg border border-[var(--border-weak)] bg-[var(--surface-base)] p-2.5">
                    <p className="oc-kicker">LSP</p>
                    <p className="oc-mono mt-1 text-[var(--text-strong)]">
                      {lspSummary.entries} entries
                      {lspSummary.active !== null ? ` · ${lspSummary.active} active` : ''}
                    </p>
                    {lspSummary.sampleStatuses.length > 0 && (
                      <p className="mt-1 text-[var(--text-weaker)]">{lspSummary.sampleStatuses.slice(0, 2).join(', ')}</p>
                    )}
                  </div>
                  <div className="rounded-lg border border-[var(--border-weak)] bg-[var(--surface-base)] p-2.5">
                    <p className="oc-kicker">Formatter</p>
                    <p className="oc-mono mt-1 text-[var(--text-strong)]">
                      {formatterSummary.entries} entries
                      {formatterSummary.active !== null ? ` · ${formatterSummary.active} active` : ''}
                    </p>
                    {formatterSummary.sampleStatuses.length > 0 && (
                      <p className="mt-1 text-[var(--text-weaker)]">
                        {formatterSummary.sampleStatuses.slice(0, 2).join(', ')}
                      </p>
                    )}
                  </div>
                  <div className="rounded-lg border border-[var(--border-weak)] bg-[var(--surface-base)] p-2.5">
                    <p className="oc-kicker">Config</p>
                    <p className="oc-mono mt-1 text-[var(--text-strong)]">
                      {configSummary.hasLocal ? 'local' : 'no-local'} · {configSummary.hasGlobal ? 'global' : 'no-global'}
                    </p>
                    <p className="mt-1 text-[var(--text-weaker)]">{configSummary.pluginCount} plugin/config labels</p>
                  </div>
                  <div className="rounded-lg border border-[var(--border-weak)] bg-[var(--surface-base)] p-2.5">
                    <p className="oc-kicker">Compatibility</p>
                    <p className="oc-mono mt-1 text-[var(--text-strong)]">
                      {compatibilitySummary.status}
                      {compatibilitySummary.mismatchCount > 0 ? ` · ${compatibilitySummary.mismatchCount} mismatches` : ''}
                    </p>
                    <p className="text-[var(--text-weaker)]">
                      req {compatibilitySummary.requiredIssues} · rec {compatibilitySummary.recommendedIssues}
                    </p>
                  </div>
                </div>

                {monitor?.compatibility && (
                  <details className="rounded-lg border border-[var(--border-weak)] bg-[var(--surface-base)] p-3">
                    <summary className="cursor-pointer text-[12px] font-medium text-[var(--text-strong)]">
                      API compatibility report
                    </summary>
                    <pre className="oc-scroll oc-mono mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap text-[11px] text-[var(--text-weak)]">
                      {prettyJson(monitor.compatibility)}
                    </pre>
                  </details>
                )}

                {(monitorError || engine?.lastError) && (
                  <div className="rounded-lg border border-[var(--critical-border)] bg-[var(--critical-soft)] p-3 text-[var(--critical)]">
                    <p className="mb-1 flex items-center gap-1.5 font-medium">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Monitor Error
                    </p>
                    <p className="text-[12px]">{monitorError || engine?.lastError}</p>
                  </div>
                )}

                {monitor?.errors && monitor.errors.length > 0 && (
                  <details className="rounded-lg border border-[var(--warning-border)] bg-[var(--warning-soft)] p-3 text-[var(--warning)]">
                    <summary className="cursor-pointer text-[12px] font-medium">Optional Endpoint Failures</summary>
                    <ul className="mt-2 space-y-1 text-[11px]">
                      {monitor.errors.map((error) => (
                        <li key={error}>{error}</li>
                      ))}
                    </ul>
                  </details>
                )}

                {engine?.recentLogs && engine.recentLogs.length > 0 && (
                  <details className="rounded-lg border border-[var(--border-weak)] bg-[var(--surface-base)] p-3">
                    <summary className="cursor-pointer text-[12px] font-medium text-[var(--text-strong)]">Recent Logs</summary>
                    <pre className="oc-scroll oc-mono mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap text-[11px] text-[var(--text-weak)]">
                      {engine.recentLogs.join('\n')}
                    </pre>
                  </details>
                )}
              </CardContent>
              </Card>
            )}

                <Card className="oc-panel">
              <CardHeader className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="flex items-center gap-2">
                    <FileCode2 className="h-4 w-4 text-[var(--accent)]" />
                    File Explorer
                  </CardTitle>
                  <Badge>{selectedFileMode?.description || 'file tools'}</Badge>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <select
                    value={fileMode}
                    onChange={(event) => setFileMode(event.target.value as OpenCodeFilesMode)}
                    className="h-9 rounded-lg border border-[var(--border-base)] bg-[var(--surface-raised)] px-3 text-[12px] text-[var(--text-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-selected)]/60"
                  >
                    {FILE_MODE_OPTIONS.map((option) => (
                      <option key={option.mode} value={option.mode}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <Input
                    value={fileRoot}
                    onChange={(event) => setFileRoot(event.target.value)}
                    placeholder="Search/list root path (optional)"
                    className="oc-mono text-[11px]"
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {fileModeUsesQuery && (
                  <Input
                    value={fileQuery}
                    onChange={(event) => setFileQuery(event.target.value)}
                    placeholder={fileMode === 'findText' ? 'Text to search for' : 'Filename/glob to search for'}
                    className="oc-mono text-[11px]"
                  />
                )}

                {fileModeUsesPath && (
                  <Input
                    value={filePathTarget}
                    onChange={(event) => setFilePathTarget(event.target.value)}
                    placeholder={fileMode === 'content' ? 'Exact file path' : 'Target directory/file path'}
                    className="oc-mono text-[11px]"
                  />
                )}

                <Input
                  value={fileExtraParams}
                  onChange={(event) => setFileExtraParams(event.target.value)}
                  placeholder='Extra query params (example: "limit=100&ignore=.git")'
                  className="oc-mono text-[11px]"
                />

                <Button variant="default" onClick={handleRunFileRequest} disabled={isFileRunning}>
                  {isFileRunning ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  Run File Request
                </Button>

                {fileError && (
                  <div className="rounded-lg border border-[var(--critical-border)] bg-[var(--critical-soft)] p-3 text-[12px] text-[var(--critical)]">
                    {fileError}
                  </div>
                )}

                {fileResponse && (
                  <div className="rounded-lg border border-[var(--border-weak)] bg-[var(--surface-base)] p-3">
                    <p className="oc-mono text-[11px] text-[var(--text-weak)]">
                      {fileResponse.mode} · {fileResponse.request.path} · {fileResponse.result.status}
                    </p>
                    <pre className="oc-scroll oc-mono mt-2 max-h-72 overflow-y-auto whitespace-pre-wrap text-[11px] text-[var(--text-weak)]">
                      {prettyJson(fileResponse.result.data ?? fileResponse.result.text)}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>

            {isSettingsView && (
              <Card className="oc-panel">
              <CardHeader className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-[var(--accent)]" />
                    Event Stream
                  </CardTitle>
                  <Badge
                    className={cn(
                      eventConnectionState === 'connected' &&
                        'border-[var(--success-border)] bg-[var(--success-soft)] text-[var(--success)]',
                      eventConnectionState === 'connecting' &&
                        'border-[var(--warning-border)] bg-[var(--warning-soft)] text-[var(--warning)]',
                      eventConnectionState === 'error' &&
                        'border-[var(--critical-border)] bg-[var(--critical-soft)] text-[var(--critical)]'
                    )}
                  >
                    {eventConnectionState}
                  </Badge>
                </div>
                <CardDescription>SSE-driven monitor updates with polling fallback.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <select
                    value={eventDebugFilter}
                    onChange={(event) =>
                      setEventDebugFilter(event.target.value as 'all' | 'instance' | 'global' | 'bridge')
                    }
                    className="h-9 rounded-lg border border-[var(--border-base)] bg-[var(--surface-raised)] px-3 text-[12px] text-[var(--text-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-selected)]/60"
                  >
                    <option value="all">all sources</option>
                    <option value="instance">instance</option>
                    <option value="global">global</option>
                    <option value="bridge">bridge</option>
                  </select>
                  <Button size="sm" variant="secondary" onClick={() => setEventDebugEvents([])}>
                    clear
                  </Button>
                </div>

                {eventConnectionError && (
                  <div className="rounded-lg border border-[var(--warning-border)] bg-[var(--warning-soft)] p-2.5 text-[11px] text-[var(--warning)]">
                    {eventConnectionError}
                  </div>
                )}

                <div className="oc-scroll max-h-56 space-y-2 overflow-y-auto">
                  {filteredDebugEvents.length === 0 && (
                    <div className="rounded-lg border border-[var(--border-weak)] bg-[var(--surface-base)] px-3 py-4 text-center text-[12px] text-[var(--text-weak)]">
                      No events captured yet.
                    </div>
                  )}

                  {filteredDebugEvents.map((entry) => (
                    <article key={entry.id} className="rounded-lg border border-[var(--border-weak)] bg-[var(--surface-base)] p-2.5">
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                        <Badge>{entry.source}</Badge>
                        <Badge>{entry.streamEvent}</Badge>
                        <Badge>{entry.eventType}</Badge>
                        {entry.seq !== null && <Badge>#{entry.seq}</Badge>}
                      </div>
                      <p className="mt-1 text-[11px] text-[var(--text-weaker)]">{formatRelativeTime(entry.timestamp)}</p>
                      {entry.sessionId && (
                        <p className="oc-mono mt-1 text-[11px] text-[var(--text-weak)]">session {entry.sessionId}</p>
                      )}
                    </article>
                  ))}
                </div>
              </CardContent>
              </Card>
            )}

            <Card className="oc-panel">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SendHorizontal className="h-4 w-4 text-[var(--accent)]" />
                  Session Controls
                </CardTitle>
                <CardDescription>Create sessions and dispatch prompts like the TUI.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Input
                    value={newSessionTitle}
                    onChange={(event) => setNewSessionTitle(event.target.value)}
                    placeholder="New session title (optional)"
                  />
                  <Input
                    value={newSessionParent}
                    onChange={(event) => setNewSessionParent(event.target.value)}
                    placeholder="Parent session id (optional)"
                  />
                  <Button
                    variant="default"
                    className="w-full"
                    onClick={handleCreateSession}
                    disabled={isOperationRunning}
                  >
                    {isOperationRunning ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Create Session
                  </Button>
                </div>

                <Separator />

                <div className="space-y-2">
                  <p className="oc-kicker">Advanced Composer</p>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {COMPOSER_MODE_OPTIONS.map((option) => (
                      <Button
                        key={option.mode}
                        size="sm"
                        variant={composerMode === option.mode ? 'default' : 'secondary'}
                        className="justify-start"
                        onClick={() => setComposerMode(option.mode)}
                      >
                        {option.mode === 'command' && <Command className="h-3.5 w-3.5" />}
                        {option.mode === 'shell' && <TerminalSquare className="h-3.5 w-3.5" />}
                        {(option.mode === 'prompt-sync' || option.mode === 'prompt-async') && <SendHorizontal className="h-3.5 w-3.5" />}
                        {option.label}
                      </Button>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    <Badge>mode: {composerModeDetails.label}</Badge>
                    <Badge>{composerModeDetails.detail}</Badge>
                    {composerMode === 'command' && <Badge>command: {composerCommand || 'required'}</Badge>}
                    {composerMode === 'shell' && <Badge>agent: {composerShellAgent || 'auto'}</Badge>}
                    {composerAttachments.length > 0 && <Badge>{composerAttachments.length} attachments</Badge>}
                  </div>

                  {composerMode === 'command' && (
                    <Input
                      value={composerCommand}
                      onChange={(event) => setComposerCommand(event.target.value)}
                      placeholder="Command name (example: review)"
                    />
                  )}

                  {composerMode === 'shell' && (
                    <div className="space-y-1.5">
                      {agentCandidates.length > 0 ? (
                        <select
                          value={composerShellAgent}
                          onChange={(event) => setComposerShellAgent(event.target.value)}
                          className="h-9 w-full rounded-lg border border-[var(--border-base)] bg-[var(--surface-raised)] px-3 text-[12px] text-[var(--text-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-selected)]/60"
                        >
                          <option value="">auto agent</option>
                          {agentCandidates.map((agent) => (
                            <option key={agent} value={agent}>
                              {agent}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Input
                          value={composerShellAgent}
                          onChange={(event) => setComposerShellAgent(event.target.value)}
                          placeholder="Optional agent id"
                        />
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Textarea
                      ref={composerTextareaRef}
                      value={quickPrompt}
                      onChange={handleComposerInputChange}
                      onSelect={handleComposerSelectionChange}
                      onClick={handleComposerSelectionChange}
                      onKeyDown={handleComposerKeyDown}
                      placeholder={composerPlaceholder}
                      className="h-32 resize-none"
                    />

                    {composerSuggestions.length > 0 && (
                      <div className="rounded-lg border border-[var(--border-weak)] bg-[var(--surface-base)] p-1">
                        {composerSuggestions.map((suggestion, index) => (
                          <button
                            key={suggestion.id}
                            type="button"
                            onMouseDown={(event) => {
                              event.preventDefault();
                              applyComposerSuggestion(suggestion);
                            }}
                            onMouseEnter={() => setComposerSuggestionIndex(index)}
                            className={cn(
                              'flex w-full items-start justify-between rounded-md px-2 py-1.5 text-left transition-colors',
                              index === composerSuggestionIndex
                                ? 'bg-[var(--accent-soft)] text-[var(--text-strong)]'
                                : 'text-[var(--text-base)] hover:bg-[var(--surface-hover)]'
                            )}
                          >
                            <span className="flex items-center gap-1.5 text-[12px]">
                              {suggestion.kind === 'slash' ? <Command className="h-3.5 w-3.5" /> : <AtSign className="h-3.5 w-3.5" />}
                              {suggestion.label}
                            </span>
                            <span className="text-[11px] text-[var(--text-weaker)]">{suggestion.detail}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      ref={composerAttachmentInputRef}
                      type="file"
                      multiple
                      onChange={handleComposerAttachmentSelect}
                      className="hidden"
                    />
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => composerAttachmentInputRef.current?.click()}
                      disabled={composerAttachments.length >= COMPOSER_ATTACHMENT_LIMIT}
                    >
                      <FilePlus2 className="h-3.5 w-3.5" />
                      Attach Files
                    </Button>
                    <p className="text-[11px] text-[var(--text-weaker)]">
                      Slash: `/prompt` `/async` `/command` `/shell`, mentions: `@file:` `@agent:` `@mcp:`, send: cmd/ctrl
                      + enter.
                    </p>
                  </div>

                  {composerAttachments.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {composerAttachments.map((attachment) => (
                        <span
                          key={attachment.id}
                          className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border-weak)] bg-[var(--surface-base)] px-2 py-1 text-[11px] text-[var(--text-base)]"
                        >
                          {attachment.file.type.startsWith('image/') ? (
                            <FileImage className="h-3.5 w-3.5 text-[var(--accent)]" />
                          ) : (
                            <FileCode2 className="h-3.5 w-3.5 text-[var(--accent)]" />
                          )}
                          <span className="max-w-[140px] truncate">{attachment.file.name}</span>
                          <span className="text-[var(--text-weaker)]">{formatBytes(attachment.file.size)}</span>
                          <button
                            type="button"
                            aria-label={`Remove attachment ${attachment.file.name}`}
                            onClick={() => handleRemoveComposerAttachment(attachment.id)}
                            className="text-[var(--text-weaker)] transition-colors hover:text-[var(--text-strong)]"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-[1fr_auto] items-center gap-2">
                    <p className="text-[11px] text-[var(--text-weaker)]">
                      {composerMode === 'shell'
                        ? 'Shell mode executes command text directly; attachments are disabled for shell runs.'
                        : 'Text and image attachments are inlined as compact context blocks before dispatch.'}
                    </p>
                    <Button variant="secondary" onClick={() => void handleSendPrompt()} disabled={!composerCanSubmit}>
                      {isOperationRunning ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : composerMode === 'command' ? (
                        <Command className="h-4 w-4" />
                      ) : composerMode === 'shell' ? (
                        <TerminalSquare className="h-4 w-4" />
                      ) : (
                        <SendHorizontal className="h-4 w-4" />
                      )}
                      {composerSubmitLabel}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {isSettingsView && (
              <>
                <Card className="oc-panel">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-[var(--accent)]" />
                  Runtime Controls
                </CardTitle>
                <CardDescription>Provider/model configuration and agent quick actions for active sessions.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-lg border border-[var(--border-weak)] bg-[var(--surface-base)] p-3">
                  <p className="oc-kicker">Provider + Model</p>
                  <div className="mt-2 space-y-2">
                    <select
                      value={selectedProviderId}
                      onChange={(event) => setSelectedProviderId(event.target.value)}
                      className="h-9 w-full rounded-lg border border-[var(--border-base)] bg-[var(--surface-raised)] px-3 text-[12px] text-[var(--text-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-selected)]/60"
                    >
                      {providerOptions.length === 0 && <option value="">no providers detected</option>}
                      {providerOptions.map((provider) => (
                        <option key={provider.id} value={provider.id}>
                          {provider.label}
                        </option>
                      ))}
                    </select>

                    <select
                      value={selectedModelId}
                      onChange={(event) => setSelectedModelId(event.target.value)}
                      className="h-9 w-full rounded-lg border border-[var(--border-base)] bg-[var(--surface-raised)] px-3 text-[12px] text-[var(--text-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-selected)]/60"
                    >
                      {providerOptions.length === 0 && <option value="">no models detected</option>}
                      {providerOptions.map((provider) => (
                        <optgroup key={provider.id} label={provider.label}>
                          {provider.models.length === 0 && <option value="">no models</option>}
                          {provider.models.map((model) => (
                            <option key={`${provider.id}-${model.id}`} value={model.id}>
                              {model.label}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>

                    <select
                      value={selectedModelVariant}
                      onChange={(event) => setSelectedModelVariant(event.target.value)}
                      className="h-9 w-full rounded-lg border border-[var(--border-base)] bg-[var(--surface-raised)] px-3 text-[12px] text-[var(--text-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-selected)]/60"
                    >
                      {selectedModelVariants.length === 0 && <option value="">default variant</option>}
                      {selectedModelVariants.map((variant) => (
                        <option key={variant} value={variant}>
                          {variant}
                        </option>
                      ))}
                    </select>

                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        disabled={!activeSessionId || !selectedProviderId || !selectedModelId || runtimeControlsLocked}
                        onClick={() => void handleApplySessionModel()}
                      >
                        {isRuntimeControlBusy ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Cpu className="h-3.5 w-3.5" />}
                        Apply To Session
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => setIsProviderModalOpen(true)}>
                        <KeyRound className="h-3.5 w-3.5" />
                        Provider Connect
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-[var(--border-weak)] bg-[var(--surface-base)] p-3">
                  <p className="oc-kicker">Agent Picker</p>
                  <div className="mt-2 space-y-2">
                    <select
                      value={selectedAgentId}
                      onChange={(event) => setSelectedAgentId(event.target.value)}
                      className="h-9 w-full rounded-lg border border-[var(--border-base)] bg-[var(--surface-raised)] px-3 text-[12px] text-[var(--text-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-selected)]/60"
                    >
                      {agentCandidates.length === 0 && <option value="">no agents detected</option>}
                      {agentCandidates.map((agent) => (
                        <option key={agent} value={agent}>
                          {agent}
                        </option>
                      ))}
                    </select>

                    <div className="grid grid-cols-3 gap-2">
                      <Button size="sm" variant="secondary" disabled={!selectedAgentId} onClick={handleUseSelectedAgent}>
                        use
                      </Button>
                      <Button size="sm" variant="secondary" disabled={agentCandidates.length < 2} onClick={handleCycleAgentLocal}>
                        <RotateCw className="h-3.5 w-3.5" />
                        local
                      </Button>
                      <Button size="sm" variant="secondary" disabled={runtimeControlsLocked} onClick={() => void handleCycleAgentRemote()}>
                        <RotateCw className="h-3.5 w-3.5" />
                        tui
                      </Button>
                    </div>
                    <p className="text-[11px] text-[var(--text-weaker)]">Composer shell agent: {composerShellAgent || 'auto'}</p>
                  </div>
                </div>

                {(runtimeControlError || runtimeControlResult) && (
                  <div className="rounded-lg border border-[var(--border-weak)] bg-[var(--surface-base)] p-3">
                    {runtimeControlError && <p className="text-[12px] text-[var(--critical)]">{runtimeControlError}</p>}
                    {runtimeControlResult && (
                      <pre className="oc-scroll oc-mono mt-2 max-h-36 overflow-y-auto whitespace-pre-wrap text-[11px] text-[var(--text-weak)]">
                        {prettyJson(runtimeControlResult.data ?? runtimeControlResult.text)}
                      </pre>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="oc-panel">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-[var(--accent)]" />
                    Project Module
                  </CardTitle>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={isSystemSnapshotLoading}
                    onClick={() => void refreshProjectSnapshot()}
                  >
                    <RefreshCw className={cn('h-3.5 w-3.5', isSystemSnapshotLoading && 'animate-spin')} />
                    refresh
                  </Button>
                </div>
                <CardDescription>List/current project inspection and current project update actions.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  <Badge>{projectCandidates.length} project candidates</Badge>
                  {systemSnapshot?.errors?.length ? <Badge>{systemSnapshot.errors.length} system errors</Badge> : <Badge>system ok</Badge>}
                </div>

                <select
                  value={selectedProjectCandidate}
                  onChange={(event) => setSelectedProjectCandidate(event.target.value)}
                  className="h-9 w-full rounded-lg border border-[var(--border-base)] bg-[var(--surface-raised)] px-3 text-[12px] text-[var(--text-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-selected)]/60"
                >
                  {projectCandidates.length === 0 && <option value="">no project metadata</option>}
                  {projectCandidates.map((candidate) => (
                    <option key={candidate} value={candidate}>
                      {candidate}
                    </option>
                  ))}
                </select>

                <div className="grid grid-cols-[auto_1fr] gap-2">
                  <Button size="sm" variant="secondary" disabled={!selectedProjectCandidate} onClick={handlePrefillProjectUpdate}>
                    prefill
                  </Button>
                  <p className="text-[11px] text-[var(--text-weaker)]">
                    Prefill writes <code>{"{\"id\": \"...\"}"}</code>. Edit JSON if your OpenCode version expects another shape.
                  </p>
                </div>

                <Textarea
                  value={projectUpdateBody}
                  onChange={(event) => setProjectUpdateBody(event.target.value)}
                  className="oc-mono h-28 resize-none text-[11px]"
                  placeholder='JSON body for POST /project/current (example: {"id":"..."})'
                />

                <Button size="sm" variant="default" disabled={runtimeControlsLocked} onClick={() => void handleUpdateCurrentProject()}>
                  update current
                </Button>

                {systemSnapshotError && (
                  <div className="rounded-lg border border-[var(--critical-border)] bg-[var(--critical-soft)] p-2.5 text-[12px] text-[var(--critical)]">
                    {systemSnapshotError}
                  </div>
                )}

                <details className="rounded-lg border border-[var(--border-weak)] bg-[var(--surface-base)] p-3">
                  <summary className="cursor-pointer text-[12px] font-medium text-[var(--text-strong)]">project list snapshot</summary>
                  <pre className="oc-scroll oc-mono mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap text-[11px] text-[var(--text-weak)]">
                    {prettyJson(projectListSection?.data ?? null)}
                  </pre>
                </details>

                <details className="rounded-lg border border-[var(--border-weak)] bg-[var(--surface-base)] p-3">
                  <summary className="cursor-pointer text-[12px] font-medium text-[var(--text-strong)]">
                    current project snapshot
                  </summary>
                  <pre className="oc-scroll oc-mono mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap text-[11px] text-[var(--text-weak)]">
                    {prettyJson(projectCurrentSection?.data ?? null)}
                  </pre>
                </details>
              </CardContent>
            </Card>

            <Card className="oc-panel">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="flex items-center gap-2">
                    <TerminalSquare className="h-4 w-4 text-[var(--accent)]" />
                    Terminal Dock
                  </CardTitle>
                  <Button size="sm" variant="secondary" disabled={isPtyBusy} onClick={() => void refreshPtyList()}>
                    <RefreshCw className={cn('h-3.5 w-3.5', isPtyBusy && 'animate-spin')} />
                    refresh
                  </Button>
                </div>
                <CardDescription>PTY lifecycle controls with live stream, input, resize, and reconnect handling.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  <Badge>{ptySessions.length} pty sessions</Badge>
                  {selectedPtySession ? <Badge>{selectedPtySession.status}</Badge> : <Badge>no selection</Badge>}
                  <Badge>stream: {ptyStreamState}</Badge>
                  {ptyStreamCursor !== null && <Badge>cursor {ptyStreamCursor}</Badge>}
                  {ptyReconnectAttempt > 0 && <Badge>retry {ptyReconnectAttempt}</Badge>}
                </div>

                <select
                  value={selectedPtyId}
                  onChange={(event) => setSelectedPtyId(event.target.value)}
                  className="h-9 w-full rounded-lg border border-[var(--border-base)] bg-[var(--surface-raised)] px-3 text-[12px] text-[var(--text-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-selected)]/60"
                >
                  {ptySessions.length === 0 && <option value="">no PTY sessions</option>}
                  {ptySessions.map((session) => (
                    <option key={session.id} value={session.id}>
                      {session.title} ({session.id})
                    </option>
                  ))}
                </select>

                {selectedPtySession && (
                  <div className="rounded-lg border border-[var(--border-weak)] bg-[var(--surface-base)] p-3 text-[11px]">
                    <p className="oc-kicker">Selected PTY</p>
                    <p className="oc-mono mt-1 text-[var(--text-strong)]">
                      {selectedPtySession.command}
                      {selectedPtySession.args.length > 0 ? ` ${selectedPtySession.args.join(' ')}` : ''}
                    </p>
                    <p className="oc-mono text-[var(--text-weaker)]">{selectedPtySession.cwd || 'cwd unavailable'}</p>
                    <p className="text-[var(--text-weaker)]">
                      {selectedPtySession.pid !== null ? `pid ${selectedPtySession.pid}` : 'pid unknown'}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={!selectedPtyId || (ptyStreamState === 'connecting' || ptyStreamState === 'reconnecting')}
                    onClick={handleConnectPtyStream}
                  >
                    connect stream
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={ptyStreamState === 'idle'}
                    onClick={handleDisconnectPtyStream}
                  >
                    disconnect stream
                  </Button>
                </div>

                <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[var(--border-weak)] bg-[var(--surface-base)] px-3 py-2 text-[11px]">
                  <label className="flex items-center gap-1.5 text-[var(--text-base)]">
                    <input
                      type="checkbox"
                      checked={ptyAutoConnect}
                      onChange={(event) => setPtyAutoConnect(event.target.checked)}
                    />
                    auto connect
                  </label>
                  <label className="flex items-center gap-1.5 text-[var(--text-base)]">
                    <input
                      type="checkbox"
                      checked={ptyAutoReconnect}
                      onChange={(event) => setPtyAutoReconnect(event.target.checked)}
                    />
                    auto reconnect
                  </label>
                  <Button size="sm" variant="secondary" onClick={handleClearPtyOutput}>
                    clear output
                  </Button>
                </div>

                <div className="rounded-lg border border-[var(--border-weak)] bg-[var(--surface-base)] p-3">
                  <p className="oc-kicker">Live PTY Output</p>
                  <pre
                    ref={ptyOutputViewportRef}
                    className="oc-scroll oc-mono mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap text-[11px] text-[var(--text-weak)]"
                  >
                    {ptyStreamOutput || '(waiting for stream output)'}
                  </pre>
                </div>

                <div className="grid gap-2 md:grid-cols-[1fr_auto_auto]">
                  <Input
                    value={ptyStreamInput}
                    onChange={(event) => setPtyStreamInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key !== 'Enter') return;
                      event.preventDefault();
                      handleSendPtyInput(true);
                    }}
                    placeholder="Type PTY input"
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={ptyStreamState !== 'connected'}
                    onClick={() => handleSendPtyInput(false)}
                  >
                    send
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={ptyStreamState !== 'connected'}
                    onClick={() => handleSendPtyInput(true)}
                  >
                    send line
                  </Button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <Input
                    value={ptyResizeCols}
                    onChange={(event) => setPtyResizeCols(event.target.value)}
                    placeholder="cols"
                    className="oc-mono text-[11px]"
                  />
                  <Input
                    value={ptyResizeRows}
                    onChange={(event) => setPtyResizeRows(event.target.value)}
                    placeholder="rows"
                    className="oc-mono text-[11px]"
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={!selectedPtyId || isPtyBusy || runtimeControlsLocked}
                    onClick={() => void handleResizePty()}
                  >
                    resize
                  </Button>
                </div>

                <Textarea
                  value={ptyCreateBody}
                  onChange={(event) => setPtyCreateBody(event.target.value)}
                  className="oc-mono h-24 resize-none text-[11px]"
                  placeholder='Create PTY payload JSON (example: {"title":"Local Shell","command":"zsh","args":[]})'
                />

                <Button size="sm" variant="secondary" disabled={isPtyBusy || runtimeControlsLocked} onClick={() => void handleCreatePty()}>
                  create pty
                </Button>

                <Textarea
                  value={ptyUpdateBody}
                  onChange={(event) => setPtyUpdateBody(event.target.value)}
                  className="oc-mono h-20 resize-none text-[11px]"
                  placeholder='Update PTY payload JSON (example: {"title":"Renamed PTY"})'
                />

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={!selectedPtyId || isPtyBusy || runtimeControlsLocked}
                    onClick={() => void handleUpdatePty()}
                  >
                    update
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={!selectedPtyId || isPtyBusy || runtimeControlsLocked}
                    onClick={() => void handleDeletePty()}
                  >
                    remove
                  </Button>
                </div>

                {ptyError && (
                  <div className="rounded-lg border border-[var(--critical-border)] bg-[var(--critical-soft)] p-2.5 text-[12px] text-[var(--critical)]">
                    {ptyError}
                  </div>
                )}

                {ptyStreamError && (
                  <div className="rounded-lg border border-[var(--warning-border)] bg-[var(--warning-soft)] p-2.5 text-[12px] text-[var(--warning)]">
                    {ptyStreamError}
                  </div>
                )}

                <details className="rounded-lg border border-[var(--border-weak)] bg-[var(--surface-base)] p-3">
                  <summary className="cursor-pointer text-[12px] font-medium text-[var(--text-strong)]">PTY list response</summary>
                  <pre className="oc-scroll oc-mono mt-2 max-h-32 overflow-y-auto whitespace-pre-wrap text-[11px] text-[var(--text-weak)]">
                    {prettyJson(ptyListResponse?.result?.data ?? null)}
                  </pre>
                </details>

                <details className="rounded-lg border border-[var(--border-weak)] bg-[var(--surface-base)] p-3">
                  <summary className="cursor-pointer text-[12px] font-medium text-[var(--text-strong)]">last PTY action</summary>
                  <pre className="oc-scroll oc-mono mt-2 max-h-32 overflow-y-auto whitespace-pre-wrap text-[11px] text-[var(--text-weak)]">
                    {prettyJson(ptyActionResponse?.result?.data ?? null)}
                  </pre>
                </details>
              </CardContent>
            </Card>

            <Card className="oc-panel">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="flex items-center gap-2">
                    <RotateCw className="h-4 w-4 text-[var(--accent)]" />
                    Worktree Module
                  </CardTitle>
                  <Button size="sm" variant="secondary" disabled={isWorktreeBusy} onClick={() => void refreshWorktreeList()}>
                    <RefreshCw className={cn('h-3.5 w-3.5', isWorktreeBusy && 'animate-spin')} />
                    refresh
                  </Button>
                </div>
                <CardDescription>Manage experimental worktrees: list, create, remove, and reset.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  value={worktreeRequestBody}
                  onChange={(event) => setWorktreeRequestBody(event.target.value)}
                  className="oc-mono h-24 resize-none text-[11px]"
                  placeholder='Create/remove payload JSON (example: {"name":"feature-worktree"})'
                />

                <div className="grid grid-cols-2 gap-2">
                  <Button size="sm" variant="secondary" disabled={isWorktreeBusy} onClick={() => void handleCreateWorktree()}>
                    create
                  </Button>
                  <Button size="sm" variant="secondary" disabled={isWorktreeBusy} onClick={() => void handleRemoveWorktree()}>
                    remove
                  </Button>
                </div>

                <Textarea
                  value={worktreeResetBody}
                  onChange={(event) => setWorktreeResetBody(event.target.value)}
                  className="oc-mono h-20 resize-none text-[11px]"
                  placeholder='Reset payload JSON (example: {"name":"feature-worktree"})'
                />

                <Button size="sm" variant="secondary" disabled={isWorktreeBusy} onClick={() => void handleResetWorktree()}>
                  reset
                </Button>

                {worktreeError && (
                  <div className="rounded-lg border border-[var(--critical-border)] bg-[var(--critical-soft)] p-2.5 text-[12px] text-[var(--critical)]">
                    {worktreeError}
                  </div>
                )}

                <details className="rounded-lg border border-[var(--border-weak)] bg-[var(--surface-base)] p-3">
                  <summary className="cursor-pointer text-[12px] font-medium text-[var(--text-strong)]">worktree list</summary>
                  <pre className="oc-scroll oc-mono mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap text-[11px] text-[var(--text-weak)]">
                    {prettyJson(worktreeListResult?.data ?? null)}
                  </pre>
                </details>

                <details className="rounded-lg border border-[var(--border-weak)] bg-[var(--surface-base)] p-3">
                  <summary className="cursor-pointer text-[12px] font-medium text-[var(--text-strong)]">last worktree action</summary>
                  <pre className="oc-scroll oc-mono mt-2 max-h-32 overflow-y-auto whitespace-pre-wrap text-[11px] text-[var(--text-weak)]">
                    {prettyJson(worktreeActionResult?.data ?? null)}
                  </pre>
                </details>
              </CardContent>
            </Card>

            <Card className="oc-panel">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="flex items-center gap-2">
                    <MonitorCog className="h-4 w-4 text-[var(--accent)]" />
                    Config Editor
                  </CardTitle>
                  <Button size="sm" variant="secondary" disabled={isConfigBusy} onClick={() => void refreshConfigEditor()}>
                    <RefreshCw className={cn('h-3.5 w-3.5', isConfigBusy && 'animate-spin')} />
                    reload
                  </Button>
                </div>
                <CardDescription>Local/global config drafts with line-level diff counts and explicit apply confirmation.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <select
                  value={configApplyMethod}
                  onChange={(event) => setConfigApplyMethod(event.target.value as OpenCodeHttpMethod)}
                  className="h-9 w-full rounded-lg border border-[var(--border-base)] bg-[var(--surface-raised)] px-3 text-[12px] text-[var(--text-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-selected)]/60"
                >
                  <option value="PATCH">PATCH</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                </select>

                <div className="rounded-lg border border-[var(--border-weak)] bg-[var(--surface-base)] p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-[12px] font-medium text-[var(--text-strong)]">Local Config (`/config`)</p>
                    <Badge>{localConfigDiff.changed ? `${localConfigDiff.changedLines} line changes` : 'no changes'}</Badge>
                  </div>
                  <Textarea
                    value={configLocalDraft}
                    onChange={(event) => setConfigLocalDraft(event.target.value)}
                    className="oc-mono h-36 resize-none text-[11px]"
                  />
                  <label className="mt-2 flex items-center gap-2 text-[11px] text-[var(--text-weak)]">
                    <input
                      type="checkbox"
                      checked={confirmApplyLocalConfig}
                      onChange={(event) => setConfirmApplyLocalConfig(event.target.checked)}
                    />
                    Confirm apply local config update
                  </label>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="mt-2"
                    disabled={configControlsLocked || !localConfigDiff.changed}
                    onClick={() => void applyConfigDraft('local')}
                  >
                    apply local
                  </Button>
                </div>

                <div className="rounded-lg border border-[var(--border-weak)] bg-[var(--surface-base)] p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-[12px] font-medium text-[var(--text-strong)]">Global Config (`/global/config`)</p>
                    <Badge>{globalConfigDiff.changed ? `${globalConfigDiff.changedLines} line changes` : 'no changes'}</Badge>
                  </div>
                  <Textarea
                    value={configGlobalDraft}
                    onChange={(event) => setConfigGlobalDraft(event.target.value)}
                    className="oc-mono h-36 resize-none text-[11px]"
                  />
                  <label className="mt-2 flex items-center gap-2 text-[11px] text-[var(--text-weak)]">
                    <input
                      type="checkbox"
                      checked={confirmApplyGlobalConfig}
                      onChange={(event) => setConfirmApplyGlobalConfig(event.target.checked)}
                    />
                    Confirm apply global config update
                  </label>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="mt-2"
                    disabled={configControlsLocked || !globalConfigDiff.changed}
                    onClick={() => void applyConfigDraft('global')}
                  >
                    apply global
                  </Button>
                </div>

                {configError && (
                  <div className="rounded-lg border border-[var(--critical-border)] bg-[var(--critical-soft)] p-2.5 text-[12px] text-[var(--critical)]">
                    {configError}
                  </div>
                )}

                {configActionResult && (
                  <details className="rounded-lg border border-[var(--border-weak)] bg-[var(--surface-base)] p-3">
                    <summary className="cursor-pointer text-[12px] font-medium text-[var(--text-strong)]">
                      config action result ({configActionResult.status})
                    </summary>
                    <pre className="oc-scroll oc-mono mt-2 max-h-32 overflow-y-auto whitespace-pre-wrap text-[11px] text-[var(--text-weak)]">
                      {prettyJson(configActionResult.data ?? configActionResult.text)}
                    </pre>
                  </details>
                )}
              </CardContent>
            </Card>

            <Card className="oc-panel">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PlugZap className="h-4 w-4 text-[var(--accent)]" />
                  MCP Panel
                </CardTitle>
                <CardDescription>Server status, connect/disconnect, auth actions, and resource previews.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <select
                  value={selectedMcpName}
                  onChange={(event) => setSelectedMcpName(event.target.value)}
                  className="h-9 w-full rounded-lg border border-[var(--border-base)] bg-[var(--surface-raised)] px-3 text-[12px] text-[var(--text-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-selected)]/60"
                >
                  {mcpServers.length === 0 && <option value="">no MCP servers detected</option>}
                  {mcpServers.map((server) => (
                    <option key={server.name} value={server.name}>
                      {server.label}
                    </option>
                  ))}
                </select>

                {selectedMcpServer && (
                  <div className="flex flex-wrap gap-1.5">
                    <Badge>status: {selectedMcpServer.status ?? 'unknown'}</Badge>
                    <Badge>
                      connected:{' '}
                      {selectedMcpServer.connected === null ? 'unknown' : selectedMcpServer.connected ? 'yes' : 'no'}
                    </Badge>
                    <Badge>{selectedMcpServer.resources.length} resources</Badge>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2">
                  <Button size="sm" variant="secondary" disabled={!selectedMcpName || runtimeControlsLocked} onClick={() => void handleMcpConnect()}>
                    connect
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={!selectedMcpName || runtimeControlsLocked}
                    onClick={() => void handleMcpDisconnect()}
                  >
                    disconnect
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={!selectedMcpName || runtimeControlsLocked}
                    onClick={() => void handleMcpAuthenticate()}
                  >
                    auth
                  </Button>
                </div>

                <Textarea
                  value={mcpAuthPayload}
                  onChange={(event) => setMcpAuthPayload(event.target.value)}
                  className="oc-mono h-24 resize-none text-[11px]"
                  placeholder='MCP auth payload JSON (default: "{}")'
                />

                <div className="rounded-lg border border-[var(--border-weak)] bg-[var(--surface-base)] p-3">
                  <p className="oc-kicker mb-2">Resource Preview</p>
                  {!selectedMcpServer || selectedMcpServer.resources.length === 0 ? (
                    <p className="text-[11px] text-[var(--text-weaker)]">No resource metadata available.</p>
                  ) : (
                    <div className="oc-scroll max-h-32 space-y-1 overflow-y-auto">
                      {selectedMcpServer.resources.slice(0, 24).map((resource) => (
                        <p key={resource} className="oc-mono break-all text-[11px] text-[var(--text-weak)]">
                          {resource}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="oc-panel">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-[var(--accent)]" />
                  Session Operation Runner
                </CardTitle>
                <CardDescription>Run any high-impact session mutation with custom JSON payload.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <select
                  value={sessionOperationId}
                  onChange={(event) => setSessionOperationId(event.target.value)}
                  className="h-9 w-full rounded-lg border border-[var(--border-base)] bg-[var(--surface-raised)] px-3 text-[12px] text-[var(--text-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-selected)]/60"
                >
                  {SESSION_OPERATION_DEFINITIONS.map((operation) => (
                    <option key={operation.id} value={operation.id}>
                      {operation.label}
                    </option>
                  ))}
                </select>

                <Textarea
                  value={sessionOperationBody}
                  onChange={(event) => setSessionOperationBody(event.target.value)}
                  className="oc-mono h-40 resize-none text-[11px]"
                  placeholder="JSON request body"
                />

                <Button
                  variant="default"
                  className="w-full"
                  onClick={handleRunSessionOperation}
                  disabled={!activeSessionId || !selectedOperation || isOperationRunning}
                >
                  {isOperationRunning ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <MonitorCog className="h-4 w-4" />}
                  Run Operation
                </Button>

                {operationError && (
                  <div className="rounded-lg border border-[var(--critical-border)] bg-[var(--critical-soft)] p-3 text-[12px] text-[var(--critical)]">
                    {operationError}
                  </div>
                )}

                {operationResult && (
                  <details className="rounded-lg border border-[var(--border-weak)] bg-[var(--surface-base)] p-3">
                    <summary className="cursor-pointer text-[12px] font-medium text-[var(--text-strong)]">
                      Last result: {operationResult.status} {operationResult.ok ? 'ok' : 'error'}
                    </summary>
                    <pre className="oc-scroll oc-mono mt-2 max-h-44 overflow-y-auto whitespace-pre-wrap text-[11px] text-[var(--text-weak)]">
                      {prettyJson(operationResult.data ?? operationResult.text)}
                    </pre>
                  </details>
                )}
              </CardContent>
            </Card>

            <Card className="oc-panel">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-[var(--warning)]" />
                  Permission Queue
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {permissions.length === 0 && (
                  <div className="rounded-lg border border-[var(--border-weak)] bg-[var(--surface-base)] px-3 py-4 text-[12px] text-[var(--text-weak)]">
                    No pending permissions.
                  </div>
                )}

                {permissions.map((request, index) => {
                  const requestId = extractIdentifier(request) || `permission-${index + 1}`;
                  const context = summarizePermissionContext(request);
                  return (
                    <div key={requestId} className="rounded-lg border border-[var(--border-weak)] bg-[var(--surface-base)] p-3">
                      <p className="oc-mono text-[11px] text-[var(--text-weak)]">{requestId}</p>
                      <div className="mt-2 grid gap-1 text-[11px] text-[var(--text-weaker)] sm:grid-cols-2">
                        <p>session: {context.sessionId || 'n/a'}</p>
                        <p>tool: {context.tool || 'n/a'}</p>
                        <p className="sm:col-span-2">command/path: {context.command || 'n/a'}</p>
                        {context.prompt && (
                          <p className="sm:col-span-2 rounded-md border border-[var(--border-weak)] bg-[var(--surface-raised)] px-2 py-1 text-[var(--text-base)]">
                            {context.prompt}
                          </p>
                        )}
                      </div>
                      <Input
                        value={permissionMessages[requestId] || ''}
                        onChange={(event) =>
                          setPermissionMessages((prev) => ({ ...prev, [requestId]: event.target.value }))
                        }
                        placeholder="Optional message"
                        className="mt-2"
                      />
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={isOperationRunning}
                          onClick={() => void handlePermissionReply(requestId, 'once')}
                        >
                          once
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={isOperationRunning}
                          onClick={() => void handlePermissionReply(requestId, 'always')}
                        >
                          always
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={isOperationRunning}
                          onClick={() => void handlePermissionReply(requestId, 'reject')}
                        >
                          reject
                        </Button>
                      </div>
                      <details className="mt-2">
                        <summary className="cursor-pointer text-[11px] text-[var(--text-weaker)]">payload</summary>
                        <pre className="oc-scroll oc-mono mt-1 max-h-32 overflow-y-auto whitespace-pre-wrap text-[11px] text-[var(--text-weak)]">
                          {prettyJson(request)}
                        </pre>
                      </details>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card className="oc-panel">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-[var(--warning)]" />
                  Question Queue
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {questions.length === 0 && (
                  <div className="rounded-lg border border-[var(--border-weak)] bg-[var(--surface-base)] px-3 py-4 text-[12px] text-[var(--text-weak)]">
                    No pending questions.
                  </div>
                )}

                {questions.map((request, index) => {
                  const requestId = extractIdentifier(request) || `question-${index + 1}`;
                  const context = summarizeQuestionContext(request);
                  return (
                    <div key={requestId} className="rounded-lg border border-[var(--border-weak)] bg-[var(--surface-base)] p-3">
                      <p className="oc-mono text-[11px] text-[var(--text-weak)]">{requestId}</p>
                      <div className="mt-2 space-y-1 text-[11px] text-[var(--text-weaker)]">
                        <p>session: {context.sessionId || 'n/a'}</p>
                        {context.title && (
                          <p className="rounded-md border border-[var(--border-weak)] bg-[var(--surface-raised)] px-2 py-1 text-[var(--text-base)]">
                            {context.title}
                          </p>
                        )}
                        {context.options.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {context.options.slice(0, 8).map((option) => (
                              <Badge key={`${requestId}-${option}`}>{option}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <Textarea
                        value={questionReplies[requestId] || '{"answers": []}'}
                        onChange={(event) =>
                          setQuestionReplies((prev) => ({
                            ...prev,
                            [requestId]: event.target.value
                          }))
                        }
                        className="oc-mono mt-2 h-24 resize-none text-[11px]"
                      />
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={isOperationRunning}
                          onClick={() => void handleQuestionReply(requestId)}
                        >
                          reply
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={isOperationRunning}
                          onClick={() => void handleQuestionReject(requestId)}
                        >
                          reject
                        </Button>
                      </div>
                      <details className="mt-2">
                        <summary className="cursor-pointer text-[11px] text-[var(--text-weaker)]">payload</summary>
                        <pre className="oc-scroll oc-mono mt-1 max-h-32 overflow-y-auto whitespace-pre-wrap text-[11px] text-[var(--text-weak)]">
                          {prettyJson(request)}
                        </pre>
                      </details>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card className="oc-panel">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MonitorCog className="h-4 w-4 text-[var(--accent)]" />
                  TUI Controls
                </CardTitle>
                <CardDescription>Trigger TUI-level actions through OpenCode `/tui/*` endpoints.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {TUI_SHORTCUTS.map((shortcut) => (
                    <Button
                      key={shortcut.path}
                      size="sm"
                      variant="secondary"
                      disabled={isOperationRunning}
                      onClick={() => void handleTuiShortcut(shortcut.path)}
                    >
                      {shortcut.label}
                    </Button>
                  ))}
                </div>

                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <select
                    value={tuiCommand}
                    onChange={(event) => setTuiCommand(event.target.value)}
                    className="h-9 rounded-lg border border-[var(--border-base)] bg-[var(--surface-raised)] px-3 text-[12px] text-[var(--text-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-selected)]/60"
                  >
                    {TUI_COMMAND_CHOICES.map((command) => (
                      <option key={command} value={command}>
                        {command}
                      </option>
                    ))}
                  </select>
                  <Button size="sm" variant="default" disabled={isOperationRunning} onClick={handleTuiCommand}>
                    execute
                  </Button>
                </div>
              </CardContent>
            </Card>
              </>
            )}
          </aside>

          <section className="space-y-4">
            <Card className="oc-panel oc-scan">
              <CardHeader className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-[var(--accent)]" />
                    Session Monitor
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge>{sessions.length} sessions</Badge>
                    <Badge>{sessionDetail?.messageCount ?? 0} messages</Badge>
                    <Badge>{sessionTimeline?.count ?? 0} timeline</Badge>
                    {isSessionDetailLoading && <Badge>loading</Badge>}
                  </div>
                </div>
                <Input
                  value={sessionSearch}
                  onChange={(event) => setSessionSearch(event.target.value)}
                  placeholder="Filter sessions by title, id, directory..."
                />
              </CardHeader>
              <CardContent>
                {sessionError && (
                  <div className="mb-3 rounded-lg border border-[var(--critical-border)] bg-[var(--critical-soft)] p-3 text-[12px] text-[var(--critical)]">
                    <p className="flex items-center gap-1.5 font-medium">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Session Error
                    </p>
                    <p className="mt-1">{sessionError}</p>
                  </div>
                )}

                <div className="grid gap-3 lg:grid-cols-[340px_minmax(0,1fr)]">
                  <div className="oc-scroll max-h-[600px] space-y-2 overflow-y-auto">
                    {isMonitorLoading && sessions.length === 0 && (
                      <div className="rounded-lg border border-[var(--border-weak)] bg-[var(--surface-base)] px-3 py-4 text-center text-[12px] text-[var(--text-weak)]">
                        Loading sessions...
                      </div>
                    )}

                    {!isMonitorLoading && filteredSessions.length === 0 && (
                      <div className="rounded-lg border border-[var(--border-weak)] bg-[var(--surface-base)] px-3 py-4 text-center text-[12px] text-[var(--text-weak)]">
                        No matching sessions.
                      </div>
                    )}

                    {filteredSessions.map((session) => {
                      const statusRecord = asRecord(monitor?.sessionStatus?.[session.id]);
                      const statusType = statusRecord ? extractString(statusRecord, ['type', 'status']) : null;
                      return (
                        <button
                          key={session.id}
                          type="button"
                          onClick={() => setActiveSessionId(session.id)}
                          className={cn(
                            'w-full rounded-lg border p-3 text-left transition-colors',
                            activeSessionId === session.id
                              ? 'border-[var(--border-selected)] bg-[var(--accent-soft)]'
                              : 'border-[var(--border-weak)] bg-[var(--surface-base)] hover:bg-[var(--surface-hover)]'
                          )}
                        >
                          <p className="line-clamp-2 text-[13px] font-medium text-[var(--text-strong)]">{session.title}</p>
                          <p className="oc-mono mt-1 text-[11px] text-[var(--text-weak)]">{session.id}</p>
                          <p className="mt-1 text-[11px] text-[var(--text-weaker)]">
                            Updated {formatRelativeTime(session.updatedAt || session.createdAt)}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            <Badge>{session.filesChanged} files</Badge>
                            <Badge>
                              +{session.additions} / -{session.deletions}
                            </Badge>
                            {statusType && <Badge>{statusType}</Badge>}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="rounded-lg border border-[var(--border-weak)] bg-[var(--surface-base)] p-3">
                    {!activeSessionId && (
                      <div className="flex min-h-[320px] items-center justify-center text-[12px] text-[var(--text-weak)]">
                        Select a session to inspect activity.
                      </div>
                    )}

                    {activeSessionId && isSessionDetailLoading && !sessionDetail && (
                      <div className="flex min-h-[320px] items-center justify-center gap-2 text-[12px] text-[var(--text-weak)]">
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                        Loading session detail...
                      </div>
                    )}

                    {activeSessionId && sessionDetail && sessionDetail.session.id === activeSessionId && (
                      <div className="space-y-3">
                        <div className="rounded-lg border border-[var(--border-weak)] bg-[var(--surface-raised)] p-3">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="text-[13px] font-medium text-[var(--text-strong)]">{sessionDetail.session.title}</p>
                              <p className="oc-mono mt-1 text-[11px] text-[var(--text-weak)]">{sessionDetail.session.id}</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button size="sm" variant="secondary" disabled={isOperationRunning} onClick={handleUndoSession}>
                                undo
                              </Button>
                              <Button size="sm" variant="secondary" disabled={isOperationRunning} onClick={handleRedoSession}>
                                redo
                              </Button>
                              <Button size="sm" variant="secondary" disabled={isOperationRunning} onClick={() => void handleRenameSession()}>
                                rename
                              </Button>
                              <Button size="sm" variant="secondary" disabled={isOperationRunning} onClick={() => void handleSummarizeSession()}>
                                summarize
                              </Button>
                              <Button size="sm" variant="secondary" disabled={isOperationRunning} onClick={() => void handleShareSession()}>
                                share
                              </Button>
                              <Button size="sm" variant="secondary" disabled={isOperationRunning} onClick={() => void handleUnshareSession()}>
                                unshare
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                disabled={isOperationRunning}
                                className="text-[var(--critical)] hover:text-[var(--critical)]"
                                onClick={() => void handleDeleteSession()}
                              >
                                delete
                              </Button>
                            </div>
                          </div>

                          <div className="mt-2 grid gap-1 text-[11px] text-[var(--text-weak)] sm:grid-cols-2">
                            <p>Created: {formatDateTime(sessionDetail.session.createdAt)}</p>
                            <p>Updated: {formatDateTime(sessionDetail.session.updatedAt)}</p>
                            <p>Total messages: {sessionDetail.messageCount}</p>
                            <p>Active tool calls: {sessionDetail.activeToolCalls}</p>
                          </div>
                          {sessionShareUrl && (
                            <div className="mt-2 rounded-lg border border-[var(--border-weak)] bg-[var(--surface-base)] px-2.5 py-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="oc-mono break-all text-[11px] text-[var(--text-weak)]">{sessionShareUrl}</p>
                                <Button size="sm" variant="secondary" onClick={() => void handleCopyShareLink()}>
                                  copy link
                                </Button>
                              </div>
                            </div>
                          )}
                          {operationError && <p className="mt-2 text-[11px] text-[var(--critical)]">{operationError}</p>}
                          {operationResult && (
                            <p className="mt-1 text-[11px] text-[var(--text-weaker)]">
                              Last action: {operationResult.status} {operationResult.ok ? 'ok' : 'error'}
                            </p>
                          )}
                          {selectedSession?.directory && (
                            <p className="oc-mono mt-2 break-all text-[11px] text-[var(--text-weaker)]">
                              {selectedSession.directory}
                            </p>
                          )}

                          <div className="mt-2 flex flex-wrap gap-2">
                            {(sessionDetail.session.parentId || selectedSession?.parentId) && (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => setActiveSessionId(sessionDetail.session.parentId || selectedSession?.parentId || null)}
                              >
                                parent {(sessionDetail.session.parentId || selectedSession?.parentId || '').slice(0, 12)}
                              </Button>
                            )}
                            {(sessionDetail.children || []).map((child) => (
                              <Button key={child.id} size="sm" variant="secondary" onClick={() => setActiveSessionId(child.id)}>
                                child {child.id.slice(0, 12)}
                              </Button>
                            ))}
                          </div>
                        </div>

                        <div className="grid gap-2 md:grid-cols-3">
                          <div className="rounded-lg border border-[var(--border-weak)] bg-[var(--surface-raised)] p-3 text-[11px]">
                            <p className="oc-kicker">Todo</p>
                            <p className="mt-1 text-[var(--text-strong)]">
                              {todoSummary.open} open / {todoSummary.done} done
                            </p>
                            <p className="text-[var(--text-weaker)]">{todoSummary.total} total items</p>
                          </div>
                          <div className="rounded-lg border border-[var(--border-weak)] bg-[var(--surface-raised)] p-3 text-[11px]">
                            <p className="oc-kicker">Diff</p>
                            <p className="mt-1 text-[var(--text-strong)]">
                              {(diffSummary.files ?? sessionDetail.session.filesChanged ?? 0).toString()} files
                            </p>
                            <p className="text-[var(--text-weaker)]">
                              +{diffSummary.additions ?? sessionDetail.session.additions} / -
                              {diffSummary.deletions ?? sessionDetail.session.deletions}
                            </p>
                          </div>
                          <div className="rounded-lg border border-[var(--border-weak)] bg-[var(--surface-raised)] p-3 text-[11px]">
                            <p className="oc-kicker">Context / Cost</p>
                            <p className="mt-1 text-[var(--text-strong)]">
                              {usageSummary.context !== null ? `${usageSummary.context} tokens` : 'not reported'}
                            </p>
                            <p className="text-[var(--text-weaker)]">
                              {usageSummary.cost !== null ? `$${usageSummary.cost.toFixed(4)}` : 'cost unavailable'}
                            </p>
                          </div>
                        </div>

                        <div className="rounded-lg border border-[var(--border-weak)] bg-[var(--surface-raised)] p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-[12px] font-medium text-[var(--text-strong)]">Transcript</p>
                            <div className="flex flex-wrap gap-2">
                              <Button size="sm" variant="secondary" disabled={isTranscriptRunning} onClick={handleCopyTranscript}>
                                copy markdown
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                disabled={isTranscriptRunning}
                                onClick={handleExportTranscript}
                              >
                                export .md
                              </Button>
                            </div>
                          </div>
                          {transcriptError && <p className="mt-2 text-[11px] text-[var(--critical)]">{transcriptError}</p>}
                        </div>

                        <div className="rounded-lg border border-[var(--border-weak)] bg-[var(--surface-raised)] p-3">
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <p className="text-[12px] font-medium text-[var(--text-strong)]">Timeline</p>
                            {isTimelineLoading && <Badge>loading</Badge>}
                          </div>
                          {timelineError && <p className="mb-2 text-[11px] text-[var(--critical)]">{timelineError}</p>}
                          <div className="oc-scroll max-h-44 space-y-2 overflow-y-auto">
                            {!sessionTimeline || sessionTimeline.entries.length === 0 ? (
                              <div className="rounded-lg border border-[var(--border-weak)] bg-[var(--surface-base)] px-3 py-3 text-center text-[12px] text-[var(--text-weak)]">
                                No timeline entries.
                              </div>
                            ) : (
                              sessionTimeline.entries.map((entry) => (
                                <article
                                  key={entry.messageId}
                                  className="rounded-lg border border-[var(--border-weak)] bg-[var(--surface-base)] p-2.5"
                                >
                                  <div className="mb-1 flex flex-wrap items-center gap-1.5">
                                    <Badge>{entry.assistantState}</Badge>
                                    {entry.hasDiffMarker && <Badge>diff</Badge>}
                                    <span className="text-[11px] text-[var(--text-weaker)]">
                                      {formatRelativeTime(entry.createdAt)}
                                    </span>
                                  </div>
                                  <p className="line-clamp-2 text-[12px] text-[var(--text-base)]">{entry.preview}</p>
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      disabled={isOperationRunning}
                                      onClick={() => void handleMessageRevert(entry.messageId)}
                                    >
                                      revert
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      disabled={isOperationRunning}
                                      onClick={() => void handleMessageFork(entry.messageId)}
                                    >
                                      fork
                                    </Button>
                                  </div>
                                </article>
                              ))
                            )}
                          </div>
                        </div>

                        <div className="oc-scroll max-h-[460px] space-y-2 overflow-y-auto">
                          {sessionDetail.messages.length === 0 && (
                            <div className="rounded-lg border border-[var(--border-weak)] bg-[var(--surface-raised)] px-3 py-4 text-center text-[12px] text-[var(--text-weak)]">
                              No messages found for this session.
                            </div>
                          )}

                          {sessionDetail.messages.map((message) => (
                            <article
                              key={message.id}
                              className="rounded-lg border border-[var(--border-weak)] bg-[var(--surface-raised)] p-3"
                            >
                              <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className={cn('rounded-md border px-2 py-0.5 uppercase', roleTone(message.role))}>
                                    {message.role}
                                  </span>
                                  <span className="text-[var(--text-weaker)]">{formatRelativeTime(message.createdAt)}</span>
                                  {message.hasRunningToolCall && (
                                    <span className="rounded-md border border-[var(--warning-border)] bg-[var(--warning-soft)] px-2 py-0.5 text-[var(--warning)]">
                                      running tool
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <Button size="sm" variant="secondary" onClick={() => void handleCopyMessage(message)}>
                                    copy
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    disabled={isOperationRunning}
                                    onClick={() => void handleMessageRevert(message.id)}
                                  >
                                    revert
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    disabled={isOperationRunning}
                                    onClick={() => void handleMessageFork(message.id)}
                                  >
                                    fork
                                  </Button>
                                </div>
                              </div>

                              {message.text ? (
                                <p className="whitespace-pre-wrap text-[12px] leading-relaxed text-[var(--text-base)]">
                                  {message.text}
                                </p>
                              ) : (
                                <p className="text-[12px] text-[var(--text-weaker)]">No text payload.</p>
                              )}

                              {message.partTypes.length > 0 && (
                                <p className="oc-mono mt-2 text-[11px] text-[var(--text-weaker)]">
                                  parts: {message.partTypes.join(', ')}
                                </p>
                              )}

                              {message.parts.length > 0 && (
                                <details className="mt-2">
                                  <summary className="cursor-pointer text-[11px] text-[var(--text-weaker)]">
                                    raw parts ({message.parts.length})
                                  </summary>
                                  <pre className="oc-scroll oc-mono mt-1 max-h-44 overflow-y-auto whitespace-pre-wrap text-[11px] text-[var(--text-weak)]">
                                    {prettyJson(message.parts)}
                                  </pre>
                                </details>
                              )}
                            </article>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {isSettingsView && (
              <Card className="oc-panel">
              <CardHeader className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-[var(--accent)]" />
                    OpenCode API Explorer
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge>{monitor?.openapi?.title || 'OpenCode API'}</Badge>
                    <Badge>v{monitor?.openapi?.version || 'unknown'}</Badge>
                  </div>
                </div>
                <div className="grid gap-2 md:grid-cols-[1fr_120px]">
                  <select
                    value={apiPath}
                    onChange={(event) => setApiPath(event.target.value)}
                    className="h-9 rounded-lg border border-[var(--border-base)] bg-[var(--surface-raised)] px-3 text-[12px] text-[var(--text-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-selected)]/60"
                  >
                    {openApiEndpoints.map((endpoint) => (
                      <option key={endpoint.path} value={endpoint.path}>
                        {endpoint.path}
                      </option>
                    ))}
                  </select>
                  <select
                    value={apiMethod}
                    onChange={(event) => setApiMethod(event.target.value as OpenCodeHttpMethod)}
                    className="h-9 rounded-lg border border-[var(--border-base)] bg-[var(--surface-raised)] px-3 text-[12px] text-[var(--text-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-selected)]/60"
                  >
                    {selectedApiMethods.map((method) => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
                  </select>
                </div>
                {selectedEndpoint && selectedEndpoint.operationIds.length > 0 && (
                  <p className="oc-mono text-[11px] text-[var(--text-weaker)]">
                    operations: {selectedEndpoint.operationIds.join(', ')}
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  value={apiBody}
                  onChange={(event) => setApiBody(event.target.value)}
                  className="oc-mono h-40 resize-none text-[11px]"
                  placeholder="Request body JSON (optional)"
                />
                <Button variant="default" onClick={handleRunApiRequest} disabled={isApiRunning}>
                  {isApiRunning ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  Run Request
                </Button>

                {apiError && (
                  <div className="rounded-lg border border-[var(--critical-border)] bg-[var(--critical-soft)] p-3 text-[12px] text-[var(--critical)]">
                    {apiError}
                  </div>
                )}

                {apiResponse && (
                  <div className="rounded-lg border border-[var(--border-weak)] bg-[var(--surface-base)] p-3">
                    <p className="oc-mono text-[11px] text-[var(--text-weak)]">
                      status {apiResponse.status} · {apiResponse.ok ? 'ok' : 'error'} · {apiResponse.contentType || 'unknown content'}
                    </p>
                    <pre className="oc-scroll oc-mono mt-2 max-h-72 overflow-y-auto whitespace-pre-wrap text-[11px] text-[var(--text-weak)]">
                      {prettyJson(apiResponse.data ?? apiResponse.text)}
                    </pre>
                  </div>
                )}
              </CardContent>
              </Card>
            )}
          </section>
        </div>
      </div>

      {isCommandPaletteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close command palette"
            className="absolute inset-0 bg-black/40"
            onClick={closeCommandPalette}
          />
          <Card className="oc-panel relative z-10 w-full max-w-2xl" onClick={(event) => event.stopPropagation()}>
            <CardHeader className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2">
                  <Command className="h-4 w-4 text-[var(--accent)]" />
                  Command Palette
                </CardTitle>
                <Button size="sm" variant="secondary" onClick={closeCommandPalette}>
                  <X className="h-3.5 w-3.5" />
                  close
                </Button>
              </div>
              <CardDescription>Keyboard-driven operations and TUI shortcuts (Ctrl/Cmd+K).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                ref={commandPaletteInputRef}
                value={commandPaletteQuery}
                onChange={(event) => setCommandPaletteQuery(event.target.value)}
                onKeyDown={handleCommandPaletteKeyDown}
                placeholder="Search actions..."
              />

              <div className="oc-scroll max-h-72 space-y-2 overflow-y-auto">
                {filteredCommandPaletteActions.length === 0 && (
                  <div className="rounded-lg border border-[var(--border-weak)] bg-[var(--surface-base)] px-3 py-4 text-center text-[12px] text-[var(--text-weak)]">
                    No matching actions.
                  </div>
                )}

                {filteredCommandPaletteActions.map((action, index) => {
                  const selected = index === normalizedCommandPaletteIndex;
                  return (
                    <button
                      key={action.id}
                      type="button"
                      onMouseEnter={() => setCommandPaletteIndex(index)}
                      onClick={() => runCommandPaletteAction(action)}
                      disabled={action.disabled}
                      className={cn(
                        'w-full rounded-lg border px-3 py-2 text-left transition-colors',
                        selected
                          ? 'border-[var(--border-selected)] bg-[var(--accent-soft)]'
                          : 'border-[var(--border-weak)] bg-[var(--surface-base)] hover:bg-[var(--surface-hover)]',
                        action.disabled && 'cursor-not-allowed opacity-55'
                      )}
                    >
                      <p className="text-[12px] font-medium text-[var(--text-strong)]">{action.label}</p>
                      <p className="mt-0.5 text-[11px] text-[var(--text-weaker)]">{action.hint}</p>
                    </button>
                  );
                })}
              </div>

              <p className="text-[11px] text-[var(--text-weaker)]">Enter to run · Arrow keys to navigate · Esc to close</p>
            </CardContent>
          </Card>
        </div>
      )}

      {isProviderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close provider connect modal"
            className="absolute inset-0 bg-black/40"
            onClick={() => setIsProviderModalOpen(false)}
          />
          <Card className="oc-panel relative z-10 w-full max-w-xl" onClick={(event) => event.stopPropagation()}>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-[var(--accent)]" />
                  Provider Connect
                </CardTitle>
                <Button size="sm" variant="secondary" onClick={() => setIsProviderModalOpen(false)}>
                  <X className="h-3.5 w-3.5" />
                  close
                </Button>
              </div>
              <CardDescription>Auth method discovery, OAuth authorize/callback, and API key handoff.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <select
                value={selectedProviderId}
                onChange={(event) => setSelectedProviderId(event.target.value)}
                className="h-9 w-full rounded-lg border border-[var(--border-base)] bg-[var(--surface-raised)] px-3 text-[12px] text-[var(--text-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-selected)]/60"
              >
                {providerOptions.length === 0 && <option value="">no providers detected</option>}
                {providerOptions.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.label}
                  </option>
                ))}
              </select>

              <div className="grid grid-cols-2 gap-2">
                <Button size="sm" variant="secondary" disabled={runtimeControlsLocked} onClick={() => void handleFetchProviderAuthMethods()}>
                  <Search className="h-3.5 w-3.5" />
                  Discover Auth
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={!selectedProviderId || runtimeControlsLocked}
                  onClick={() => void handleProviderOAuthAuthorize()}
                >
                  <Link className="h-3.5 w-3.5" />
                  OAuth Authorize
                </Button>
              </div>

              {providerAuthMethods.length > 0 && (
                <div className="rounded-lg border border-[var(--border-weak)] bg-[var(--surface-base)] p-2.5">
                  <p className="oc-kicker">Discovered methods</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {providerAuthMethods.slice(0, 20).map((method) => (
                      <Badge key={method}>{method}</Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2 rounded-lg border border-[var(--border-weak)] bg-[var(--surface-base)] p-3">
                <p className="oc-kicker">OAuth Callback</p>
                <Input
                  value={providerOAuthCode}
                  onChange={(event) => setProviderOAuthCode(event.target.value)}
                  placeholder="OAuth code"
                />
                <Input
                  value={providerOAuthState}
                  onChange={(event) => setProviderOAuthState(event.target.value)}
                  placeholder="OAuth state (optional)"
                />
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={!selectedProviderId || !providerOAuthCode.trim() || runtimeControlsLocked}
                  onClick={() => void handleProviderOAuthCallback()}
                >
                  Send Callback
                </Button>
              </div>

              <div className="space-y-2 rounded-lg border border-[var(--border-weak)] bg-[var(--surface-base)] p-3">
                <p className="oc-kicker">API Key</p>
                <Input
                  type="password"
                  value={providerApiKey}
                  onChange={(event) => setProviderApiKey(event.target.value)}
                  placeholder="Paste API key/token"
                />
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={!selectedProviderId || !providerApiKey.trim() || runtimeControlsLocked}
                  onClick={() => void handleProviderApiKeySave()}
                >
                  Save Key
                </Button>
              </div>

              {runtimeControlError && (
                <p className="rounded-lg border border-[var(--critical-border)] bg-[var(--critical-soft)] p-2.5 text-[12px] text-[var(--critical)]">
                  {runtimeControlError}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
