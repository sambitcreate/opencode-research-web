import type { CSSProperties } from 'react';

export type OpenCodeStatus = {
  running: boolean;
  host: string;
  port: number;
  apiUrl?: string;
  lastError: string | null;
  command: string;
  startedAt: string | null;
  recentLogs?: string[];
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

export type OpenCodeSessionsResponse = {
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
  parts: Record<string, unknown>[];
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

export type OpenCodeSessionTimelineEntry = {
  messageId: string;
  createdAt: string | null;
  preview: string;
  assistantMessageId: string | null;
  assistantState: 'running' | 'complete' | 'none';
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

export type OpenCodeHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type OpenCodeEndpointDefinition = {
  path: string;
  methods: OpenCodeHttpMethod[];
  operationIds: string[];
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

export type OpenCodeFilesMode = 'findText' | 'findFile' | 'list' | 'content' | 'status';

export type OpenCodeFilesResponse = {
  mode: OpenCodeFilesMode;
  request: {
    path: string;
    method: 'GET';
  };
  result: OpenCodeControlResponse;
};

export type OpenCodeSystemSnapshotResponse = {
  status: OpenCodeStatus;
  include: string[];
  sections: Record<string, OpenCodeControlResponse>;
  errors: string[];
};

export type OpenCodePtyRouteResponse = {
  request: {
    path: string;
    method: string;
    body?: unknown;
  };
  result: OpenCodeControlResponse;
};

export type OpenCodePtySession = {
  id: string;
  title: string;
  command: string;
  args: string[];
  cwd: string;
  status: string;
  pid: number | null;
};

export type OpenCodeMonitorSnapshot = {
  status: OpenCodeStatus;
  sessions: OpenCodeSessionsResponse;
  sessionStatus: Record<string, unknown>;
  permissions: Record<string, unknown>[];
  questions: Record<string, unknown>[];
  providers: unknown;
  commands: unknown;
  agents: unknown;
  skills: unknown;
  pathInfo: unknown;
  vcsInfo: unknown;
  mcp?: unknown;
  lsp?: unknown;
  formatter?: unknown;
  config?: {
    local: unknown;
    global: unknown;
  };
  compatibility?: OpenCodeCompatibilitySnapshot;
  openapi: OpenCodeOpenApiSnapshot;
  errors: string[];
};

export type OpenCodeControlResponse = {
  ok: boolean;
  status: number;
  contentType: string;
  data: unknown;
  text: string;
};

export type EventConnectionState = 'connecting' | 'connected' | 'error';
export type PtyStreamState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'error';
export type EventRefreshScope = 'none' | 'monitor' | 'monitor-session';

export type OpenCodeDebugEvent = {
  id: string;
  streamEvent: string;
  source: 'instance' | 'global' | 'bridge';
  seq: number | null;
  eventType: string;
  sessionId: string | null;
  timestamp: string;
  payload: unknown;
};

export type ColorScheme = 'system' | 'light' | 'dark';
export type ResolvedScheme = 'light' | 'dark';
export type EngineState = 'checking' | 'offline' | 'booting' | 'ready' | 'error';
export type ComposerMode = 'prompt-sync' | 'prompt-async' | 'command' | 'shell';
export type ComposerMentionCategory = 'file' | 'agent' | 'mcp';

export type ComposerToken = {
  trigger: '/' | '@';
  value: string;
  start: number;
  end: number;
};

export type ComposerSuggestion = {
  id: string;
  kind: 'slash' | 'mention';
  label: string;
  detail: string;
  replacement: string;
  mode?: ComposerMode;
  value?: string;
  mentionCategory?: ComposerMentionCategory;
};

export type ComposerAttachment = {
  id: string;
  file: File;
};

export type ModelOption = {
  id: string;
  label: string;
  variants: string[];
};

export type ProviderOption = {
  id: string;
  label: string;
  models: ModelOption[];
};

export type McpServerOption = {
  name: string;
  label: string;
  status: string | null;
  connected: boolean | null;
  resources: string[];
};

export type CommandPaletteAction = {
  id: string;
  label: string;
  hint: string;
  keywords: string;
  disabled?: boolean;
  run: () => void | Promise<void>;
};

export type ThemePalette = {
  background: string;
  backgroundWeak: string;
  backgroundStronger: string;
  surfaceBase: string;
  surfaceRaised: string;
  surfaceHover: string;
  surfaceInset: string;
  borderBase: string;
  borderWeak: string;
  borderSelected: string;
  textBase: string;
  textWeak: string;
  textWeaker: string;
  textStrong: string;
  textInverse: string;
  buttonPrimary: string;
  buttonPrimaryHover: string;
  buttonPrimaryForeground: string;
  buttonSecondary: string;
  buttonSecondaryHover: string;
  inputBg: string;
  accent: string;
  accentSoft: string;
  success: string;
  successSoft: string;
  successBorder: string;
  warning: string;
  warningSoft: string;
  warningBorder: string;
  critical: string;
  criticalSoft: string;
  criticalBorder: string;
  info: string;
  gradientA: string;
  gradientB: string;
  gradientC: string;
  shadowXsBorder: string;
};

export type ThemeDefinition = {
  id: string;
  name: string;
  light: ThemePalette;
  dark: ThemePalette;
};

export type ThemeStyle = CSSProperties & Record<`--${string}`, string>;

export type SessionOperationDefinition = {
  id: string;
  label: string;
  method: OpenCodeHttpMethod;
  path: string;
  template: string;
  requiresBody: boolean;
};

