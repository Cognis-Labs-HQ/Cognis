# Changelog

All notable changes to Cognis are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- `src/adapters/file/local/manifest.json`: local file adapter manifest with `"locked": true`, mirroring the locked local auth adapter pattern. The local file adapter is permanently enabled and cannot be disabled.
- Files gateway (`src/gateways/files/bootstrap.ts`) now contributes `file:append(filePath, content)` capability in addition to `file:write` and `file:read`, so consumers can append to files without calling Node.js `fs` directly.
- Logging gateway (`src/gateways/logging/logger.ts`): `Logger` constructor now accepts an optional `fileAppend` parameter. When provided, all log-file writes go through the supplied function (the `file:append` capability from the files gateway) instead of calling `appendFile` directly. Falls back to native `appendFile` when the parameter is absent (test compatibility).
- DB gateway (`src/gateways/db/bootstrap.ts`) now owns executor creation, schema initialisation, and the modules-baseline insert. Contributes `db:executor`, `db:type`, and `db:dialect` to the capability store so all downstream gateways and `main.ts` obtain the executor and dialect helpers without direct adapter imports.
- `src/gateways/db/executor.ts`: canonical home for `SqliteExecutor`, `PostgresExecutor`, `MariadbExecutor`, `SupportedDbType`, and `createDbExecutor` (moved from `src/adapters/db/reuse/account-store.ts`).
- `src/gateways/db/init.ts`: canonical home for `initializeDatabaseSchema` and `resolveDbProviderDir` (moved from `src/api/bootstrap/db-init.ts`, which is now a re-export stub for backward compatibility).
- `DbLocalAccountStore` moved from `src/adapters/db/reuse/account-store.ts` to `src/adapters/auth/local/store.ts` — auth-specific persistence lives with the auth adapter.
- `src/gateways/auth/reuse/local-account-store.ts`: auth gateway's canonical re-export of the `LocalAccountStore` interface so `gateway.ts` no longer imports across the adapter boundary.
- Files gateway: contributes `file:write(path, content)` and `file:read(path)` capabilities in addition to `file:gateway`. Manifest updated to `required: true`.
- Logging gateway: `Logger` class moved from `src/api/logger.ts` to `src/gateways/logging/logger.ts` (owned by the logging gateway). `src/api/logger.ts` is now a re-export stub.
- Profile gateway bootstrap now creates and contributes `preferences:store`, removing the preference-store creation from `main.ts`.
- `db:dialect` helper (`DbDialectHelper` interface) contributed by the DB gateway provides dialect-aware `upsert` and `insertIgnore` operations, eliminating all per-dialect SQL branches from `main.ts`.

### Changed

- Logging gateway (`src/gateways/logging/bootstrap.ts`) reads the `file:append` capability from the capability store and passes it to the `Logger` constructor, routing all log persistence through the files gateway abstraction.
- Logging gateway manifest adds `"requires": ["files"]`, formalising the dependency on the files gateway. Version bumped to `1.2.0`.
- Files gateway manifest version bumped to `1.1.0` to reflect the new `file:append` capability.
- Gateway bootstrap sort order (`src/core/services/gateway-service.ts`) updated: files gateway bootstraps first (before logging) so its capabilities are available when the logging gateway initializes. Order is now files → logging → db → everything else alphabetically.
- `GatewayBootstrapContext.dbExecutor` and `.dbType` are now `optional` (`?`) and marked as deprecated. New gateway code should use `ctx.capabilities.get('db:executor')` and `ctx.capabilities.get('db:type')` instead.
- `main.ts` no longer creates the DB executor, runs schema init, or creates the preference store directly. All of these are now owned by the DB and profile gateways. Admin-state check and bootstrap-state write moved to after `gatewayService.bootstrap()`.
- `src/api/server.ts` `ApiDependencies.preferenceStore` is now optional.
- `createUserRoutes` accepts an optional `preferenceStore`; clearing preferences is a no-op when the store is absent.
- Auth gateway (`gateway.ts`) imports `LocalAccountStore` from `./reuse/local-account-store.ts` instead of from `../../adapters/auth/local/auth-adapter.ts`.
- Auth gateway bootstrap reads the DB executor from `ctx.capabilities.get('db:executor')` with fallback to `ctx.dbExecutor` for test backward compatibility.

### Fixed

- CI: corrected tsconfig project reference paths in `src/adapters/db/*/tsconfig.json` and `src/adapters/file/local/tsconfig.json` from `../../core` to `../../../core` so they resolve to `src/core` rather than the non-existent `src/adapters/core`. ([9080e62](https://github.com/le-firehawk/Cognis/commit/9080e62))
- Auth gateway: `/api/v1/auth/login` with `provider: "oidc"/"ldap"/"saml"` could authenticate through a registered-but-disabled adapter. The login handler now uses `getEnabledAdapter()` so only adapters in the enabled set are eligible. ([eb5d3f1](https://github.com/le-firehawk/Cognis/commit/eb5d3f1))
- Auth gateway: `profile:createProfile` was captured at bootstrap time (before the profile gateway has contributed it), causing new registrations and logins to silently skip profile-row creation. The capability is now looked up lazily inside the route handler. ([eb5d3f1](https://github.com/le-firehawk/Cognis/commit/eb5d3f1))
- Route registry: registered handlers for optional gateways (e.g. notify, profile) remained live after the gateway was disabled. `RouteRegistry` now stores an optional `gatewayId` alongside each handler and the server skips any entry whose gateway is marked disabled. ([eb5d3f1](https://github.com/le-firehawk/Cognis/commit/eb5d3f1))
- Administration page showed "Security" twice in the left nav and rendered an empty second section. The root cause was the auth gateway's admin section using `id: "security"` and `preferenceKey: "administration-security-layout"`, colliding with the base Security section. The auth section now uses `id: "authentication"` and `preferenceKey: "administration-auth-layout"` and is labelled "Authentication". ([aa008ec](https://github.com/le-firehawk/Cognis/commit/aa008ec))

### Added

- Adapter-to-adapter cross-gateway dependencies: adapter `manifest.json` files may now declare a `requires` field listing dependencies as `"gatewayId:adapterId"` or `"gatewayId"` strings. The auth and notify gateways read this field during adapter discovery and include it in the adapter list response. The admin Components panel enforces these dependencies when enabling an adapter: disabled gateway or adapter dependencies are listed in a confirmation popup and automatically enabled.
- `ui.app.admin.enable_confirm_adapter` i18n key added in all four language files (en, de, ja, id) for the adapter dependency enable confirmation popup.

### Changed

- Auth adapter config endpoint (`GET /api/v1/gateways/auth/adapters/:id/config`) now returns the standard flat config format `{ data, requiredFields }` (matching the notify adapter format) instead of `{ data: { schema, config } }`. This allows the generic adapter config popup in the Components panel to render auth adapter configuration forms correctly.
- `CoreAuthGateway.saveAdapterConfig` now extracts the `enabled` field from the config payload and calls `enableAdapter`/`disableAdapter` accordingly, consistent with how the notify gateway handles `enabled` in `saveProviderConfig`.
- `renderAdapterToggle` in the administration page now uses `adapter.senderId ?? adapter.id` for the adapter identifier and `adapter.active ?? adapter.enabled` for the enabled state, so auth adapters (which use `id`/`enabled`) display correctly alongside notify adapters (which use `senderId`/`active`).
- `renderInlineAdapters` now renders locked adapters with their toggle disabled, matching the Security section behaviour for the local auth adapter.
- `bindAdapterRows` now skips click-to-config for locked adapters.
- `bindAdapters` (renamed from `bindProviders`) in `admin-section.js` reflects internal naming conventions.
- Administration page Security section: the inline Save button is removed from the Trusted Email Domains form. Changes are now tracked by a floating Discard/Save bar (matching the Settings page pattern). The `initSecuritySection` interface gains `save()`, `discard()`, and an `onDirtyChange` callback parameter.

### Added

- `ui.app.admin.authentication` i18n key added in all four language files (en, de, ja, id) for the renamed Authentication admin section contributed by the auth gateway.

### Fixed

- `POST /api/v1/gateways/:id/enable` no longer returns 403 for required gateways. Only `disable` is blocked for required gateways; `enable` is permitted so that a required gateway that ended up persisted as disabled (e.g. due to an earlier state bug) can be recovered through the admin UI without a server restart.
- Auth adapter config popups in the Components panel no longer fail silently. The root cause was that auth adapter info uses `id`/`enabled` fields while the main panel expected `senderId`/`active`, causing the popup config URL to use `"undefined"` as the adapter ID.
- Local adapter now correctly shows as locked (toggle disabled) in the main Components panel.

- ([5a975f8](https://github.com/le-firehawk/Cognis/commit/5a975f8)) `uiDir` in auth, notify, and profile gateway bootstraps still referenced the removed `src/api/gateways/` path; `/static/gateways/{auth,notify}/admin-section.js` and `/static/gateways/profile/navbar.js` returned 404

### Added

- ([bb70712](https://github.com/le-firehawk/Cognis/commit/bb70712)) `src/api/reuse/` — new shared utility directory; `tfa-code.ts` and `verify-token.ts` moved here from `src/api/utils/`, `read-json.ts` moved here from `src/api/routes/` (was a utility, not a route handler)
- ([bb70712](https://github.com/le-firehawk/Cognis/commit/bb70712)) `src/gateways/profile/routes/tests/helpers.ts` — shared `makeTempDb` fixture for profile gateway route tests, eliminating the duplicated function across `file-routes`, `post-routes`, and `social-routes` test files
- ([f27a824](https://github.com/le-firehawk/Cognis/commit/f27a824)) Regression tests for gateway UI file availability: auth and notify bootstrap tests verify `uiDir` resolves to a real directory and `admin-section.js` exists; profile bootstrap tests verify `uiDir` and `navbar.js`; UI route tests verify `/static/gateways/*/` static serving returns 200 for each gateway asset
- ([789f641](https://github.com/le-firehawk/Cognis/commit/789f641)) Regression tests for file-storage availability: `avatar PUT`, `avatar DELETE`, `banner PUT`, and `banner DELETE` each return `503 file_storage_unavailable` when the file gateway is absent, catching future regressions in the file-availability guard across all four mutating endpoints

### Changed

- ([bb70712](https://github.com/le-firehawk/Cognis/commit/bb70712)) `src/api/tests/` — reorganised flat test files into domain subdirectories: `auth/`, `bootstrap/`, `docs/`, `gateways/`, `modules/`, `profile/`, `system/`, `ui/`, `users/`; `tfa/` subdirectory was already in place
- ([bb70712](https://github.com/le-firehawk/Cognis/commit/bb70712)) `src/api/routes/gateways/tests/gateway-routes.test.ts` moved to `src/api/tests/gateways/` — gateway route tests belong in the common API test tree, not inside the route handler directory
- ([bb70712](https://github.com/le-firehawk/Cognis/commit/bb70712)) `src/api/tests/{file,post,social,preferences}-routes.test.ts` moved to `src/gateways/profile/routes/tests/` — these tests cover profile gateway route handlers, not core API routes
- ([bb70712](https://github.com/le-firehawk/Cognis/commit/bb70712)) `src/api/tests/module-extension-routes.test.ts` moved to `src/modules/routes/tests/` — tests module-owned route code
- ([e2a9559](https://github.com/le-firehawk/Cognis/commit/e2a9559)) `src/adapters/db/shared/` renamed to `src/adapters/db/reuse/` — aligns with the codebase convention that cross-cutting utility directories are named `reuse/`, not `shared/`, `utils/`, or `helpers/`
- ([e2a9559](https://github.com/le-firehawk/Cognis/commit/e2a9559)) `src/gateways/tests/notification-gateway.test.ts` moved to `src/gateways/notify/tests/` — component-specific test belongs inside the notify gateway
- ([e2a9559](https://github.com/le-firehawk/Cognis/commit/e2a9559)) `.github/copilot-instructions.md` updated: "Shared UI logic" renamed to "Reusable code directories" and generalised; naming convention (`reuse/` over `shared/`/`utils/`) documented; stale test path example corrected

### Fixed

- ([bb70712](https://github.com/le-firehawk/Cognis/commit/bb70712)) `issueAccessToken` called with a role string as the third argument (TTL) in `gateway-routes.test.ts`, `ui-registry.test.ts`, and `notify/bootstrap.test.ts`; corrected to `60` (seconds)

### Added

- ([53c036f](https://github.com/le-firehawk/Cognis/commit/53c036f)) `src/tooling/scripts/gen-tsconfig.mjs` — auto-discovers all `composite: true` tsconfig.json files under `src/` and regenerates the root `tsconfig.json`; `npm run typecheck` now invokes this generator first, eliminating manually maintained project reference lists
- ([53c036f](https://github.com/le-firehawk/Cognis/commit/53c036f)) `src/ui/reuse/element-registry.js` — page-element look-up registry (replaces `components/widget-registry.js`); exports `getElementDefinition`, `mergeElementConfig`, `getElementLibrary`
- ([53c036f](https://github.com/le-firehawk/Cognis/commit/53c036f)) `src/ui/reuse/font-prefs.js` — font catalog loading, picker construction, and settings-page font preference integration; promoted from `src/ui/app/settings/font-prefs.js`
- ([53c036f](https://github.com/le-firehawk/Cognis/commit/53c036f)) `env.example` — full coverage of all environment variables; replaces `.env.example`
- ([53c036f](https://github.com/le-firehawk/Cognis/commit/53c036f)) `src/ui/public/assets/reuse/` — new asset directory for reusable SVG icons; `edit.svg` and `upload.svg` moved here from `assets/icons/`
- ([53c036f](https://github.com/le-firehawk/Cognis/commit/53c036f)) `src/ui/styles/reuse/layout.css` and `src/ui/styles/reuse/theme.css` — moved from `styles/base/` into `styles/reuse/` to consolidate all shared CSS under one directory

### Changed

- ([53c036f](https://github.com/le-firehawk/Cognis/commit/53c036f)) `docker/Dockerfile` now declares defaults for `HOST`, `EXTERNAL_HOST`, `MEDIA_LOCATION`, `COGNIS_GATEWAYS_ROOT`, and `COGNIS_ADAPTERS_ROOT`; docker-compose files no longer provide fallback values for these variables
- ([53c036f](https://github.com/le-firehawk/Cognis/commit/53c036f)) `src/ui/config/pages.js` — renamed `PAGE_WIDGET_LIBRARY` → `PAGE_ELEMENT_LIBRARY` and `widgets` → `elements` in `DEFAULT_PAGES`

### Removed

- ([53c036f](https://github.com/le-firehawk/Cognis/commit/53c036f)) Root `style.css` — unused 28,000-line monolith with no references in the codebase
- ([53c036f](https://github.com/le-firehawk/Cognis/commit/53c036f)) `.env.example` — superseded by `env.example`
- ([53c036f](https://github.com/le-firehawk/Cognis/commit/53c036f)) `src/ui/components/` directory — sole occupant `widget-registry.js` superseded by `src/ui/reuse/element-registry.js`
- ([53c036f](https://github.com/le-firehawk/Cognis/commit/53c036f)) `src/ui/styles/base/` directory — contents merged into `src/ui/styles/reuse/`

### Added

- ([1355598](https://github.com/le-firehawk/Cognis/commit/1355598)) `src/core/services/gateway-service.ts` — new `GatewayService` class that discovers, bootstraps, and manages the gateway lifecycle, analogous to `ModuleService` for modules; subsumes `bootstrapGateways()` from `src/gateways/index.ts` and absorbs `GatewayRegistry`, `GatewayManifest`, `GatewayEntry`, `GatewayBootstrapBase`, `CapabilityStore`, and `BootstrapLog` into `@cognis/core`
- ([1355598](https://github.com/le-firehawk/Cognis/commit/1355598)) `src/gateways/shared.ts` — common import barrel for gateway authors; re-exports `GatewayBootstrapContext`, `GatewayRegistry`, `CapabilityStore`, `BootstrapLog`, `requireAuth`, `getAuthClaims`, `getCookieSession`, `setPageSecurityHeaders`, and `readJson` so gateway subdirectories need only a single `../shared.js` import for the most common utilities

### Changed

- ([1355598](https://github.com/le-firehawk/Cognis/commit/1355598)) Structural file reorganization: rename adapter files, move docs, reorganize routes and interfaces
- Removed stale `COPY db ./db` from `docker/Dockerfile` — SQL migrations now live inside `src/adapters/db/<provider>/sql/` and are copied as part of `COPY src ./src`
- ([1355598](https://github.com/le-firehawk/Cognis/commit/1355598)) `src/core/index.ts` now exports gateway types directly from `src/gateways/*/gateway.ts` and `src/modules/gateway.ts`; `GatewayService` and its supporting types are also exported from `@cognis/core`
- ([1355598](https://github.com/le-firehawk/Cognis/commit/1355598)) `src/api/gateway-bootstrap.ts` slimmed to only `GatewayBootstrapContext` (the API-specific extension of `GatewayBootstrapBase`); re-exports `GatewayRegistry`, `CapabilityStore`, `BootstrapLog`, and `GatewayBootstrapBase` from `@cognis/core` for backward compatibility within the API layer
- ([1355598](https://github.com/le-firehawk/Cognis/commit/1355598)) `src/api/main.ts` now instantiates `GatewayService` and calls `gatewayService.bootstrap()` instead of the standalone `bootstrapGateways()` function
- ([1355598](https://github.com/le-firehawk/Cognis/commit/1355598)) All gateway bootstrap files updated to import common utilities from `../shared.js`

### Removed

- ([1355598](https://github.com/le-firehawk/Cognis/commit/1355598)) `src/core/gateways/` — five backwards-compatibility re-export shims deleted; all consumers now import directly from `@cognis/core` or the real source paths
- ([1355598](https://github.com/le-firehawk/Cognis/commit/1355598)) `src/gateways/index.ts` — standalone `bootstrapGateways()` function removed; equivalent logic lives in `GatewayService.bootstrap()`
- ([1355598](https://github.com/le-firehawk/Cognis/commit/1355598)) `src/api/gateway-registry.ts` — `GatewayRegistry` class moved to `src/core/services/gateway-service.ts` and exported from `@cognis/core`

### Fixed

- Added `src/gateways/package.json` with `"type": "module"` so that gateway files are treated as ESM — without it, gateways moved from `src/api/gateways/` (which inherited ESM from `src/api/package.json`) to `src/gateways/` defaulted to CJS, breaking all named imports including `bootstrapGateways` at startup ([47eea07](https://github.com/le-firehawk/Cognis/commit/47eea07))
- Added `src/modules/package.json` with `"type": "module"` — without it, `src/modules/routes/module-extensions.ts` was treated as CJS, causing `SyntaxError: The requested module does not provide an export named 'createModuleExtensionRoutes'` at startup
- Updated root `tsconfig.json` project references to reflect the renamed adapter paths (`src/adapters/db/{sqlite,postgres,mariadb,memory}`, `src/adapters/file/local`) ([47eea07](https://github.com/le-firehawk/Cognis/commit/47eea07))

### Changed

- Moved all gateways from `src/api/gateways/` to a top-level `src/gateways/` directory, mirroring the `src/adapters/` layout; default `COGNIS_GATEWAYS_ROOT` updated accordingly ([e7f0413](https://github.com/le-firehawk/Cognis/commit/e7f0413))
- Moved db adapters from flat `src/adapters/db-*` directories into `src/adapters/db/<provider>/` (sqlite, postgres, mariadb, memory); `db-` prefix dropped ([d1d8bb4](https://github.com/le-firehawk/Cognis/commit/d1d8bb4))
- Moved db init/migrate SQL from top-level `db/init/<provider>/` and `db/migrate/<provider>/` into `src/adapters/db/<provider>/sql/init/` and `.../sql/migrate/`; `initializeDatabaseSchema()` now accepts an optional `adaptersRoot` parameter; top-level `db/` directory removed ([d1d8bb4](https://github.com/le-firehawk/Cognis/commit/d1d8bb4))
- Removed stale `src/adapters/auth-ldap/`, `auth-saml/`, and `auth-sso-oidc/` directories — code now lives under `src/adapters/auth/` ([d1d8bb4](https://github.com/le-firehawk/Cognis/commit/d1d8bb4))
- Moved `src/adapters/file-local/` to `src/adapters/file/local/` for namespace consistency ([d1d8bb4](https://github.com/le-firehawk/Cognis/commit/d1d8bb4))

### Added

- Auth gateway at `src/api/gateways/auth/` with `bootstrap.ts`, `gateway.ts`, and `manifest.json`; self-registers routes and capabilities via `routeRegistry` and `gatewayRegistry`
- Pluggable auth adapters: `local`, `ldap`, `saml`, and `oidc` under `src/adapters/auth/`; each adapter exposes `createAdapter()`, `getConfigSchema()`, and `configure()`
- `CoreAuthGateway` class managing adapter registry, enable/disable persistence, and adapter discovery from filesystem
- Auth gateway contributes `auth:accountStore`, `auth:createLocalAdmin`, and `auth:getLoginMethods` capabilities
- Admin section UI at `src/api/gateways/auth/ui/admin-section.js` for managing auth providers in the Administration page
- `GET /api/v1/auth/login-methods` endpoint returning enabled auth providers
- `GET/PUT /api/v1/gateways/auth/adapters/:id/config` and `POST /api/v1/gateways/auth/adapters/:id/enable|disable` admin endpoints
- DB migration `003_auth_adapter_configs.sql` for all three DB backends (sqlite, postgresql, mariadb)
- Login page now fetches login methods and renders a provider toggle for multi-provider login and SSO buttons for OIDC/SAML
- i18n keys for auth security admin section and login provider labels
- Tests for all new auth adapters and the auth gateway bootstrap

### Changed

- `authGateway` removed from `ApiDependencies` in `server.ts`; auth routes are now self-registered by the auth gateway via `routeRegistry`
- `accountStore` made optional in `ApiDependencies`; sourced from `auth:accountStore` capability after gateway bootstrap
- `buildServer` user routes are now conditionally created based on `accountStore` availability
- `main.ts` removes direct `LocalAuthGateway` and `DbLocalAccountStore` usage; admin account creation delegates to `auth:createLocalAdmin` capability after gateway bootstrap

### Changed

- `getCookieSession` and `setPageSecurityHeaders` extracted from duplicated private helpers in `routes/ui/index.ts` and `gateways/profile/bootstrap.ts` into `auth/guard.ts`; both call sites now import the shared functions ([5c08973](https://github.com/le-firehawk/Cognis/commit/5c08973))
- `as any` casts for `AccountRole` in `gateways/profile/bootstrap.ts` replaced with the exported `AccountRole` type ([5c08973](https://github.com/le-firehawk/Cognis/commit/5c08973))
- Dual `readRawBody`/`readJson` imports from the same module in `routes/profile/index.ts` merged into a single import statement ([5c08973](https://github.com/le-firehawk/Cognis/commit/5c08973))
- Comment in `main.ts` that named the profile gateway replaced with a gateway-agnostic description ([5c08973](https://github.com/le-firehawk/Cognis/commit/5c08973))
- CSS comments removed from `styles/base/layout.css` and `styles/base/theme.css` per codebase convention ([5c08973](https://github.com/le-firehawk/Cognis/commit/5c08973))

### Fixed

- Profile page routes (`/profile/:handle`) now return 404 when the profile gateway is disabled, preventing the profile SPA from loading while the gateway is off ([9e8abf0](https://github.com/le-firehawk/Cognis/commit/9e8abf0))
- Gateway registry entries now carry the `requires` field from each gateway's `manifest.json`; previously, `requires` was read for dependency-validation only and never stored, so the admin UI always showed "No dependencies" for gateways with declared requirements ([9e8abf0](https://github.com/le-firehawk/Cognis/commit/9e8abf0))
- Admin UI — dependency links in the gateway details panel now display the human-readable gateway name (e.g. "Database Gateway") rather than the raw ID (e.g. "db") ([9e8abf0](https://github.com/le-firehawk/Cognis/commit/9e8abf0))

### Changed

- Profile edit: saving a new display name now also writes `cognis_display_name` to `localStorage`, so the navbar name reflects the change without a full page reload ([9e8abf0](https://github.com/le-firehawk/Cognis/commit/9e8abf0))
- Dashboard layout: `bindTopbarActions` now listens for `storage` events on `cognis_display_name` and updates `#profile-name` in real time, keeping the user menu consistent across in-page profile edits ([9e8abf0](https://github.com/le-firehawk/Cognis/commit/9e8abf0))
- Admin UI: toggling a gateway now calls `updateNavbarAvatar()` immediately after reloading gateway state, so the Profile nav link appears or disappears without requiring a page navigation ([9e8abf0](https://github.com/le-firehawk/Cognis/commit/9e8abf0))

### Removed

- `src/ui/reuse/provider-config.js` deleted — the file was dead code (no consumers) and its route (`/api/v1/notifications/providers/…/config`) is a notify-gateway-specific endpoint that does not belong in core reuse; the equivalent logic is provided inline by `openAdapterConfig` in the administration page using the generic gateway adapter config API ([083995a](https://github.com/le-firehawk/Cognis/commit/083995a))

### Changed (architecture)

- Dashboard layout no longer calls profile-gateway routes directly (`/api/v1/profile/ping`, `/api/v1/profile`). Avatar and profile-link state are now supplied by a `registerAvatarProvider` hook that gateways register via a navbar plugin. The layout fetches registered plugins from `GET /api/v1/ui/navbar-plugins` and dynamically imports each one before the first avatar render ([083995a](https://github.com/le-firehawk/Cognis/commit/083995a))
- Profile gateway now self-registers its navbar plugin (`ui/navbar.js`) via `ctx.uiRegistry.registerNavbarPlugin`; the plugin provides the profile-ping + avatar-fetch logic that formerly lived in core `dashboard-layout.js` ([083995a](https://github.com/le-firehawk/Cognis/commit/083995a))
- `UIRegistry` extended with `NavbarPlugin` type, `registerNavbarPlugin(plugin)`, and `listNavbarPlugins()` methods; `GET /api/v1/ui/navbar-plugins` (user auth) added to the UI route handler ([083995a](https://github.com/le-firehawk/Cognis/commit/083995a))

- Gateway enable/disable state now persisted to the `gateways` DB table; state survives container restarts across all three DB providers (SQLite, MariaDB, PostgreSQL) ([5c70705](https://github.com/le-firehawk/Cognis/commit/5c70705))
- `POST /api/v1/gateways/:id/enable|disable` now returns `403 required_gateway` when the target gateway has `required: true`, preventing required gateways from being toggled ([5c70705](https://github.com/le-firehawk/Cognis/commit/5c70705))
- Adapter enable endpoint (`POST /api/v1/gateways/:id/adapters/:adapterId/enable`) returns `409 gateway_disabled` when the parent gateway is disabled, preventing adapters from being enabled while their gateway is off ([5c70705](https://github.com/le-firehawk/Cognis/commit/5c70705))
- Admin UI — required gateway sliders are rendered `disabled` (same as core/required modules), preventing accidental toggle ([5c70705](https://github.com/le-firehawk/Cognis/commit/5c70705))
- Admin UI — adapter toggles are rendered `disabled` when the parent gateway is disabled ([5c70705](https://github.com/le-firehawk/Cognis/commit/5c70705))
- Admin UI — `<summary>` elements in module and gateway rows now carry a `module-row-summary` class for targeted CSS vertical-alignment ([5c70705](https://github.com/le-firehawk/Cognis/commit/5c70705))
- CLI commands: `gateway:list`, `gateway:enable <gatewayId>`, `gateway:disable <gatewayId>` added to `cognisctl` under a new "Gateways" section ([5c70705](https://github.com/le-firehawk/Cognis/commit/5c70705))

- Gateway enable/disable: `GatewayRegistry` now tracks `status: "active" | "disabled"` per gateway with `enable(id)` and `disable(id)` methods; `POST /api/v1/gateways/:id/enable` and `POST /api/v1/gateways/:id/disable` (admin) toggle gateway state at runtime
- `GatewayManifest.hasAdapters?: boolean`: signals whether a gateway exposes a `/api/v1/gateways/:id/adapters` endpoint; notify gateway sets this to `true`; admin UI only fetches adapters for flagged gateways, eliminating 404 noise for non-adapter gateways
- Admin UI — Modules and Gateways now render as separate headed sections instead of a dropdown tab; gateway details show `required` (boolean) and adapter count; gateway rows include an enable/disable toggle matching the module pattern
- Admin UI — gateway detail shows a "Required" row (boolean) and a "Dependencies" row listing each gateway ID from `requires` as a clickable link that opens and scrolls to that gateway's row
- Admin UI — adapter config popup now maps backend field names to human-readable labels using existing SMTP i18n keys with camelCase fallback; `secure` field rendered as a dropdown (None / STARTTLS / TLS); `user`/`password` fields wrapped in `.provider-auth-fields` and hidden when `authDisabled` is checked
- Slider `<label>` elements for module and gateway toggles now carry a `title` tooltip via `ui.app.admin.toggle_module` / `ui.app.admin.toggle_gateway` i18n keys
- `CoreNotificationGateway.enableSender(id)` and `disableSender(id)` methods: toggle a sender's enabled state and persist the change without overwriting the rest of the adapter config ([3adec54](https://github.com/le-firehawk/Cognis/commit/3adec54))
- `POST /api/v1/gateways/:id/adapters/:adapterId/enable` and `.../disable` endpoints added to notify gateway adapter routes ([3adec54](https://github.com/le-firehawk/Cognis/commit/3adec54))
- `createProfileRoutes` accepts an optional `isGatewayEnabled?: () => boolean` callback; when supplied and returns `false`, `GET /api/v1/profile/ping` returns 503 so the dashboard hides the Profile link immediately after the profile gateway is disabled ([3adec54](https://github.com/le-firehawk/Cognis/commit/3adec54))
- i18n: `ui.reuse.generic.true`, `ui.reuse.generic.false`, `ui.reuse.generic.configure` keys added across all four language files ([3adec54](https://github.com/le-firehawk/Cognis/commit/3adec54))

### Changed

- Admin UI — module and gateway enable/disable sliders moved into `<summary>` (next to title); inline `onclick="event.stopPropagation()"` removed (CSP violation) — replaced by `bindSummarySliderClicks()` which attaches click listeners programmatically ([9efa200](https://github.com/le-firehawk/Cognis/commit/9efa200))
- Admin UI — gateway "Required" field now displays "True" / "False" text (via new i18n keys) instead of repurposing the Active/Disabled pill labels ([9efa200](https://github.com/le-firehawk/Cognis/commit/9efa200))
- Admin UI — adapter inline rows are now clickable (entire row opens the settings popup); "Configure" button removed; row has hover/focus styles; clicking the enable/disable toggle within the row does not open the popup ([9efa200](https://github.com/le-firehawk/Cognis/commit/9efa200))
- Admin UI — "Adapters" label shown above the inline adapter list (only when adapters are present) ([9efa200](https://github.com/le-firehawk/Cognis/commit/9efa200))
- Admin UI — SMTP adapter popup: `user`/`password` fields moved into the main `.provider-fields` grid (above the "Disable Authentication" toggle) rather than below it ([9efa200](https://github.com/le-firehawk/Cognis/commit/9efa200))
- Admin UI — SMTP adapter popup: `<select>` dropdown now fills the full width of its grid cell via `.provider-popup-field input, .provider-popup-field select { width: 100%; }` ([9efa200](https://github.com/le-firehawk/Cognis/commit/9efa200))
- Notify gateway `ctx.gatewayRegistry.register()` call now includes `hasAdapters: true`; previously the field was absent, causing `loadAllAdapters()` to skip the notify gateway and show zero adapters in the admin UI ([9efa200](https://github.com/le-firehawk/Cognis/commit/9efa200))
- Admin UI — adapter row click handler now checks the whole `.switch--inline` label (not just the hidden `input` element), so clicking anywhere on the toggle track/knob correctly blocks the popup ([90c6df4](https://github.com/le-firehawk/Cognis/commit/90c6df4))
- Admin UI — expanded gateway/module view state now persisted to `sessionStorage` and restored on page refresh via `saveExpandedState()`, `restoreExpandedState()`, and `bindExpandedStateListeners()` ([90c6df4](https://github.com/le-firehawk/Cognis/commit/90c6df4))
- Gateway manifests bumped from `0.1.0` to `1.0.0`; corresponding version strings in bootstrap files updated to match ([90c6df4](https://github.com/le-firehawk/Cognis/commit/90c6df4))
- `db` gateway bootstrapped second (after `logging`) in `bootstrapGateways()` sort order so it is registered before any gateway that declares it as a required dependency ([90c6df4](https://github.com/le-firehawk/Cognis/commit/90c6df4))

### Added

- DB gateway (`src/api/gateways/db/`) — minimal gateway that registers itself in `GatewayRegistry` with `required: true`; allows notify and profile gateways to declare it as a dependency and ensures it appears in the admin UI with the correct required flag ([90c6df4](https://github.com/le-firehawk/Cognis/commit/90c6df4))
- Profile gateway manifest: added `"requires": ["db", "files"]`; notiy gateway manifest: added `"requires": ["db"]` ([90c6df4](https://github.com/le-firehawk/Cognis/commit/90c6df4))

### Fixed

- Admin UI — adapter inline toggle `isEnabled` condition fixed: previously `adapter.enabled !== false` evaluated `true` when `enabled` was `undefined`, causing the slider to always appear checked even after disabling an adapter; now uses `!!adapter.active` which correctly reflects the backend-reported state ([9efa200](https://github.com/le-firehawk/Cognis/commit/9efa200))
- `.switch--inline` — changed from `display: inline-flex` to `display: flex; height: 28px; line-height: 0` so the toggle is reliably vertically centred in the `<summary>` grid in all browsers ([90c6df4](https://github.com/le-firehawk/Cognis/commit/90c6df4))
- SMTP adapter `getConfig()` now includes `password: ""` so the password field always appears in the adapter settings form; `setConfig()` ignores empty-string password values to avoid overwriting a stored password when the user saves without re-entering it; `saveProviderConfig` strips empty password before persisting to avoid clearing the stored value ([90c6df4](https://github.com/le-firehawk/Cognis/commit/90c6df4))
- `bootstrapGateways()` sort comparator renamed parameters from `a`/`b` to `entryA`/`entryB` to eliminate single-letter variable ambiguity flagged by the readability lint check ([ee5ac2f](https://github.com/le-firehawk/Cognis/commit/ee5ac2f))
- `src/api/tests/docs-routes.test.ts`: updated slug assertions to match current directory structure (`components/docs/ui` instead of the stale `docs/components/ui`); both docs tests now pass

### Changed

- `src/components/docs/api.en.md`: documented new gateway API endpoints (`GET /api/v1/gateways`, `GET /api/v1/gateways/:id`, `GET /api/v1/admin/sections`), page-extensions route (`GET /api/v1/ui/page-extensions/:pageId`), and profile ping (`GET /api/v1/profile/ping`); noted `503` behaviour for avatar/banner when file gateway is absent
- `src/components/docs/overview.en.md`: added UIRegistry, auto-discovered adapters, and cross-gateway dependency declarations to Key Concepts
- `src/components/docs/versions.en.md`: added Gateways section with all four gateways (notify, profile, files, logging); renamed "Gateways (Core Contracts)" to "Core contracts"

### Added

- `src/api/ui-registry.ts` — `UIRegistry` class: gateways register admin-page sections (`{ id, label, scriptUrl }`) and static asset directories; core serves them without knowing gateway content
- `GatewayBootstrapContext.uiRegistry` optional field: gateways receive `UIRegistry` during bootstrap to self-register UI contributions
- `GET /api/v1/admin/sections` route (admin): returns list of admin sections registered by gateways via `UIRegistry`
- `UIRegistry.registerPageExtension(pageId, element)` / `listPageExtensions(pageId)`: gateways inject `PageElement` contributions into any named core page
- `GET /api/v1/ui/page-extensions/:pageId` route (authenticated): returns page extensions contributed by gateways for the given page; used by core pages to dynamically load gateway-contributed UI modules
- `GatewayManifest.requires?: string[]`: declares mandatory inter-gateway dependencies; cross-dependency violations for required gateways now throw before server start; optional gateways log a warning when a dependency is absent

### Changed

- `src/api/gateways/index.ts` `bootstrapGateways()`: reads `requires` from each gateway's `manifest.json`; validates cross-gateway dependencies after all gateways have bootstrapped; throws for missing required-gateway deps, logs warning for optional-gateway deps
- `src/api/main.ts`: removed unused `logger` variable (type `Logger` was undeclared; `log` via `BootstrapLog` is the correct interface)

### Tests

- `src/api/tests/ui-registry.test.ts`: new — UIRegistry unit tests (admin sections, static dirs, page extensions, route handler for `GET /api/v1/ui/page-extensions/:pageId`)
- `src/api/tests/profile-routes.test.ts`: added — `GET /api/v1/profile/ping` returns 200/401; avatar PUT returns 503 without fileGateway
- `src/api/routes/gateways/tests/gateway-routes.test.ts`: added — `GET /api/v1/admin/sections` auth and content tests
- `src/api/gateways/tests/gateway-registry.test.ts`: added — `GatewayManifest.requires` field, `assertRequiredInitialized` success and failure cases

- `/static/gateways/:gatewayId/...` static file handler: serves gateway-owned UI assets from filesystem paths registered via `UIRegistry.registerStaticDir()`
- `GET /api/v1/profile/ping` route: lightweight capability-check endpoint; returns `{ data: { available: true } }` when the profile gateway is present
- `src/api/gateways/notify/ui/admin-section.js` — browser ES module: contributes the Notifications debug panel to the admin page via the `UIRegistry` mechanism
- Profile gateway now registers `createProfilePageRoutes()` for `GET /profile` and `GET /profile/:handle`, owning its own page-serving routes

### Changed

- `notify/bootstrap.ts`: registers notification gateway admin section and static UI directory with `UIRegistry` at end of bootstrap; renamed ambiguous `key` variable from `verifyTokenService.verify()` to `userEmailPair`
- `routes/profile/index.ts`: `fileGateway` parameter made optional; avatar/banner/banner-delete routes return `503 file_storage_unavailable` when file gateway is absent
- `gateways/profile/bootstrap.ts`: profile API routes always registered (with optional fileGateway); file routes only registered when file gateway is present; `/profile` and `/profile/:handle` page routes owned by profile gateway via `createProfilePageRoutes()`
- `routes/ui/index.ts`: removed hardcoded `/profile` and `/profile/:handle` routes (now owned by profile gateway); added `/static/gateways/:id/...` gateway static file handler; accepts optional `uiRegistry?` parameter
- `routes/gateways/index.ts`: added `GET /api/v1/admin/sections`; accepts optional `uiRegistry?` parameter
- `server.ts` `ApiDependencies`: added `uiRegistry?` field; passed to `createUiRoutes` and `createGatewayRoutes`
- `main.ts`: creates `UIRegistry` instance and passes it to `bootstrapGateways` context and `buildServer`
- `ui/app/administration/index.js`: removed hardcoded `Notifications` section and SMTP-specific `renderSmtpPopupBody`; added `loadAdminSections()` and `loadGatewaySection()` for dynamic section discovery; added generic `renderGenericAdapterForm` (derives field types from API-returned descriptors); toolbar nav and elements array built dynamically from registered gateway sections
- `ui/layouts/dashboard-layout.js` `updateNavbarAvatar()`: pings `/api/v1/profile/ping` first; Profile menu link conditionally shown/hidden based on gateway availability
- `ui/public/templates/dashboard-layout.html`: Profile menu `<li>` hidden by default with `data-profile-link` attribute; revealed dynamically when profile gateway is present
- `ui/tests/dead-code.test.js`: `USAGE_ROOTS` extended to include `src/api/gateways` so gateway-contributed browser JS is scanned for CSS class references
- `api/tests/ui-routes.test.ts`: updated profile-page test to assert core `createUiRoutes` no longer handles `/profile` (now owned by profile gateway)

- `src/api/gateways/profile/` — profile gateway (optional). Owns `DbProfileStore` schema, profile/social/post/file routes and file-size-limits admin routes. Reads `file:gateway` from capabilities (avatar/banner/file routes registered only when the file gateway is present). Contributes `profile:createProfile` and `profile:setRoleByHandle` callbacks so auth and user routes can stay profile-agnostic ([e49cc0e](https://github.com/le-firehawk/Cognis/commit/e49cc0e))
- `BootstrapLog` type in `gateway-bootstrap.ts`: standard `(level, message, meta?) => void` signature; optional `log?` field added to `GatewayBootstrapContext` so gateways can emit structured logs during bootstrap ([e49cc0e](https://github.com/le-firehawk/Cognis/commit/e49cc0e))
- `DbInitLogger` interface in `bootstrap/db-init.ts`: minimal `info(msg, meta?)` contract for the database initializer, replacing the hard import of the concrete `Logger` class ([e49cc0e](https://github.com/le-firehawk/Cognis/commit/e49cc0e))

### Changed

- `gateways/index.ts` `bootstrapGateways()`: sorts gateways so the logging gateway always runs first; after the logging gateway initializes, `ctx.log` is populated from `logging:log` for all remaining gateways ([e49cc0e](https://github.com/le-firehawk/Cognis/commit/e49cc0e))
- `server.ts` `ApiDependencies`: removed `profileStore`, `fileGateway`; added `log?`, `createProfile?`, `setProfileRole?` — all plain callback types with no adapter imports. `buildServer` now delegates logging to the injected `log` function (no-ops when absent) ([e49cc0e](https://github.com/le-firehawk/Cognis/commit/e49cc0e))
- `routes/auth/index.ts`: replaced `ProfileCreateStore` import and `profileStore?` parameter with a plain `createProfile?` callback — auth routes carry zero profile dependency ([e49cc0e](https://github.com/le-firehawk/Cognis/commit/e49cc0e))
- `routes/users/index.ts`: replaced `ProfileCreateStore` import and `profileStore?` parameter with `setProfileRole?` callback. User-create route no longer calls `createProfile` (profile gateway creates profiles on first login instead) ([e49cc0e](https://github.com/le-firehawk/Cognis/commit/e49cc0e))
- `main.ts`: removed `Logger` and `DbProfileStore` imports; removed direct `profileStore` bootstrap; removed `fileGateway` retrieval. Pre-gateway logging uses a minimal inline `bootstrapLog()` console writer. After gateway bootstrap, `log` and `createProfile`/`setProfileRole` are read from `CapabilityStore` and injected into `buildServer` ([e49cc0e](https://github.com/le-firehawk/Cognis/commit/e49cc0e))

### Added

- `GatewayBootstrapContext` interface and `CapabilityStore` class in `src/api/gateway-bootstrap.ts`: standard contract for all gateway bootstrap functions; gateways contribute capabilities (e.g. `file:gateway`) back to core without core importing any concrete class ([30e69f1](https://github.com/le-firehawk/Cognis/commit/30e69f1))
- `GatewayManifest.required` field: gateways can declare themselves required; `GatewayRegistry.assertRequiredInitialized()` throws if any required gateway failed to register, causing core to refuse startup ([30e69f1](https://github.com/le-firehawk/Cognis/commit/30e69f1))
- `src/api/gateways/index.ts` `bootstrapGateways()`: auto-discovers gateway subdirectories, reads each `manifest.json` for required flag, and dynamically imports each gateway's standard `bootstrap(ctx)` entry point ([30e69f1](https://github.com/le-firehawk/Cognis/commit/30e69f1))
- `src/api/gateways/notify/` directory: notification gateway moved from flat files to self-contained subdirectory; `bootstrap.ts` now also owns and registers all user email management routes (`/api/v1/users/:id/emails/*`, `/api/v1/verify-email`, `/api/v1/verify-tokens/status`) that previously leaked into core user routes ([30e69f1](https://github.com/le-firehawk/Cognis/commit/30e69f1))
- `src/api/gateways/files/` directory: local file storage gateway now bootstraps itself, reads `MEDIA_LOCATION` from env, and contributes `file:gateway` to the capability store — core never imports `LocalFileGateway` directly ([30e69f1](https://github.com/le-firehawk/Cognis/commit/30e69f1))
- `manifest.json` for `notify` and `files` gateways (both `required: false` by default) ([30e69f1](https://github.com/le-firehawk/Cognis/commit/30e69f1))
- Tests for `assertRequiredInitialized`, notify bootstrap registration, and email management routes in `src/api/gateways/notify/tests/` ([30e69f1](https://github.com/le-firehawk/Cognis/commit/30e69f1))

### Changed

- `main.ts` no longer imports any concrete gateway or adapter class; calls `bootstrapGateways()` blindly then performs the required-gateway startup check before the server starts listening ([30e69f1](https://github.com/le-firehawk/Cognis/commit/30e69f1))
- `ApiDependencies` in `server.ts` stripped of `notifStore`, `tfaService`, `verificationEmailSender`, `verifyTokenService`, and `externalHost`; `fileGateway` is now sourced from the capability store ([30e69f1](https://github.com/le-firehawk/Cognis/commit/30e69f1))
- `createUserRoutes` reduced to pure user CRUD (create, role, password, enable, disable, delete, preferences/clear); email management routes moved to notify gateway ([30e69f1](https://github.com/le-firehawk/Cognis/commit/30e69f1))
- Email-verification tests relocated from `src/adapters/notify/smtp/tests/` to `src/api/gateways/notify/tests/email-routes.test.ts` to match route ownership ([30e69f1](https://github.com/le-firehawk/Cognis/commit/30e69f1))

### Removed

- `src/api/gateways/notification.ts`, `notification-bootstrap.ts` — replaced by `notify/gateway.ts` and `notify/bootstrap.ts` ([30e69f1](https://github.com/le-firehawk/Cognis/commit/30e69f1))

### Added

- `GatewayRegistry`: registry service for gateway self-registration with metadata ([7889c64](https://github.com/le-firehawk/Cognis/commit/7889c64))
- `RouteRegistry`: pluggable route handler registry; gateways self-register routes instead of being hardcoded in `server.ts` ([7889c64](https://github.com/le-firehawk/Cognis/commit/7889c64))
- `bootstrapNotificationGateway()` in `notification-bootstrap.ts`: notification gateway now bootstraps itself (creates stores, discovers adapters, registers routes) without `main.ts` or `server.ts` knowing about specific gateway internals ([7889c64](https://github.com/le-firehawk/Cognis/commit/7889c64))
- `GET /api/v1/gateways` and `GET /api/v1/gateways/:id`: gateway management API (admin-only) ([7889c64](https://github.com/le-firehawk/Cognis/commit/7889c64))
- `GET /api/v1/gateways/notify/adapters`, `GET/PUT /api/v1/gateways/notify/adapters/:id/config`, `POST /api/v1/gateways/notify/adapters/:id/test`: unified gateway adapter API registered by the notification gateway itself ([7889c64](https://github.com/le-firehawk/Cognis/commit/7889c64))
- Administration page "Components" section with Modules/Gateways/Adapters dropdown, replacing the flat "Modules" section ([7889c64](https://github.com/le-firehawk/Cognis/commit/7889c64))
- Adapter configuration management moved from the Notifications section into Components → Adapters ([7889c64](https://github.com/le-firehawk/Cognis/commit/7889c64))
- Tests for `GatewayRegistry`, gateway routes (`GET /api/v1/gateways`), and `bootstrapNotificationGateway` ([7889c64](https://github.com/le-firehawk/Cognis/commit/7889c64))
- i18n keys for `ui.app.admin.components`, `ui.app.admin.gateways`, `ui.app.admin.adapters`, `ui.app.admin.description`, `ui.app.admin.no_gateways`, `ui.app.admin.no_adapters` in all four supported languages ([7889c64](https://github.com/le-firehawk/Cognis/commit/7889c64))

### Changed

- `server.ts` `ApiDependencies`: `notificationGateway` removed; `routeRegistry` and `gatewayRegistry` added; server is now unaware of specific gateway implementations ([7889c64](https://github.com/le-firehawk/Cognis/commit/7889c64))
- `main.ts` delegates notification gateway lifecycle to `bootstrapNotificationGateway()`; no longer directly constructs `CoreNotificationGateway` or its stores ([7889c64](https://github.com/le-firehawk/Cognis/commit/7889c64))
- Administration Notifications section now shows only the debug dispatch panel; provider config lives in Components → Adapters ([7889c64](https://github.com/le-firehawk/Cognis/commit/7889c64))

- `VerificationEmailSender` interface; gateway is now the sole authority for verification emails ([f51b505](https://github.com/le-firehawk/Cognis/commit/f51b505))
- Per-provider enable/disable flag persisted through the gateway config store ([f51b505](https://github.com/le-firehawk/Cognis/commit/f51b505))
- Docs auto-discovery: route scans for `docs/` directories anywhere under `src/` ([67c070c](https://github.com/le-firehawk/Cognis/commit/67c070c))
- Component versioning document at `src/components/docs/versions.en.md` ([67c070c](https://github.com/le-firehawk/Cognis/commit/67c070c))
- SMTP adapter relocated to `src/adapters/notify/smtp/`; tests co-located inside `tests/` subdirectory ([67c070c](https://github.com/le-firehawk/Cognis/commit/67c070c))

### Changed

- Prettier 3.8.3 adopted as the canonical code formatter (inferred from IDE auto-format samples): 4-space indent, double quotes, trailing commas in multi-line argument lists ([4f0eab0](https://github.com/le-firehawk/Cognis/commit/4f0eab0))
- `lint-placeholder.mjs` replaced with Prettier `--check` invocation; `lint-readable.mjs` indentation check removed (now covered by Prettier)
- All source files (JS, TS, HTML, CSS) reformatted to match the Prettier standard
- All route files restructured to `routes/<domain>/index.ts` pattern ([67c070c](https://github.com/le-firehawk/Cognis/commit/67c070c))
- Notification gateway renamed from `notification-gateway.ts` to `notifications.ts` (redundant suffix removed) ([67c070c](https://github.com/le-firehawk/Cognis/commit/67c070c))
- Component docs reorganised: `src/docs/components/` → `src/components/docs/`, `src/docs/modules/` → `src/modules/docs/`, `src/docs/standards/` → `src/tooling/docs/`
- AI instructions updated with CHANGELOG, CHANGELOG compression convention, and general gateway/adapter authority principle

### Removed

- `src/docs/foundation-log.md` (internal session log, not product documentation)
- Flat `*-routes.ts` files replaced by domain-subdirectory route handlers ([67c070c](https://github.com/le-firehawk/Cognis/commit/67c070c))

### Fixed

- `dispatch()` in notification gateway now catches per-sender errors rather than propagating ([f51b505](https://github.com/le-firehawk/Cognis/commit/f51b505))
- Email UNIQUE constraint now enforced in all DB init scripts ([f51b505](https://github.com/le-firehawk/Cognis/commit/f51b505))
- `discoverSenders` now scans `adaptersRoot/notify/` instead of `adaptersRoot/`, correctly resolving the two-level `src/adapters/<gateway-id>/<adapter-id>/` structure

[Unreleased]: https://github.com/le-firehawk/Cognis/compare/HEAD...HEAD
