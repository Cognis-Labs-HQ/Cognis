# AI Instructions for Cognis

These instructions guide AI-assisted contributions to the Cognis codebase. Human contributor guidance is documented in-app alongside the relevant code.

---

## Persistent Review Preferences

Read this file before changing Cognis or its modules. Apply these preferences proactively while implementing and reviewing; do not wait for another review comment. They supplement the AI instructions and do not authorize unrelated changes.

### Ownership and integration

- Keep code, routes, tests, styles, CLI contributions and lifecycle cleanup in their owning component. An optional component must be removable without breaking its siblings or core.
- Treat ctx as the backbone of every supported application action, on the server and in the browser. Declare and execute named staged flows for reads, navigation, practice, imports, exports and mutations; register capabilities through ctx and fail when required contracts are unavailable. Add behavioral contract tests that fail if actions bypass their declared flow or component boundary.
- Use injected ctx capabilities and registered flows across component boundaries. Never instantiate another component's concrete services or import its private implementation, including in tests.
- Only publish capabilities that are fully implemented, registered and tested. Check the actual host capability used by bootstrap, disable and uninstall; reject unavailable contracts rather than falling back to broader or older APIs.
- Core owns host behavior and policy; modules provide language data and dictionary enrichment. Modules must not dictate app navigation, permissions or query-cache refresh schedules.
- Do not change core, routing, page shell or composer-owned classes merely to make a feature work. Diagnose missing styles, initialization and lifecycle handling in the owning page first. Intentional shared features require their own evidence and regression coverage.
- Keep browser providers scoped to module lifetime and canvas instances scoped to page lifetime. Share provider ownership through ctx across bundled and directly served loader instances. Enforce exclusive integration-source bindings in the resource provider, and provide administrator recovery without guessing which historical reference to retain.
- Unhook contributed UI/backend functions and event handlers when disabled or unmounted. Roll back registrations on failed bootstrap.

### Reuse, clarity and scope

- Search existing reuse before implementing a helper. Move parameterizable duplicated logic of five or more lines into the narrowest appropriate component-owned `reuse/` abstraction, with direct consumers.
- Remove duplicate variable definitions and duplicated fixture setup. Generic shared labels belong in reuse and retain all supported translations.
- Avoid forwarding-only shims, speculative compatibility branches and unnecessary abstractions. Keep route handlers thin; preserve meaningful named operation stages and transaction boundaries.
- Preserve blank lines between functions, methods and declaration groups. Never remove newlines, compress declarations, raise size thresholds or weaken tests to disguise a large file or PR. Split files by coherent responsibility.
- Keep large markup in feature templates and styles in their owning stylesheet. Small reusable controls may render their own bounded markup.
- Review the whole PR and adjacent functionality, not only the reported symptom. Keep changes proportional to the feature, and explain unavoidable generated data separately.
- Trace callers, capability consumers and lifecycle hooks before deleting apparently obsolete code. Preserve active Study progress, XP, achievements, leaderboard and quota integrations. Keep DB driver changes out of feature fixes unless evidence demonstrates a driver defect.
- Scope caches to their owning component, bound their keys, coalesce concurrent loads and evict failed promises so retries remain possible.
- Decode entities and interpolate placeholders in a single pass each; inserted values remain opaque data. Use the existing localized catalog and explicit fallback policy rather than recursive replacement or hardcoded messages.
- Reuse uniform cryptographic sampling for shuffles and selections. Reject out-of-range samples instead of reducing arbitrary random integers modulo the range.

### UI and Study feedback

- Use page composer, existing buttons, themed selects, SVG icons, popup/discard confirmation, profile previews and notification conventions. Do not override composer/shell classes in feature CSS.
- Keep URLs free of query data, credentials and incidental page state. Preserve sidebar geometry and moved drawing-pad position across overlays. Close the drawing pad when leaving Explore.
- Carousels append repeated placements. Hover highlights every matching placement, previews only primary pronunciation/definition, and horizontal dragging has drop indicators.
- Resolve every reference to a real canonical UUID. Preserve authored composition, sentence structure, transformations and pronunciation segments across edits and nested creation.
- Dictionary matches of the same composition combine alternate readings/definitions. Distinct compositions are optional choices. Preserve authoritative readings and common-result order; only suppress proven redundant echoes. Enforce field limits before saving.
- Characters and particles remain provider-owned. Recursive dictionary enrichment starts at the permitted writing-unit layer. Hidden pronunciation cards follow provider content rules and resolve their own kana dependencies.
- Keep requests' original card context through relocations; clear it only on deletion. Distinguish genuine new content from scope oscillations. Admin-authorized operations run immediately unless the operation explicitly requires review/confirmation.
- Batch delete has one confirmation. Downgrading shared visibility requires confirmation/review and complete cascade handling; notify affected users in the Study category. Success creates/requests show a toast.
- Browse pages show all visible items, concise empty states, sort/favourite controls and clean selected-detail results. Keep preview favourites clear of child hints, toast successful favourite changes, and use Escape to exit multi-selection. Show one contextual favourite control during study. Deck exports are available only to their creator or an administrator. Flashcards own their adapter, use Cognis sharing, and permit provider starter decks.

### Verification and documentation

- Test observable behavior through real registered flow execution and public-contract fakes. Source-only assertions are supplemental; they cannot prove a capability works. Never use silent no-op runners, unrelated tests or altered assertions to hide failures.
- Keep executable test fixtures static and configurable values in data files. Load actual module exports through explicit dependency boundaries instead of generating executable source, rewriting exports or evaluating symbol names.
- Read the linked review and search existing reuse before patching. Batch independent checks; rerun passed checks when relevant code changes or unresolved evidence warrants it. Compare type diagnostics against the same base revision to distinguish existing failures from regressions.
- Distinguish source fixes, passing local regressions, completed security jobs and confirmed alert clearance. Do not claim a clean CodeQL result from an older run or job completion alone.
- Check cold/direct navigation, repeated SPA mounts, disabled/uninstalled providers, admin/user permissions, pending/approved requests, transactional failures and dictionary/card duplication.
- Keep versions, manifests, lockfiles, dependency ceilings and all four localized documents/changelogs synchronized. Document capabilities, constraints and lifecycle behavior accurately. Regenerate and verify provider package hashes after the final edits.
- Avoid raw provider payloads in UI, unsafe error metadata and silent catches. Use appropriate user-facing errors and structured safe logs.

### Evidence and full review archive

These preferences derive from the author's Cognis PR reviews and the Study feedback in this conversation, archived on 2026-10-11. The workspace archive is `/workspace/feedback-deploy/review-memory/`: `cognis-author-reviews.json` contains all 101 nonempty author review bodies and 516 inline comments across the 228 PRs available at retrieval; `cognis-author-discussions.json` preserves the author's repository discussion comments. GitHub remains the portable source of the original feedback; the archive is deliberately outside the PR to avoid duplicating hundreds of historical comments in source control.

Representative source reviews:

- [#226: duplication, test integrity, size and spacing](https://github.com/Cognis-Labs-HQ/Cognis/pull/226#pullrequestreview-5453771603)
- [#196: no convenience changes to core/router](https://github.com/Cognis-Labs-HQ/Cognis/pull/196#pullrequestreview-5273631083)
- [#172: immediate disable cleanup](https://github.com/Cognis-Labs-HQ/Cognis/pull/172#pullrequestreview-5000121369)
- [#128: prevent spurious newline removal](https://github.com/Cognis-Labs-HQ/Cognis/pull/128#pullrequestreview-4814252284)
- [#106: shared search conventions](https://github.com/Cognis-Labs-HQ/Cognis/pull/106#pullrequestreview-4770189279)
- [#99: gateway and adapter CLI ownership](https://github.com/Cognis-Labs-HQ/Cognis/pull/99#pullrequestreview-4750770814)
- [#80: explicit reuse dependencies](https://github.com/Cognis-Labs-HQ/Cognis/pull/80#pullrequestreview-4727685799)
- [#62: split files without gaming limits](https://github.com/Cognis-Labs-HQ/Cognis/pull/62#pullrequestreview-4719732992)
- [#54: ctx integration and proportional changes](https://github.com/Cognis-Labs-HQ/Cognis/pull/54#pullrequestreview-4444490335)
- [#8: retain lessons for future work](https://github.com/Cognis-Labs-HQ/Cognis/pull/8#pullrequestreview-4351935184)

## Session startup requirements

As soon as you begin work in a session, you MUST run:

`pip install ripgrep && npm install`

Do this before exploration, implementation, linting, or testing so the required tooling and dependencies are available.

---

## Architecture

### UI consumers use gateway client functions

When browser code needs data owned by a gateway, export the request function
from that gateway's UI client module and consume that function instead of
issuing a gateway API request directly from another page or module. This keeps
endpoint knowledge and response handling within the owning gateway.

### Keep URLs clean and non-sensitive

Avoid query parameters and fragments for transient server-owned workflow state.
URLs must remain short, readable, and safe to expose in browser history, logs,
analytics, referrer headers, and screenshots. Never place opaque attempt IDs,
internal expiry timestamps, authorization decisions, or similar implementation
state in a URL. Keep that state behind an HttpOnly, SameSite cookie and retrieve
non-sensitive presentation metadata through the owning gateway's UI client. Use
path segments or query parameters only for intentionally shareable resource
identity, explicit user-controlled filtering, or a user-facing one-time link
whose credential is intrinsically part of the shared link.

### API result limits are caller-controlled

API endpoints must not impose arbitrary default or maximum result limits in
their route definitions or indirectly through a store's default arguments.
Filtering or limiting results is applied only when the caller explicitly sends
the corresponding parameter. When no limit value is supplied, return every
matching result. Validate an explicitly supplied limit, but do not silently
replace, clamp, or default it in the endpoint. When a UI only needs a smaller
display set, fetch the complete API result and truncate it on the API-caller
side.

### User-specific secrets belong in the keyring

Use `src/adapters/auth/keyring/ui/keyring.js` as the canonical storage and retrieval surface
for passwords, encryption keys, and other user-specific secrets. Never add a
new plaintext `localStorage`, `sessionStorage`, preference, or component-owned
secret cache. Components that generate or receive a secret must contribute it
to the keyring immediately with a stable capability-owned identifier and useful
metadata. Retrieval must use the keyring resolver so an invalid edited value is
removed and the user is prompted, or an authoritative source is consulted,
without permanently breaking access.

### Route handlers must be thin and provider-agnostic

Route handlers should be unassuming about the details of any backing service or gateway. The goal is plug-and-play provider support: switching a provider (e.g. database, auth, file storage) should require only an environment variable change — the core codebase never knows the difference. All concrete interactions are encapsulated behind gateway/adapter abstractions.

- Never call a database driver, auth library, or external service directly from a route handler.
- Route handlers orchestrate; gateways/adapters execute.
- Apply this principle across all subsystems, not just the database layer.

### Adapter abstractions across subsystems

Prefer gateway/adapter abstractions at every seam where a concrete implementation might change. This extends beyond the DB layer to auth providers, file storage, queues, and any other pluggable subsystem.

### Capabilities must be use-case neutral

Capabilities shared between components must describe the generic facility they
provide, not one caller's current use of it. Provider contracts, payload fields,
events, documentation, styles, and strings must remain unassuming about feature-
specific consumers. Callers supply their own labels, icons, action identifiers,
and other presentation or behavior metadata; the providing component only
validates and renders the neutral contract.

### Ctx capability naming

All ctx capability and flow names must use camel case within each colon-delimited segment; do not introduce kebab-case names (for example, use `messages:formatRoomEvent`, not `messages:format-room-event`).

### Ctx is the capability backbone

Use `ctx` as the only cross-component import surface for both core-to-component and inter-component interactions. When core, a gateway, an adapter, a module, or a route needs something owned elsewhere, it must obtain that capability through `ctx` (or a request/route context built from `ctx`) instead of importing another component's internals or receiving ad-hoc side-channel references.

For runtime modules specifically, treat `ctx` as the full system bus: module bootstrap is the only entrypoint allowed to expose module capabilities, and traditional direct imports between modules/core internals are forbidden.

- Register exported capabilities through `ctx.capabilities`.
- Consume capabilities by querying `ctx`/`ctx.capabilities`, including optional dependency checks.
- Use `ctx` to detect whether another component is present; do not hardcode adapter-to-adapter imports for availability checks.
- When a subsystem exposes multiple provider tracks or outputs, model that selection through capabilities and ctx-backed contracts rather than hardcoded branches.

### Advertise only implemented capabilities

Never advertise or register a capability, UI action, route, or flow that lacks a working implementation. Register every flow invoked by an exposed operation before making that operation available. Metadata, buttons, and capability declarations are promises of executable behavior, not placeholders. Verify each exposed operation through the real registered runtime, including authorization, persistence, and failure handling; tests with a no-op flow runner do not establish that the flow exists. If an optional implementation is unavailable, omit its advertised capability and action rather than exposing a control that fails when invoked.

### Flows and staged injection are mandatory for orchestration

Treat all meaningful operations as named `ctx` flows with explicit stages. A flow can represent backend operations (create user, login, change password, send message, create meeting) and UI construction operations (construct login page, construct settings page).

- Register every orchestration pipeline as a flow with ordered stage IDs.
- Components must extend behavior by injecting stage hooks into flows, not by editing unrelated internals.
- Treat flows as the preferred lattice for interactions between otherwise-isolated components: a caller invokes a generic ctx capability or flow, and the owning component contributes behavior through stages rather than being imported directly.
- TODO: Proliferate flow use across legacy cross-component seams so fewer routes need component-specific branching or direct capability choreography.
- Flow hooks must be removable so disabling a component cleanly unhooks its behavior.
- Flows may call other flows through `ctx` to compose behavior (for example login page flow calling login flow, login flow calling LDAP flow).
- Provider-specific choices (like LDAP availability) must be expressed as flow hook participation and capability checks, not hardcoded route/UI branches.

When introducing new behavior, first decide which flow owns it, then decide which stage receives the hook. Direct cross-component imports are still forbidden even for core-owned orchestration logic.

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

Pass that same injected context through nested route factories. Declare required auth dependencies in the owning manifest and fail before registering routes if the capability is missing. Test that an injected denying guard governs every exposed route family; a default guard must not silently bypass it.

### External module skeleton

Every new external module must start from https://github.com/Cognis-Labs-HQ/cognis-module-template using template creation or a fork. Assign its own product UUID and metadata, retain the template's AGENTS.md baseline, and preserve module-specific guidance in a final appendix. The template is the canonical contributor skeleton; do not create parallel module layouts.

Use required root `manifest.json`, `package.json`, `routes.json` and `bootstrap.js`. Keep domain handlers under `api/routes/<domain>/index.js`, browser styles under `ui/styles/`, reusable markup under `ui/templates/`, locale XML under `ui/languages/<locale>/`, layer-owned tests beside their layer, and release notes under `docs/changelog/`. Implementation imports stay inside the module; host integration uses ctx. Existing entrypoint and route URLs remain stable during reorganizations. Jitsi Meet proves the standard through structure validation and executable public-contract tests.

Npm scripts are checkout-local; document `npm --prefix <module-checkout> test` when the working directory could be ambiguous. Installed operational commands use `cognisctl modules:<module-id>:<action>` and register through the external module's `cli/index.js`. Do not add aliases or run another module's npm scripts from core.

Browser providers export `mountProvider(scopedUiCtx)` without module-owned import-time registrations. Bind listeners to the scope's signal, return cleanup for other resources, and use `ui:navbarLinks` for host-owned navigation contributions. Server resources that return cleanup attach it with `ctx.registerDisposer`; tests must cover disable, failed bootstrap and re-enable. Keep core layout unchanged when the owning loader can handle lifecycle behavior.

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

Components, including adapters, may own a `reuse/` directory for parameterizable logic shared by multiple surfaces within that component. Keep single-surface logic beside its feature; reuse must reduce duplication rather than add forwarding wrappers.

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

Every UI page must be assembled exclusively through `createPageComposer` from `src/ui/reuse/page-composer/index.js`. The composer owns layout, the toolbar, page context, the content grid, and element rendering. No page entry point may bypass it by writing directly to `#app`, constructing its own toolbar, floating menu, or content wrapper by hand, or rendering content to the page outside of the composer's `elements` and `toolbar` arrays.

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

Never use redundant prefixes or suffixes in file names when the directory path already provides the context. A file at `gateways/notifications.ts` does not need to be named `notification-gateway.ts`; a file at `routes/users/index.ts` does not need to live at `routes/user-routes.ts`; files inside `adapters/notify/smtp/` do not need the `smtp-` prefix. When a file would need a feature or adapter prefix to disambiguate it, that is a signal to place it in a subdirectory and give it a generic name instead (e.g. `message-builders.ts` inside `smtp/`, not `smtp-message-builders.ts` at a higher level).

### Concise fixture and test paths

Do not check in redundant nested source-tree scaffolding or needlessly repetitive
paths. Store test fixtures in concise, purpose-specific layouts; do not mirror
`src/ui/public/pages/` or another project tree beneath an existing source-tree
fixture directory. When a test genuinely exercises production path resolution,
copy static fixture assets into the minimal required temporary layout using an
explicit data mapping. Keep executable fixtures static and preserve the actual
build/discovery behavior. Keep meaningful package, provider, and schema layout
segments when those segments are themselves the contract under test.

Group related tests by their descriptive subject instead of repeating a prefix
on every filename: use `src/tooling/tests/ui-build/entrypoints.test.js`, not
`src/tooling/tests/ui-build-entrypoints.test.js`. Reuse an existing subject
directory and omit context already supplied by its path. Do not split arbitrary
hyphenated names or add a directory that merely repeats its parent. Update every
caller, import, discovery rule, and configuration when moving files; do not retain
compatibility copies, aliases, or forwarding files to avoid those updates.

### Core contract file organisation

In `src/core/contracts/`, use domain subdirectories instead of feature prefixes in flat file names. For example, prefer `src/core/contracts/profile/media-flow-catalog.ts` over `src/core/contracts/profile-media-flow-catalog.ts`.

### Route granularity and self-registration

Routes must be granular enough that disabling or removing a gateway, adapter, or module cannot create dead code or crashes elsewhere. Gateways and adapters should be able to register their own API routes as part of their setup, so that removing a component is as simple as not loading it. The server assembles the full route table from what is present, rather than from a hardcoded list of known subsystems. Avoid presumptive checks in server.ts for a specific named gateway or module.

For gateway-owned API spaces, each gateway must claim its canonical API prefix with `ctx.routeRegistry.registerPrefix("/api/v1/<gateway-id>", "<gateway-id>")` during bootstrap, and all gateway/adapter route registrations must carry a gateway ID (or default to the owning gateway ID). This guarantees disabled gateways return a deterministic `503 gateway_disabled` response for any request under their owned prefix instead of silently falling through to 404.

### Adapter directory structure

Adapters live under `src/adapters/<gateway-id>/<adapter-id>/`. For example, the SMTP notification adapter lives at `src/adapters/notify/smtp/`, and the MariaDB database adapter at `src/adapters/db/mariadb/`. This lets a gateway find all of its adapters consistently by scanning `src/adapters/<gateway-id>/`. Never nest an adapter under a flat path like `src/adapters/notify-smtp/`.

### Module directory structure

Runtime extension modules must use a consistent root layout:

- `src/modules/<module-id>/manifest.json`
- `src/modules/<module-id>/routes.json`
- `src/modules/<module-id>/ui/`
- `src/modules/<module-id>/api/index.js` (or `index.ts`) when the module exposes server handlers

Files in `src/modules/` that are framework internals (for example `study` language packs or route-runtime internals) may use their own documented structure, but must not be mixed with extension-module roots.

### Adapter admin controls must always exist

Any adapter that appears in Administration must expose a config contract even when it has no configurable fields. An empty config is still a real config surface: the adapter's gateway routes must serve `GET` and `PUT` config handling without returning 404.

Administration-facing adapter metadata must also announce its control endpoints instead of relying on the UI to guess them. Always include the adapter's config, enable, and disable endpoints in the adapter listing payload; include a test endpoint when the adapter supports one.

### Versioned manifests for gateways, adapters, and modules

Every gateway, adapter, and module must carry a `package.json` (or equivalent manifest) with a `version` field. Any change to the code, schema, or API within that component's scope must be accompanied by a version bump. This prevents silent drift between components that depend on each other. A higher-level versioning document at `src/docs/versions.en.md` tracks the current version of each component and serves as a changelog index.

Gateway bootstrap registration must derive its runtime version from the gateway's own `manifest.json`; never duplicate the version in a hardcoded registry value. Use `readGatewayManifestVersion(import.meta.url, manifestPath)` from `src/gateways/reuse/manifest-version.ts` during bootstrap and pass the returned version to `gatewayRegistry.register(...)`.

Version updates are atomic repository-wide changes. When bumping a component, update its version in every adjacent `manifest.json` and `package.json`, update `package-lock.json`, raise dependency specifications in every adjacent manifest or package that consumes the new version, and update `src/docs/versions.md` or every available language variation such as `versions.en.md`, `versions.de.md`, `versions.id.md`, and `versions.ja.md`. Run `npm ci --ignore-scripts` afterward to prove that the lockfile resolves only local Cognis workspaces and published external packages; an internal `@cognis/*` registry lookup means the version update is incomplete.

Component package dependencies on other Cognis components must use flexible tested-ceiling version ranges instead of exact pins. Use `<=<tested-version>` for every `@cognis/*` dependency so newer installed components can be detected as potentially untested without blocking older compatible patch lines at install time. Runtime lifecycle surfaces must treat missing or disabled declared dependencies as component errors, disable the affected component power control, and present a red exclamation warning with the expected and installed versions when the installed component is newer than the declared tested ceiling.

### Branch and pull request names

Branch names may contain only ASCII letters, numbers, hyphens (`-`), and underscores (`_`). Pull request names may additionally contain whitespace. No other special characters are legal in either name.

### Changelog entries

Store changelog entries under `src/docs/changelog/` (one shared directory for all changelog files) instead of a root `CHANGELOG.md`.

Every pull request change must add changelog files for that PR in every supported app language (de, en, id, ja). Use the filename pattern `<branch-name-without-copilot-prefix>.<lang>.md` for each language (for example, branch `copilot/cleanup-strings-and-codebase` produces `cleanup-strings-and-codebase.en.md`, `cleanup-strings-and-codebase.de.md`, `cleanup-strings-and-codebase.id.md`, and `cleanup-strings-and-codebase.ja.md`).

Changelog entry structure is mandatory:

- `# ...` — changelog title (release summary title)
- `**Feature Branch:** ...` — the source branch, placed directly after the title; localize the label as `Feature-Zweig`, `Cabang Fitur`, or `機能ブランチ` in the corresponding language file
- `## ...` — one change point per heading (these are shown as dot-point summary items in release popups)
- body content under each `##` — full details shown on the changelogs page only
- `## Commits` — the final section containing a Markdown list of full GitHub commit links; localize this heading in each language file

Commit-list items must be contiguous: never place blank lines between commit links in a changelog's final commit section.

The final commit section is bookkeeping metadata, not a release-summary change point. Do not omit the feature-branch line or commit section merely because the title, change headings, and bodies are already present. Use `N/A` as the branch and leave the commit list empty only for changelogs that do not belong to a feature branch.

Every implementation commit whose work is described by the current pull request's changelog must ensure that the changelog's commit list links the immediately preceding implementation commit. When a user requests this provenance update immediately before implementation, finish the work with a dedicated final commit that changes only the localized changelog files to record the prior implementation commit; that bookkeeping commit must not add unrelated changes or link itself.

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
- Implementation contracts, technical details, and usage examples belong in component docs, not source-file overview comments. Keep source comments limited to non-obvious constraints.

### Auto-discovery over static wiring

Prefer scanning the filesystem to discover gateways, adapters, and modules over maintaining hardcoded import lists. The core should load gateways by discovering directories under `src/api/gateways/`; gateways should load adapters by discovering directories under `src/adapters/<gateway-id>/`. Static imports in `src/core/index.ts` or `src/api/server.ts` that enumerate individual components by name work against this goal and create coupling.

### Bootstrap registries for unavoidable references

When a gateway, adapter, or module truly must add entries to a central bootstrap/import surface, do not append the reference directly inside the main bootstrap file. Instead, place the contribution in a dedicated sibling file under a bootstrap directory (for example `src/gateways/auth/bootstrap/*.ts`) and have `bootstrap/index.ts` blindly ingest every file in that directory. This keeps separate contributor PRs from colliding on one shared registry file and preserves an additive extension pattern.

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

### Button consequence styling

Button classes must communicate the consequence of the action consistently:

- An action with any potentially destructive consequence must use `btn-cancel`.
- An action with a creative consequence must use `btn-confirm`.
- Every other action must use `btn-neutral`.

Choose the class from the action's consequence, never from visual preference.

### Prefer links over buttons

Always prefer an `<a>` element over a `<button>` when the control can be represented as navigation to a URL. Use a `<button>` only when there is a specific semantic reason, such as submitting a form, changing in-page state, or performing an action that has no navigation target.

### Codebase cleanliness is paramount

The cleanliness, consistency, and structural integrity of the codebase are non-negotiable. Every contribution must leave the codebase in at least as clean a state as it found it. Introducing non-conformant code — even as a temporary measure, even under time pressure, even when it "works" — is unacceptable.

Any feedback that identifies non-conformant code, naming violations, structural inconsistencies, or deviations from these instructions must be acted on. Deferring or discarding such feedback is a quality failure, not a scope decision.

When you discover that a change you are making would introduce non-conformant code, stop and fix the design before proceeding. If an existing file you are editing already contains violations, fix those too while you are in that file.

### Mission and review feedback

Your mission is to make Cognis the best it can possibly be within the user's request and these instructions. Treat review suggestions as a serious part of that mission, not as noise to be waved away.

Do not dismiss a review suggestion as "out of scope" merely because it was not part of the original prompt. Consider its technical merits carefully. If the suggestion improves correctness, security, maintainability, UX, accessibility, consistency, or alignment with these instructions, and implementing it does not directly violate a higher-priority instruction or explicit user constraint, you are expected to implement it.

Automated feedback is not exempt from this rule. Regardless of scope, automated feedback must be implemented unless doing so would directly conflict with an explicit user instruction.

If you choose not to implement a review suggestion, the reason must be concrete and rooted in these instructions, the codebase architecture, correctness, security, or an explicit user direction — not convenience, narrow task framing, or a desire to avoid additional work.

Every ignored feedback item must be recorded in `TODO.md` at the repository root with the reason it was not implemented.

Repeatedly ignoring, hand-waving, or vainly dismissing valid review feedback is a mission failure. When feedback is technically sound, you must either implement it in the same change or explicitly document a concrete, instruction-grounded reason for not doing so.

### Readability over terseness

Format all new or modified code for human readability. Do not compress logic, markup, or styles into dense one-liners when a multi-line structure is clearer. A statement that would naturally span 6+ lines in JavaScript should remain that way — humans must be able to eyeball the code meaningfully.

### LOC discipline and consistency are mandatory

Never delete blank lines between functions, compress declarations, or relax a size guard to pass an anti-monolith check. Split cohesive behavior into focused modules and restore natural spacing. Tests must exercise actual behavior; never substitute a no-op implementation, change expectations to accept a known defect, or bypass the production path merely to make a test pass.

Large diffs are not a success metric. Adding thousands of lines in a pull request is **not** an indicator of quality, velocity, or correctness. Any safe opportunity to reduce LOC through consolidation and reusable abstractions should be taken whenever behavior remains unchanged.

For every change:

- Treat LOC reduction as a first-class objective whenever a safe reduction is possible.
- Reuse existing generic utilities before introducing new feature-specific helpers.
- Keep function names and CSS class names generic and role-based, not feature-branded.
- Move code out of `reuse/` when it only serves one feature surface; keep `reuse/` strictly cross-cutting.
- Keep HTML and JS/TS in separate files; do not embed page markup as feature-sized string templates in JS/TS modules.
- Keep files at or below 1000 lines. If a file grows beyond that limit, convert it into a subdirectory with `index` as the entry point and split logic into focused sibling files.
- Before writing any new feature, estimate the minimal-footprint implementation first: identify the smallest set of files and lines that satisfy the requirement using existing gateways, adapters, capabilities, and `reuse/` utilities. Only add new abstractions, files, or scaffolding when the existing surface genuinely cannot express the behavior.
- A feature request phrased in a single sentence (e.g. "add a share button") must not translate into thousands of added lines. If a change is trending toward that scale, stop and re-derive the plan around composing existing primitives (flows, capabilities, composer/router contracts, existing UI components) instead of building parallel infrastructure.
- Prefer extending an existing flow, gateway route, or UI composer contribution over introducing a new one, whenever the existing contract already covers the use case.

### Tests must respect component isolation

Tests outside `src/core` must assume any gateway, adapter, or module outside the unit under test can disappear. Prefer testing a component through its public route/capability/flow contract with local fakes for external capabilities. Do not import concrete stores, gateways, or modules from sibling components just to make an integration convenient; if cross-component behavior needs coverage, assert the exported ctx contract and stage participation rather than coupling the test to another component's internals.

### Variable naming

Prefer fully qualified database table names instead of aliases. When an alias is necessary, it must preserve the complete, descriptive table name; never shorten table names to initials, abbreviations, or single-letter aliases such as `a`, `i`, or `c`.

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

Existing installations must converge on the current declared schema through the database gateway's schema initialization. Do not add version-specific migration functions or identity conversions to compensate for a superseded model introduced in this beta application. Keep persisted identities stable and let declarative schema reconciliation enforce the current keys.

Current implementation directories have zero tolerance for legacy aliases, fallback entrypoints, deprecated payload keys, or dual-format parsing. Delete those paths rather than preserving them beside the current contract.

Do not write tests that verify legacy artefacts are absent. Asserting that a field does not exist, a route is not registered, or a column is not written is a legacy-absence test — it encodes an expectation about a removed thing rather than a requirement about the current system. These tests are forbidden and must be deleted on sight.

---

## Testing

Before running unit tests, ensure the following prerequisites are met:

- `ripgrep` is installed (used by tooling scripts). Install with `apt-get install -y ripgrep` or equivalent for your platform.
- `npm install` has been run to ensure all dependencies are present.

Tests must never assume that optional system binaries such as `git`, `curl`,
or shell-specific utilities are installed in the environment where they run.
Use language/runtime APIs for filesystem, networking, and process-independent
operations. When a test specifically exercises an external executable, detect
its availability first and skip with an explicit reason when it is absent.

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

## Docker environment variables

Application container defaults belong in the versioned `docker/env/default.env`, not in `docker/Dockerfile` or inline Docker Compose fallback expressions. User and deployment settings belong in the single ignored `docker/env/runtime.env` generated by `setup.sh`; do not introduce driver-, development-, production-, or example-env variants. Docker Compose files select these env files through `env_file`.
Every Docker environment-variable addition, removal, or rename must be synchronized with the Dockerfile, every Docker Compose file, and every applicable setup env file in the same change.
Docker Compose `env_file` imports must use explicit repository-relative `./docker/env/...` paths; do not replace them with absolute host paths, because the checkout or its working directory may be reached through a symlink.

## Logging coverage requirements

Comprehensive logging is required for every new feature and behaviour change.

- Log caught failures at `error` level with structured metadata (component, operation, identifiers, and safe failure context).
- Log uncaught runtime failures as fatal events (`fatal: true` in metadata) so they are easy to detect in operational monitoring.
- Emit `info` logs for user activity and state-changing actions so flows are auditable end-to-end.
- Avoid silent `catch` blocks. If a fallback path is intentional, log the failure first, then continue.
- Use one invocation style for logging in new code: call a local `log` function (`log?.(...)` or `log(...)`) rather than mixing direct property calls (`this.log?.(...)`) and alternate logger names in the same file.

---

## Do not

- Do not install, invoke, or otherwise use Playwright. Use existing non-Playwright browser tooling or programmatic UI checks instead.
- Do not delete or discard existing code without a clear and explicit reason. Prefer refactoring, deprecating, or commenting out with an explanation over silent removal.
- Do not change public API contracts (route signatures, exported types, CLI command names) without flagging the breaking change.
- Do not introduce new third-party dependencies without discussion.
- Do not use `Math.random()` for generated user-facing identifiers, names, tokens, or keys; use Web Crypto or Node Crypto as appropriate.
- Do not perform speculative or cosmetic changes outside the files directly relevant to the task.
- Do not add AI process notes, agent reasoning, or session context to any product-facing documentation.
- Do not use inline result messages or browser alerts for user feedback. All transient user-facing feedback (success confirmations, warnings, errors, info notices) must be delivered via `showToast` from `src/ui/reuse/toast.js`. Never write feedback text directly into a DOM element's `textContent` or `innerHTML`, and never call `alert()`, `confirm()`, or `prompt()`. Reserve `openPopup` exclusively for interactions that require a deliberate user decision (e.g. confirming a destructive action, filling in a form) — not for displaying a result.
- Client-side errors must be visible to users through `showToast`; logging to the console or server is optional supporting telemetry, never the only error presentation.
- Module string keys must use lowercase ASCII names with dots, hyphens, and underscores only; do not introduce camelCase, spaces, or locale-specific characters in string keys.
- Function names must describe what the function actually does. General-purpose helpers with reuse potential belong in the relevant `reuse/` package rather than inside a single feature module.
- Do not add pass-through shim functions that merely rename or forward an operation without enforcing a boundary, normalizing data, or reducing duplication; call the underlying function inline instead.
- Do not use inline hint text (`<span class="...-hint">`) below or beside form fields to deliver longer contextual descriptions. Instead, use `renderInfoTooltip(text)` from `src/ui/reuse/info-tooltip.js` placed inline next to the label or heading. This keeps forms visually clean while still making context available on demand. Inline hint text is only appropriate for a single short phrase that must always be visible; anything longer or more contextual belongs in an info tooltip.
- Do not introduce legacy compatibility code: fallback paths, conditional shims, retry branches, or any alternate logic that exists solely to accommodate an older schema layout, API shape, or data format that is no longer the standard. Legacy compatibility is never required and never acceptable, even when framed as temporary. A feature that ships with built-in backward compatibility for its own "legacy" form was never properly designed — ship it clean or don't ship it at all.
- Do not write tests that assert the absence of legacy artefacts — for example, "this deprecated column is not present in the insert" or "this removed route returns 404". These legacy-absence tests are strictly forbidden. Delete any that already exist.

## Symbols and icons

SVG icons must always be stored as standalone asset files rather than embedded
as SVG markup in JavaScript, TypeScript, HTML, or CSS. Reuse the same asset
wherever an icon appears; callers that contribute icon markup to a neutral
capability must load that markup from the owning component's asset file. Paired `-light` and `-dark` image variants are strongly recommended so icons remain legible in every theme.

When applying a symbol or icon (e.g. as a UI label, button decoration, or status indicator), check https://www.w3schools.com/charsets/ref_utf_symbols.asp first. It provides the most expansive set of UTF symbol codes and should be the primary reference for selecting an appropriate character.

Unicode emoji should be avoided for interface icons because their rendering varies by platform and cannot be themed consistently. Prefer reusable SVG assets with explicit light and dark variants; use Unicode symbols only when no suitable SVG asset exists and the symbol's textual meaning is intentional.

## Avatar interaction rule

Any UI avatar that represents a user must support the same interaction model everywhere in the dashboard shell: hovering the avatar shows the standard profile preview card, and clicking the avatar navigates to that user's profile page (`/profile/:handle`). Treat this as a universal requirement across pages, adapters, and modules.

---

## i18n requirements

Hardcoded English user-facing strings are forbidden under all circumstances, including fallback text, errors, empty states, accessibility labels, tooltips, toasts, and consent dialogs. Resolve every user-facing string through XML language keys. If the user’s preferred language does not provide a non-empty value, resolve the same key from the English XML resources. If the English key is also absent or empty, fail explicitly with a missing-translation error. Never substitute literal English, display the raw key, return an empty string, or catch and suppress that missing-translation failure to keep rendering. Tests must cover both the preferred-language-to-English fallback and failure when the English fallback key is unavailable.

- Resolve all user-facing text via language keys from XML resources; do not hardcode UI copy in JS/HTML.
- The entire app must respect the user's selected font preference from Settings. Do not hardcode or import external fonts in ways that bypass user font settings.
- Route all user-facing date/time output through `src/ui/reuse/timestamp.js` (for example `formatDate` / `formatDateTime`), including Administration surfaces that render DB-backed values.
- Use flat `ui.reuse.*` keys for all cross-component labels and generic phrases (for example `save`, `confirm`, `message`, `users`, `settings`, `modules`, `language`, `error`). Do not introduce `ui.reuse` sub-namespaces.
- Basic phrases must never be monopolized inside feature, gateway, adapter, or module domains. Before adding a non-`ui.reuse.*` key, check whether the text is reusable; if yes, use or add a `ui.reuse.*` key and remove duplicates from specific domains.
- Keep non-`ui.reuse.*` keys only for truly domain-specific strings that cannot reasonably be reused outside that domain.
- Module-owned locale keys must be namespaced as `module.<moduleId>.*` and loaded without leaking into global namespaces. Preserve the manifest module ID as one segment, including hyphens: `module.terms-of-service.admin.title`. Only the suffix after the module ID uses period-delimited words.
- For docs, prefer language-suffixed markdown files (`*.en.md`, `*.es.md`) and resolve by language key first, then fallback.
- Documentation language parity is mandatory: when changing any `*.md` doc that has translated variants, update the corresponding language files in the same change so content stays in sync across supported languages.
- Keep every docs markdown H1 title (`# ...`) at or below 30 characters so docs navigation labels stay compact without runtime truncation rules.
- Every string value in a `strings.xml` file must be written in the language that file represents. When adding or updating keys in non-English files (e.g. `de/strings.xml`, `ja/strings.xml`, `id/strings.xml`), translate the value into that file's language. Never copy an English string value verbatim into a non-English file. The only exceptions are values that are legitimately language-neutral: brand names (`Cognis`), universal technical acronyms (`LDAP`, `TLS`, `STARTTLS`), format placeholders (`example.com, company.org`), and the Latin tagline (`Disce. Loquere. Vive.`). When in doubt, translate.
- All page titles (keys ending in `page_title`), section headings (keys ending in `.title`), and English `ui.reuse.*` label keys must use Title Case where they are label-style text. This rule applies to English (`en/strings.xml`) only; other languages follow their own capitalization conventions. A test in `src/ui/tests/title-case.test.js` enforces this for the English file.
