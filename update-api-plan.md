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
- [ ] Add provider connect modal:
  - auth method discovery
  - OAuth authorize/callback
  - API key entry
- [ ] Add model picker grouped by provider.
- [ ] Add model variant selector.
- [ ] Add agent picker and quick-cycle actions.
- [ ] Add MCP panel:
  - status list
  - connect/disconnect
  - auth actions
  - resources preview

## P2 (Should) - File/Project/Worktree/Config + Diagnostics

### API
- [ ] Add `GET /api/opencode/files` with modes:
  - `findText` -> `/find`
  - `findFile` -> `/find/file`
  - `list` -> `/file`
  - `content` -> `/file/content`
  - `status` -> `/file/status`
- [ ] Add `GET /api/opencode/system` aggregate route for:
  - `config`
  - `global/config`
  - `project`
  - `project/current`
  - `mcp`
  - `lsp`
  - `formatter`
  - `path`
  - `vcs`
- [ ] Extend `GET /api/opencode/openapi` with route metadata transform for UI form generation.

### UI
- [ ] Add file explorer/search/read/status module.
- [ ] Add project list/current/update module.
- [ ] Add worktree create/list/remove/reset module.
- [ ] Add config editor for local + global config with diff/confirm.
- [ ] Improve permission/question UI with richer typed context.
- [ ] Expand status panel for LSP + formatter + plugin/config summaries.

## P3 (Could) - PTY Terminal + Command Palette

### API
- [ ] Expose PTY lifecycle over HTTP (`list/create/update/delete`) as short-term baseline.
- [ ] Run implementation spike for PTY websocket proxy feasibility in Next runtime.

### UI
- [ ] Add terminal dock with PTY session create/select/remove.
- [ ] Add live PTY stream connection.
- [ ] Add PTY input + resize actions.
- [ ] Add reconnect handling for PTY sessions.
- [ ] Add command palette parity for keyboard-driven operations.

## Cross-Cutting Engineering Tasks

- [ ] Build typed backend service adapter module (no scattered direct `fetch` in components).
- [ ] Add event method-router layer before reducer mutation.
- [ ] Keep optional/additive response fields only (no breaking contract changes).
- [ ] Add compatibility checks when OpenCode API evolves.
- [ ] Keep monitor payload size bounded (include flags + lazy loads).

## Validation Checklist (Run Per Meaningful Change)

- [ ] `npm run lint`
- [ ] `npm run build -- --webpack`
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
