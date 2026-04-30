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

## Theme coverage requirement (light/dark)
- Every new HTML element added to `ui/src/templates` or injected from `ui/src/app` **must** resolve its visual colors from theme tokens (CSS variables), not hard-coded hex/rgb values.
- Interactive HTML elements (`button`, `select`, `input`, `textarea`, links, badges, status chips) must inherit or explicitly use shared theme variables so both `light` and `dark` modes remain readable.
- If an element cannot use shared classes, add a scoped selector under `ui/src/styles/base/layout.css` or `ui/src/styles/page-builder.css` that maps it to existing theme variables.
- PRs that touch UI markup must verify theme parity for both modes before merge.
