# AI Instructions for Cognis

These instructions guide AI-assisted contributions to the Cognis codebase. Human contributor guidance is documented in-app alongside the relevant code.

---

## Architecture

### Route handlers must be thin and provider-agnostic

Route handlers should be unassuming about the details of any backing service or gateway. The goal is plug-and-play provider support: switching a provider (e.g. database, auth, file storage) should require only an environment variable change — the core codebase never knows the difference. All concrete interactions are encapsulated behind gateway/adapter abstractions.

- Never call a database driver, auth library, or external service directly from a route handler.
- Route handlers orchestrate; gateways/adapters execute.
- Apply this principle across all subsystems, not just the database layer.

### Adapter abstractions across subsystems

Prefer gateway/adapter abstractions at every seam where a concrete implementation might change. This extends beyond the DB layer to auth providers, file storage, queues, and any other pluggable subsystem.

### Each gateway is the sole authority for its adapter type

A gateway is the only component that may interact directly with its adapters. No route handler, service, or utility outside a gateway may hold a reference to a concrete adapter instance or call its methods directly. All capabilities of an adapter must be obtained by calling methods on the owning gateway. Passing a raw adapter instance around (e.g. `smtpSender`, a raw DB driver, a concrete auth client) anywhere outside the gateway violates this principle and must never be introduced.

This applies across every subsystem: the notification gateway owns its notification adapters, the database gateway owns its DB adapters, the auth gateway owns its auth adapters, and so on. Any component needing a capability must go through the gateway, never the adapter.

### Module CLI controls

For module-specific operational controls, add pluggable CLI subcommands at `modules/<id>/cli/index.js`. Use `cognisctl` as the primary operational control surface.

### User namespace

Use the `user:*` command namespace for account operations (`create`, `role`, `set-password`, `disable`, `enable`, `delete`). Expose user preference resets only via `user:preferences:clear`; avoid granular per-key mutations.

### Reusable code directories

Use `reuse/` as the name for any directory that holds cross-cutting utilities within a given layer or component family. Never name such a directory `shared/`, `utils/`, `helpers/`, or `common/` — these names are generic and do not express purpose. Each layer of the codebase that needs intra-layer sharing uses `reuse/` at its own root:

- `src/api/reuse/` — shared utilities for the API layer (e.g. token helpers, JSON parsing)
- `src/adapters/db/reuse/` — shared store abstractions used across all DB adapters
- `src/ui/reuse/` — reusable UI logic and components
- `src/ui/styles/reuse/` — shared CSS primitives

Promote code reactively: when writing a new feature in area B, if you notice similar logic already exists in area A, move it to `reuse/`, update area A to import it, and use it in area B. The threshold for promotion is any parameterisable snippet of 5 or more lines that provides distinct enough functionality to be worth a named function.

Every module in `src/ui/reuse/` must open with a JSDoc block that documents: what the module does, its public exports with a one-line description each, a concrete usage example, and `@param` / `@returns` annotations on non-trivial exported functions. See `unsaved-changes.js` for the canonical form.

### UI app page structure

Each page entry point lives in its own subdirectory under `ui/src/app/` as `index.js`, alongside any sub-modules it owns. The directory name is the page name; sub-modules drop any shared prefix. For example:

```
app/
  settings/
    index.js          ← was settings.js
    font-prefs.js     ← was settings-font-prefs.js
    language-prefs.js ← was settings-language-prefs.js
  administration/
    index.js
  page-builder/
    index.js
  demo-puppeteer/
    index.js
```

Apply this layout to every new page and sub-module; never place a page entry point directly in `app/` as a flat `.js` file.

### UI pages must use createPageComposer

Every UI page must be assembled exclusively through `createPageComposer` from `src/ui/reuse/page-composer.js`. The composer owns layout, the toolbar, page context, the content grid, and element rendering. No page entry point may bypass it by writing directly to `#app`, constructing its own toolbar, floating menu, or content wrapper by hand, or rendering content to the page outside of the composer's `elements` and `toolbar` arrays.

Bypassing the composer is always wrong, even when the page appears to work. Doing so silently breaks theming, accessibility, user layout preferences, and any future infrastructure built into the composer. All of these are non-negotiable requirements for every page in the application.

### Route file organisation

Route handler files live in subdirectories named after their domain, mirroring the `src/ui/app/` convention. Each handler is `index.ts` inside that directory (e.g. `src/api/routes/profile/index.ts`, `src/api/routes/social/index.ts`). Never place a route handler as a flat `*-routes.ts` file directly inside `routes/`.

Never use redundant suffixes in file names when the directory path already provides the context. A file at `gateways/notifications.ts` does not need to be named `notification-gateway.ts`; a file at `routes/users/index.ts` does not need to live at `routes/user-routes.ts`.

### Route granularity and self-registration

Routes must be granular enough that disabling or removing a gateway, adapter, or module cannot create dead code or crashes elsewhere. Gateways and adapters should be able to register their own API routes as part of their setup, so that removing a component is as simple as not loading it. The server assembles the full route table from what is present, rather than from a hardcoded list of known subsystems. Avoid presumptive checks in server.ts for a specific named gateway or module.

### Adapter directory structure

Adapters live under `src/adapters/<gateway-id>/<adapter-id>/`. For example, the SMTP notification adapter lives at `src/adapters/notify/smtp/`, and the MariaDB database adapter at `src/adapters/db/mariadb/`. This lets a gateway find all of its adapters consistently by scanning `src/adapters/<gateway-id>/`. Never nest an adapter under a flat path like `src/adapters/notify-smtp/`.

### Versioned manifests for gateways, adapters, and modules

Every gateway, adapter, and module must carry a `package.json` (or equivalent manifest) with a `version` field. Any change to the code, schema, or API within that component's scope must be accompanied by a version bump. This prevents silent drift between components that depend on each other. A higher-level versioning document at `src/components/docs/versions.en.md` tracks the current version of each component and serves as a changelog index.

### CHANGELOG.md

Maintain a `CHANGELOG.md` at the repository root conforming to [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) standards and [Semantic Versioning](https://semver.org/). Every commit that changes behaviour, fixes a bug, or adds a feature must add an entry under the `[Unreleased]` section with: the commit short-SHA as a parenthetical link, the change type sub-heading (Added / Changed / Deprecated / Removed / Fixed / Security), and a one-line summary. Commit links follow the pattern `https://github.com/le-firehawk/Cognis/commit/<sha>`.

When a pull request is created that targets an imminent release, compress the `[Unreleased]` section into a versioned release block listing each commit with its working URL since the previous release tag, then open a new empty `[Unreleased]` section above it.

### Component self-containment

Gateways, adapters, and modules are responsible for their own resources. This includes:

- **Routes**: each component registers its own API routes; the server auto-discovers them.
- **UI pages**: adapter-specific HTML pages and entry-point JS live inside the adapter directory, not under `src/ui/app/`.
- **Styles**: adapter-specific CSS lives inside the adapter, not under `src/ui/styles/`.
- **Strings (i18n)**: each component can carry its own `languages/<lang>/strings.xml`; the i18n loader merges these at startup. Core-level `src/ui/languages/` files must contain only keys that are genuinely cross-component.
- **User preferences**: adapters and gateways can contribute preference fields to the settings UI; the settings page is assembled from contributions rather than hardcoded sections.
- **Docs**: each component places its documentation under a `docs/` subdirectory. The docs route auto-discovers all `docs/` directories across the codebase and serves them dynamically. Do not hardcode doc paths in the docs route. Follow the section structure, depth tiers, and language requirements defined in `src/docs/standard.en.md`.

### Auto-discovery over static wiring

Prefer scanning the filesystem to discover gateways, adapters, and modules over maintaining hardcoded import lists. The core should load gateways by discovering directories under `src/api/gateways/`; gateways should load adapters by discovering directories under `src/adapters/<gateway-id>/`. Static imports in `src/core/index.ts` or `src/api/server.ts` that enumerate individual components by name work against this goal and create coupling.

### Comment references for alternate control flow

When a comment introduces an alternative or fallback code path (e.g. a catch block that intentionally falls through, or a condition that skips the normal path), it must explicitly reference the line numbers or label of the alternate block — for example: `// fall through to initials fallback (lines 141-146 below)` or `// handled by the block starting at line 82`. This helps reviewers trace non-obvious flow.

---

## Code quality

### Readability over terseness

Format all new or modified code for human readability. Do not compress logic, markup, or styles into dense one-liners when a multi-line structure is clearer. A statement that would naturally span 6+ lines in JavaScript should remain that way — humans must be able to eyeball the code meaningfully.

### Module cohesion

Keep modules focused and cohesive. Avoid duplicated request/serialization logic across routes and pages.

### Comments

Avoid speculative comments. Annotate only non-obvious technical constraints. Keep docs user/product-oriented; AI process guidance stays in this file.

Never let AI session reasoning, agent process notes, or session-specific observations enter the codebase — for example, remarks like "it was never changed", "queued; only written on Save", or "subsections ordered alphabetically" are agent artefacts and must be removed before committing.

Do not use section-indicator dividers (e.g. `/* ── Section name ─── */` or `// ── Section name ─── //`) in any file. These add noise without value.

Do not add any comments at all in CSS files. CSS is self-describing through its selectors and property names; inline or block annotations should not appear.

### Opportunistic improvement

When editing a file, make opportunistic improvements to the surrounding code that align with these principles — within the scope of the files being touched. Do not perform project-wide refactors as a side-effect of a targeted change.

---

## Testing

Before running unit tests, ensure the following prerequisites are met:

- `ripgrep` is installed (used by tooling scripts). Install with `apt-get install -y ripgrep` or equivalent for your platform.
- `npm install` has been run to ensure all dependencies are present.

Write unit tests that verify the API responds correctly under defined conditions, for example:

- An invalid or expired user token cannot make authenticated API calls.
- A disabled extension does not expose its routes via the API.
- A missing required field returns an appropriate error response.

Tests live alongside the code they cover. Place tests for a gateway, adapter, or module inside a `tests/` subdirectory within that component (e.g., `src/adapters/notify/smtp/tests/`, `src/gateways/notify/tests/`). Core API utilities that are not component-specific may keep their tests under `src/api/tests/<subdomain>/` (e.g., `src/api/tests/tfa/`). All new features require tests, logging, and documentation.

---

## Linting and formatting

Before running linting, ensure the following prerequisites are met:

- `ripgrep` is installed (used by tooling scripts). Install with `apt-get install -y ripgrep` or equivalent for your platform.
- `npm install` has been run to ensure all dependencies are present.

The project enforces readability via `src/tooling/scripts/lint-readable.mjs` (no tabs, no trailing whitespace) and `src/tooling/scripts/lint-placeholder.mjs`. Run `npm run lint` to check. All committed code must pass these checks.

Additional formal standards:

- Two-space indentation for JS/TS/HTML/CSS.
- Single quotes for string literals in JS/TS.
- Trailing comma on multi-line arrays and objects.
- Explicit return types on exported functions.
- No `any` in TypeScript except where unavoidable; document why when used.

---

## Security

API sanity and security are paramount.

- Validate and sanitise all user-supplied input at the boundary (route/gateway entry point).
- Enforce authentication and authorisation checks before any business logic executes.
- Never expose internal error details to API consumers; log them server-side.
- Do not introduce new dependencies without flagging them for review.

---

## Do not

- Do not delete or discard existing code without a clear and explicit reason. Prefer refactoring, deprecating, or commenting out with an explanation over silent removal.
- Do not change public API contracts (route signatures, exported types, CLI command names) without flagging the breaking change.
- Do not introduce new third-party dependencies without discussion.
- Do not perform speculative or cosmetic changes outside the files directly relevant to the task.
- Do not add AI process notes, agent reasoning, or session context to any product-facing documentation.

## Symbols and icons

When applying a symbol or icon (e.g. as a UI label, button decoration, or status indicator), check https://www.w3schools.com/charsets/ref_utf_symbols.asp first. It provides the most expansive set of UTF symbol codes and should be the primary reference for selecting an appropriate character.

---

## i18n requirements

- Resolve all user-facing text via language keys from XML resources; do not hardcode UI copy in JS/HTML.
- Use `ui.reuse.generic.*` for standalone action words and common UI labels that are not feature-specific (e.g. `save`, `discard`, `reset`, `refresh`, `add`, `remove`, `done`, `enable`, `disable`, `id`, `version`, `class`, `actions`). Check for an existing `ui.reuse.generic.*` key before introducing a new app-specific one.
- Use shared `ui.reuse.*` keys for labels with meaningful context (section headings, menu items, named features). Reserve `ui.reuse.generic.*` strictly for context-free words usable in any feature area.
- Module-owned locale keys must be namespaced as `module.<moduleId>.*` and loaded without leaking into global namespaces.
- For docs, prefer language-suffixed markdown files (`*.en.md`, `*.es.md`) and resolve by language key first, then fallback.
- Every string value in a `strings.xml` file must be written in the language that file represents. When adding or updating keys in non-English files (e.g. `de/strings.xml`, `ja/strings.xml`, `id/strings.xml`), translate the value into that file's language. Never copy an English string value verbatim into a non-English file. The only exceptions are values that are legitimately language-neutral: brand names (`Cognis`), universal technical acronyms (`LDAP`, `TLS`, `STARTTLS`), format placeholders (`example.com, company.org`), and the Latin tagline (`Disce. Loquere. Vive.`). When in doubt, translate.
