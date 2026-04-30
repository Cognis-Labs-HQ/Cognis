# Cognis Linting & Readability Standard

## Goals
- Keep code human-readable and consistently formatted.
- Prefer small, pure, reusable functions in `src/reuse`.
- Keep rendering templates separate from behavior.

## Rules
1. 2-space indentation, semicolons required, single quotes for JS/TS strings.
2. One responsibility per module; extract shared logic into `reuse/`.
3. HTML structure lives in `ui/src/templates/*.html`; JS imports templates via loader utilities.
4. Page shells/layout guardrails live in `ui/src/layouts/`.
5. API routes should delegate business logic to services; avoid inline persistence logic.

## Lint command
- `npm run lint` runs the repository lint placeholder plus a readability guard that fails on tabs and trailing spaces for `api/`, `core/`, and `ui/` sources.
