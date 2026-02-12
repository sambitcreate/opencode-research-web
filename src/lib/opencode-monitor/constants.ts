import type {
  ComposerMode,
  OpenCodeEndpointDefinition,
  OpenCodeFilesMode,
  OpenCodeHttpMethod,
  OpenCodeSessionSummary,
  SessionOperationDefinition,
  ThemeDefinition
} from './types';

export const EMPTY_SESSIONS: OpenCodeSessionSummary[] = [];
export const EMPTY_OPENAPI_ENDPOINTS: OpenCodeEndpointDefinition[] = [];
export const DEFAULT_API_METHODS: OpenCodeHttpMethod[] = ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'];
export const DEBUG_EVENT_LIMIT = 120;
export const MONITOR_POLL_MS_DISCONNECTED = 12_000;
export const MONITOR_POLL_MS_CONNECTED = 45_000;
export const SESSION_POLL_MS_DISCONNECTED = 9_000;
export const SESSION_POLL_MS_CONNECTED = 30_000;
export const EVENT_REFRESH_NONE = new Set(['ready', 'heartbeat', 'ping', 'noop']);
export const EVENT_REFRESH_MONITOR_ONLY_TYPES = new Set([
  'provider',
  'providers',
  'pty',
  'mcp',
  'project',
  'projects',
  'config',
  'path',
  'vcs',
  'lsp',
  'formatter'
]);
export const EVENT_REFRESH_MONITOR_ONLY_PREFIXES = [
  'provider.',
  'providers.',
  'pty.',
  'mcp.',
  'project.',
  'projects.',
  'config.',
  'path.',
  'vcs.',
  'lsp.',
  'formatter.'
];
export const EVENT_REFRESH_MONITOR_AND_SESSION_TYPES = new Set([
  'message',
  'messages',
  'session',
  'sessions',
  'todo',
  'diff',
  'permission',
  'question',
  'tool'
]);
export const EVENT_REFRESH_MONITOR_AND_SESSION_PREFIXES = [
  'message.',
  'messages.',
  'session.',
  'sessions.',
  'todo.',
  'diff.',
  'permission.',
  'question.',
  'tool.',
  'prompt.',
  'command.',
  'shell.'
];

export const SHADOW_DARK =
  '0 0 0 1px rgba(252,251,251,0.16), 0 1px 2px -1px rgba(0,0,0,0.26), 0 1px 2px 0 rgba(0,0,0,0.22), 0 2px 6px 0 rgba(0,0,0,0.18)';
export const SHADOW_LIGHT =
  '0 0 0 1px rgba(11,6,0,0.12), 0 1px 2px -1px rgba(19,16,16,0.05), 0 1px 2px 0 rgba(19,16,16,0.07), 0 2px 6px 0 rgba(19,16,16,0.1)';

export const THEME_DEFINITIONS: ThemeDefinition[] = [
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

export const SESSION_OPERATION_DEFINITIONS: SessionOperationDefinition[] = [
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

export const TUI_SHORTCUTS = [
  { label: 'Help', path: '/tui/open-help' },
  { label: 'Sessions', path: '/tui/open-sessions' },
  { label: 'Themes', path: '/tui/open-themes' },
  { label: 'Models', path: '/tui/open-models' },
  { label: 'Submit Prompt', path: '/tui/submit-prompt' },
  { label: 'Clear Prompt', path: '/tui/clear-prompt' }
];

export const TUI_COMMAND_CHOICES = [
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

export const COMPOSER_ATTACHMENT_LIMIT = 8;
export const COMPOSER_ATTACHMENT_MAX_BYTES = 256_000;
export const COMPOSER_TEXT_SNIPPET_LIMIT = 4_000;
export const COMPOSER_IMAGE_DATA_URL_LIMIT = 9_000;
export const COMPOSER_SUGGESTION_LIMIT = 8;
export const PTY_OUTPUT_CHAR_LIMIT = 180_000;
export const PTY_RECONNECT_BASE_MS = 900;
export const PTY_RECONNECT_MAX_MS = 12_000;

export const TEXT_ATTACHMENT_EXTENSIONS = new Set([
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

export const COMPOSER_MODE_OPTIONS: Array<{ mode: ComposerMode; label: string; detail: string }> = [
  { mode: 'prompt-sync', label: 'Prompt', detail: '/session/:id/message' },
  { mode: 'prompt-async', label: 'Async Prompt', detail: '/session/:id/prompt_async' },
  { mode: 'command', label: 'Command', detail: '/session/:id/command' },
  { mode: 'shell', label: 'Shell', detail: '/session/:id/shell' }
];

export const COMPOSER_SLASH_OPTIONS: Array<{
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

export const FILE_MODE_OPTIONS: Array<{ mode: OpenCodeFilesMode; label: string; description: string }> = [
  { mode: 'findText', label: 'Find Text', description: 'Text search via /find' },
  { mode: 'findFile', label: 'Find File', description: 'File search via /find/file' },
  { mode: 'list', label: 'List Files', description: 'Directory listing via /file' },
  { mode: 'content', label: 'Read Content', description: 'File content via /file/content' },
  { mode: 'status', label: 'File Status', description: 'Status checks via /file/status' }
];
