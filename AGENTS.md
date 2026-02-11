# AGENTS.md

Repository-level guidance for coding agents and contributors.

## Purpose

This app is a localhost research interface that orchestrates a local OpenCode instance.
Primary goal: keep the local query flow stable and transparent.

## Core Architecture

- Frontend: `src/app/page.tsx`
- Query API: `src/app/api/query/route.ts`
- Engine status API: `src/app/api/opencode/status/route.ts`
- OpenCode manager/client glue: `src/lib/opencode.ts`

## Non-Negotiables

- Keep the app local-first.
- Do not remove automatic OpenCode startup on research requests.
- Do not switch `query` API runtime away from Node (`runtime = 'nodejs'`), because it spawns processes.
- Avoid destructive git commands unless explicitly requested.

## OpenCode Integration Notes

- Default startup path is `opencode serve --hostname 127.0.0.1 --port 4096`.
- Do not assume `opencode serve` supports browser/CORS flags on every version.
- If startup fails, preserve and expose logs through status endpoint.
- Prefer env-driven overrides (`OPENCODE_COMMAND`, `OPENCODE_API_URL`) over hardcoding.

## Editing Guidelines

- Keep TypeScript strict-compatible.
- Keep UI mobile-safe and desktop-safe.
- Preserve result contract used by frontend:
  - `id`, `query`, `status`, `sessionId`, `answer`, `sources`, `metadata`, `timestamp`
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
3. Submit query: `POST /api/query`
4. Confirm `metadata.opencode.started` behavior and returned `sources`

## Documentation Rule

When changing behavior, update `README.md` in the same PR/commit.
