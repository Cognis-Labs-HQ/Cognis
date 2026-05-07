# UI

## Overview

`src/ui/` hosts the Cognis browser frontend. It provides the study workflows, social interaction surfaces, administration panels, and the embedded documentation browser. The UI is a server-rendered multi-page application: each page is an HTML file with its own JavaScript entry point; shared layout shells and reuse utilities keep common behaviour consistent across pages.

The UI layer has no knowledge of which gateways or adapters are installed. Instead, gateways contribute UI elements at runtime through the `UIRegistry` and the page-extensions API. The core pages load only what the server reports as available for the current user, so the frontend remains coherent whether or not optional gateways like profile or notify are enabled.

All user-visible text goes through the i18n system defined in `src/ui/reuse/i18n.js`. No copy is hardcoded in JavaScript or HTML templates. Automated tests in `src/ui/tests/hardcoded-strings.test.js` enforce this at CI time.

## Responsibilities

- Host all page entry points and their associated HTML templates.
- Provide the layout shells (`ui/layouts/`) that all non-login pages render through.
- Maintain the reuse utilities (`ui/reuse/`) for i18n, page composer, unsaved-change guards, and other cross-page behaviour.
- Enforce theme parity: every element resolves its colors from CSS variables, never hard-coded hex values.
- Provide the i18n string packs for all four required languages (en, de, ja, id) at `src/ui/languages/`.

Not responsible for: generating API responses, owning authentication logic, or injecting gateway-specific UI — gateways contribute their own sections via `UIRegistry`.

## Architecture

### Directory structure

| Path                       | Purpose                                                |
| -------------------------- | ------------------------------------------------------ |
| `src/ui/layouts/`          | Shared HTML shells that page entries render inside     |
| `src/ui/public/templates/` | Reusable markup fragments                              |
| `src/ui/public/pages/`     | Per-page HTML files served to the browser              |
| `src/ui/app/`              | Page entry point JavaScript modules                    |
| `src/ui/reuse/`            | Cross-page utility modules (i18n, page composer, etc.) |
| `src/ui/styles/`           | CSS: base tokens, layout, page-specific rules          |
| `src/ui/languages/`        | i18n string packs (en, de, ja, id)                     |

Each page entry point lives in its own subdirectory under `src/ui/app/` as `index.js`. Sub-modules for that page sit alongside `index.js`, dropping any shared prefix (e.g. `settings/font-prefs.js` rather than `settings-font-prefs.js`).

### Page composer

The `createPageComposer` utility in `src/ui/reuse/page-composer.js` handles widget grid layout, persistence, sub-page navigation, toolbar slots, and floating menus. Pages declare an array of `elements` with `id`, `label`, `render`, and optional `gridSize`; the composer handles everything else. See `src/docs/page-composer.en.md` for full API reference.

### UIRegistry

Gateways inject admin panels, static assets, and per-page UI contributions at runtime through the `UIRegistry` (`src/api/ui-registry.ts`). The `GET /api/v1/ui/page-extensions/:pageId` endpoint returns elements contributed by all enabled gateways for the named page. The `GET /api/v1/admin/sections` endpoint returns gateway-contributed admin UI sections.

### State model

- The bearer token and account ID are stored client-side after login.
- Page layout preferences are saved via `PUT /api/v1/users/:accountId/preferences/:pageId`.
- The auth token is also available in the `cognis_access_token` HttpOnly cookie for server-rendered route guards.

### Theme coverage requirement

Every HTML element added to templates or injected from page scripts must resolve its visual colors from CSS theme variables defined in `src/ui/styles/base/theme.css`. Hard-coded hex or rgb values are a policy violation. Both `light` and `dark` modes must remain readable, including hover, focus, disabled, and active states.

## Configuration

The UI layer has no operator-facing configuration beyond environment variables inherited from the API server (e.g. `COGNIS_UI_DEMO_MODE=1` enables pre-populated example data).

## Extension Points

Gateways extend the UI through the `UIRegistry`:

- `ctx.uiRegistry.registerStaticDir(id, dir)` — serves static assets from a gateway-owned directory.
- `ctx.uiRegistry.registerNavbarPlugin({ scriptUrl })` — injects a navbar script into the shell.
- `ctx.uiRegistry.registerAdminSection(section)` — adds a section to the administration page.
- `ctx.uiRegistry.registerPageExtension(pageId, element)` — contributes an element to a named page.

Modules contribute CSS, HTML templates, and JavaScript via the `frontend` field in their manifest. The module loader appends styles, registers templates, and calls `mount(context)` on each script.

## API Routes

| Method | Path               | Description                   | Auth   |
| ------ | ------------------ | ----------------------------- | ------ |
| `GET`  | `/login`           | User sign-in page             | None   |
| `GET`  | `/`                | Study app landing surface     | Cookie |
| `GET`  | `/modules`         | Module and feature management | Cookie |
| `GET`  | `/settings`        | User settings and preferences | Cookie |
| `GET`  | `/administration`  | Administrative controls       | Cookie |
| `GET`  | `/docs`            | Documentation browser         | Cookie |
| `GET`  | `/profile`         | Redirect to own profile       | Cookie |
| `GET`  | `/profile/:handle` | View a user's profile         | Cookie |
| `GET`  | `/user`            | Legacy alias for profile      | Cookie |

### i18n key conventions

| Prefix               | Use                                                              |
| -------------------- | ---------------------------------------------------------------- |
| `ui.reuse.*`         | Labels shared across multiple pages                              |
| `ui.reuse.generic.*` | Context-free standalone action words (save, discard, reset, add) |
| `ui.app.<page>.*`    | Page-specific copy                                               |
| `ui.layout.*`        | Layout shell text and ARIA labels                                |
| `ui.page.title.*`    | Document `<title>` values                                        |
| `module.<id>.*`      | Module-owned strings loaded on demand                            |
