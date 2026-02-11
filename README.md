# OpenCode Research Website

Local-first research app with an OpenCode-inspired themed UI and an auto-managed OpenCode backend.

## Overview

- Runs on localhost by design.
- Clicking `Start Research` calls `POST /api/query`.
- Backend ensures OpenCode is running, creates a session, submits the query, and returns structured results.
- UI polls `GET /api/opencode/status` for local engine health.
- UI also polls OpenCode session APIs to monitor all sessions and inspect per-session message activity.
- Frontend includes a rebuilt shadcn-style component layer and runtime theme switching (`OC-1`, `Tokyo Night`, `Nord`, `Catppuccin`) with `system/light/dark` scheme control.

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

When a query is submitted:

1. API checks if OpenCode is reachable on `OPENCODE_HOST:OPENCODE_PORT`.
2. If not reachable, API spawns `opencode serve`.
3. API creates an OpenCode session.
4. API sends the research prompt and returns answer text, detected URLs, and metadata.

The session monitor panel:

1. Fetches session list from `GET /api/opencode/sessions`.
2. Lets you select any session.
3. Fetches details/messages from `GET /api/opencode/sessions?sessionId=<id>`.

## UI and Themes

- The app shell is rebuilt around OpenCode-style semantic tokens (`surface`, `text`, `border`, `interactive`).
- Theme controls in the header let you:
  - switch between curated OpenCode-inspired themes,
  - cycle color scheme mode (`system`, `light`, `dark`).
- UI primitives live in `src/components/ui/*` and follow shadcn-style composition patterns.

## Environment Variables

- `OPENCODE_HOST` default `127.0.0.1`
- `OPENCODE_PORT` default `4096`
- `OPENCODE_AUTH_TOKEN` optional, also forwarded in API requests
- `OPENCODE_MODEL` optional
- `OPENCODE_COMMAND` optional full command override for custom startup
- `OPENCODE_API_URL` optional direct API URL override
- `OPENCODE_STARTUP_TIMEOUT_MS` default `25000`
- `OPENCODE_QUERY_TIMEOUT_MS` default `120000`

## API Routes

- `POST /api/query`
  - Input: `{ "query": "..." }`
  - Output: result id, answer text, source URLs, processing metadata, and OpenCode session id.
- `GET /api/opencode/status`
  - Output: running state, host/port, launch command, recent logs, last startup error.
- `GET /api/opencode/sessions`
  - Query params:
    - `limit` optional, max sessions returned (default 40)
    - `sessionId` optional, return detail for one session
    - `messageLimit` optional, max messages in detail mode (default 120)
    - `autostart=1` optional, ensure OpenCode is started before fetching
  - Output (list mode): running state, host/port, session count, sorted sessions.
  - Output (detail mode): selected session metadata, messages, message count, running tool-call count.

## Commands

```bash
npm run dev
npm run lint
npm run build -- --webpack
npm run start
```

## Troubleshooting

- `Failed to process query` + startup error:
  - Verify `opencode` is installed and executable: `command -v opencode`
  - Try manual start: `opencode serve --hostname 127.0.0.1 --port 4096`
- Query works but response quality is odd:
  - Check `/api/opencode/status` logs for backend stderr/stdout hints.
- Session monitor fails:
  - Verify OpenCode API is reachable on configured host/port.
  - Inspect `/api/opencode/status` and `/api/opencode/sessions` responses for startup or API errors.
- Turbopack build fails in restricted environments:
  - Use webpack build path: `npm run build -- --webpack`

## Key Files

- `src/lib/opencode.ts` OpenCode process manager + API client glue
- `src/app/api/query/route.ts` research query endpoint
- `src/app/api/opencode/status/route.ts` runtime engine status endpoint
- `src/app/api/opencode/sessions/route.ts` OpenCode session monitor endpoint
- `src/app/page.tsx` main UI
- `src/app/globals.css` visual theme and animations
- `src/components/ui/*` shadcn-style UI primitives

## Project Docs

- `PLAN.md` long-form project plan
- `AGENTS.md` contributor/agent operating instructions
