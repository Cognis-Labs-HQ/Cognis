# UI Component

## Purpose
`ui/` hosts the Cognis frontend for study workflows, social interaction surfaces, administration, and the embedded documentation center.

## Architecture
- **Layouts**: shared shells in `ui/layouts`.
- **Templates**: reusable markup in `ui/public/templates`.
- **Reuse**: shared utilities in `ui/reuse`.
- **Pages**: route behavior in `ui/app`.

## UX routes
| Route | Purpose |
|---|---|
| `/login` | User sign-in |
| `/` | Study app landing surface |
| `/modules` | Module and feature management |
| `/settings` | User settings and preferences |
| `/administration` | Administrative controls |
| `/docs` | Browse production docs |
| `/profile` | Redirect to own profile page |
| `/profile/:handle` | View a user's profile |
| `/user` | Legacy alias for `/profile` (serves profile HTML directly) |

## State model
- Auth token and account id stored client-side.
- Page preferences saved via API (`/api/v1/users/:accountId/preferences/:pageId`).

## Guardrails
> Non-login pages should render through layout shells so customization stays safe and coherent.

## Internationalisation (i18n)

All user-visible text must go through the i18n helper in `ui/reuse/i18n.js` — no hardcoded copy in JS or HTML templates.

### Key conventions

| Prefix | Use |
|---|---|
| `ui.reuse.*` | Labels shared across multiple pages |
| `ui.app.<page>.*` | Page-specific copy |
| `ui.layout.*` | Layout shell text and ARIA labels |
| `ui.page.title.*` | Document `<title>` values |
| `module.<id>.*` | Module-owned strings (loaded on demand) |

### Adding a string

1. Add the key to `src/ui/languages/en/strings.xml` (and mirror it in all other language packs under `src/ui/languages/`).
2. Reference it in JS with `i18n.t('ui.app.mypage.my_key')`.
3. For static HTML, use `data-i18n="..."` and call `applyStaticTranslations(i18n, root)` once after the template is rendered into the DOM.

### Enforcement

Two automated checks in `src/ui/tests/hardcoded-strings.test.js` guard against regressions:

- **Quoted literal check** — flags multi-word strings in regular quoted literals.
- **Template text-node check** — scans JS template literals for literal text between HTML tags (e.g. `<th>ID</th>`) and fails if any alphabetic content is found outside an interpolated `i18n.t()` call.

Run with `node --test src/ui/tests/hardcoded-strings.test.js`.

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
