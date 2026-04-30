# UI Component

## Purpose
`ui/` hosts the Cognis frontend and includes a centralized documentation center consuming `/api/v1/docs`.

## Principles
- Layout guardrails first: pages use shared layout shells (`ui/src/layouts`) to constrain rows/columns and preserve sane UX.
- Reuse by default: generalized logic lives in `ui/src/reuse` and page-specific behavior stays in `ui/src/app`.
- Template separation: HTML templates live in `ui/src/templates` and are loaded by JS modules.
- API-first state: account login and per-page preferences are persisted via API routes, not hardcoded UI hacks.

## Current UI scaffold
- Dashboard UI: `/dashboard`
- Login UI: `/login`
- Docs UI: `/docs`
- Preferences API: `/api/v1/users/:accountId/preferences/:pageId`
