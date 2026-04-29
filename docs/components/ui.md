# UI Component

## Purpose
`ui/` hosts the Cognis frontend and includes a centralized documentation center consuming `/api/v1/docs`.

## Requirements
- Render docs index and per-component markdown from API.
- Keep layout modular to support pluggable module UI panels.
- Store static images/icons under `ui/public/assets/icons` instead of generic root-level `src/` paths.
- Support a puppeteered demo mode controlled by deployment environment.
- Keep UI endpoint URIs clean (entrypoint at `/dashboard`).

## Current UI scaffold
- Jira-like page builder in `ui/index.html` + `ui/src/app/page-builder.js`.
- Widget registry and page defaults to support add/tweak/remove component composition on every page.
- Demo puppeteer in `ui/src/app/demo-puppeteer.js`, triggered when `COGNIS_UI_DEMO_MODE` is enabled via API config.
- `Sandbox` page includes all baseline widgets for low-effort UI capability validation.
- API server serves UI with baseline security headers and CSP.
