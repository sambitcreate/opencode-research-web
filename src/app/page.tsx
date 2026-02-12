'use client';

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
import { cn } from '@/lib/utils';

type OpenCodeStatus = {
  running: boolean;
  host: string;
  port: number;
  lastError: string | null;
  command: string;
  startedAt: string | null;
  recentLogs?: string[];
};

type OpenCodeSessionSummary = {
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
  parts: Record<string, unknown>[];
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
  todo?: unknown;
  diff?: unknown;
  children?: OpenCodeSessionSummary[];
};

type OpenCodeSessionTimelineEntry = {
  messageId: string;
  createdAt: string | null;
  preview: string;
  assistantMessageId: string | null;
  assistantState: 'running' | 'complete' | 'none';
  hasDiffMarker: boolean;
};

type OpenCodeSessionTimeline = {
  running: boolean;
  host: string;
  port: number;
  started: boolean;
  sessionId: string;
  count: number;
  entries: OpenCodeSessionTimelineEntry[];
};

type OpenCodeSessionTranscript = {
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

type OpenCodeHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type OpenCodeEndpointDefinition = {
  path: string;
  methods: OpenCodeHttpMethod[];
  operationIds: string[];
};

type OpenCodeOpenApiSnapshot = {
  source: 'live' | 'fallback';
  title: string;
  version: string;
  endpointCount: number;
  endpoints: OpenCodeEndpointDefinition[];
};

type OpenCodeFilesMode = 'findText' | 'findFile' | 'list' | 'content' | 'status';

type OpenCodeFilesResponse = {
  mode: OpenCodeFilesMode;
  request: {
    path: string;
    method: 'GET';
  };
  result: OpenCodeControlResponse;
};

type OpenCodeSystemSnapshotResponse = {
  status: OpenCodeStatus;
  include: string[];
  sections: Record<string, OpenCodeControlResponse>;
  errors: string[];
};

type OpenCodeMonitorSnapshot = {
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
  openapi: OpenCodeOpenApiSnapshot;
  errors: string[];
};

type OpenCodeControlResponse = {
  ok: boolean;
  status: number;
  contentType: string;
  data: unknown;
  text: string;
};

type EventConnectionState = 'connecting' | 'connected' | 'error';

type OpenCodeDebugEvent = {
  id: string;
  streamEvent: string;
  source: 'instance' | 'global' | 'bridge';
  seq: number | null;
  eventType: string;
  sessionId: string | null;
  timestamp: string;
  payload: unknown;
};

type ColorScheme = 'system' | 'light' | 'dark';
type ResolvedScheme = 'light' | 'dark';
type EngineState = 'checking' | 'offline' | 'booting' | 'ready' | 'error';
type ComposerMode = 'prompt-sync' | 'prompt-async' | 'command' | 'shell';
type ComposerMentionCategory = 'file' | 'agent' | 'mcp';

type ComposerToken = {
  trigger: '/' | '@';
  value: string;
  start: number;
  end: number;
};

type ComposerSuggestion = {
  id: string;
  kind: 'slash' | 'mention';
  label: string;
  detail: string;
  replacement: string;
  mode?: ComposerMode;
  value?: string;
  mentionCategory?: ComposerMentionCategory;
};

type ComposerAttachment = {
  id: string;
  file: File;
};

type ModelOption = {
  id: string;
  label: string;
  variants: string[];
};

type ProviderOption = {
  id: string;
  label: string;
  models: ModelOption[];
};

type McpServerOption = {
  name: string;
  label: string;
  status: string | null;
  connected: boolean | null;
  resources: string[];
};

type ThemePalette = {
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

type ThemeDefinition = {
  id: string;
  name: string;
  light: ThemePalette;
  dark: ThemePalette;
};

type ThemeStyle = React.CSSProperties & Record<`--${string}`, string>;

type SessionOperationDefinition = {
  id: string;
  label: string;
  method: OpenCodeHttpMethod;
  path: string;
  template: string;
  requiresBody: boolean;
};

const EMPTY_SESSIONS: OpenCodeSessionSummary[] = [];
const EMPTY_OPENAPI_ENDPOINTS: OpenCodeEndpointDefinition[] = [];
const DEFAULT_API_METHODS: OpenCodeHttpMethod[] = ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'];
const DEBUG_EVENT_LIMIT = 120;
const MONITOR_POLL_MS_DISCONNECTED = 12_000;
const MONITOR_POLL_MS_CONNECTED = 45_000;
const SESSION_POLL_MS_DISCONNECTED = 9_000;
const SESSION_POLL_MS_CONNECTED = 30_000;

const SHADOW_DARK =
  '0 0 0 1px rgba(252,251,251,0.16), 0 1px 2px -1px rgba(0,0,0,0.26), 0 1px 2px 0 rgba(0,0,0,0.22), 0 2px 6px 0 rgba(0,0,0,0.18)';
const SHADOW_LIGHT =
  '0 0 0 1px rgba(11,6,0,0.12), 0 1px 2px -1px rgba(19,16,16,0.05), 0 1px 2px 0 rgba(19,16,16,0.07), 0 2px 6px 0 rgba(19,16,16,0.1)';

const THEME_DEFINITIONS: ThemeDefinition[] = [
  {
    id: 'oc-1',
    name: 'OC-1',
    light: {
      background: '#f8f7f7',
      backgroundWeak: '#f1f0f0',
      backgroundStronger: '#fcfcfc',
      surfaceBase: 'rgba(5,0,0,0.06)',
      surfaceRaised: 'rgba(255,255,255,0.85)',
      surfaceHover: 'rgba(17,0,0,0.1)',
      surfaceInset: 'rgba(12,0,0,0.08)',
      borderBase: 'rgba(11,6,0,0.2)',
      borderWeak: 'rgba(17,0,0,0.12)',
      borderSelected: '#004aff',
      textBase: '#656363',
      textWeak: '#8e8b8b',
      textWeaker: '#a29f9f',
      textStrong: '#211e1e',
      textInverse: '#fdfcfc',
      buttonPrimary: '#211e1e',
      buttonPrimaryHover: '#151313',
      buttonPrimaryForeground: '#ffffff',
      buttonSecondary: '#fdfcfc',
      buttonSecondaryHover: '#f1f0f0',
      inputBg: '#fdfcfc',
      accent: '#034cff',
      accentSoft: 'rgba(3,76,255,0.11)',
      success: '#008600',
      successSoft: 'rgba(18,201,5,0.12)',
      successBorder: 'rgba(18,201,5,0.3)',
      warning: '#b57f00',
      warningSoft: 'rgba(255,220,23,0.16)',
      warningBorder: 'rgba(255,220,23,0.34)',
      critical: '#d61d00',
      criticalSoft: 'rgba(252,83,58,0.14)',
      criticalBorder: 'rgba(252,83,58,0.34)',
      info: '#1251ec',
      gradientA: 'rgba(3,76,255,0.22)',
      gradientB: 'rgba(220,222,141,0.34)',
      gradientC: 'rgba(18,201,5,0.12)',
      shadowXsBorder: SHADOW_LIGHT
    },
    dark: {
      background: '#131010',
      backgroundWeak: '#252121',
      backgroundStronger: '#1b1818',
      surfaceBase: 'rgba(252,249,249,0.05)',
      surfaceRaised: 'rgba(252,249,249,0.03)',
      surfaceHover: 'rgba(252,249,249,0.1)',
      surfaceInset: 'rgba(252,249,249,0.13)',
      borderBase: 'rgba(252,249,249,0.2)',
      borderWeak: 'rgba(252,249,249,0.11)',
      borderSelected: '#2768fe',
      textBase: '#b7b1b1',
      textWeak: '#8e8b8b',
      textWeaker: '#716c6b',
      textStrong: '#f1ecec',
      textInverse: '#151313',
      buttonPrimary: '#f1ecec',
      buttonPrimaryHover: '#ffffff',
      buttonPrimaryForeground: '#151313',
      buttonSecondary: '#252121',
      buttonSecondaryHover: '#2d2828',
      inputBg: '#1b1818',
      accent: '#3f82ff',
      accentSoft: 'rgba(63,130,255,0.15)',
      success: '#37db2e',
      successSoft: 'rgba(55,219,46,0.14)',
      successBorder: 'rgba(55,219,46,0.3)',
      warning: '#fdd63c',
      warningSoft: 'rgba(253,214,60,0.16)',
      warningBorder: 'rgba(253,214,60,0.33)',
      critical: '#ff917b',
      criticalSoft: 'rgba(255,145,123,0.15)',
      criticalBorder: 'rgba(255,145,123,0.32)',
      info: '#89b5ff',
      gradientA: 'rgba(39,104,254,0.22)',
      gradientB: 'rgba(253,255,202,0.12)',
      gradientC: 'rgba(55,219,46,0.09)',
      shadowXsBorder: SHADOW_DARK
    }
  },
  {
    id: 'tokyonight',
    name: 'Tokyo Night',
    light: {
      background: '#edf2fb',
      backgroundWeak: '#dfe7f5',
      backgroundStronger: '#f9fbff',
      surfaceBase: 'rgba(24,35,71,0.07)',
      surfaceRaised: 'rgba(255,255,255,0.88)',
      surfaceHover: 'rgba(24,35,71,0.12)',
      surfaceInset: 'rgba(24,35,71,0.08)',
      borderBase: 'rgba(24,35,71,0.2)',
      borderWeak: 'rgba(24,35,71,0.14)',
      borderSelected: '#2b90ff',
      textBase: '#3b4668',
      textWeak: '#5f6990',
      textWeaker: '#7380aa',
      textStrong: '#1c2540',
      textInverse: '#f9fbff',
      buttonPrimary: '#1c2540',
      buttonPrimaryHover: '#161f36',
      buttonPrimaryForeground: '#f9fbff',
      buttonSecondary: '#f9fbff',
      buttonSecondaryHover: '#edf2fb',
      inputBg: '#ffffff',
      accent: '#2b90ff',
      accentSoft: 'rgba(43,144,255,0.16)',
      success: '#2ea86f',
      successSoft: 'rgba(46,168,111,0.13)',
      successBorder: 'rgba(46,168,111,0.32)',
      warning: '#e3a335',
      warningSoft: 'rgba(227,163,53,0.14)',
      warningBorder: 'rgba(227,163,53,0.34)',
      critical: '#d95d76',
      criticalSoft: 'rgba(217,93,118,0.13)',
      criticalBorder: 'rgba(217,93,118,0.33)',
      info: '#2b90ff',
      gradientA: 'rgba(43,144,255,0.24)',
      gradientB: 'rgba(144,112,255,0.2)',
      gradientC: 'rgba(46,168,111,0.11)',
      shadowXsBorder: SHADOW_LIGHT
    },
    dark: {
      background: '#16161e',
      backgroundWeak: '#1d202f',
      backgroundStronger: '#1a1b26',
      surfaceBase: 'rgba(214,222,255,0.06)',
      surfaceRaised: 'rgba(214,222,255,0.035)',
      surfaceHover: 'rgba(214,222,255,0.11)',
      surfaceInset: 'rgba(214,222,255,0.14)',
      borderBase: 'rgba(214,222,255,0.19)',
      borderWeak: 'rgba(214,222,255,0.11)',
      borderSelected: '#7aa2f7',
      textBase: '#a9b1d6',
      textWeak: '#8890b5',
      textWeaker: '#6f7798',
      textStrong: '#d5defa',
      textInverse: '#11121b',
      buttonPrimary: '#d5defa',
      buttonPrimaryHover: '#edf2ff',
      buttonPrimaryForeground: '#11121b',
      buttonSecondary: '#24283b',
      buttonSecondaryHover: '#2b3050',
      inputBg: '#1d202f',
      accent: '#7aa2f7',
      accentSoft: 'rgba(122,162,247,0.17)',
      success: '#9ece6a',
      successSoft: 'rgba(158,206,106,0.14)',
      successBorder: 'rgba(158,206,106,0.32)',
      warning: '#e0af68',
      warningSoft: 'rgba(224,175,104,0.14)',
      warningBorder: 'rgba(224,175,104,0.33)',
      critical: '#f7768e',
      criticalSoft: 'rgba(247,118,142,0.14)',
      criticalBorder: 'rgba(247,118,142,0.33)',
      info: '#7dcfff',
      gradientA: 'rgba(122,162,247,0.22)',
      gradientB: 'rgba(187,154,247,0.16)',
      gradientC: 'rgba(158,206,106,0.1)',
      shadowXsBorder: SHADOW_DARK
    }
  },
  {
    id: 'nord',
    name: 'Nord',
    light: {
      background: '#eceff4',
      backgroundWeak: '#e5e9f0',
      backgroundStronger: '#f8f9fb',
      surfaceBase: 'rgba(59,66,82,0.07)',
      surfaceRaised: 'rgba(255,255,255,0.88)',
      surfaceHover: 'rgba(59,66,82,0.12)',
      surfaceInset: 'rgba(59,66,82,0.08)',
      borderBase: 'rgba(59,66,82,0.2)',
      borderWeak: 'rgba(59,66,82,0.13)',
      borderSelected: '#5e81ac',
      textBase: '#4c566a',
      textWeak: '#616c84',
      textWeaker: '#7d8799',
      textStrong: '#2e3440',
      textInverse: '#f8f9fb',
      buttonPrimary: '#2e3440',
      buttonPrimaryHover: '#262b36',
      buttonPrimaryForeground: '#f8f9fb',
      buttonSecondary: '#f8f9fb',
      buttonSecondaryHover: '#e5e9f0',
      inputBg: '#f8f9fb',
      accent: '#5e81ac',
      accentSoft: 'rgba(94,129,172,0.16)',
      success: '#6c9b55',
      successSoft: 'rgba(108,155,85,0.13)',
      successBorder: 'rgba(108,155,85,0.32)',
      warning: '#c48b3e',
      warningSoft: 'rgba(196,139,62,0.13)',
      warningBorder: 'rgba(196,139,62,0.34)',
      critical: '#bf616a',
      criticalSoft: 'rgba(191,97,106,0.13)',
      criticalBorder: 'rgba(191,97,106,0.33)',
      info: '#5e81ac',
      gradientA: 'rgba(94,129,172,0.24)',
      gradientB: 'rgba(129,161,193,0.2)',
      gradientC: 'rgba(108,155,85,0.1)',
      shadowXsBorder: SHADOW_LIGHT
    },
    dark: {
      background: '#2e3440',
      backgroundWeak: '#3b4252',
      backgroundStronger: '#323a46',
      surfaceBase: 'rgba(236,239,244,0.06)',
      surfaceRaised: 'rgba(236,239,244,0.03)',
      surfaceHover: 'rgba(236,239,244,0.1)',
      surfaceInset: 'rgba(236,239,244,0.14)',
      borderBase: 'rgba(236,239,244,0.19)',
      borderWeak: 'rgba(236,239,244,0.11)',
      borderSelected: '#81a1c1',
      textBase: '#d8dee9',
      textWeak: '#b6c0d2',
      textWeaker: '#94a3be',
      textStrong: '#eceff4',
      textInverse: '#242a35',
      buttonPrimary: '#eceff4',
      buttonPrimaryHover: '#ffffff',
      buttonPrimaryForeground: '#242a35',
      buttonSecondary: '#3b4252',
      buttonSecondaryHover: '#434c5e',
      inputBg: '#323a46',
      accent: '#81a1c1',
      accentSoft: 'rgba(129,161,193,0.17)',
      success: '#a3be8c',
      successSoft: 'rgba(163,190,140,0.14)',
      successBorder: 'rgba(163,190,140,0.32)',
      warning: '#ebcb8b',
      warningSoft: 'rgba(235,203,139,0.14)',
      warningBorder: 'rgba(235,203,139,0.33)',
      critical: '#bf616a',
      criticalSoft: 'rgba(191,97,106,0.14)',
      criticalBorder: 'rgba(191,97,106,0.34)',
      info: '#88c0d0',
      gradientA: 'rgba(129,161,193,0.2)',
      gradientB: 'rgba(136,192,208,0.14)',
      gradientC: 'rgba(163,190,140,0.1)',
      shadowXsBorder: SHADOW_DARK
    }
  },
  {
    id: 'catppuccin',
    name: 'Catppuccin',
    light: {
      background: '#eff1f5',
      backgroundWeak: '#e6e9ef',
      backgroundStronger: '#f7f8fb',
      surfaceBase: 'rgba(76,79,105,0.07)',
      surfaceRaised: 'rgba(255,255,255,0.88)',
      surfaceHover: 'rgba(76,79,105,0.12)',
      surfaceInset: 'rgba(76,79,105,0.08)',
      borderBase: 'rgba(76,79,105,0.21)',
      borderWeak: 'rgba(76,79,105,0.13)',
      borderSelected: '#1e66f5',
      textBase: '#4c4f69',
      textWeak: '#6c6f85',
      textWeaker: '#8c8fa1',
      textStrong: '#303446',
      textInverse: '#f7f8fb',
      buttonPrimary: '#303446',
      buttonPrimaryHover: '#252a39',
      buttonPrimaryForeground: '#f7f8fb',
      buttonSecondary: '#f7f8fb',
      buttonSecondaryHover: '#e6e9ef',
      inputBg: '#f7f8fb',
      accent: '#1e66f5',
      accentSoft: 'rgba(30,102,245,0.16)',
      success: '#40a02b',
      successSoft: 'rgba(64,160,43,0.13)',
      successBorder: 'rgba(64,160,43,0.33)',
      warning: '#df8e1d',
      warningSoft: 'rgba(223,142,29,0.13)',
      warningBorder: 'rgba(223,142,29,0.33)',
      critical: '#d20f39',
      criticalSoft: 'rgba(210,15,57,0.13)',
      criticalBorder: 'rgba(210,15,57,0.33)',
      info: '#179299',
      gradientA: 'rgba(30,102,245,0.23)',
      gradientB: 'rgba(136,57,239,0.17)',
      gradientC: 'rgba(64,160,43,0.11)',
      shadowXsBorder: SHADOW_LIGHT
    },
    dark: {
      background: '#1e1e2e',
      backgroundWeak: '#252537',
      backgroundStronger: '#232335',
      surfaceBase: 'rgba(205,214,244,0.06)',
      surfaceRaised: 'rgba(205,214,244,0.03)',
      surfaceHover: 'rgba(205,214,244,0.11)',
      surfaceInset: 'rgba(205,214,244,0.14)',
      borderBase: 'rgba(205,214,244,0.2)',
      borderWeak: 'rgba(205,214,244,0.11)',
      borderSelected: '#89b4fa',
      textBase: '#cdd6f4',
      textWeak: '#a6adc8',
      textWeaker: '#9399b2',
      textStrong: '#f5e0dc',
      textInverse: '#11111b',
      buttonPrimary: '#f5e0dc',
      buttonPrimaryHover: '#ffffff',
      buttonPrimaryForeground: '#11111b',
      buttonSecondary: '#313244',
      buttonSecondaryHover: '#3b3d52',
      inputBg: '#252537',
      accent: '#89b4fa',
      accentSoft: 'rgba(137,180,250,0.17)',
      success: '#a6e3a1',
      successSoft: 'rgba(166,227,161,0.14)',
      successBorder: 'rgba(166,227,161,0.32)',
      warning: '#f9e2af',
      warningSoft: 'rgba(249,226,175,0.14)',
      warningBorder: 'rgba(249,226,175,0.33)',
      critical: '#f38ba8',
      criticalSoft: 'rgba(243,139,168,0.14)',
      criticalBorder: 'rgba(243,139,168,0.33)',
      info: '#74c7ec',
      gradientA: 'rgba(137,180,250,0.2)',
      gradientB: 'rgba(180,190,254,0.16)',
      gradientC: 'rgba(166,227,161,0.1)',
      shadowXsBorder: SHADOW_DARK
    }
  }
];

const SESSION_OPERATION_DEFINITIONS: SessionOperationDefinition[] = [
  {
    id: 'session-prompt',
    label: 'Prompt (sync)',
    method: 'POST',
    path: '/session/{sessionID}/message',
    template: `{
  "parts": [
    { "type": "text", "text": "Describe the current repo state." }
  ]
}`,
    requiresBody: true
  },
  {
    id: 'session-prompt-async',
    label: 'Prompt (async)',
    method: 'POST',
    path: '/session/{sessionID}/prompt_async',
    template: `{
  "parts": [
    { "type": "text", "text": "Run this in background and summarize changes." }
  ]
}`,
    requiresBody: true
  },
  {
    id: 'session-command',
    label: 'Command',
    method: 'POST',
    path: '/session/{sessionID}/command',
    template: `{
  "command": "review",
  "arguments": "latest changes"
}`,
    requiresBody: true
  },
  {
    id: 'session-shell',
    label: 'Shell',
    method: 'POST',
    path: '/session/{sessionID}/shell',
    template: `{
  "agent": "build",
  "command": "npm run lint"
}`,
    requiresBody: true
  },
  {
    id: 'session-update',
    label: 'Update Session',
    method: 'PATCH',
    path: '/session/{sessionID}',
    template: `{
  "title": "Renamed session"
}`,
    requiresBody: true
  },
  {
    id: 'session-init',
    label: 'Initialize Session',
    method: 'POST',
    path: '/session/{sessionID}/init',
    template: `{
  "providerID": "openai",
  "modelID": "gpt-5",
  "messageID": "msg_..."
}`,
    requiresBody: true
  },
  {
    id: 'session-fork',
    label: 'Fork Session',
    method: 'POST',
    path: '/session/{sessionID}/fork',
    template: `{
  "messageID": "msg_..."
}`,
    requiresBody: false
  },
  {
    id: 'session-revert',
    label: 'Revert',
    method: 'POST',
    path: '/session/{sessionID}/revert',
    template: `{
  "messageID": "msg_..."
}`,
    requiresBody: true
  },
  {
    id: 'session-unrevert',
    label: 'Unrevert',
    method: 'POST',
    path: '/session/{sessionID}/unrevert',
    template: '{}',
    requiresBody: false
  },
  {
    id: 'session-abort',
    label: 'Abort',
    method: 'POST',
    path: '/session/{sessionID}/abort',
    template: '{}',
    requiresBody: false
  },
  {
    id: 'session-share',
    label: 'Share',
    method: 'POST',
    path: '/session/{sessionID}/share',
    template: '{}',
    requiresBody: false
  },
  {
    id: 'session-unshare',
    label: 'Unshare',
    method: 'DELETE',
    path: '/session/{sessionID}/share',
    template: '{}',
    requiresBody: false
  },
  {
    id: 'session-summarize',
    label: 'Summarize',
    method: 'POST',
    path: '/session/{sessionID}/summarize',
    template: `{
  "providerID": "openai",
  "modelID": "gpt-5",
  "auto": false
}`,
    requiresBody: true
  },
  {
    id: 'session-delete',
    label: 'Delete Session',
    method: 'DELETE',
    path: '/session/{sessionID}',
    template: '{}',
    requiresBody: false
  }
];

const TUI_SHORTCUTS = [
  { label: 'Help', path: '/tui/open-help' },
  { label: 'Sessions', path: '/tui/open-sessions' },
  { label: 'Themes', path: '/tui/open-themes' },
  { label: 'Models', path: '/tui/open-models' },
  { label: 'Submit Prompt', path: '/tui/submit-prompt' },
  { label: 'Clear Prompt', path: '/tui/clear-prompt' }
];

const TUI_COMMAND_CHOICES = [
  'session_new',
  'session_share',
  'session_interrupt',
  'session_compact',
  'messages_page_up',
  'messages_page_down',
  'messages_line_up',
  'messages_line_down',
  'messages_half_page_up',
  'messages_half_page_down',
  'messages_first',
  'messages_last',
  'agent_cycle'
];

const COMPOSER_ATTACHMENT_LIMIT = 8;
const COMPOSER_ATTACHMENT_MAX_BYTES = 256_000;
const COMPOSER_TEXT_SNIPPET_LIMIT = 4_000;
const COMPOSER_IMAGE_DATA_URL_LIMIT = 9_000;
const COMPOSER_SUGGESTION_LIMIT = 8;

const TEXT_ATTACHMENT_EXTENSIONS = new Set([
  'txt',
  'md',
  'markdown',
  'json',
  'yaml',
  'yml',
  'xml',
  'csv',
  'ts',
  'tsx',
  'js',
  'jsx',
  'mjs',
  'cjs',
  'html',
  'css',
  'scss',
  'sh',
  'bash',
  'zsh',
  'env',
  'toml',
  'ini',
  'sql',
  'py',
  'go',
  'rs',
  'java',
  'swift',
  'kt',
  'rb'
]);

const COMPOSER_MODE_OPTIONS: Array<{ mode: ComposerMode; label: string; detail: string }> = [
  { mode: 'prompt-sync', label: 'Prompt', detail: '/session/:id/message' },
  { mode: 'prompt-async', label: 'Async Prompt', detail: '/session/:id/prompt_async' },
  { mode: 'command', label: 'Command', detail: '/session/:id/command' },
  { mode: 'shell', label: 'Shell', detail: '/session/:id/shell' }
];

const COMPOSER_SLASH_OPTIONS: Array<{
  id: string;
  label: string;
  detail: string;
  mode: ComposerMode;
}> = [
  { id: 'slash-prompt', label: '/prompt', detail: 'Switch to sync prompt mode', mode: 'prompt-sync' },
  { id: 'slash-async', label: '/async', detail: 'Switch to async prompt mode', mode: 'prompt-async' },
  { id: 'slash-command', label: '/command', detail: 'Switch to command mode', mode: 'command' },
  { id: 'slash-shell', label: '/shell', detail: 'Switch to shell mode', mode: 'shell' }
];

const FILE_MODE_OPTIONS: Array<{ mode: OpenCodeFilesMode; label: string; description: string }> = [
  { mode: 'findText', label: 'Find Text', description: 'Text search via /find' },
  { mode: 'findFile', label: 'Find File', description: 'File search via /find/file' },
  { mode: 'list', label: 'List Files', description: 'Directory listing via /file' },
  { mode: 'content', label: 'Read Content', description: 'File content via /file/content' },
  { mode: 'status', label: 'File Status', description: 'Status checks via /file/status' }
];

function toUniqueStrings(values: string[], limit = 120): string[] {
  const seen = new Set<string>();
  const next: string[] = [];

  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    next.push(trimmed);
    if (next.length >= limit) break;
  }

  return next;
}

function formatBytes(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0 B';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function fileSignature(file: File): string {
  return `${file.name}:${file.size}:${file.type}:${file.lastModified}`;
}

function isTextAttachment(file: File): boolean {
  if (file.type.startsWith('text/')) return true;
  if (
    file.type === 'application/json' ||
    file.type === 'application/xml' ||
    file.type === 'application/javascript' ||
    file.type === 'application/x-sh'
  ) {
    return true;
  }

  const extension = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() ?? '' : '';
  return extension ? TEXT_ATTACHMENT_EXTENSIONS.has(extension) : false;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error(`Unable to read ${file.name}`));
      }
    };
    reader.onerror = () => reject(new Error(`Unable to read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

function collectStringFields(value: unknown, fieldNames: string[], depth = 0, bucket: string[] = []): string[] {
  if (!value || depth > 4) return bucket;
  if (Array.isArray(value)) {
    for (const nested of value) {
      collectStringFields(nested, fieldNames, depth + 1, bucket);
      if (bucket.length >= 240) break;
    }
    return bucket;
  }

  const record = asRecord(value);
  if (!record) return bucket;

  for (const fieldName of fieldNames) {
    const fieldValue = record[fieldName];
    if (typeof fieldValue === 'string') {
      bucket.push(fieldValue);
    }
  }

  for (const nested of Object.values(record)) {
    if (!nested || typeof nested !== 'object') continue;
    collectStringFields(nested, fieldNames, depth + 1, bucket);
    if (bucket.length >= 240) break;
  }

  return bucket;
}

function collectLikelyFilePaths(messages: OpenCodeSessionMessage[]): string[] {
  const pattern = /(?:^|[\s"'`(])((?:\.{1,2}\/)?(?:[A-Za-z0-9._-]+\/)+[A-Za-z0-9._-]+|[A-Za-z0-9._-]+\.[A-Za-z0-9._-]+)(?=$|[\s"'`),:;])/g;
  const matches: string[] = [];

  for (const message of messages) {
    const text = message.text;
    let match: RegExpExecArray | null = pattern.exec(text);
    while (match) {
      const candidate = match[1]?.trim();
      if (
        candidate &&
        !candidate.startsWith('http://') &&
        !candidate.startsWith('https://') &&
        !candidate.startsWith('@')
      ) {
        matches.push(candidate);
      }
      match = pattern.exec(text);
    }
    pattern.lastIndex = 0;
  }

  return toUniqueStrings(matches, 100);
}

function extractComposerToken(value: string, caretPosition: number): ComposerToken | null {
  const safeCaret = Math.max(0, Math.min(caretPosition, value.length));
  const textBeforeCursor = value.slice(0, safeCaret);
  const match = /(?:^|\s)([@/][^\s]*)$/.exec(textBeforeCursor);
  if (!match) return null;

  const raw = match[1];
  const trigger = raw[0];
  if (trigger !== '@' && trigger !== '/') return null;

  return {
    trigger,
    value: raw.slice(1),
    start: safeCaret - raw.length,
    end: safeCaret
  };
}

function appendRawQueryParams(params: URLSearchParams, raw: string): void {
  const trimmed = raw.trim();
  if (!trimmed) return;
  const normalized = trimmed.startsWith('?') ? trimmed.slice(1) : trimmed;
  const extra = new URLSearchParams(normalized);
  for (const [key, value] of extra.entries()) {
    if (!key.trim()) continue;
    params.set(key, value);
  }
}

function summarizeDraftDiff(base: string, draft: string): { changed: boolean; changedLines: number } {
  if (base === draft) return { changed: false, changedLines: 0 };
  const baseLines = base.split('\n');
  const draftLines = draft.split('\n');
  const length = Math.max(baseLines.length, draftLines.length);
  let changedLines = 0;

  for (let index = 0; index < length; index += 1) {
    if ((baseLines[index] ?? '') !== (draftLines[index] ?? '')) {
      changedLines += 1;
    }
  }

  return { changed: true, changedLines };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function prettyJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function extractString(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value;
  }
  return null;
}

function extractIdentifier(value: unknown): string | null {
  const record = asRecord(value);
  if (!record) return null;
  const direct = extractString(record, ['requestID', 'id', 'sessionID']);
  if (direct) return direct;
  const nested = asRecord(record.request);
  if (!nested) return null;
  return extractString(nested, ['requestID', 'id', 'sessionID']);
}

function collectRecords(
  value: unknown,
  depth = 0,
  bucket: Array<Record<string, unknown>> = []
): Array<Record<string, unknown>> {
  if (!value || depth > 4) return bucket;
  if (Array.isArray(value)) {
    for (const item of value) {
      collectRecords(item, depth + 1, bucket);
      if (bucket.length >= 400) break;
    }
    return bucket;
  }

  const record = asRecord(value);
  if (!record) return bucket;

  bucket.push(record);
  for (const nested of Object.values(record)) {
    if (!nested || typeof nested !== 'object') continue;
    collectRecords(nested, depth + 1, bucket);
    if (bucket.length >= 400) break;
  }

  return bucket;
}

function toStringList(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) {
    const strings: string[] = [];
    for (const item of value) {
      if (typeof item === 'string') {
        strings.push(item);
        continue;
      }
      const record = asRecord(item);
      if (!record) continue;
      const candidate = extractString(record, ['id', 'name', 'slug', 'title', 'value']);
      if (candidate) strings.push(candidate);
    }
    return strings;
  }
  return [];
}

function mergeModelOptions(models: ModelOption[]): ModelOption[] {
  const map = new Map<string, ModelOption>();

  for (const model of models) {
    const modelId = model.id.trim();
    if (!modelId) continue;
    const existing = map.get(modelId);
    if (!existing) {
      map.set(modelId, {
        id: modelId,
        label: model.label || modelId,
        variants: toUniqueStrings(model.variants, 64)
      });
      continue;
    }

    existing.variants = toUniqueStrings([...existing.variants, ...model.variants], 64);
    if (!existing.label && model.label) {
      existing.label = model.label;
    }
  }

  return Array.from(map.values()).sort((left, right) => left.label.localeCompare(right.label));
}

function extractModelOptionsFromUnknown(value: unknown): ModelOption[] {
  const models: ModelOption[] = [];

  for (const entry of toStringList(value)) {
    const id = entry.trim();
    if (!id) continue;
    models.push({ id, label: id, variants: [] });
  }

  const records = collectRecords(value);
  for (const record of records) {
    const modelId = extractString(record, ['modelID', 'modelId']);
    const modelLabel = extractString(record, ['name', 'title', 'label']) ?? modelId;
    if (!modelId) continue;
    const variants = toUniqueStrings(
      [
        ...toStringList(record.variants),
        ...toStringList(record.variantIDs),
        ...toStringList(record.variantIds),
        ...toStringList(record.modelVariants)
      ],
      64
    );

    models.push({
      id: modelId,
      label: modelLabel || modelId,
      variants
    });
  }

  return mergeModelOptions(models);
}

function extractProviderOptions(value: unknown): ProviderOption[] {
  const providerMap = new Map<string, ProviderOption>();

  const addProvider = (providerIdRaw: string, providerLabelRaw?: string | null, modelsRaw?: unknown): void => {
    const providerId = providerIdRaw.trim();
    if (!providerId) return;

    const providerLabel = providerLabelRaw?.trim() || providerId;
    const models = extractModelOptionsFromUnknown(modelsRaw);
    const existing = providerMap.get(providerId);

    if (!existing) {
      providerMap.set(providerId, {
        id: providerId,
        label: providerLabel,
        models
      });
      return;
    }

    existing.models = mergeModelOptions([...existing.models, ...models]);
    if (!existing.label && providerLabel) {
      existing.label = providerLabel;
    }
  };

  const rootRecord = asRecord(value);
  if (rootRecord) {
    const providerCollection = rootRecord.providers ?? rootRecord.list ?? rootRecord.items ?? rootRecord.data;
    if (providerCollection !== undefined) {
      const providerItems = Array.isArray(providerCollection) ? providerCollection : [providerCollection];
      for (const providerEntry of providerItems) {
        const providerRecord = asRecord(providerEntry);
        if (!providerRecord) continue;
        const providerId = extractString(providerRecord, ['id', 'providerID', 'providerId', 'slug', 'name']);
        if (!providerId) continue;
        addProvider(providerId, extractString(providerRecord, ['name', 'title', 'label']), providerRecord.models);
      }
    }

    for (const [key, nestedValue] of Object.entries(rootRecord)) {
      if (key === 'providers' || key === 'list' || key === 'items' || key === 'data') continue;
      const nestedRecord = asRecord(nestedValue);
      if (!nestedRecord) continue;
      if (!nestedRecord.models && !nestedRecord.modelIDs && !nestedRecord.modelId && !nestedRecord.modelID) continue;
      const providerId = extractString(nestedRecord, ['id', 'providerID', 'providerId', 'slug']) ?? key;
      addProvider(providerId, extractString(nestedRecord, ['name', 'title', 'label']) ?? key, nestedRecord.models ?? nestedRecord.modelIDs);
    }
  }

  const records = collectRecords(value);
  for (const record of records) {
    const providerId = extractString(record, ['providerID', 'providerId']);
    if (!providerId) continue;
    addProvider(
      providerId,
      extractString(record, ['providerName', 'name', 'title', 'label']),
      record.models ?? record.modelIDs ?? record.modelId
    );
  }

  if (providerMap.size === 0) {
    const fallbackIds = toUniqueStrings(
      collectStringFields(value, ['providerID', 'providerId', 'provider', 'id', 'name', 'slug']).filter((entry) => entry.length <= 80),
      40
    );
    for (const providerId of fallbackIds) {
      addProvider(providerId, providerId, undefined);
    }
  }

  return Array.from(providerMap.values()).sort((left, right) => left.label.localeCompare(right.label));
}

function extractMcpServers(value: unknown): McpServerOption[] {
  const map = new Map<string, McpServerOption>();

  const addServer = (nameRaw: string, input: { label?: string | null; status?: string | null; connected?: boolean | null; resources?: unknown }): void => {
    const name = nameRaw.trim();
    if (!name) return;

    const label = input.label?.trim() || name;
    const resources = toUniqueStrings(toStringList(input.resources), 80);
    const existing = map.get(name);
    if (!existing) {
      map.set(name, {
        name,
        label,
        status: input.status ?? null,
        connected: typeof input.connected === 'boolean' ? input.connected : null,
        resources
      });
      return;
    }

    existing.resources = toUniqueStrings([...existing.resources, ...resources], 80);
    if (!existing.status && input.status) existing.status = input.status;
    if (existing.connected === null && typeof input.connected === 'boolean') {
      existing.connected = input.connected;
    }
    if (!existing.label && label) existing.label = label;
  };

  const rootRecord = asRecord(value);
  if (rootRecord) {
    const serverCollection = rootRecord.servers ?? rootRecord.list ?? rootRecord.items ?? rootRecord.data;
    if (serverCollection !== undefined) {
      const serverItems = Array.isArray(serverCollection) ? serverCollection : [serverCollection];
      for (const serverEntry of serverItems) {
        const serverRecord = asRecord(serverEntry);
        if (!serverRecord) continue;
        const serverName = extractString(serverRecord, ['name', 'id', 'server']);
        if (!serverName) continue;
        const status = extractString(serverRecord, ['status', 'state']);
        const connected =
          typeof serverRecord.connected === 'boolean'
            ? serverRecord.connected
            : typeof serverRecord.active === 'boolean'
              ? serverRecord.active
              : typeof serverRecord.enabled === 'boolean'
                ? serverRecord.enabled
                : null;
        addServer(serverName, {
          label: extractString(serverRecord, ['title', 'label', 'name']),
          status,
          connected,
          resources: serverRecord.resources
        });
      }
    }

    for (const [key, nestedValue] of Object.entries(rootRecord)) {
      if (key === 'servers' || key === 'list' || key === 'items' || key === 'data') continue;
      const nestedRecord = asRecord(nestedValue);
      if (!nestedRecord) continue;
      if (!nestedRecord.resources && !nestedRecord.status && !nestedRecord.state) continue;
      const serverName = extractString(nestedRecord, ['name', 'id', 'server']) ?? key;
      const status = extractString(nestedRecord, ['status', 'state']);
      const connected =
        typeof nestedRecord.connected === 'boolean'
          ? nestedRecord.connected
          : typeof nestedRecord.active === 'boolean'
            ? nestedRecord.active
            : typeof nestedRecord.enabled === 'boolean'
              ? nestedRecord.enabled
              : null;
      addServer(serverName, {
        label: extractString(nestedRecord, ['title', 'label']) ?? key,
        status,
        connected,
        resources: nestedRecord.resources
      });
    }
  }

  const records = collectRecords(value);
  for (const record of records) {
    const hasMcpShape = 'resources' in record || 'status' in record || 'state' in record || 'connected' in record;
    if (!hasMcpShape) continue;
    const serverName = extractString(record, ['name', 'id', 'server']);
    if (!serverName) continue;
    const status = extractString(record, ['status', 'state']);
    const connected =
      typeof record.connected === 'boolean'
        ? record.connected
        : typeof record.active === 'boolean'
          ? record.active
          : typeof record.enabled === 'boolean'
            ? record.enabled
            : null;

    addServer(serverName, {
      label: extractString(record, ['title', 'label', 'name']),
      status,
      connected,
      resources: record.resources
    });
  }

  return Array.from(map.values()).sort((left, right) => left.label.localeCompare(right.label));
}

function parseEventJson(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

function findSessionId(value: unknown, depth = 0): string | null {
  if (depth > 4) return null;
  const record = asRecord(value);
  if (!record) return null;

  const direct = extractString(record, ['sessionId', 'sessionID', 'session_id', 'id', 'session']);
  if (direct && direct.startsWith('ses_')) return direct;

  for (const nested of Object.values(record)) {
    if (!nested || typeof nested !== 'object') continue;
    const found = findSessionId(nested, depth + 1);
    if (found) return found;
  }

  return null;
}

function extractNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function summarizeTodoItems(value: unknown): { total: number; done: number; open: number } {
  const stack: unknown[] = Array.isArray(value) ? value : [value];
  let total = 0;
  let done = 0;

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;

    if (Array.isArray(current)) {
      for (const entry of current) stack.push(entry);
      continue;
    }

    const record = asRecord(current);
    if (!record) continue;

    const looksLikeTodo =
      typeof record.title === 'string' ||
      typeof record.text === 'string' ||
      typeof record.content === 'string' ||
      typeof record.status === 'string' ||
      typeof record.done === 'boolean';

    if (looksLikeTodo) {
      total += 1;
      const status = typeof record.status === 'string' ? record.status.toLowerCase() : '';
      const state = typeof record.state === 'string' ? record.state.toLowerCase() : '';
      const completed =
        record.done === true ||
        status === 'done' ||
        status === 'completed' ||
        status === 'complete' ||
        state === 'done' ||
        state === 'completed' ||
        state === 'complete';
      if (completed) done += 1;
    }

    for (const nested of Object.values(record)) {
      if (nested && typeof nested === 'object') {
        stack.push(nested);
      }
    }
  }

  return {
    total,
    done,
    open: Math.max(0, total - done)
  };
}

function summarizeDiff(value: unknown): { files: number | null; additions: number | null; deletions: number | null } {
  const record = asRecord(value);
  if (!record) {
    return { files: null, additions: null, deletions: null };
  }

  const summary = asRecord(record.summary) ?? record;
  const files = extractNumber(summary.files ?? summary.filesChanged ?? summary.fileCount);
  const additions = extractNumber(summary.additions ?? summary.added ?? summary.insertions);
  const deletions = extractNumber(summary.deletions ?? summary.removed ?? summary.removals);

  return { files, additions, deletions };
}

function summarizeSessionUsage(value: unknown): { context: number | null; cost: number | null } {
  const record = asRecord(value);
  if (!record) return { context: null, cost: null };

  const context =
    extractNumber(record.contextTokens) ??
    extractNumber(record.context) ??
    extractNumber(record.promptTokens) ??
    extractNumber(record.tokens);
  const cost = extractNumber(record.costUsd) ?? extractNumber(record.cost) ?? extractNumber(record.estimatedCostUsd);
  return { context, cost };
}

function resolveSessionPath(templatePath: string, sessionId: string): string {
  return templatePath.replaceAll('{sessionID}', encodeURIComponent(sessionId));
}

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
  if (role === 'assistant') return 'border-[var(--info)]/40 bg-[var(--accent-soft)] text-[var(--info)]';
  if (role === 'user') return 'border-[var(--success-border)] bg-[var(--success-soft)] text-[var(--success)]';
  if (role === 'system') return 'border-[var(--warning-border)] bg-[var(--warning-soft)] text-[var(--warning)]';
  if (role === 'tool') return 'border-[var(--border-selected)]/45 bg-[var(--accent-soft)] text-[var(--accent)]';
  return 'border-[var(--border-weak)] bg-[var(--surface-base)] text-[var(--text-weak)]';
}

function toThemeStyle(theme: ThemePalette): ThemeStyle {
  return {
    '--background': theme.background,
    '--background-weak': theme.backgroundWeak,
    '--background-stronger': theme.backgroundStronger,
    '--surface-base': theme.surfaceBase,
    '--surface-raised': theme.surfaceRaised,
    '--surface-hover': theme.surfaceHover,
    '--surface-inset': theme.surfaceInset,
    '--border-base': theme.borderBase,
    '--border-weak': theme.borderWeak,
    '--border-selected': theme.borderSelected,
    '--text-base': theme.textBase,
    '--text-weak': theme.textWeak,
    '--text-weaker': theme.textWeaker,
    '--text-strong': theme.textStrong,
    '--text-inverse': theme.textInverse,
    '--button-primary': theme.buttonPrimary,
    '--button-primary-hover': theme.buttonPrimaryHover,
    '--button-primary-foreground': theme.buttonPrimaryForeground,
    '--button-secondary': theme.buttonSecondary,
    '--button-secondary-hover': theme.buttonSecondaryHover,
    '--input-bg': theme.inputBg,
    '--accent': theme.accent,
    '--accent-soft': theme.accentSoft,
    '--success': theme.success,
    '--success-soft': theme.successSoft,
    '--success-border': theme.successBorder,
    '--warning': theme.warning,
    '--warning-soft': theme.warningSoft,
    '--warning-border': theme.warningBorder,
    '--critical': theme.critical,
    '--critical-soft': theme.criticalSoft,
    '--critical-border': theme.criticalBorder,
    '--info': theme.info,
    '--gradient-a': theme.gradientA,
    '--gradient-b': theme.gradientB,
    '--gradient-c': theme.gradientC,
    '--shadow-xs-border': theme.shadowXsBorder
  };
}

export default function OpenCodeMonitorPage() {
  const [monitor, setMonitor] = useState<OpenCodeMonitorSnapshot | null>(null);
  const [engine, setEngine] = useState<OpenCodeStatus | null>(null);
  const [engineState, setEngineState] = useState<EngineState>('checking');
  const [monitorError, setMonitorError] = useState<string | null>(null);
  const [isMonitorLoading, setIsMonitorLoading] = useState(false);

  const [sessionDetail, setSessionDetail] = useState<OpenCodeSessionDetail | null>(null);
  const [sessionTimeline, setSessionTimeline] = useState<OpenCodeSessionTimeline | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isSessionDetailLoading, setIsSessionDetailLoading] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [sessionSearch, setSessionSearch] = useState('');
  const [isTimelineLoading, setIsTimelineLoading] = useState(false);
  const [timelineError, setTimelineError] = useState<string | null>(null);

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
  const [eventConnectionState, setEventConnectionState] = useState<EventConnectionState>('connecting');
  const [eventConnectionError, setEventConnectionError] = useState<string | null>(null);
  const [eventDebugFilter, setEventDebugFilter] = useState<'all' | 'instance' | 'global' | 'bridge'>('all');
  const [eventDebugEvents, setEventDebugEvents] = useState<OpenCodeDebugEvent[]>([]);
  const [isTranscriptRunning, setIsTranscriptRunning] = useState(false);
  const [transcriptError, setTranscriptError] = useState<string | null>(null);

  const activeSessionIdRef = useRef<string | null>(null);
  const refreshMonitorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshSessionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const composerTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const composerAttachmentInputRef = useRef<HTMLInputElement | null>(null);

  const callControl = useCallback(
    async (input: {
      path: string;
      method?: OpenCodeHttpMethod;
      body?: unknown;
      timeoutMs?: number;
      parseSsePayload?: boolean;
    }): Promise<OpenCodeControlResponse> => {
      const response = await fetch('/api/opencode/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: input.path,
          method: input.method ?? 'GET',
          body: input.body,
          timeoutMs: input.timeoutMs,
          parseSsePayload: input.parseSsePayload === true,
          autostart: true
        })
      });

      const payload = (await response.json()) as OpenCodeControlResponse | { error?: string };
      if (
        payload &&
        typeof payload === 'object' &&
        'ok' in payload &&
        'status' in payload &&
        'contentType' in payload
      ) {
        return payload as OpenCodeControlResponse;
      }

      const message =
        typeof (payload as { error?: string }).error === 'string'
          ? (payload as { error?: string }).error
          : `OpenCode control request failed with status ${response.status}`;
      throw new Error(message);
    },
    []
  );

  const refreshMonitor = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) setIsMonitorLoading(true);

    try {
      const response = await fetch(
        '/api/opencode/monitor?sessionLimit=120&autostart=0&include=providers,agents,skills,commands,path,vcs,mcp,openapi',
        { cache: 'no-store' }
      );
      const payload = (await response.json()) as OpenCodeMonitorSnapshot | { error?: string };
      if (!response.ok) {
        throw new Error((payload as { error?: string }).error || 'Failed to fetch OpenCode monitor snapshot.');
      }

      const snapshot = payload as OpenCodeMonitorSnapshot;
      setMonitor(snapshot);
      setEngine(snapshot.status);
      setMonitorError(null);
      setEngineState(snapshot.status.running ? 'ready' : 'offline');
      setActiveSessionId((current) => {
        if (current && snapshot.sessions.sessions.some((session) => session.id === current)) return current;
        return snapshot.sessions.sessions[0]?.id || null;
      });
    } catch (error) {
      setMonitorError(error instanceof Error ? error.message : 'Unable to load monitor snapshot.');
      setEngineState('error');
    } finally {
      if (!options?.silent) setIsMonitorLoading(false);
    }
  }, []);

  const refreshSessionDetail = useCallback(async (sessionId: string, options?: { silent?: boolean }) => {
    if (!sessionId) return;
    if (!options?.silent) setIsSessionDetailLoading(true);

    try {
      const response = await fetch(
        `/api/opencode/sessions?sessionId=${encodeURIComponent(sessionId)}&messageLimit=160&include=messages,todo,diff,children`,
        {
          cache: 'no-store'
        }
      );
      const payload = (await response.json()) as OpenCodeSessionDetail | { error?: string };
      if (!response.ok) {
        throw new Error((payload as { error?: string }).error || `Failed to load session ${sessionId}.`);
      }
      setSessionDetail(payload as OpenCodeSessionDetail);
      setSessionError(null);
    } catch (error) {
      setSessionError(error instanceof Error ? error.message : 'Unable to load session detail.');
    } finally {
      if (!options?.silent) setIsSessionDetailLoading(false);
    }
  }, []);

  const refreshSessionTimeline = useCallback(async (sessionId: string, options?: { silent?: boolean }) => {
    if (!sessionId) return;
    if (!options?.silent) setIsTimelineLoading(true);

    try {
      const response = await fetch(`/api/opencode/session/${encodeURIComponent(sessionId)}/timeline`, {
        cache: 'no-store'
      });
      const payload = (await response.json()) as OpenCodeSessionTimeline | { error?: string };
      if (!response.ok) {
        throw new Error((payload as { error?: string }).error || `Failed to load session timeline for ${sessionId}.`);
      }
      setSessionTimeline(payload as OpenCodeSessionTimeline);
      setTimelineError(null);
    } catch (error) {
      setTimelineError(error instanceof Error ? error.message : 'Unable to load timeline.');
    } finally {
      if (!options?.silent) setIsTimelineLoading(false);
    }
  }, []);

  const pushDebugEvent = useCallback((event: Omit<OpenCodeDebugEvent, 'id' | 'timestamp'>) => {
    const timestamp = new Date().toISOString();
    const id = `${timestamp}-${Math.random().toString(36).slice(2, 8)}`;
    setEventDebugEvents((current) => {
      const next = [{ ...event, id, timestamp }, ...current];
      return next.slice(0, DEBUG_EVENT_LIMIT);
    });
  }, []);

  const scheduleMonitorRefreshFromEvent = useCallback(
    (payload: unknown) => {
      if (refreshMonitorTimerRef.current) return;
      refreshMonitorTimerRef.current = setTimeout(() => {
        refreshMonitorTimerRef.current = null;
        void refreshMonitor({ silent: true });
      }, 550);

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
      setEventConnectionState('connecting');
      setEventConnectionError(null);

      source = new EventSource('/api/opencode/events?scope=both&autostart=0');

      source.addEventListener('ready', (event) => {
        const payload = parseEventJson(event.data);
        setEventConnectionState('connected');
        pushDebugEvent({
          streamEvent: 'ready',
          source: 'bridge',
          seq: null,
          eventType: 'ready',
          sessionId: null,
          payload
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

        scheduleMonitorRefreshFromEvent(nestedPayload);
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
        setEventConnectionState('error');
        setEventConnectionError('Event stream disconnected. Using polling fallback and retrying.');

        pushDebugEvent({
          streamEvent: 'error',
          source: 'bridge',
          seq: null,
          eventType: 'connection_error',
          sessionId: null,
          payload: { message: 'Event stream disconnected.' }
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
  }, [pushDebugEvent, scheduleMonitorRefreshFromEvent]);

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
  }, [activeSessionId, eventConnectionState, refreshSessionDetail, refreshSessionTimeline]);

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

  useEffect(() => {
    if (projectCandidates.length === 0) {
      if (selectedProjectCandidate) setSelectedProjectCandidate('');
      return;
    }
    if (projectCandidates.includes(selectedProjectCandidate)) return;
    setSelectedProjectCandidate(projectCandidates[0]);
  }, [projectCandidates, selectedProjectCandidate]);

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
    refreshSessionTimeline
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
    [activeSessionId, callControl, isOperationRunning, refreshMonitor, refreshSessionDetail, refreshSessionTimeline]
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
      const response = await fetch(
        `/api/opencode/session/${encodeURIComponent(activeSessionId)}/transcript?toolDetails=1&assistantMetadata=1`,
        {
          cache: 'no-store'
        }
      );
      const payload = (await response.json()) as OpenCodeSessionTranscript | { error?: string };
      if (!response.ok) {
        throw new Error((payload as { error?: string }).error || 'Failed to build transcript.');
      }
      const transcript = payload as OpenCodeSessionTranscript;
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
      const response = await fetch(
        `/api/opencode/session/${encodeURIComponent(activeSessionId)}/transcript?toolDetails=1&assistantMetadata=1`,
        {
          cache: 'no-store'
        }
      );
      const payload = (await response.json()) as OpenCodeSessionTranscript | { error?: string };
      if (!response.ok) {
        throw new Error((payload as { error?: string }).error || 'Failed to export transcript.');
      }

      const transcript = payload as OpenCodeSessionTranscript;
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

      const response = await fetch(`/api/opencode/files?${params.toString()}`, {
        cache: 'no-store'
      });
      const payload = (await response.json()) as OpenCodeFilesResponse | { error?: string };
      if (!response.ok) {
        throw new Error((payload as { error?: string }).error || 'Files request failed.');
      }

      const parsed = payload as OpenCodeFilesResponse;
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
      const response = await fetch('/api/opencode/system?include=project,project/current&autostart=0', {
        cache: 'no-store'
      });
      const payload = (await response.json()) as OpenCodeSystemSnapshotResponse | { error?: string };
      if (!response.ok) {
        throw new Error((payload as { error?: string }).error || 'Failed to load project snapshot.');
      }
      setSystemSnapshot(payload as OpenCodeSystemSnapshotResponse);
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
    [callControl, refreshMonitor, runtimeControlsLocked]
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

  const refreshConfigEditor = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setIsConfigBusy(true);
    }
    setConfigError(null);

    try {
      const response = await fetch('/api/opencode/system?include=config,global/config&autostart=0', {
        cache: 'no-store'
      });
      const payload = (await response.json()) as OpenCodeSystemSnapshotResponse | { error?: string };
      if (!response.ok) {
        throw new Error((payload as { error?: string }).error || 'Unable to read config snapshot.');
      }

      const snapshot = payload as OpenCodeSystemSnapshotResponse;
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
      refreshMonitor
    ]
  );

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
                  Full OpenCode Monitor
                </h1>
                <p className="max-w-3xl text-[13px] text-[var(--text-weak)] md:text-[14px]">
                  Session control, approvals, TUI commands, and raw API execution are all surfaced in one local-first
                  dashboard.
                </p>
              </div>

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
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
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
            </div>
          </CardHeader>
        </Card>

        <div className="mt-4 grid gap-4 xl:grid-cols-[390px_minmax(0,1fr)]">
          <aside className="space-y-4">
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
                  return (
                    <div key={requestId} className="rounded-lg border border-[var(--border-weak)] bg-[var(--surface-base)] p-3">
                      <p className="oc-mono text-[11px] text-[var(--text-weak)]">{requestId}</p>
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
                  return (
                    <div key={requestId} className="rounded-lg border border-[var(--border-weak)] bg-[var(--surface-base)] p-3">
                      <p className="oc-mono text-[11px] text-[var(--text-weak)]">{requestId}</p>
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
                            </div>
                          </div>

                          <div className="mt-2 grid gap-1 text-[11px] text-[var(--text-weak)] sm:grid-cols-2">
                            <p>Created: {formatDateTime(sessionDetail.session.createdAt)}</p>
                            <p>Updated: {formatDateTime(sessionDetail.session.updatedAt)}</p>
                            <p>Total messages: {sessionDetail.messageCount}</p>
                            <p>Active tool calls: {sessionDetail.activeToolCalls}</p>
                          </div>
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
          </section>
        </div>
      </div>

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
