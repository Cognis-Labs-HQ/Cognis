# Changelog

All notable changes to Cognis are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Gateway enable/disable: `GatewayRegistry` now tracks `status: "active" | "disabled"` per gateway with `enable(id)` and `disable(id)` methods; `POST /api/v1/gateways/:id/enable` and `POST /api/v1/gateways/:id/disable` (admin) toggle gateway state at runtime
- `GatewayManifest.hasAdapters?: boolean`: signals whether a gateway exposes a `/api/v1/gateways/:id/adapters` endpoint; notify gateway sets this to `true`; admin UI only fetches adapters for flagged gateways, eliminating 404 noise for non-adapter gateways
- Admin UI — Modules and Gateways now render as separate headed sections instead of a dropdown tab; gateway details show `required` (boolean) and adapter count; gateway rows include an enable/disable toggle matching the module pattern
- Admin UI — gateway expanded detail shows a "Go to adapters" button (gateways with `hasAdapters` only) that loads and toggles an inline adapters panel; adapter click handler now uses locally-fetched adapter data so opening the popup never silently fails
- Admin UI — gateway detail shows a "Required" row (boolean) and a "Dependencies" row listing each gateway ID from `requires` as a clickable link that opens and scrolls to that gateway's row
- Admin UI — adapter config popup now maps backend field names to human-readable labels using existing SMTP i18n keys with camelCase fallback; `secure` field rendered as a dropdown (None / STARTTLS / TLS); `user`/`password` fields wrapped in `.provider-auth-fields` and hidden when `authDisabled` is checked
- Slider `<label>` elements for module and gateway toggles now carry a `title` tooltip via `ui.app.admin.toggle_module` / `ui.app.admin.toggle_gateway` i18n keys

### Fixed

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
