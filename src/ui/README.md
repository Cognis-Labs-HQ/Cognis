# Cognis UI

## Structure
- `src/layouts/`: reusable page layout guardrails.
- `src/reuse/`: shared utilities.
- `public/templates/`: HTML templates imported by JS and served as static assets.
- `src/app/`: page behavior (dashboard, login, docs).

## UX model
Pages (except login) should render through a layout module so row/column guardrails remain consistent while widget customization stays flexible.

## API-driven features
- Login uses `/api/v1/auth/login`.
- Product docs UI reads `/api/v1/docs`.
- User page preferences use `/api/v1/users/:accountId/preferences/:pageId`.
