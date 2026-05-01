# UI Component

## Purpose
`ui/` hosts the Cognis frontend and documentation center.

## Architecture
- **Layouts**: shared shells in `ui/layouts`.
- **Templates**: reusable markup in `ui/public/templates`.
- **Reuse**: shared utilities in `ui/reuse`.
- **Pages**: route behavior in `ui/app`.

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
- Every new HTML element added to `ui/public/templates` or injected from `ui/app` **must** resolve its visual colors from theme tokens (CSS variables), not hard-coded hex/rgb values.
- Interactive HTML elements (`button`, `select`, `input`, `textarea`, links, badges, status chips) must inherit or explicitly use shared theme variables so both `light` and `dark` modes remain readable.
- If an element cannot use shared classes, add a scoped selector under `ui/styles/base/layout.css` or `ui/styles/page-builder.css` that maps it to existing theme variables.
- PRs that touch UI markup must verify theme parity for both modes before merge.

### Why this is critical for future work
- Theme regressions are treated as functional regressions: unreadable text, low-contrast controls, or mode-inconsistent components are release-blocking issues.
- New UI features should not ship unless they have explicit light/dark validation, including hover/focus/disabled/active states.
- Refactors must preserve theme token usage; replacing variables with hard-coded colors is considered a policy violation.
- During code review, maintainers should request updates whenever new elements bypass theme variables, even if the page appears correct in one mode.

### Ongoing maintenance checklist
- Validate each changed screen in both themes before marking work complete.
- Confirm dynamic/injected markup (template strings, API-rendered HTML, docs markdown output) inherits theme-safe colors.
- Reuse existing tokens first; if a new token is needed, define both dark and light values in `ui/styles/base/theme.css`.
- Keep this requirement visible in future UI PR descriptions to avoid regressions over time.
