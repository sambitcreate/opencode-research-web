import type { NextRequest } from 'next/server';
import { invokeOpenCodeEndpoint, type OpenCodeHttpMethod } from '@/lib/opencode';

export const runtime = 'nodejs';

type OpenCodeActionTarget =
  | 'session'
  | 'message'
  | 'permission'
  | 'question'
  | 'provider'
  | 'mcp'
  | 'project'
  | 'worktree'
  | 'pty'
  | 'global';

type ActionRequest = {
  target: OpenCodeActionTarget;
  action: string;
  sessionId?: string;
  messageId?: string;
  requestId?: string;
  providerId?: string;
  mcpName?: string;
  projectId?: string;
  ptyId?: string;
  body?: unknown;
  method?: OpenCodeHttpMethod;
  path?: string;
  timeoutMs?: number;
  autostart?: boolean;
};

type ActionResolution = {
  path: string;
  method: OpenCodeHttpMethod;
  body?: unknown;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function toMethod(value: unknown, fallback: OpenCodeHttpMethod): OpenCodeHttpMethod {
  if (typeof value !== 'string') return fallback;
  const upper = value.toUpperCase();
  if (upper === 'GET' || upper === 'POST' || upper === 'PUT' || upper === 'PATCH' || upper === 'DELETE') {
    return upper;
  }
  return fallback;
}

function badRequest(code: string, message: string, details?: unknown): Response {
  return Response.json(
    {
      ok: false,
      error: {
        code,
        message,
        details: details ?? null
      }
    },
    { status: 400 }
  );
}

function requireIdentifier(value: string, fieldName: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`Missing required field: ${fieldName}`);
  }
  return normalized;
}

function resolveAction(input: ActionRequest): ActionResolution {
  const target = input.target;
  const action = input.action.toLowerCase().trim();

  if (input.path && input.path.trim()) {
    return {
      path: input.path.trim(),
      method: toMethod(input.method, 'POST'),
      body: input.body
    };
  }

  if (target === 'session') {
    const sessionId = input.sessionId ? requireIdentifier(input.sessionId, 'sessionId') : '';

    switch (action) {
      case 'create':
        return { path: '/session', method: 'POST', body: input.body ?? {} };
      case 'prompt':
        return {
          path: `/session/${encodeURIComponent(requireIdentifier(sessionId, 'sessionId'))}/message`,
          method: 'POST',
          body: input.body ?? {}
        };
      case 'promptasync':
      case 'prompt_async':
        return {
          path: `/session/${encodeURIComponent(requireIdentifier(sessionId, 'sessionId'))}/prompt_async`,
          method: 'POST',
          body: input.body ?? {}
        };
      case 'command':
        return {
          path: `/session/${encodeURIComponent(requireIdentifier(sessionId, 'sessionId'))}/command`,
          method: 'POST',
          body: input.body ?? {}
        };
      case 'shell':
        return {
          path: `/session/${encodeURIComponent(requireIdentifier(sessionId, 'sessionId'))}/shell`,
          method: 'POST',
          body: input.body ?? {}
        };
      case 'update':
        return {
          path: `/session/${encodeURIComponent(requireIdentifier(sessionId, 'sessionId'))}`,
          method: 'PATCH',
          body: input.body ?? {}
        };
      case 'delete':
        return {
          path: `/session/${encodeURIComponent(requireIdentifier(sessionId, 'sessionId'))}`,
          method: 'DELETE'
        };
      case 'undo':
      case 'revert':
        return {
          path: `/session/${encodeURIComponent(requireIdentifier(sessionId, 'sessionId'))}/revert`,
          method: 'POST',
          body: input.body ?? {}
        };
      case 'redo':
      case 'unrevert':
        return {
          path: `/session/${encodeURIComponent(requireIdentifier(sessionId, 'sessionId'))}/unrevert`,
          method: 'POST',
          body: input.body
        };
      case 'fork':
        return {
          path: `/session/${encodeURIComponent(requireIdentifier(sessionId, 'sessionId'))}/fork`,
          method: 'POST',
          body: input.body ?? {}
        };
      case 'abort':
        return {
          path: `/session/${encodeURIComponent(requireIdentifier(sessionId, 'sessionId'))}/abort`,
          method: 'POST',
          body: input.body
        };
      case 'share':
        return {
          path: `/session/${encodeURIComponent(requireIdentifier(sessionId, 'sessionId'))}/share`,
          method: 'POST',
          body: input.body
        };
      case 'unshare':
        return {
          path: `/session/${encodeURIComponent(requireIdentifier(sessionId, 'sessionId'))}/share`,
          method: 'DELETE'
        };
      case 'summarize':
        return {
          path: `/session/${encodeURIComponent(requireIdentifier(sessionId, 'sessionId'))}/summarize`,
          method: 'POST',
          body: input.body ?? {}
        };
      case 'init':
        return {
          path: `/session/${encodeURIComponent(requireIdentifier(sessionId, 'sessionId'))}/init`,
          method: 'POST',
          body: input.body ?? {}
        };
      default:
        throw new Error(`Unsupported session action: ${action}`);
    }
  }

  if (target === 'message') {
    const sessionId = requireIdentifier(input.sessionId ?? '', 'sessionId');
    const messageId = requireIdentifier(input.messageId ?? '', 'messageId');

    if (action === 'revert') {
      return {
        path: `/session/${encodeURIComponent(sessionId)}/revert`,
        method: 'POST',
        body: { messageID: messageId, ...(isObject(input.body) ? input.body : {}) }
      };
    }

    if (action === 'fork') {
      return {
        path: `/session/${encodeURIComponent(sessionId)}/fork`,
        method: 'POST',
        body: { messageID: messageId, ...(isObject(input.body) ? input.body : {}) }
      };
    }

    throw new Error(`Unsupported message action: ${action}`);
  }

  if (target === 'permission') {
    if (action !== 'reply') {
      throw new Error(`Unsupported permission action: ${action}`);
    }
    const requestId = requireIdentifier(input.requestId ?? '', 'requestId');
    return {
      path: `/permission/${encodeURIComponent(requestId)}/reply`,
      method: 'POST',
      body: input.body ?? {}
    };
  }

  if (target === 'question') {
    const requestId = requireIdentifier(input.requestId ?? '', 'requestId');
    if (action === 'reply') {
      return {
        path: `/question/${encodeURIComponent(requestId)}/reply`,
        method: 'POST',
        body: input.body ?? {}
      };
    }
    if (action === 'reject') {
      return {
        path: `/question/${encodeURIComponent(requestId)}/reject`,
        method: 'POST',
        body: input.body
      };
    }
    throw new Error(`Unsupported question action: ${action}`);
  }

  if (target === 'provider') {
    if (action === 'list') {
      return { path: '/provider', method: 'GET' };
    }
    if (action === 'auth_methods') {
      return { path: '/provider/auth', method: 'GET' };
    }

    const providerId = requireIdentifier(input.providerId ?? '', 'providerId');
    if (action === 'oauth_authorize') {
      return {
        path: `/provider/${encodeURIComponent(providerId)}/oauth/authorize`,
        method: 'POST',
        body: input.body ?? {}
      };
    }
    if (action === 'oauth_callback') {
      return {
        path: `/provider/${encodeURIComponent(providerId)}/oauth/callback`,
        method: 'POST',
        body: input.body ?? {}
      };
    }
    throw new Error(`Unsupported provider action: ${action}`);
  }

  if (target === 'mcp') {
    if (action === 'list' || action === 'status') {
      return { path: '/mcp', method: 'GET' };
    }

    const mcpName = requireIdentifier(input.mcpName ?? '', 'mcpName');
    if (action === 'connect') {
      return {
        path: `/mcp/${encodeURIComponent(mcpName)}/connect`,
        method: 'POST',
        body: input.body
      };
    }
    if (action === 'disconnect') {
      return {
        path: `/mcp/${encodeURIComponent(mcpName)}/disconnect`,
        method: 'POST',
        body: input.body
      };
    }
    if (action === 'auth') {
      return {
        path: `/mcp/${encodeURIComponent(mcpName)}/auth/authenticate`,
        method: 'POST',
        body: input.body ?? {}
      };
    }

    throw new Error(`Unsupported mcp action: ${action}`);
  }

  if (target === 'project') {
    if (action === 'list') return { path: '/project', method: 'GET' };
    if (action === 'current') return { path: '/project/current', method: 'GET' };

    const projectId = input.projectId ? input.projectId.trim() : '';
    if (action === 'update_current') {
      return {
        path: '/project/current',
        method: 'POST',
        body: input.body ?? {}
      };
    }
    if (action === 'update' && projectId) {
      return {
        path: `/project/${encodeURIComponent(projectId)}`,
        method: 'PATCH',
        body: input.body ?? {}
      };
    }

    throw new Error(`Unsupported project action: ${action}`);
  }

  if (target === 'worktree') {
    if (action === 'list') return { path: '/experimental/worktree', method: 'GET' };
    if (action === 'create') return { path: '/experimental/worktree', method: 'POST', body: input.body ?? {} };
    if (action === 'remove') return { path: '/experimental/worktree', method: 'DELETE', body: input.body ?? {} };
    if (action === 'reset') return { path: '/experimental/worktree/reset', method: 'POST', body: input.body ?? {} };

    throw new Error(`Unsupported worktree action: ${action}`);
  }

  if (target === 'pty') {
    if (action === 'list') return { path: '/pty', method: 'GET' };
    if (action === 'create') return { path: '/pty', method: 'POST', body: input.body ?? {} };

    const ptyId = requireIdentifier(input.ptyId ?? '', 'ptyId');
    if (action === 'update') {
      return {
        path: `/pty/${encodeURIComponent(ptyId)}`,
        method: 'PATCH',
        body: input.body ?? {}
      };
    }
    if (action === 'delete') {
      return {
        path: `/pty/${encodeURIComponent(ptyId)}`,
        method: 'DELETE'
      };
    }
    if (action === 'connect') {
      return {
        path: `/pty/${encodeURIComponent(ptyId)}/connect`,
        method: 'GET'
      };
    }

    throw new Error(`Unsupported pty action: ${action}`);
  }

  if (target === 'global') {
    if (action === 'health') return { path: '/global/health', method: 'GET' };
    if (action === 'dispose') return { path: '/global/dispose', method: 'POST', body: input.body };

    throw new Error(`Unsupported global action: ${action}`);
  }

  throw new Error(`Unsupported action target: ${target}`);
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as unknown;
    if (!isObject(payload)) {
      return badRequest('VALIDATION_ERROR', 'Request body must be an object.');
    }

    const target = asString(payload.target);
    const action = asString(payload.action);
    if (!target) {
      return badRequest('VALIDATION_ERROR', 'Field "target" is required and must be a non-empty string.');
    }
    if (!action && !asString(payload.path)) {
      return badRequest('VALIDATION_ERROR', 'Field "action" is required unless a custom "path" is provided.');
    }

    const normalizedTarget = target as OpenCodeActionTarget;
    const allowedTargets: OpenCodeActionTarget[] = [
      'session',
      'message',
      'permission',
      'question',
      'provider',
      'mcp',
      'project',
      'worktree',
      'pty',
      'global'
    ];

    if (!allowedTargets.includes(normalizedTarget)) {
      return badRequest('VALIDATION_ERROR', `Unsupported target "${target}".`, {
        allowedTargets
      });
    }

    const actionRequest: ActionRequest = {
      target: normalizedTarget,
      action,
      sessionId: asString(payload.sessionId),
      messageId: asString(payload.messageId),
      requestId: asString(payload.requestId),
      providerId: asString(payload.providerId),
      mcpName: asString(payload.mcpName),
      projectId: asString(payload.projectId),
      ptyId: asString(payload.ptyId),
      body: payload.body,
      method: toMethod(payload.method, 'POST'),
      path: asString(payload.path),
      timeoutMs: typeof payload.timeoutMs === 'number' ? payload.timeoutMs : undefined,
      autostart: payload.autostart === false ? false : true
    };

    let resolved: ActionResolution;
    try {
      resolved = resolveAction(actionRequest);
    } catch (error) {
      return badRequest('ACTION_RESOLUTION_ERROR', error instanceof Error ? error.message : 'Action is invalid.', {
        target: actionRequest.target,
        action: actionRequest.action
      });
    }

    const result = await invokeOpenCodeEndpoint({
      path: resolved.path,
      method: resolved.method,
      body: resolved.body,
      timeoutMs: actionRequest.timeoutMs,
      ensureRunning: actionRequest.autostart
    });

    return Response.json(
      {
        ok: result.ok,
        target: actionRequest.target,
        action: actionRequest.action,
        request: {
          path: resolved.path,
          method: resolved.method
        },
        result
      },
      { status: result.ok ? 200 : result.status || 502 }
    );
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: {
          code: 'UNKNOWN_ACTION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown OpenCode action error',
          details: null
        }
      },
      { status: 500 }
    );
  }
}
