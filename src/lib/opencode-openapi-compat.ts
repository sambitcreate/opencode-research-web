import type {
  OpenCodeCompatibilityMethodMismatch,
  OpenCodeCompatibilitySnapshot,
  OpenCodeEndpointDefinition,
  OpenCodeHttpMethod,
  OpenCodeOpenApiSnapshot
} from './opencode';

type JsonRecord = Record<string, unknown>;

type OpenCodeCompatibilityRule = {
  path: string;
  methods: OpenCodeHttpMethod[];
  required: boolean;
};

const DEFAULT_OPENAPI_ENDPOINTS = [
  '/global/health',
  '/global/event',
  '/global/config',
  '/global/dispose',
  '/auth/{providerID}',
  '/project',
  '/project/current',
  '/project/{projectID}',
  '/pty',
  '/pty/{ptyID}',
  '/pty/{ptyID}/connect',
  '/config',
  '/config/providers',
  '/experimental/tool/ids',
  '/experimental/tool',
  '/experimental/worktree',
  '/experimental/worktree/reset',
  '/experimental/resource',
  '/session',
  '/session/status',
  '/session/{sessionID}',
  '/session/{sessionID}/children',
  '/session/{sessionID}/todo',
  '/session/{sessionID}/init',
  '/session/{sessionID}/fork',
  '/session/{sessionID}/abort',
  '/session/{sessionID}/share',
  '/session/{sessionID}/diff',
  '/session/{sessionID}/summarize',
  '/session/{sessionID}/message',
  '/session/{sessionID}/message/{messageID}',
  '/session/{sessionID}/message/{messageID}/part/{partID}',
  '/session/{sessionID}/prompt_async',
  '/session/{sessionID}/command',
  '/session/{sessionID}/shell',
  '/session/{sessionID}/revert',
  '/session/{sessionID}/unrevert',
  '/session/{sessionID}/permissions/{permissionID}',
  '/permission/{requestID}/reply',
  '/permission',
  '/question',
  '/question/{requestID}/reply',
  '/question/{requestID}/reject',
  '/provider',
  '/provider/auth',
  '/provider/{providerID}/oauth/authorize',
  '/provider/{providerID}/oauth/callback',
  '/find',
  '/find/file',
  '/find/symbol',
  '/file',
  '/file/content',
  '/file/status',
  '/mcp',
  '/mcp/{name}/auth',
  '/mcp/{name}/auth/callback',
  '/mcp/{name}/auth/authenticate',
  '/mcp/{name}/connect',
  '/mcp/{name}/disconnect',
  '/tui/append-prompt',
  '/tui/open-help',
  '/tui/open-sessions',
  '/tui/open-themes',
  '/tui/open-models',
  '/tui/submit-prompt',
  '/tui/clear-prompt',
  '/tui/execute-command',
  '/tui/show-toast',
  '/tui/publish',
  '/tui/select-session',
  '/tui/control/next',
  '/tui/control/response',
  '/instance/dispose',
  '/path',
  '/vcs',
  '/command',
  '/log',
  '/agent',
  '/skill',
  '/lsp',
  '/formatter',
  '/event'
] as const;

const OPEN_CODE_COMPATIBILITY_RULES: OpenCodeCompatibilityRule[] = [
  { path: '/session', methods: ['GET', 'POST'], required: true },
  { path: '/session/{sessionID}', methods: ['GET'], required: true },
  { path: '/session/{sessionID}/message', methods: ['POST'], required: true },
  { path: '/session/{sessionID}/prompt_async', methods: ['POST'], required: true },
  { path: '/session/{sessionID}/command', methods: ['POST'], required: true },
  { path: '/session/{sessionID}/shell', methods: ['POST'], required: true },
  { path: '/session/{sessionID}/revert', methods: ['POST'], required: true },
  { path: '/session/{sessionID}/unrevert', methods: ['POST'], required: true },
  { path: '/permission/{requestID}/reply', methods: ['POST'], required: true },
  { path: '/question/{requestID}/reply', methods: ['POST'], required: true },
  { path: '/question/{requestID}/reject', methods: ['POST'], required: true },
  { path: '/event', methods: ['GET'], required: true },
  { path: '/global/event', methods: ['GET'], required: true },
  { path: '/provider', methods: ['GET'], required: false },
  { path: '/mcp', methods: ['GET'], required: false },
  { path: '/pty', methods: ['GET', 'POST'], required: false },
  { path: '/pty/{ptyID}', methods: ['DELETE'], required: false },
  { path: '/project/current', methods: ['GET', 'POST'], required: false },
  { path: '/config', methods: ['GET'], required: false },
  { path: '/global/config', methods: ['GET'], required: false }
];

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

function asJsonRecord(value: unknown): JsonRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as JsonRecord;
}

function isOpenCodeMethod(value: string): value is OpenCodeHttpMethod {
  return value === 'GET' || value === 'POST' || value === 'PUT' || value === 'PATCH' || value === 'DELETE';
}

export function fallbackOpenApiSnapshot(): OpenCodeOpenApiSnapshot {
  return {
    source: 'fallback',
    title: 'OpenCode API (fallback)',
    version: 'unknown',
    endpointCount: DEFAULT_OPENAPI_ENDPOINTS.length,
    endpoints: DEFAULT_OPENAPI_ENDPOINTS.map((path) => ({
      path,
      methods: [],
      operationIds: []
    }))
  };
}

export function parseOpenApiSnapshot(document: unknown): OpenCodeOpenApiSnapshot | null {
  const root = asJsonRecord(document);
  if (!root) return null;
  const paths = asJsonRecord(root.paths);
  if (!paths) return null;

  const endpoints: OpenCodeEndpointDefinition[] = [];
  for (const [path, definition] of Object.entries(paths)) {
    const operations = asJsonRecord(definition);
    if (!operations) continue;

    const methods: OpenCodeHttpMethod[] = [];
    const operationIds: string[] = [];

    for (const [methodKey, operationValue] of Object.entries(operations)) {
      const upperMethod = methodKey.toUpperCase();
      if (
        upperMethod !== 'GET' &&
        upperMethod !== 'POST' &&
        upperMethod !== 'PUT' &&
        upperMethod !== 'PATCH' &&
        upperMethod !== 'DELETE'
      ) {
        continue;
      }

      methods.push(upperMethod);
      const operationRecord = asJsonRecord(operationValue);
      if (typeof operationRecord?.operationId === 'string' && operationRecord.operationId.trim()) {
        operationIds.push(operationRecord.operationId);
      }
    }

    endpoints.push({
      path,
      methods: uniqueStrings(methods).filter((method): method is OpenCodeHttpMethod => isOpenCodeMethod(method)),
      operationIds: uniqueStrings(operationIds)
    });
  }

  endpoints.sort((left, right) => left.path.localeCompare(right.path));

  const info = asJsonRecord(root.info);
  return {
    source: 'live',
    title: typeof info?.title === 'string' && info.title.trim() ? info.title : 'OpenCode API',
    version: typeof info?.version === 'string' && info.version.trim() ? info.version : 'unknown',
    endpointCount: endpoints.length,
    endpoints
  };
}

export function assessOpenCodeCompatibility(snapshot: OpenCodeOpenApiSnapshot): OpenCodeCompatibilitySnapshot {
  const checkedAt = new Date().toISOString();
  const requiredRules = OPEN_CODE_COMPATIBILITY_RULES.filter((rule) => rule.required);
  const recommendedRules = OPEN_CODE_COMPATIBILITY_RULES.filter((rule) => !rule.required);

  if (snapshot.source === 'fallback') {
    return {
      status: 'unverified',
      checkedAt,
      source: snapshot.source,
      requiredRuleCount: requiredRules.length,
      recommendedRuleCount: recommendedRules.length,
      missingRequiredEndpoints: [],
      missingRecommendedEndpoints: [],
      methodMismatches: [],
      notes: [
        'OpenAPI source is fallback, so compatibility checks are not verified against a live OpenCode schema.'
      ]
    };
  }

  const endpointMap = new Map<string, OpenCodeEndpointDefinition>();
  for (const endpoint of snapshot.endpoints) {
    endpointMap.set(endpoint.path, endpoint);
  }

  const missingRequiredEndpoints: string[] = [];
  const missingRecommendedEndpoints: string[] = [];
  const methodMismatches: OpenCodeCompatibilityMethodMismatch[] = [];

  for (const rule of OPEN_CODE_COMPATIBILITY_RULES) {
    const endpoint = endpointMap.get(rule.path);
    if (!endpoint) {
      if (rule.required) {
        missingRequiredEndpoints.push(rule.path);
      } else {
        missingRecommendedEndpoints.push(rule.path);
      }
      continue;
    }

    const availableMethodSet = new Set(endpoint.methods);
    const missingMethods = rule.methods.filter((method) => !availableMethodSet.has(method));
    if (missingMethods.length === 0) continue;

    methodMismatches.push({
      path: rule.path,
      requiredMethods: rule.methods,
      availableMethods: endpoint.methods,
      missingMethods,
      required: rule.required
    });
  }

  const hasRequiredIssues =
    missingRequiredEndpoints.length > 0 || methodMismatches.some((mismatch) => mismatch.required);
  const hasRecommendedIssues =
    missingRecommendedEndpoints.length > 0 || methodMismatches.some((mismatch) => !mismatch.required);

  const notes: string[] = [];
  if (hasRequiredIssues) {
    notes.push('Required compatibility checks failed; some expected OpenCode endpoints/methods are missing.');
  } else if (hasRecommendedIssues) {
    notes.push('Required checks passed but some recommended endpoints/methods are missing.');
  } else {
    notes.push('Required and recommended compatibility checks passed against the live OpenCode schema.');
  }

  return {
    status: hasRequiredIssues ? 'fail' : hasRecommendedIssues ? 'warn' : 'pass',
    checkedAt,
    source: snapshot.source,
    requiredRuleCount: requiredRules.length,
    recommendedRuleCount: recommendedRules.length,
    missingRequiredEndpoints: uniqueStrings(missingRequiredEndpoints),
    missingRecommendedEndpoints: uniqueStrings(missingRecommendedEndpoints),
    methodMismatches,
    notes
  };
}
