# OpenCode Full Monitor Parity TODO Tracker (API + UI)

Last updated: February 11, 2026

## How to use this file

- Use `- [ ]` for not started tasks.
- Change to `- [x]` when done.
- For in-progress items, keep `- [ ]` and append `(in progress)`.
- Add completion notes in **Done Log** with date and PR/commit refs.

## Planning Work Already Completed

- [x] Baseline audited across:
  - `opencode-research-web` @ `db0d852923de48800d813625690bcfa92ecb7302`
  - `anomalyco/opencode` @ `8c7b35ad05c9dca5778501b287c5f17ee59dd0a2`
  - `Dimillian/CodexMonitor` @ `e67f9bdfd32d22917291e4cc7ddafd6b21f300ab`
- [x] Parity target defined for first-class TUI workflow coverage.
- [x] Gap matrix and phased delivery plan created.
- [x] Constraints captured (local-first, autostart, Node runtime for process routes).

## Guardrails (Do Not Break)

- [ ] Keep app local-first.
- [ ] Keep automatic OpenCode startup on research requests.
- [ ] Keep `runtime = 'nodejs'` for process-spawning routes.
- [ ] Preserve env-driven overrides (`OPENCODE_COMMAND`, `OPENCODE_API_URL`).
- [ ] Keep current frontend contracts backward-compatible:
  - Query result: `id`, `query`, `status`, `sessionId`, `answer`, `sources`, `metadata`, `timestamp`
  - Sessions list: `running`, `host`, `port`, `started`, `count`, `sessions`
  - Session detail: `running`, `host`, `port`, `started`, `session`, `messages`, `messageCount`, `latestMessageAt`, `activeToolCalls`

## P0 (Must) - Architecture + Session Workbench

### API
- [x] Add `GET /api/opencode/events` SSE bridge for `/event` and `/global/event`.
- [x] Support query params on SSE route: `scope=instance|global|both`, `autostart=0|1`.
- [x] Emit normalized events with source tags and monotonic sequence IDs.
- [x] Extend `GET /api/opencode/sessions` with passthrough params: `roots`, `start`, `search`, `limit`.
- [x] Add optional detail includes on sessions route: `include=messages,todo,diff,children`.
- [x] Add `GET /api/opencode/session/[sessionId]/timeline`.
- [x] Add `GET /api/opencode/session/[sessionId]/transcript` with options:
  - `thinking`
  - `toolDetails`
  - `assistantMetadata`

### UI
- [ ] Introduce centralized monitor store/reducer with event-application model.
- [x] Prefer SSE updates with polling fallback.
- [x] Add event debug panel (recent normalized events + filters).
- [x] Add timeline drawer with per-message actions:
  - Revert
  - Copy
  - Fork from message
- [x] Add explicit Undo / Redo controls mapped to revert/unrevert semantics.
- [x] Add parent/child fork navigation UI.
- [x] Add session sidebar blocks:
  - Todo
  - Diff summary/details
  - Context/cost usage
- [x] Add transcript copy/export controls.

## P1 (Must) - Composer + Runtime Controls

### API
- [x] Add `POST /api/opencode/action` typed high-level action endpoint:
  - session
  - message
  - permission
  - question
  - provider
  - mcp
  - project
  - worktree
  - pty
  - global
- [x] Add schema validation + stable error envelopes to action route.
- [x] Extend `GET /api/opencode/monitor` include flags:
  - `providers,agents,skills,commands,path,vcs,mcp,lsp,formatter,projects,config,openapi`
- [x] Normalize monitor payload sections for:
  - `mcp`
  - `lsp`
  - `formatter`
  - `projects`
  - `config`

### UI
- [x] Replace simple prompt textarea with advanced composer.
- [x] Add slash command autocomplete.
- [x] Add mention autocomplete for `@file`, `@agent`, MCP resources.
- [x] Add shell mode + command mode indicators.
- [x] Add image/file attachments in composer.
- [x] Add provider connect modal:
  - auth method discovery
  - OAuth authorize/callback
  - API key entry
- [x] Add model picker grouped by provider.
- [x] Add model variant selector.
- [x] Add agent picker and quick-cycle actions.
- [x] Add MCP panel:
  - status list
  - connect/disconnect
  - auth actions
  - resources preview

## P2 (Should) - File/Project/Worktree/Config + Diagnostics

### API
- [x] Add `GET /api/opencode/files` with modes:
  - `findText` -> `/find`
  - `findFile` -> `/find/file`
  - `list` -> `/file`
  - `content` -> `/file/content`
  - `status` -> `/file/status`
- [x] Add `GET /api/opencode/system` aggregate route for:
  - `config`
  - `global/config`
  - `project`
  - `project/current`
  - `mcp`
  - `lsp`
  - `formatter`
  - `path`
  - `vcs`
- [x] Extend `GET /api/opencode/openapi` with route metadata transform for UI form generation.

### UI
- [x] Add file explorer/search/read/status module.
- [x] Add project list/current/update module.
- [x] Add worktree create/list/remove/reset module.
- [x] Add config editor for local + global config with diff/confirm.
- [x] Improve permission/question UI with richer typed context.
- [x] Expand status panel for LSP + formatter + plugin/config summaries.

## P3 (Could) - PTY Terminal + Command Palette

### API
- [x] Expose PTY lifecycle over HTTP (`list/create/update/delete`) as short-term baseline.
- [x] Run implementation spike for PTY websocket proxy feasibility in Next runtime.

### UI
- [x] Add terminal dock with PTY session create/select/remove.
- [x] Add live PTY stream connection.
- [x] Add PTY input + resize actions.
- [x] Add reconnect handling for PTY sessions.
- [x] Add command palette parity for keyboard-driven operations.

## Cross-Cutting Engineering Tasks

- [x] Build typed backend service adapter module (no scattered direct `fetch` in components).
- [x] Add event method-router layer before reducer mutation.
- [ ] Keep optional/additive response fields only (no breaking contract changes).
- [x] Add compatibility checks when OpenCode API evolves.
- [x] Keep monitor payload size bounded (include flags + lazy loads).

## Validation Checklist (Run Per Meaningful Change)

- [x] `npm run lint`
- [x] `npm run build -- --webpack`
- [ ] Live smoke: `GET /api/opencode/status`
- [ ] Live smoke: `GET /api/opencode/sessions`
- [ ] Live smoke: `GET /api/opencode/monitor`
- [ ] Live smoke: `GET /api/opencode/events` receives stream events
- [ ] Live smoke: `POST /api/query` still autostarts OpenCode as needed
- [ ] Verify `metadata.opencode.started` behavior unchanged
- [ ] Verify session + message visibility in `/api/opencode/sessions?sessionId=<id>`

## Definition of Done (Parity Milestone)

- [ ] Manage sessions end-to-end in web UI:
  - create/select/search/fork/share/rename/archive/delete/undo/redo/summarize
- [ ] Send prompts in normal/command/shell paths with mentions and attachments.
- [ ] Handle permission and question prompts with full context.
- [ ] Manage provider auth, models, agents, and variants.
- [ ] Manage MCP connections/auth/resources.
- [ ] Inspect todos/diffs/messages/timeline and export transcripts.
- [ ] Use file/project/config/worktree workflows.
- [ ] Monitor and operate runtime status with real-time updates.

## Done Log

- [x] 2026-02-12: Refactored oversized monitor/runtime modules without changing API/UI contracts:
  - Extracted monitor page shared model code into `src/lib/opencode-monitor/{types,constants,utils}.ts`
  - Slimmed `src/app/page.tsx` by importing shared monitor symbols/types from `src/lib/opencode-monitor-page-shared.ts`
  - Split OpenAPI compatibility logic into `src/lib/opencode-openapi-compat.ts`
  - Split OpenCode data/session parsing utilities into `src/lib/opencode-data-utils.ts`
  - Verified with `npm run lint` and `npm run build -- --webpack`
- [x] 2026-02-12: Added command palette parity for keyboard-driven operations:
  - Global shortcut `Ctrl/Cmd + K` opens a searchable command palette modal
  - Keyboard navigation (`ArrowUp`, `ArrowDown`, `Enter`, `Escape`) and click execution
  - Palette actions wired to monitor/session refresh, composer focus/send/clear, session undo/redo, PTY connect/disconnect/list refresh, and TUI shortcuts/command execution
- [x] 2026-02-12: Completed PTY terminal streaming parity slice in Terminal Dock:
  - Added direct browser websocket stream connection to OpenCode `/pty/:ptyID/connect` using status-derived `apiUrl` (with host/port fallback)
  - Added live output panel with cursor tracking and bounded buffer
  - Added PTY input send/send-line actions over websocket
  - Added PTY resize action wiring (`size.cols` / `size.rows`) via PTY update endpoint
  - Added reconnect handling with backoff, auto-connect/auto-reconnect toggles, and reconnect attempt indicators
  - Added additive status payload field `apiUrl` in `getOpenCodeStatus()` to support env override-safe websocket targeting
- [x] 2026-02-12: Added typed client backend adapter module (`src/lib/opencode-api-client.ts`) and refactored `src/app/page.tsx` to route API calls through the adapter (no direct component `fetch` calls remain).
- [x] 2026-02-12: Added an explicit event refresh method-router (`resolveEventRefreshScope`) so SSE `event` envelopes route to monitor-only vs monitor+session refresh paths before state updates/timer scheduling.
- [x] 2026-02-12: Added dedicated PTY lifecycle API routes:
  - `GET|POST /api/opencode/pty` for list/create
  - `PATCH|DELETE /api/opencode/pty/:ptyId` for update/delete
  - Updated README route docs and key-files list for PTY baseline coverage
- [x] 2026-02-12: Added a Terminal Dock UI panel for PTY session create/select/remove workflows:
  - Uses `/api/opencode/pty` and `/api/opencode/pty/:ptyId` routes via typed client adapter
  - Includes PTY session list/selection, create/update/delete payload actions, and response inspectors
- [x] 2026-02-12: Added OpenCode API compatibility checks against live OpenAPI snapshots:
  - Added additive monitor include flag `compatibility`
  - Added compatibility report generation (required/recommended endpoint+method checks) in `src/lib/opencode.ts`
  - Surfaced compatibility status/report in Engine Snapshot UI and updated README monitor docs
- [x] 2026-02-12: Added PTY websocket feasibility spike route:
  - `GET /api/opencode/pty/:ptyId/connect` probes upstream connect endpoint and reports feasibility diagnostics
  - Documents that transparent websocket upgrade proxying is not provided by the current Next route-handler path
- [x] 2026-02-12: Added bounded monitor queue limits for payload control:
  - Added additive monitor query params `permissionLimit` and `questionLimit` (default 80 each)
  - Wired limits through API route, backend snapshot builder, and typed client adapter
  - Updated README monitor query parameter documentation
- [x] 2026-02-11: Converted this document from narrative plan to checklist-style tracker.
- [x] 2026-02-11: Completed initial P0 API backend slice:
  - `/api/opencode/events` SSE bridge (`scope`, `autostart`, source-tagged normalized events with `seq`)
  - `/api/opencode/sessions` passthrough filters + detail includes (`todo`, `diff`, `children`)
  - `/api/opencode/session/[sessionId]/timeline`
  - `/api/opencode/session/[sessionId]/transcript`
  - Updated README API docs for these routes and query params
- [x] 2026-02-11: Completed major P0 session workbench UI slice:
  - SSE-first refresh strategy with polling fallback and reconnection
  - Event debug panel with source filtering and recent normalized event log
  - Timeline panel with per-message `revert` / `copy` / `fork` actions
  - Explicit session `undo` / `redo` controls
  - Parent/child navigation chips in session detail
  - Sidebar summaries for todo, diff, and context/cost status
  - Transcript copy/export controls backed by transcript API
- [x] 2026-02-11: Completed core P1 API control and monitor expansion:
  - Added typed `POST /api/opencode/action` for session/message/permission/question/provider/mcp/project/worktree/pty/global actions
  - Added stable validation and action-resolution error envelopes
  - Extended `GET /api/opencode/monitor` with `include=` flags
  - Added normalized optional monitor blocks for `mcp`, `lsp`, `formatter`, `projects`, and `config`
- [x] 2026-02-11: Completed first P1 composer UI parity slice:
  - Replaced basic prompt box with a mode-aware advanced composer (`prompt`, `async`, `command`, `shell`)
  - Added slash command autocomplete for fast mode switching (`/prompt`, `/async`, `/command`, `/shell`)
  - Added mention autocomplete for `@file`, `@agent`, and `@mcp` resource references
  - Added explicit command/shell mode indicators and shell agent selection
  - Added file/image attachments with compact inline context packaging for prompt/command dispatch
- [x] 2026-02-11: Stabilized verification baseline:
  - Excluded `/reference` mirror repositories from app lint/type-check scope (`eslint` + `tsconfig`)
  - Restored green checks for `npm run lint` and `npm run build -- --webpack`
- [x] 2026-02-11: Completed second P1 runtime control UI slice:
  - Added provider connect modal with auth method discovery, OAuth authorize/callback, and API key submission
  - Added provider-grouped model picker + model variant selector with session init apply action
  - Added agent picker with local cycle, TUI cycle, and quick apply to shell composer mode
  - Added MCP control panel with status, connect/disconnect/auth actions, and resource previews
- [x] 2026-02-11: Added `/api/opencode/files` mode-based passthrough route:
  - Supports `findText`, `findFile`, `list`, `content`, and `status` modes
  - Forwards additional query params to mapped OpenCode endpoints
- [x] 2026-02-11: Added `/api/opencode/system` aggregate route:
  - Supports additive `include=` selection across config/project/mcp/lsp/formatter/path/vcs snapshots
  - Returns per-section invocation result envelopes and aggregated errors
- [x] 2026-02-11: Extended `/api/opencode/openapi` with form metadata transform:
  - Adds additive `routeMetadata` entries (path params, query hints, per-method body requirement/templates)
  - Adds additive `metadata` envelope for generated timestamp and route metadata count
- [x] 2026-02-11: Added file explorer/search/read/status UI module:
  - New File Explorer panel in dashboard backed by `/api/opencode/files`
  - Supports `findText`, `findFile`, `list`, `content`, and `status` with optional extra query params
- [x] 2026-02-11: Added project list/current/update UI module:
  - New Project Module panel backed by `/api/opencode/system?include=project,project/current`
  - Supports prefilled JSON updates to `POST /project/current` and live snapshot refresh
- [x] 2026-02-11: Added worktree create/list/remove/reset UI module:
  - New Worktree Module panel backed by `/experimental/worktree` and `/experimental/worktree/reset`
  - Supports create/remove/reset JSON payloads and live list refresh
- [x] 2026-02-11: Added local/global config editor UI module:
  - New Config Editor panel with local and global JSON drafts
  - Includes line-change diff indicators and explicit confirm-before-apply flow
- [x] 2026-02-11: Improved permission/question and runtime status diagnostics:
  - Added typed context summaries in permission/question queues (session/tool/command/prompt/options hints)
  - Expanded engine snapshot with LSP, formatter, and config/plugin summary tiles
