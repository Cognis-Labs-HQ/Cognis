# UI Component

## Purpose
`ui/` hosts the Cognis frontend and documentation center.

## Architecture
- **Layouts**: shared shells in `ui/src/layouts`.
- **Templates**: reusable markup in `ui/src/templates`.
- **Reuse**: shared utilities in `ui/src/reuse`.
- **Pages**: route behavior in `ui/src/app`.

## UX routes
| Route | Purpose |
|---|---|
| `/login` | User sign-in |
| `/dashboard` | Modular page builder |
| `/docs` | Browse production docs |

## State model
- Auth token and account id stored client-side.
- Page preferences saved via API (`/api/v1/users/:accountId/preferences/:pageId`).

## Guardrails
> Non-login pages should render through layout shells so customization stays safe and coherent.
