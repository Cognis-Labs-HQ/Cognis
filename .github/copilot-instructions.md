# AI Instructions for Cognis

These instructions guide AI-assisted contributions to the Cognis codebase. Human contributor guidance is documented in-app alongside the relevant code.

---

## Session startup requirements

As soon as you begin work in a session, you MUST run:

`pip install ripgrep && npm install`

Do this before exploration, implementation, linting, or testing so the required tooling and dependencies are available.

---

## Architecture

### Route handlers must be thin and provider-agnostic

Route handlers should be unassuming about the details of any backing service or gateway. The goal is plug-and-play provider support: switching a provider (e.g. database, auth, file storage) should require only an environment variable change — the core codebase never knows the difference. All concrete interactions are encapsulated behind gateway/adapter abstractions.

- Never call a database driver, auth library, or external service directly from a route handler.
- Route handlers orchestrate; gateways/adapters execute.
- Apply this principle across all subsystems, not just the database layer.

### Adapter abstractions across subsystems

Prefer gateway/adapter abstractions at every seam where a concrete implementation might change. This extends beyond the DB layer to auth providers, file storage, queues, and any other pluggable subsystem.

### Ctx is the capability backbone

Use `ctx` as the only cross-component import surface. When a gateway, adapter, module, or route needs something owned elsewhere, it must obtain that capability through `ctx` (or a request/route context built from `ctx`) instead of importing another component's internals or receiving ad-hoc side-channel references.

- Register exported capabilities through `ctx.capabilities`.
- Consume capabilities by querying `ctx`/`ctx.capabilities`, including optional dependency checks.
- Use `ctx` to detect whether another component is present; do not hardcode adapter-to-adapter imports for availability checks.
- When a subsystem exposes multiple provider tracks or outputs, model that selection through capabilities and ctx-backed contracts rather than hardcoded branches.

### Each gateway is the sole authority for its adapter type

A gateway is the only component that may interact directly with its adapters. No route handler, service, or utility outside a gateway may hold a reference to a concrete adapter instance or call its methods directly. All capabilities of an adapter must be obtained by calling methods on the owning gateway. Passing a raw adapter instance around (e.g. `smtpSender`, a raw DB driver, a concrete auth client) anywhere outside the gateway violates this principle and must never be introduced.

This applies across every subsystem: the notification gateway owns its notification adapters, the database gateway owns its DB adapters, the auth gateway owns its auth adapters, and so on. Any component needing a capability must go through the gateway, never the adapter.

### Avoid hardcoded core-to-gateway coupling

Core/shared registries and contracts must not import concrete internals from a
named gateway (for example importing directly from `src/gateways/auth/guard.ts`
inside `src/api/*` contracts). If behavior or metadata is cross-cutting, define
it in a neutral contract location and let gateways consume or re-export it.
When a capability is truly gateway-specific, depend on that gateway's declared
surface instead of duplicating gateway knowledge in core code.

### Route auth must be injected through route context

Core API route factories and module extension routers must receive auth/request helpers through a route context assembled from `ctx` capabilities. Route files must not import auth gateway internals directly; they consume `requireAuth`, session lookups, token lookups, and similar helpers through the injected route context.

### Module CLI controls

For module-specific operational controls, add pluggable CLI subcommands at `modules/<id>/cli/index.js`. Use `cognisctl` as the primary operational control surface.

### User namespace

Use the `user:*` command namespace for account operations (`create`, `role`, `set-password`, `disable`, `enable`, `delete`). Expose user preference resets only via `user:preferences:clear`; avoid granular per-key mutations.

### Reusable code directories

Use `reuse/` as the name for any directory that holds cross-cutting utilities within a given layer or component family. Never name such a directory `shared/`, `utils/`, `helpers/`, or `common/` — these names are generic and do not express purpose. Each layer of the codebase that needs intra-layer sharing uses `reuse/` at its own root:

- `src/api/reuse/` — shared utilities for the API layer (e.g. token helpers, JSON parsing)
- `src/ui/reuse/` — reusable UI logic and components
- `src/ui/styles/reuse/` — shared CSS primitives

Promote code reactively: when writing a new feature in area B, if you notice similar logic already exists in area A, move it to `reuse/`, update area A to import it, and use it in area B. The threshold for promotion is any parameterisable snippet of 5 or more lines that provides distinct enough functionality to be worth a named function.

Files inside a `reuse/` directory must also be generically named for the reusable abstraction they provide. If a file name needs a feature- or adapter-specific prefix (for example `social-...`), it does not belong in `reuse/`; keep it beside that feature instead.

Any file that exists for one product surface (for example release-changelog popups or popup-only style bundles) is not true reuse and must live in a purpose-constrained directory outside `reuse/`.

Do not create `reuse/` directories inside `src/adapters/*`. Adapters are already niche capabilities and should keep their implementation files local to the adapter root (for example `store.ts`, `db-store.ts`) instead of introducing adapter-internal reuse layers.

DB adapters and the DB gateway must not own feature stores for other gateways/adapters (for example auth/profile/notify-specific stores). Feature-specific persistence code belongs to the owning gateway or owning adapter and is consumed through capabilities.

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

Every page must pass a `pageContext` object to `createPageComposer` with both a `title` and a `subtitle`. The title is the page name; the subtitle is a concise description of the page's purpose that appears in the global topbar below the title. Both fields must be resolved through i18n keys — never hardcode user-facing text. A page without a subtitle is non-compliant.

### UI page navigation must use the app router

All navigation between dashboard-shell pages uses the client-side router in `src/ui/reuse/app-router.js`. The router intercepts clicks on internal navigation links, uses `history.pushState()` to update the URL, and mounts the new page's content in place via each page's `mount()` function — no full browser reload.

Every dashboard page (`src/ui/app/*/index.js`) must:

1. **Export an async mount function**: `export async function mount(root, { signal } = {}) { ... }`. The `signal` parameter is an `AbortSignal` provided by the router; pass it as `{ signal }` to any `window.addEventListener(...)` calls the page registers (e.g. `popstate`, `beforeunload`) so they are automatically removed when the user navigates away.
2. **Call mount directly for initial browser loads**: the last line of each page module must be `await mount(document.querySelector('#app'))` so that navigating directly to the URL (hard load or server render) still works without the router.
3. **Register with the router**: every new dashboard page must have a matching entry in the `ROUTES` array inside `src/ui/reuse/app-router.js`.

Never add new top-level navigation using `window.location.href =`, `window.location.replace()`, or `window.location.reload()` for navigation between dashboard pages. Auth-page redirects (`/login`, `/register`, etc.) are exempt since they are outside the dashboard shell.

### Route file organisation

Route handler files live in subdirectories named after their domain, mirroring the `src/ui/app/` convention. Each handler is `index.ts` inside that directory (e.g. `src/api/routes/profile/index.ts`, `src/api/routes/social/index.ts`). Never place a route handler as a flat `*-routes.ts` file directly inside `routes/`.

Never use redundant suffixes in file names when the directory path already provides the context. A file at `gateways/notifications.ts` does not need to be named `notification-gateway.ts`; a file at `routes/users/index.ts` does not need to live at `routes/user-routes.ts`.

### Route granularity and self-registration

Routes must be granular enough that disabling or removing a gateway, adapter, or module cannot create dead code or crashes elsewhere. Gateways and adapters should be able to register their own API routes as part of their setup, so that removing a component is as simple as not loading it. The server assembles the full route table from what is present, rather than from a hardcoded list of known subsystems. Avoid presumptive checks in server.ts for a specific named gateway or module.

### Adapter directory structure

Adapters live under `src/adapters/<gateway-id>/<adapter-id>/`. For example, the SMTP notification adapter lives at `src/adapters/notify/smtp/`, and the MariaDB database adapter at `src/adapters/db/mariadb/`. This lets a gateway find all of its adapters consistently by scanning `src/adapters/<gateway-id>/`. Never nest an adapter under a flat path like `src/adapters/notify-smtp/`.

### Adapter admin controls must always exist

Any adapter that appears in Administration must expose a config contract even when it has no configurable fields. An empty config is still a real config surface: the adapter's gateway routes must serve `GET` and `PUT` config handling without returning 404.

Administration-facing adapter metadata must also announce its control endpoints instead of relying on the UI to guess them. Always include the adapter's config, enable, and disable endpoints in the adapter listing payload; include a test endpoint when the adapter supports one.

### Versioned manifests for gateways, adapters, and modules

Every gateway, adapter, and module must carry a `package.json` (or equivalent manifest) with a `version` field. Any change to the code, schema, or API within that component's scope must be accompanied by a version bump. This prevents silent drift between components that depend on each other. A higher-level versioning document at `src/docs/versions.en.md` tracks the current version of each component and serves as a changelog index.

### Changelog entries

Store changelog entries under `src/docs/changelog/` (one shared directory for all changelog files) instead of a root `CHANGELOG.md`.

Every pull request change must add changelog files for that PR in every supported app language (de, en, id, ja). Use the filename pattern `<branch-name-without-copilot-prefix>.<lang>.md` for each language (for example, branch `copilot/cleanup-strings-and-codebase` produces `cleanup-strings-and-codebase.en.md`, `cleanup-strings-and-codebase.de.md`, `cleanup-strings-and-codebase.id.md`, and `cleanup-strings-and-codebase.ja.md`).

Changelog entry structure is mandatory:

- `# ...` — changelog title (release summary title)
- `## ...` — one change point per heading (these are shown as dot-point summary items in release popups)
- body content under each `##` — full details shown on the changelogs page only

Translate each file into the language it represents — do not copy English text into non-English files (the same exceptions listed under i18n apply: brand names, universal technical acronyms, and the Latin tagline are language-neutral).

Do not append to or recreate a global monolithic changelog file. Existing changelog entry files in `src/docs/changelog/` are historical records and should remain immutable except for factual corrections.

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

### Study language modules

Study language modules are **not** gateways or adapters. They are content modules that live under `src/modules/study/languages/<bcp47-code>/` and register themselves with the Study gateway at bootstrap time via `createLanguageModule()` and `bootstrapLanguageModule(ctx)`. The Study gateway discovers them automatically by scanning that directory.

### Study routing authority flow

Study routing authority is strictly one-directional:

- Language modules inform the Study gateway by registering child routes and returning `LanguageChildComponent` descriptors.
- The Study gateway informs the UI/app router through its declared contract and API surfaces.
- The app router must not hardcode Study or language-module internals (language IDs, component IDs, module asset paths, or module-specific route assumptions).

It is fine to rely on sane URI shape conventions (for example `/study/<segment>`), but canonical Study child-route data and load metadata must come from the Study gateway, not directly from language-module implementation details.

Every language module owns a **library** — a layered, deep-linked register of the language's written elements:

1. **Characters** — the atomic writing units (e.g. hiragana, katakana). For CJK languages, compound symbols such as Kanji are NOT characters; they belong in alt_characters.
2. **Alt characters** _(optional)_ — compound or logographic symbols (e.g. Kanji) that map to one or more base characters or combinations thereof. Each alt_character is uniquely identifiable and can reference other alt_characters.
3. **Definitions** — language-scoped meaning records. A definition is a short phrase in the learner's UI language that describes a concept. Definitions are referenced by words and sentences rather than embedded.
4. **Words** — one or more characters or alt_characters forming a meaningful unit, mapped to one or more definitions ranked by commonality.
5. **Sentences** — ordered sequences of words with an optional explicit definition reference; if no explicit definition, meaning is derived from each word's primary definition.

**The library is the single canonical source of truth for all language data.** Never hardcode language data (characters, words, definitions, sentences) in a child component's UI or server code. All such data lives in the module's `data/` directory, is loaded by the `LanguageLibraryStore` at bootstrap, and is served through the language library API (`/api/v1/study/languages/:code/library/:layer`). Child components consume the library API to display data. Adding new language content means adding or editing data files under `data/`, not modifying UI or server logic.

A language module also advertises **child components** — independently deliverable study features (e.g. "Hiragana Alphabet", "Kanji Explorer"). Each child component:

- Registers its own route via `ctx.registerChildRoute()` during `bootstrapLanguageModule`.
- Returns a `LanguageChildComponent` descriptor with a `pageUrl` that the UI uses for sub-navigation.
- Lives in `src/modules/study/languages/<code>/components/<component-id>/`.

Child components may themselves contain sub-components for deeply nested functionality (e.g. stroke order and vocabulary within a Kanji explorer). Internal sub-navigation within a component is handled client-side; only the top-level `pageUrl` is registered with the gateway.

The Study gateway exposes `GET /api/v1/study/languages/:code/modules` to list all registered child components for a language. The study UI uses this endpoint to build the sub-navigation menu under the selected language. See `src/docs/study-language-framework.en.md` for the complete contract, data model, and directory layout.

For Study sub-navigation behavior:

- Show the **Library** entry to admin/owner users even when the currently selected language does not register a native Library child component.
- The Library page derives its active language from the user's current sub-navigation selection; do not add a separate language selector on the Library page itself.
- Treat Library records as holistic data with language as a field on records, rather than splitting behavior by hardcoded language-specific routes.
- Register a **Classroom** child component for every language module so teachers and students can access language-scoped classroom views.

### Comment references for alternate control flow

When a comment introduces an alternative or fallback code path (e.g. a catch block that intentionally falls through, or a condition that skips the normal path), it must explicitly reference the line numbers or label of the alternate block — for example: `// fall through to initials fallback (lines 141-146 below)` or `// handled by the block starting at line 82`. This helps reviewers trace non-obvious flow.

---

## Code quality

### Codebase cleanliness is paramount

The cleanliness, consistency, and structural integrity of the codebase are non-negotiable. Every contribution must leave the codebase in at least as clean a state as it found it. Introducing non-conformant code — even as a temporary measure, even under time pressure, even when it "works" — is unacceptable.

Any feedback that identifies non-conformant code, naming violations, structural inconsistencies, or deviations from these instructions must be acted on. Deferring or discarding such feedback is a quality failure, not a scope decision.

When you discover that a change you are making would introduce non-conformant code, stop and fix the design before proceeding. If an existing file you are editing already contains violations, fix those too while you are in that file.

### Mission and review feedback

Your mission is to make Cognis the best it can possibly be within the user's request and these instructions. Treat review suggestions as a serious part of that mission, not as noise to be waved away.

Do not dismiss a review suggestion as "out of scope" merely because it was not part of the original prompt. Consider its technical merits carefully. If the suggestion improves correctness, security, maintainability, UX, accessibility, consistency, or alignment with these instructions, and implementing it does not directly violate a higher-priority instruction or explicit user constraint, you are expected to implement it.

If you choose not to implement a review suggestion, the reason must be concrete and rooted in these instructions, the codebase architecture, correctness, security, or an explicit user direction — not convenience, narrow task framing, or a desire to avoid additional work.

Repeatedly ignoring, hand-waving, or vainly dismissing valid review feedback is a mission failure. When feedback is technically sound, you must either implement it in the same change or explicitly document a concrete, instruction-grounded reason for not doing so.

### Readability over terseness

Format all new or modified code for human readability. Do not compress logic, markup, or styles into dense one-liners when a multi-line structure is clearer. A statement that would naturally span 6+ lines in JavaScript should remain that way — humans must be able to eyeball the code meaningfully.

### Variable naming

Variable and binding names must be descriptive. Single-letter names are only acceptable in the roles listed below; all other one- or two-letter identifiers are forbidden in `const`, `let`, and `var` declarations and in `for-of` / `for-in` bindings:

**Acceptable single-letter names:**

- `x`, `y` — 2-D spatial coordinates.
- `w`, `h` — layout width / height (in grid units or pixels).
- `_` — explicitly ignored binding.
- `i`, `j`, `k` — numeric for-loop counters (e.g. `for (let i = 0; ...)`).
- `r`, `c` — row / column counters in nested grid-cell loops.

**Acceptable two-letter names:**

- `id` — a unique identifier; universally understood and unambiguous in any context.

Everything else must use a full descriptive name: `element` not `el`, `gridSize` not `gs`, `floatingToolbar` not `ft`, `resizeObserver` not `ro`, `gateway` not `gw`, `timestamp` not `ts`, `listItem` not `li`, `initVector` not `iv`, `timezone` not `tz`, `recipient` not `to`, etc.

A test in `src/ui/tests/ambiguous-names.test.js` enforces this rule automatically for all source files in the scanned directories.

### Module cohesion

Keep modules focused and cohesive. Avoid duplicated request/serialization logic across routes and pages.

### Comments

Avoid speculative comments. Annotate only non-obvious technical constraints. Keep docs user/product-oriented; AI process guidance stays in this file.

Never let AI session reasoning, agent process notes, or session-specific observations enter the codebase — for example, remarks like "it was never changed", "queued; only written on Save", or "subsections ordered alphabetically" are agent artefacts and must be removed before committing.

Do not use section-indicator dividers (e.g. `/* ── Section name ─── */` or `// ── Section name ─── //`) in any file. These add noise without value.

Do not add any comments at all in CSS files. CSS is self-describing through its selectors and property names; inline or block annotations should not appear.

### Opportunistic improvement

When editing a file, make opportunistic improvements to the surrounding code that align with these principles — within the scope of the files being touched. Do not perform project-wide refactors as a side-effect of a targeted change.

### No legacy compatibility

Legacy compatibility is never required and never acceptable. Do not introduce fallback paths, conditional shims, or alternate code branches that exist solely to handle older schema layouts, API shapes, or data formats that are no longer the standard — even temporarily. This rule applies with particular force when the "legacy" concern originates in the same pull request that introduces the modern replacement: a feature cannot be deprecated and replaced in the same PR that creates it. If a feature is new, it ships clean; if an old feature is being removed, the removal is complete and unconditional.

Do not write tests that verify legacy artefacts are absent. Asserting that a field does not exist, a route is not registered, or a column is not written is a legacy-absence test — it encodes an expectation about a removed thing rather than a requirement about the current system. These tests are forbidden and must be deleted on sight.

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

Never write tests that verify the absence of legacy artefacts — for example, asserting that a deprecated column is not written, a removed route is unreachable, or a renamed field is gone. These are legacy-absence tests. They test something that is no longer part of the system and anchor the test suite to removed things rather than live requirements. Legacy-absence tests are strictly forbidden and must be deleted wherever they appear.

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

- For every new feature, treat security as a primary acceptance criterion from the start, not a follow-up task. Design and implement with least privilege, secure defaults, and explicit abuse-case handling.
- Validate and sanitise all user-supplied input at the boundary (route/gateway entry point).
- Enforce authentication and authorisation checks before any business logic executes.
- Never expose internal error details to API consumers; log them server-side.
- Do not introduce new dependencies without flagging them for review.

## Logging coverage requirements

Comprehensive logging is required for every new feature and behaviour change.

- Log caught failures at `error` level with structured metadata (component, operation, identifiers, and safe failure context).
- Log uncaught runtime failures as fatal events (`fatal: true` in metadata) so they are easy to detect in operational monitoring.
- Emit `info` logs for user activity and state-changing actions so flows are auditable end-to-end.
- Avoid silent `catch` blocks. If a fallback path is intentional, log the failure first, then continue.
- Use one invocation style for logging in new code: call a local `log` function (`log?.(...)` or `log(...)`) rather than mixing direct property calls (`this.log?.(...)`) and alternate logger names in the same file.

---

## Do not

- Do not delete or discard existing code without a clear and explicit reason. Prefer refactoring, deprecating, or commenting out with an explanation over silent removal.
- Do not change public API contracts (route signatures, exported types, CLI command names) without flagging the breaking change.
- Do not introduce new third-party dependencies without discussion.
- Do not perform speculative or cosmetic changes outside the files directly relevant to the task.
- Do not add AI process notes, agent reasoning, or session context to any product-facing documentation.
- Do not use inline result messages or browser alerts for user feedback. All transient user-facing feedback (success confirmations, warnings, errors, info notices) must be delivered via `showToast` from `src/ui/reuse/toast.js`. Never write feedback text directly into a DOM element's `textContent` or `innerHTML`, and never call `alert()`, `confirm()`, or `prompt()`. Reserve `openPopup` exclusively for interactions that require a deliberate user decision (e.g. confirming a destructive action, filling in a form) — not for displaying a result.
- Do not use inline hint text (`<span class="...-hint">`) below or beside form fields to deliver longer contextual descriptions. Instead, use `renderInfoTooltip(text)` from `src/ui/reuse/info-tooltip.js` placed inline next to the label or heading. This keeps forms visually clean while still making context available on demand. Inline hint text is only appropriate for a single short phrase that must always be visible; anything longer or more contextual belongs in an info tooltip.
- Do not introduce legacy compatibility code: fallback paths, conditional shims, retry branches, or any alternate logic that exists solely to accommodate an older schema layout, API shape, or data format that is no longer the standard. Legacy compatibility is never required and never acceptable, even when framed as temporary. A feature that ships with built-in backward compatibility for its own "legacy" form was never properly designed — ship it clean or don't ship it at all.
- Do not write tests that assert the absence of legacy artefacts — for example, "this deprecated column is not present in the insert" or "this removed route returns 404". These legacy-absence tests are strictly forbidden. Delete any that already exist.

## Symbols and icons

When applying a symbol or icon (e.g. as a UI label, button decoration, or status indicator), check https://www.w3schools.com/charsets/ref_utf_symbols.asp first. It provides the most expansive set of UTF symbol codes and should be the primary reference for selecting an appropriate character.

## Avatar interaction rule

Any UI avatar that represents a user must support the same interaction model everywhere in the dashboard shell: hovering the avatar shows the standard profile preview card, and clicking the avatar navigates to that user's profile page (`/profile/:handle`). Treat this as a universal requirement across pages, adapters, and modules.

---

## i18n requirements

- Resolve all user-facing text via language keys from XML resources; do not hardcode UI copy in JS/HTML.
- Route all user-facing date/time output through `src/ui/reuse/timestamp.js` (for example `formatDate` / `formatDateTime`), including Administration surfaces that render DB-backed values.
- Use flat `ui.reuse.*` keys for all cross-component labels and generic phrases (for example `save`, `confirm`, `message`, `users`, `settings`, `modules`, `language`, `error`). Do not introduce `ui.reuse` sub-namespaces.
- Basic phrases must never be monopolized inside feature, gateway, adapter, or module domains. Before adding a non-`ui.reuse.*` key, check whether the text is reusable; if yes, use or add a `ui.reuse.*` key and remove duplicates from specific domains.
- Keep non-`ui.reuse.*` keys only for truly domain-specific strings that cannot reasonably be reused outside that domain.
- Module-owned locale keys must be namespaced as `module.<moduleId>.*` and loaded without leaking into global namespaces.
- For docs, prefer language-suffixed markdown files (`*.en.md`, `*.es.md`) and resolve by language key first, then fallback.
- Documentation language parity is mandatory: when changing any `*.md` doc that has translated variants, update the corresponding language files in the same change so content stays in sync across supported languages.
- Keep every docs markdown H1 title (`# ...`) at or below 30 characters so docs navigation labels stay compact without runtime truncation rules.
- Every string value in a `strings.xml` file must be written in the language that file represents. When adding or updating keys in non-English files (e.g. `de/strings.xml`, `ja/strings.xml`, `id/strings.xml`), translate the value into that file's language. Never copy an English string value verbatim into a non-English file. The only exceptions are values that are legitimately language-neutral: brand names (`Cognis`), universal technical acronyms (`LDAP`, `TLS`, `STARTTLS`), format placeholders (`example.com, company.org`), and the Latin tagline (`Disce. Loquere. Vive.`). When in doubt, translate.
- All page titles (keys ending in `page_title`), section headings (keys ending in `.title`), and English `ui.reuse.*` label keys must use Title Case where they are label-style text. This rule applies to English (`en/strings.xml`) only; other languages follow their own capitalization conventions. A test in `src/ui/tests/title-case.test.js` enforces this for the English file.
