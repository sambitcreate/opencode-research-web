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
    name: 'OC-1 (Solid)',
    light: {
      background: '#ffffff',
      backgroundWeak: '#f4f4f4',
      backgroundStronger: '#fafafa',
      surfaceBase: '#f4f4f4',
      surfaceRaised: '#ffffff',
      surfaceHover: '#eeeeee',
      surfaceInset: '#f0f0f0',
      borderBase: '#dcdcdc',
      borderWeak: '#eaeaea',
      borderSelected: '#004aff',
      textBase: '#444444',
      textWeak: '#777777',
      textWeaker: '#999999',
      textStrong: '#000000',
      textInverse: '#ffffff',
      buttonPrimary: '#000000',
      buttonPrimaryHover: '#222222',
      buttonPrimaryForeground: '#ffffff',
      buttonSecondary: '#ffffff',
      buttonSecondaryHover: '#f0f0f0',
      inputBg: '#ffffff',
      accent: '#034cff',
      accentSoft: '#eef2ff',
      success: '#008600',
      successSoft: '#eafce8',
      successBorder: '#008600',
      warning: '#b57f00',
      warningSoft: '#fff8e0',
      warningBorder: '#b57f00',
      critical: '#d61d00',
      criticalSoft: '#ffe8e5',
      criticalBorder: '#d61d00',
      info: '#1251ec',
      gradientA: 'transparent',
      gradientB: 'transparent',
      gradientC: 'transparent',
      shadowXsBorder: SHADOW_LIGHT
    },
    dark: {
      background: '#111111',
      backgroundWeak: '#1a1a1a',
      backgroundStronger: '#0a0a0a',
      surfaceBase: '#1a1a1a',
      surfaceRaised: '#222222',
      surfaceHover: '#2a2a2a',
      surfaceInset: '#151515',
      borderBase: '#333333',
      borderWeak: '#262626',
      borderSelected: '#3f82ff',
      textBase: '#e0e0e0',
      textWeak: '#a0a0a0',
      textWeaker: '#666666',
      textStrong: '#ffffff',
      textInverse: '#000000',
      buttonPrimary: '#ffffff',
      buttonPrimaryHover: '#e0e0e0',
      buttonPrimaryForeground: '#000000',
      buttonSecondary: '#2a2a2a',
      buttonSecondaryHover: '#333333',
      inputBg: '#151515',
      accent: '#3f82ff',
      accentSoft: '#1a2a44',
      success: '#2ea043',
      successSoft: '#1a2e20',
      successBorder: '#2ea043',
      warning: '#f1c40f',
      warningSoft: '#332b00',
      warningBorder: '#f1c40f',
      critical: '#ff5252',
      criticalSoft: '#3a1515',
      criticalBorder: '#ff5252',
      info: '#3f82ff',
      gradientA: 'transparent',
      gradientB: 'transparent',
      gradientC: 'transparent',
      shadowXsBorder: SHADOW_DARK
    }
  },
  {
    id: 'tokyonight',
    name: 'Tokyo Night (Solid)',
    light: {
      background: '#e1e5ea',
      backgroundWeak: '#d5d9e0',
      backgroundStronger: '#ebf0f7',
      surfaceBase: '#d5d9e0',
      surfaceRaised: '#ffffff',
      surfaceHover: '#e8ecf2',
      surfaceInset: '#cfd4db',
      borderBase: '#bcc2cc',
      borderWeak: '#d0d5dd',
      borderSelected: '#3d59a1',
      textBase: '#4a5578',
      textWeak: '#7885a8',
      textWeaker: '#9aa5c4',
      textStrong: '#1a1b26',
      textInverse: '#ffffff',
      buttonPrimary: '#3d59a1',
      buttonPrimaryHover: '#2f4580',
      buttonPrimaryForeground: '#ffffff',
      buttonSecondary: '#ffffff',
      buttonSecondaryHover: '#e8ecf2',
      inputBg: '#ffffff',
      accent: '#3d59a1',
      accentSoft: '#e6ebf7',
      success: '#485e30',
      successSoft: '#eff5ea',
      successBorder: '#485e30',
      warning: '#8f5e15',
      warningSoft: '#fbf5e6',
      warningBorder: '#8f5e15',
      critical: '#8c4351',
      criticalSoft: '#faebee',
      criticalBorder: '#8c4351',
      info: '#2ac3de',
      gradientA: 'transparent',
      gradientB: 'transparent',
      gradientC: 'transparent',
      shadowXsBorder: SHADOW_LIGHT
    },
    dark: {
      background: '#1a1b26',
      backgroundWeak: '#16161e',
      backgroundStronger: '#24283b',
      surfaceBase: '#16161e',
      surfaceRaised: '#1f2335',
      surfaceHover: '#292e42',
      surfaceInset: '#15161e',
      borderBase: '#292e42',
      borderWeak: '#1f2335',
      borderSelected: '#7aa2f7',
      textBase: '#a9b1d6',
      textWeak: '#787c99',
      textWeaker: '#565f89',
      textStrong: '#c0caf5',
      textInverse: '#15161e',
      buttonPrimary: '#7aa2f7',
      buttonPrimaryHover: '#9ab8f7',
      buttonPrimaryForeground: '#1a1b26',
      buttonSecondary: '#24283b',
      buttonSecondaryHover: '#2f354f',
      inputBg: '#24283b',
      accent: '#7aa2f7',
      accentSoft: '#1f2642',
      success: '#9ece6a',
      successSoft: '#243026',
      successBorder: '#9ece6a',
      warning: '#e0af68',
      warningSoft: '#363026',
      warningBorder: '#e0af68',
      critical: '#f7768e',
      criticalSoft: '#332228',
      criticalBorder: '#f7768e',
      info: '#7dcfff',
      gradientA: 'transparent',
      gradientB: 'transparent',
      gradientC: 'transparent',
      shadowXsBorder: SHADOW_DARK
    }
  },
  {
    id: 'nord',
    name: 'Nord (Solid)',
    light: {
      background: '#eceff4',
      backgroundWeak: '#e5e9f0',
      backgroundStronger: '#f8f9fb',
      surfaceBase: '#e5e9f0',
      surfaceRaised: '#ffffff',
      surfaceHover: '#eef2f7',
      surfaceInset: '#d8dee9',
      borderBase: '#d8dee9',
      borderWeak: '#e5e9f0',
      borderSelected: '#5e81ac',
      textBase: '#4c566a',
      textWeak: '#6b768a',
      textWeaker: '#8f99ac',
      textStrong: '#2e3440',
      textInverse: '#ffffff',
      buttonPrimary: '#2e3440',
      buttonPrimaryHover: '#3b4252',
      buttonPrimaryForeground: '#eceff4',
      buttonSecondary: '#ffffff',
      buttonSecondaryHover: '#eceff4',
      inputBg: '#ffffff',
      accent: '#5e81ac',
      accentSoft: '#eaf0f7',
      success: '#a3be8c',
      successSoft: '#eef5ea',
      successBorder: '#a3be8c',
      warning: '#ebcb8b',
      warningSoft: '#fbf5e6',
      warningBorder: '#ebcb8b',
      critical: '#bf616a',
      criticalSoft: '#faebee',
      criticalBorder: '#bf616a',
      info: '#88c0d0',
      gradientA: 'transparent',
      gradientB: 'transparent',
      gradientC: 'transparent',
      shadowXsBorder: SHADOW_LIGHT
    },
    dark: {
      background: '#2e3440',
      backgroundWeak: '#292e39',
      backgroundStronger: '#3b4252',
      surfaceBase: '#292e39',
      surfaceRaised: '#3b4252',
      surfaceHover: '#434c5e',
      surfaceInset: '#242933',
      borderBase: '#434c5e',
      borderWeak: '#383e4b',
      borderSelected: '#88c0d0',
      textBase: '#d8dee9',
      textWeak: '#9ca9c2',
      textWeaker: '#6e798c',
      textStrong: '#eceff4',
      textInverse: '#2e3440',
      buttonPrimary: '#88c0d0',
      buttonPrimaryHover: '#a3dbe8',
      buttonPrimaryForeground: '#2e3440',
      buttonSecondary: '#3b4252',
      buttonSecondaryHover: '#4c566a',
      inputBg: '#3b4252',
      accent: '#88c0d0',
      accentSoft: '#333e4d',
      success: '#a3be8c',
      successSoft: '#324036',
      successBorder: '#a3be8c',
      warning: '#ebcb8b',
      warningSoft: '#423d30',
      warningBorder: '#ebcb8b',
      critical: '#bf616a',
      criticalSoft: '#402e33',
      criticalBorder: '#bf616a',
      info: '#5e81ac',
      gradientA: 'transparent',
      gradientB: 'transparent',
      gradientC: 'transparent',
      shadowXsBorder: SHADOW_DARK
    }
  },
  {
    id: 'catppuccin',
    name: 'Catppuccin (Solid)',
    light: {
      background: '#eff1f5',
      backgroundWeak: '#e6e9ef',
      backgroundStronger: '#fafbfc',
      surfaceBase: '#e6e9ef',
      surfaceRaised: '#ffffff',
      surfaceHover: '#eef2fa',
      surfaceInset: '#dce0e8',
      borderBase: '#ccd0da',
      borderWeak: '#e6e9ef',
      borderSelected: '#1e66f5',
      textBase: '#4c4f69',
      textWeak: '#7c7f93',
      textWeaker: '#9ca0b0',
      textStrong: '#292c3c',
      textInverse: '#ffffff',
      buttonPrimary: '#1e66f5',
      buttonPrimaryHover: '#0b57e7',
      buttonPrimaryForeground: '#ffffff',
      buttonSecondary: '#ffffff',
      buttonSecondaryHover: '#eff1f5',
      inputBg: '#ffffff',
      accent: '#1e66f5',
      accentSoft: '#eaf1fe',
      success: '#40a02b',
      successSoft: '#ecf6e9',
      successBorder: '#40a02b',
      warning: '#df8e1d',
      warningSoft: '#faf1e5',
      warningBorder: '#df8e1d',
      critical: '#d20f39',
      criticalSoft: '#fae7eb',
      criticalBorder: '#d20f39',
      info: '#04a5e5',
      gradientA: 'transparent',
      gradientB: 'transparent',
      gradientC: 'transparent',
      shadowXsBorder: SHADOW_LIGHT
    },
    dark: {
      background: '#1e1e2e',
      backgroundWeak: '#181825',
      backgroundStronger: '#313244',
      surfaceBase: '#181825',
      surfaceRaised: '#313244',
      surfaceHover: '#45475a',
      surfaceInset: '#11111b',
      borderBase: '#45475a',
      borderWeak: '#313244',
      borderSelected: '#89b4fa',
      textBase: '#cdd6f4',
      textWeak: '#a6adc8',
      textWeaker: '#7f849c',
      textStrong: '#f5e0dc',
      textInverse: '#1e1e2e',
      buttonPrimary: '#89b4fa',
      buttonPrimaryHover: '#b4befe',
      buttonPrimaryForeground: '#1e1e2e',
      buttonSecondary: '#313244',
      buttonSecondaryHover: '#45475a',
      inputBg: '#313244',
      accent: '#89b4fa',
      accentSoft: '#292b3d',
      success: '#a6e3a1',
      successSoft: '#253329',
      successBorder: '#a6e3a1',
      warning: '#f9e2af',
      warningSoft: '#3a352c',
      warningBorder: '#f9e2af',
      critical: '#f38ba8',
      criticalSoft: '#38262d',
      criticalBorder: '#f38ba8',
      info: '#89dceb',
      gradientA: 'transparent',
      gradientB: 'transparent',
      gradientC: 'transparent',
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
