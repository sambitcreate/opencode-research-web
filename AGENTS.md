# AGENTS.md

Repository-level guidance for coding agents and contributors.

## Purpose

This app is a localhost research interface that orchestrates a local OpenCode instance.
Primary goal: keep the local query flow stable and transparent.

## Core Architecture

- Frontend: `src/app/page.tsx`
- Global theme tokens + shell styling: `src/app/globals.css`
- Reusable UI primitives (shadcn-style): `src/components/ui/*`
- Shared class utility: `src/lib/utils.ts`
- Query API: `src/app/api/query/route.ts`
- Engine status API: `src/app/api/opencode/status/route.ts`
- Session monitor API: `src/app/api/opencode/sessions/route.ts`
- Event stream bridge API: `src/app/api/opencode/events/route.ts`
- Typed action API: `src/app/api/opencode/action/route.ts`
- Session timeline API: `src/app/api/opencode/session/[sessionId]/timeline/route.ts`
- Session transcript API: `src/app/api/opencode/session/[sessionId]/transcript/route.ts`
- OpenCode manager/client glue: `src/lib/opencode.ts`

## Non-Negotiables

- Keep the app local-first.
- Do not remove automatic OpenCode startup on research requests.
- Do not switch `query` API runtime away from Node (`runtime = 'nodejs'`), because it spawns processes.
- Avoid destructive git commands unless explicitly requested.
- Keep the OpenCode-inspired theme system and compact UI density intact unless explicitly asked to redesign.

## OpenCode Integration Notes

- Default startup path is `opencode serve --hostname 127.0.0.1 --port 4096`.
- Do not assume `opencode serve` supports browser/CORS flags on every version.
- If startup fails, preserve and expose logs through status endpoint.
- Prefer env-driven overrides (`OPENCODE_COMMAND`, `OPENCODE_API_URL`) over hardcoding.
- Session monitoring should use OpenCode HTTP APIs (`GET /session`, `GET /session/:id`, `GET /session/:id/message`) via `src/lib/opencode.ts`.
- Keep monitor reads non-destructive; do not mutate/delete sessions from the monitor endpoint.
- Preserve SSE bridge behavior:
  - `GET /api/opencode/events` supports `scope=instance|global|both` and `autostart=0|1`.
  - Bridge emits normalized event envelopes with monotonic `seq`.

## Editing Guidelines

- Keep TypeScript strict-compatible.
- Keep UI mobile-safe and desktop-safe.
- Keep the frontend token-driven:
  - Semantic tokens are defined in `src/app/globals.css` (surface/text/border/status/interactive variables).
  - Runtime theme definitions are in `src/app/page.tsx`.
- When introducing new UI controls, prefer primitives in `src/components/ui/*` instead of ad-hoc styled elements.
- Preserve result contract used by frontend:
  - `id`, `query`, `status`, `sessionId`, `answer`, `sources`, `metadata`, `timestamp`
- Preserve monitor contracts used by frontend:
  - List mode: `running`, `host`, `port`, `started`, `count`, `sessions`
  - Detail mode: `running`, `host`, `port`, `started`, `session`, `messages`, `messageCount`, `latestMessageAt`, `activeToolCalls`
  - Detail mode optional additions: `todo`, `diff`, `children`
- Preserve monitor include behavior:
  - `GET /api/opencode/monitor` supports `include=` CSV.
  - Optional include blocks are additive (`mcp`, `lsp`, `formatter`, `projects`, `config`).
- Preserve sessions passthrough query behavior:
  - `GET /api/opencode/sessions` supports `roots`, `start`, `search`, `limit`.
- Keep typed action envelopes stable:
  - `POST /api/opencode/action` validation/action-resolution errors use `{ ok: false, error: { code, message, details } }`.
- If you change API payload shape, update both API route and UI types in the same change.

## Verification Checklist

Run after meaningful changes:

```bash
npm run lint
npm run build -- --webpack
```

Optional live smoke test:

1. Start app: `npm run dev`
2. Check status: `GET /api/opencode/status`
3. Check sessions: `GET /api/opencode/sessions`
4. Check monitor: `GET /api/opencode/monitor`
5. Check events stream: `GET /api/opencode/events?scope=both`
6. Check timeline: `GET /api/opencode/session/<id>/timeline`
7. Check transcript: `GET /api/opencode/session/<id>/transcript`
8. Submit query: `POST /api/query`
9. Confirm `metadata.opencode.started` behavior and returned `sources`
10. Confirm new session and messages appear in `/api/opencode/sessions?sessionId=<id>`

## Documentation Rule

When changing behavior, update `README.md` in the same PR/commit.

## Reference Repositories

The following repositories are cloned in `/reference` for code/inspiration reference:
- `opencode` (anomalyco/opencode)
- `CodexMonitor` (Dimillian/CodexMonitor)
