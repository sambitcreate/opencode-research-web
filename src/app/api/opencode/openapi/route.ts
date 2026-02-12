import type { NextRequest } from 'next/server';
import { getOpenCodeOpenApi } from '@/lib/opencode';
import { parseAutostartParam } from '@/lib/opencode-route-utils';

export const runtime = 'nodejs';

type OpenCodeHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type OpenCodeEndpointDefinition = {
  path: string;
  methods: OpenCodeHttpMethod[];
  operationIds: string[];
};

type OpenCodeFormField = {
  key: string;
  source: 'path' | 'query' | 'body';
  type: 'string' | 'json';
  required: boolean;
  placeholder: string;
};

type OpenCodeMethodForm = {
  method: OpenCodeHttpMethod;
  requiresBody: boolean;
  bodyTemplate: string;
  fields: OpenCodeFormField[];
};

type OpenCodeRouteFormMetadata = {
  id: string;
  path: string;
  pathParams: string[];
  queryParamHints: string[];
  methods: OpenCodeMethodForm[];
  operationIds: string[];
};

const COMMON_QUERY_HINTS = ['autostart'];

function extractPathParams(path: string): string[] {
  const matches = path.matchAll(/\{([^}]+)\}/g);
  const names = Array.from(matches, (match) => (match[1] || '').trim()).filter(Boolean);
  return Array.from(new Set(names));
}

function buildQueryHints(path: string): string[] {
  const hints = [...COMMON_QUERY_HINTS];

  if (path === '/session') hints.push('limit', 'roots', 'start', 'search');
  if (path.includes('/session/') && path.includes('/transcript')) hints.push('thinking', 'toolDetails', 'assistantMetadata');
  if (path.includes('/session/')) hints.push('include', 'messageLimit');
  if (path.includes('/event')) hints.push('scope');
  if (path === '/api/opencode/files' || path.startsWith('/file') || path.startsWith('/find')) hints.push('mode');

  return Array.from(new Set(hints));
}

function bodyTemplateFor(path: string, method: OpenCodeHttpMethod): string {
  if (method === 'GET') return '';
  if (path.endsWith('/message')) {
    return `{
  "parts": [
    { "type": "text", "text": "Describe current changes." }
  ]
}`;
  }
  if (path.endsWith('/prompt_async')) {
    return `{
  "parts": [
    { "type": "text", "text": "Run this asynchronously." }
  ]
}`;
  }
  if (path.endsWith('/command')) {
    return `{
  "command": "review",
  "arguments": "latest changes"
}`;
  }
  if (path.endsWith('/shell')) {
    return `{
  "agent": "build",
  "command": "npm run lint"
}`;
  }
  if (path.endsWith('/revert')) {
    return `{
  "messageID": "msg_..."
}`;
  }
  if (path.endsWith('/init')) {
    return `{
  "providerID": "openai",
  "modelID": "gpt-5"
}`;
  }
  if (path.endsWith('/oauth/callback')) {
    return `{
  "code": "oauth_code",
  "state": "optional_state"
}`;
  }
  return '{}';
}

function methodRequiresBody(method: OpenCodeHttpMethod): boolean {
  return method === 'POST' || method === 'PUT' || method === 'PATCH';
}

function toMethodForms(endpoint: OpenCodeEndpointDefinition): OpenCodeMethodForm[] {
  const pathParams = extractPathParams(endpoint.path);
  const baseFields: OpenCodeFormField[] = pathParams.map((param) => ({
    key: param,
    source: 'path',
    type: 'string',
    required: true,
    placeholder: `${param} value`
  }));

  return endpoint.methods.map((method) => {
    const requiresBody = methodRequiresBody(method);
    const fields: OpenCodeFormField[] = [...baseFields];

    if (requiresBody) {
      fields.push({
        key: 'body',
        source: 'body',
        type: 'json',
        required: false,
        placeholder: 'JSON payload'
      });
    }

    return {
      method,
      requiresBody,
      bodyTemplate: bodyTemplateFor(endpoint.path, method),
      fields
    };
  });
}

function buildRouteMetadata(endpoints: OpenCodeEndpointDefinition[]): OpenCodeRouteFormMetadata[] {
  return endpoints.map((endpoint) => {
    const pathParams = extractPathParams(endpoint.path);
    const normalizedId = endpoint.path.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');

    return {
      id: normalizedId || 'root',
      path: endpoint.path,
      pathParams,
      queryParamHints: buildQueryHints(endpoint.path),
      methods: toMethodForms(endpoint),
      operationIds: endpoint.operationIds
    };
  });
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const autostart = parseAutostartParam(searchParams);
    const snapshot = await getOpenCodeOpenApi({ ensureRunning: autostart });
    const routeMetadata = buildRouteMetadata(snapshot.endpoints);

    return Response.json({
      ...snapshot,
      routeMetadata,
      metadata: {
        generatedAt: new Date().toISOString(),
        count: routeMetadata.length
      }
    });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : 'Unknown OpenCode OpenAPI error'
      },
      { status: 500 }
    );
  }
}
