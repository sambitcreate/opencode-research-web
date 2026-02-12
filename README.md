# OpenCode Full Monitor (Local-First)

Local-first OpenCode control plane for monitoring and executing OpenCode operations from the browser, with parity-oriented coverage for session/TUI/API workflows.

## Overview

- Runs on localhost by design.
- Monitors OpenCode runtime, sessions, status map, pending permissions/questions, providers, agents, skills, and command metadata.
- Supports direct control of OpenCode via a generic backend proxy route (`/api/opencode/control`) for any OpenCode API path/method.
- Includes monitor-first UI modules:
  - session list + session detail/message timeline,
  - session timeline with per-message `revert` / `fork` / `copy`,
  - explicit session `undo` / `redo` controls,
  - transcript copy/export (`.md`) from selected session,
  - SSE event debug panel (`/api/opencode/events`) with source filtering,
  - session side summaries (todo, diff, context/cost when reported),
  - advanced session composer with mode switching (`prompt`, `async`, `command`, `shell`),
  - slash autocomplete (`/prompt`, `/async`, `/command`, `/shell`) and mention autocomplete (`@file:`, `@agent:`, `@mcp:`),
  - image/file attachments (compact inline context for prompt/command),
  - provider connect modal (auth method discovery, OAuth authorize/callback, API key submission),
  - provider-grouped model picker + model variant selector with session init apply,
  - agent picker with local/TUI cycle actions and shell-agent quick apply,
  - MCP panel with status list, connect/disconnect/auth actions, and resource preview,
  - file explorer module for find/list/content/status workflows via `/api/opencode/files`,
  - project module for list/current snapshots and `POST /project/current` update actions,
  - worktree module for `/experimental/worktree` list/create/remove/reset operations,
  - config editor for `/config` and `/global/config` drafts with diff/confirm apply flow,
  - richer permission/question queue context (session/tool/command/question/options hints),
  - expanded engine status summaries for LSP, formatter, and config/plugin signals,
  - session operation runner (fork/revert/share/summarize/delete/etc),
  - permission and question response queues,
  - TUI command shortcuts (`/tui/*` routes),
  - OpenAPI-backed API explorer for arbitrary endpoint execution.

## Prerequisites

- Node.js 18+
- OpenCode CLI installed and available as `opencode` in `PATH`

## Quick Start

```bash
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:3000`.

## Local OpenCode Flow

Default launch command used by the app:

```bash
opencode serve --hostname 127.0.0.1 --port 4096
```

The app uses OpenCode HTTP APIs directly and remains local-first:

1. UI fetches monitor snapshot from `GET /api/opencode/monitor`.
2. Backend checks OpenCode status and reads monitor surfaces (`/session`, `/session/status`, `/permission`, `/question`, `/provider`, `/agent`, `/skill`, `/command`, `/path`, `/vcs`).
3. UI can execute any OpenCode operation through `POST /api/opencode/control`.
4. Session detail reads use `GET /api/opencode/sessions?sessionId=<id>`.
5. Existing research route remains available at `POST /api/query` (still auto-starts OpenCode when needed).

## UI and Themes

- The app shell keeps the OpenCode-inspired semantic token system (`surface`, `text`, `border`, `interactive`).
- Runtime theme switcher is still available (`OC-1`, `Tokyo Night`, `Nord`, `Catppuccin`) with `system/light/dark` scheme control.
- UI primitives remain in `src/components/ui/*`.

## Environment Variables

- `OPENCODE_HOST` default `127.0.0.1`
- `OPENCODE_PORT` default `4096`
- `OPENCODE_AUTH_TOKEN` optional, forwarded in API requests
- `OPENCODE_MODEL` optional
- `OPENCODE_COMMAND` optional full command override for custom startup
- `OPENCODE_API_URL` optional direct API URL override
- `OPENCODE_STARTUP_TIMEOUT_MS` default `25000`
- `OPENCODE_QUERY_TIMEOUT_MS` default `120000`
- `OPENCODE_STATUS_TIMEOUT_MS` default `25000`

## API Routes

- `POST /api/query`
  - Existing research-oriented route (kept for compatibility).
  - Input: `{ "query": "..." }`
  - Output contract preserved:
    - `id`, `query`, `status`, `sessionId`, `answer`, `sources`, `metadata`, `timestamp`

- `GET /api/opencode/status`
  - Engine/process state snapshot (running, host/port, command, logs, errors).

- `GET /api/opencode/sessions`
  - Query params:
    - `limit` optional (default 40)
    - `roots` optional (`1|0|true|false`) passthrough to OpenCode session search
    - `start` optional passthrough cursor/offset value
    - `search` optional passthrough search text
    - `sessionId` optional (detail mode)
    - `messageLimit` optional (default 120)
    - `include` optional CSV for detail mode (`messages,todo,diff,children`)
    - `autostart=1` optional
  - List mode contract preserved:
    - `running`, `host`, `port`, `started`, `count`, `sessions`
  - Detail mode contract preserved:
    - `running`, `host`, `port`, `started`, `session`, `messages`, `messageCount`, `latestMessageAt`, `activeToolCalls`
  - Detail mode optional additive fields:
    - `todo`, `diff`, `children` (when requested via `include`)

- `GET /api/opencode/session/:sessionId/timeline`
  - User-message-centric timeline output for session workbench UIs.
  - Query params:
    - `autostart=1` optional
  - Returns:
    - `running`, `host`, `port`, `started`, `sessionId`, `count`, `entries`
    - each entry includes `messageId`, `preview`, `createdAt`, `assistantMessageId`, `assistantState`, `hasDiffMarker`

- `GET /api/opencode/session/:sessionId/transcript`
  - Generates markdown transcript for copy/export flows.
  - Query params:
    - `thinking=1|true` optional
    - `toolDetails=1|true` optional
    - `assistantMetadata=1|true` optional
    - `autostart=1` optional
  - Returns:
    - `running`, `host`, `port`, `started`, `sessionId`, `title`, `generatedAt`, `messageCount`, `options`, `markdown`

- `GET /api/opencode/monitor`
  - Aggregated monitor snapshot for the dashboard.
  - Query params:
    - `autostart=1` optional
    - `sessionLimit` optional (default 80)
    - `include` optional CSV:
      - `providers,agents,skills,commands,path,vcs,mcp,lsp,formatter,projects,config,openapi`
  - Returns:
    - `status`, `sessions`, `sessionStatus`, `permissions`, `questions`,
    - `providers`, `commands`, `agents`, `skills`, `pathInfo`, `vcsInfo`,
    - optional normalized blocks (when included): `mcp`, `lsp`, `formatter`, `projects`, `config`
    - `openapi`, `errors`

- `POST /api/opencode/control`
  - Generic OpenCode executor/proxy.
  - Input:
    - `path` required OpenCode-relative path (example `/session`)
    - `method` optional (`GET|POST|PUT|PATCH|DELETE`, default `GET`)
    - `body` optional JSON payload
    - `timeoutMs` optional
    - `autostart` optional boolean
    - `parseSsePayload` optional boolean
  - Output:
    - `{ ok, status, contentType, data, text }`
  - Enables the web UI to trigger all OpenCode operations, including TUI endpoints.

- `POST /api/opencode/action`
  - Typed high-level action route with stable error envelopes.
  - Input:
    - `target` required:
      - `session | message | permission | question | provider | mcp | project | worktree | pty | global`
    - `action` required unless custom `path` is supplied
    - optional IDs: `sessionId`, `messageId`, `requestId`, `providerId`, `mcpName`, `projectId`, `ptyId`
    - optional passthrough: `body`, `method`, `path`, `timeoutMs`, `autostart`
  - Output:
    - success: `{ ok, target, action, request, result }`
    - validation/resolution errors: `{ ok: false, error: { code, message, details } }`

- `GET|POST /api/opencode/pty`
  - PTY lifecycle baseline route for list/create operations.
  - Query params:
    - `autostart=1|true` optional
  - `GET` returns PTY list via OpenCode `/pty`.
  - `POST` accepts optional JSON body and creates PTY via OpenCode `/pty`.
  - Output:
    - `{ request, result }` where `result` is `{ ok, status, contentType, data, text }`

- `PATCH|DELETE /api/opencode/pty/:ptyId`
  - PTY lifecycle baseline route for update/delete operations.
  - Query params:
    - `autostart=1|true` optional
  - `PATCH` accepts optional JSON body and forwards to OpenCode `/pty/:ptyId`.
  - `DELETE` forwards to OpenCode `/pty/:ptyId`.
  - Output:
    - `{ request, result }` where `result` is `{ ok, status, contentType, data, text }`

- `GET /api/opencode/files`
  - Mode-based file/find passthrough route.
  - Query params:
    - `mode` required:
      - `findText` -> `/find`
      - `findFile` -> `/find/file`
      - `list` -> `/file`
      - `content` -> `/file/content`
      - `status` -> `/file/status`
    - `autostart=1` optional
    - any other query params are forwarded directly to the mapped OpenCode endpoint
  - Output:
    - `{ mode, request, result }`

- `GET /api/opencode/system`
  - Aggregate system/config/project/runtime snapshot route.
  - Query params:
    - `include` optional CSV:
      - `config,global/config,project,project/current,mcp,lsp,formatter,path,vcs`
    - `autostart=1` optional
  - Output:
    - `{ status, include, sections, errors }`

- `GET /api/opencode/openapi`
  - Returns parsed OpenCode OpenAPI endpoint snapshot for explorer UX.
  - Attempts live OpenCode spec first; falls back to an embedded endpoint manifest.
  - Includes additive route form metadata for UI generation:
    - `routeMetadata[]` with path params, query hints, per-method body requirements, and JSON body templates
    - `metadata.generatedAt` and `metadata.count`

- `GET /api/opencode/events`
  - SSE bridge for OpenCode event streams with normalized payloads.
  - Query params:
    - `scope=instance|global|both` optional (default `instance`)
    - `autostart=1` optional
  - Emits SSE events:
    - `ready`, `source_open`, `event`, `source_closed`, `source_error`, `complete`
  - `event` payloads include source-tagged normalized objects with monotonic `seq`.

## Commands

```bash
npm run dev
npm run lint
npm run build -- --webpack
npm run start
```

Reference repositories under `reference/` are intentionally excluded from app lint/type-check scope so verification reflects only this web app.

## Verification Checklist

```bash
npm run lint
npm run build -- --webpack
```

Optional live smoke test:

1. Start app: `npm run dev`
2. Check engine: `GET /api/opencode/status`
3. Check monitor: `GET /api/opencode/monitor`
4. List sessions: `GET /api/opencode/sessions`
5. Execute control call: `POST /api/opencode/control` with `{ "path": "/global/health", "method": "GET" }`
6. From UI:
   - create/select session,
   - send prompt,
   - run one session operation (share/revert/fork/etc),
   - respond to pending permission/question (if any),
   - run one `/tui/*` shortcut,
   - run one arbitrary API request via explorer.

## Troubleshooting

- Monitor/control failures:
  - Verify `opencode` exists: `command -v opencode`
  - Verify manual start: `opencode serve --hostname 127.0.0.1 --port 4096`
  - Check `GET /api/opencode/status` for recent logs and startup errors.

- OpenAPI explorer shows fallback:
  - Server may not expose live spec endpoint in your OpenCode version.
  - Fallback manifest is still usable for path discovery and execution.

- Session detail missing:
  - Confirm the session still exists in `GET /api/opencode/sessions`.
  - Verify OpenCode API connectivity on configured host/port.

- Build constraints:
  - Use webpack path as documented: `npm run build -- --webpack`

## Key Files

- `src/lib/opencode.ts` OpenCode process manager + monitor/control client glue
- `src/app/page.tsx` monitor-first control UI
- `src/app/api/opencode/monitor/route.ts` aggregated monitor snapshot route
- `src/app/api/opencode/control/route.ts` generic OpenCode control executor
- `src/app/api/opencode/files/route.ts` mode-based file/find passthrough route
- `src/app/api/opencode/system/route.ts` aggregate system/config/project route
- `src/app/api/opencode/openapi/route.ts` OpenAPI snapshot route
- `src/app/api/opencode/pty/route.ts` PTY lifecycle list/create route
- `src/app/api/opencode/pty/[ptyId]/route.ts` PTY lifecycle update/delete route
- `src/app/api/opencode/sessions/route.ts` session list/detail route
- `src/app/api/opencode/status/route.ts` engine status route
- `src/app/api/query/route.ts` legacy research query route
- `src/app/globals.css` visual theme and shell styles
- `src/components/ui/*` shadcn-style UI primitives
