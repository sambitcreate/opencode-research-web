'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Database,
  LoaderCircle,
  MonitorCog,
  Moon,
  Palette,
  RefreshCw,
  Search,
  SendHorizontal,
  Server,
  Sun
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

type ColorScheme = 'system' | 'light' | 'dark';
type ResolvedScheme = 'light' | 'dark';
type EngineState = 'checking' | 'offline' | 'booting' | 'ready' | 'error';

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
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isSessionDetailLoading, setIsSessionDetailLoading] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [sessionSearch, setSessionSearch] = useState('');

  const [newSessionTitle, setNewSessionTitle] = useState('');
  const [newSessionParent, setNewSessionParent] = useState('');
  const [quickPrompt, setQuickPrompt] = useState('');
  const [quickPromptMode, setQuickPromptMode] = useState<'sync' | 'async'>('sync');

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

  const [themeId, setThemeId] = useState<string>('oc-1');
  const [colorScheme, setColorScheme] = useState<ColorScheme>('system');
  const [systemPrefersDark, setSystemPrefersDark] = useState(true);

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
      const response = await fetch('/api/opencode/monitor?sessionLimit=120&autostart=0', { cache: 'no-store' });
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
        `/api/opencode/sessions?sessionId=${encodeURIComponent(sessionId)}&messageLimit=160`,
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
    void refreshMonitor();
    const timer = setInterval(() => {
      void refreshMonitor({ silent: true });
    }, 12000);
    return () => clearInterval(timer);
  }, [refreshMonitor]);

  useEffect(() => {
    if (!activeSessionId) {
      setSessionDetail(null);
      return;
    }
    void refreshSessionDetail(activeSessionId);
    const timer = setInterval(() => {
      void refreshSessionDetail(activeSessionId, { silent: true });
    }, 9000);
    return () => clearInterval(timer);
  }, [activeSessionId, refreshSessionDetail]);

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

  const handleSendPrompt = async () => {
    if (!activeSessionId || !quickPrompt.trim()) return;

    setIsOperationRunning(true);
    setOperationError(null);
    setEngineState('booting');

    try {
      const path =
        quickPromptMode === 'async'
          ? `/session/${encodeURIComponent(activeSessionId)}/prompt_async`
          : `/session/${encodeURIComponent(activeSessionId)}/message`;
      const response = await callControl({
        path,
        method: 'POST',
        body: {
          parts: [{ type: 'text', text: quickPrompt.trim() }]
        }
      });
      setOperationResult(response);
      if (!response.ok) {
        throw new Error(response.text || 'OpenCode prompt failed.');
      }

      setQuickPrompt('');
      await Promise.all([
        refreshMonitor({ silent: true }),
        refreshSessionDetail(activeSessionId, { silent: true })
      ]);
      setEngineState('ready');
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : 'Prompt submission failed.');
      setEngineState('error');
    } finally {
      setIsOperationRunning(false);
    }
  };

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
      }

      await refreshMonitor({ silent: true });
      if (activeSessionId && selectedOperation.id !== 'session-delete') {
        await refreshSessionDetail(activeSessionId, { silent: true });
      }
      setEngineState('ready');
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : 'Session operation failed.');
      setEngineState('error');
    } finally {
      setIsOperationRunning(false);
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
      if (activeSessionId) await refreshSessionDetail(activeSessionId, { silent: true });
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
      if (activeSessionId) await refreshSessionDetail(activeSessionId, { silent: true });
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
      if (activeSessionId) await refreshSessionDetail(activeSessionId, { silent: true });
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
      if (activeSessionId) await refreshSessionDetail(activeSessionId, { silent: true });
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'API request failed.');
      setEngineState('error');
    } finally {
      setIsApiRunning(false);
    }
  };

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
                  <Textarea
                    value={quickPrompt}
                    onChange={(event) => setQuickPrompt(event.target.value)}
                    placeholder={activeSessionId ? 'Prompt selected session...' : 'Select a session to prompt'}
                    className="h-28 resize-none"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={quickPromptMode}
                      onChange={(event) => setQuickPromptMode(event.target.value as 'sync' | 'async')}
                      className="h-9 rounded-lg border border-[var(--border-base)] bg-[var(--surface-raised)] px-3 text-[12px] text-[var(--text-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-selected)]/60"
                    >
                      <option value="sync">Sync Prompt</option>
                      <option value="async">Async Prompt</option>
                    </select>
                    <Button
                      variant="secondary"
                      onClick={handleSendPrompt}
                      disabled={!activeSessionId || !quickPrompt.trim() || isOperationRunning}
                    >
                      {isOperationRunning ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
                      Send
                    </Button>
                  </div>
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
                          <p className="text-[13px] font-medium text-[var(--text-strong)]">{sessionDetail.session.title}</p>
                          <p className="oc-mono mt-1 text-[11px] text-[var(--text-weak)]">{sessionDetail.session.id}</p>
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
                              <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[11px]">
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
    </div>
  );
}
