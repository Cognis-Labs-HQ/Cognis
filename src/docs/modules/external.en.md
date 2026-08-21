# External Modules

## Stable identity

Every module has a human-readable `id` and an RFC 4122 `uuid`. The ID may be renamed; the UUID must never change, move between products, or be reused. Every `requires` entry is a component UUID. Cognis uses UUIDs for dependency and lifecycle decisions and names only for display and URLs.

## Repository contract

One Git repository delivers one module. Its root contains `manifest.json`, `package.json`, `routes.json`, and the optional orchestrator entry points `bootstrap.js`, `api/index.js`, `ui/index.js`, and `cli/index.js`. `bootstrap.js` is the sole system integration entry and receives `ctx`; it may import any file within its repository, but must not import Cognis or another component's internal paths. Export capabilities and flow stages through `ctx`. This narrow entry-point contract lets authors freely reorganize internal files without coupling Cognis to them.

`package.json` must use `"type": "module"` and its version must exactly match `manifest.json`. `routes.json` is always present and contains an array, including an empty array when the module claims no routes. Every declared entry point must resolve to a regular file inside the checkout. Keep orchestration in the declared entry points and place freely organized implementation code behind them; Cognis does not import any other module path.

Every external module declares `entrypoints.bootstrap`. Cognis imports only that file and calls `bootstrapModule(ctx)` when the module is enabled. The scoped context provides API route registration, module static directories, SPA routes, navigation, settings and page extensions, capability contribution, flow creation and stage injection. Put localized documentation under `docs/` and module release notes under `docs/changelog/`; both are discovered from installed repositories without core path registration. Browser assets remain module-owned and are exposed only through `ctx.registerStaticDir`.

`bootstrapModule` may return a disposer, and a module may additionally export `teardownModule(ctx)`. On disable or uninstall, Cognis invokes those hooks and then removes every route, static directory, UI contribution, capability, created flow, and injected flow stage recorded by the scoped context. Modules must not retain timers, listeners, sockets, or other work after their disposer completes. Contributions made by importing core internals or by bypassing the supplied `ctx` cannot be tracked and are unsupported.

The manifest declares `uuid`, `id`, `name`, `version`, `publisher`, `class`, `coreApiVersion`, `summary`, `description`, `categories`, `recommended`, `license`, `homepage`, `repository`, `support`, `capabilities`, UUID-based `requires`, `entrypoints`, and `assets`. Asset paths are repository-relative. `assets.icon` identifies the square store icon, `assets.banner` identifies the detail hero, and `assets.screenshots` is an ordered gallery. Paths must remain inside the repository.

## Sources and private repositories

Cognis includes the `https://github.com/Cognis-Labs-HQ` organization as an immutable trusted source by default. Administrators can add further GitHub organizations or GitLab groups from Modules in the user menu, then Module Sources. Cognis queries the provider API, treats each repository containing a valid root manifest as a module, and derives the catalog dynamically. A source can reference an optional PAT stored in the signed-in administrator's keyring; the source record stores only the keyring identifier. Use a least-privilege, read-only token with repository and metadata access. Tokens are supplied only for discovery and cloning and are never written to source configuration. Private repositories are excluded unless **Scan Private Repositories** is enabled; enabling it makes the PAT mandatory.

## Installation and safety

Installation clones the selected HTTPS repository without an interactive credential prompt, validates the downloaded root manifest and immutable UUID, and atomically moves it under the external module root. Before committing the checkout, Cognis verifies the package and manifest versions, route declaration, entry points, required artwork, safe repository-relative paths, and every declared SHA-256 file digest. A failed check removes the temporary checkout and leaves the installed version untouched. Updating repeats that operation for the same UUID. Uninstalling removes that UUID's checkout. Enabling remains a separate lifecycle action so code is not executed merely by browsing or installing it. Routes must be declared in `routes.json`; protected core prefixes cannot be claimed.

Repository owners should sign releases, pin dependencies, publish checksums in `files`, avoid generated secrets, and document all requested capabilities. Screenshots must not contain credentials or personal data. Cognis administrators remain responsible for reviewing third-party code before enabling it.

## Extraction checklist

Before moving a bundled module into its own repository, copy the module directory without changing its UUID, retain the readable ID, and preserve the root `manifest.json`, `package.json`, and `routes.json`. Make the repository URL, homepage, and support links point at the new project; keep manifest and package versions synchronized; ensure every declared entry point and asset exists with exact filename casing; regenerate `files` SHA-256 values after the final change; and run the module tests without relying on monorepo-relative imports. Runtime interaction with Cognis and other components must occur only through the bootstrap `ctx` capabilities and flows. Test enable-disable-enable and uninstall cycles so every contribution is demonstrably removable and repeatable.

## Store assets and tags

A module may declare `tags` alongside its broader `categories`; both participate in marketplace filtering. Store artwork lives at the repository root under `assets/`: provide `assets/icon.svg` or `assets/icon.png` for the catalog icon, and `assets/banner.svg`, `assets/banner.png`, or `assets/banner.jpg` for the detail-page hero. Declare the chosen paths as `assets.icon` and `assets.banner` in `manifest.json`. Optional gallery images are listed in `assets.screenshots`. Keep artwork free of secrets and personal data.

## Module preferences

A module can expose administrator-editable settings with `ui.preferences`. Each field declares a stable `key`, a localized `labelKey`, an optional `descriptionKey`, a `type` of `boolean`, `string`, or `number`, an optional matching `default`, `secret: true` for concealed sensitive strings, and `required: true` when enablement must be blocked until the module-owned config endpoint returns a value; `ui.stringsBaseUrl` identifies the module-owned translations. Cognis renders this manifest contract in the installed-module detail view, polls `GET /api/v1/modules/<id>/config`, and submits changes with `PUT` to that same module-owned endpoint. The module validates, applies, and persists its operational configuration. It must not provide a second settings UI or use Cognis user preferences as configuration storage. Disabling or restarting a module must preserve this persisted configuration; only the uninstall flow may clear it.

## Logging and user feedback

Server bootstrap and route code writes structured application logs through `ctx.log(level, message, meta)`. Cognis scopes each entry to the module before forwarding it to the Logging gateway. Browser code obtains `ui:log`, `ui:showToast`, and `ui:openErrorPopup` from `uiCtx.capabilities`; `ui:log` forwards authenticated entries to the server log, while the feedback capabilities use the host's themed and accessible UI. Modules must use these processes instead of relying on browser console output for operational failures or implementing their own notification surfaces.

## Release-channel refresh and browser clients

For an installed module, catalog refresh resolves the installed branch or release first and uses the repository default branch only when no channel is recorded. Modules consume gateway-owned browser data through declared `uiCtx.capabilities` clients; current host clients include `social:profileUiClient`, `social:messagesUiClient`, `files:uiClient`, and `share:uiClient`. Declare every required UI capability so Cognis loads its active provider before mounting the module route.

Modules that persist configuration or content outside their checkout must export `uninstallModule(ctx, { deleteContent })` from the declared bootstrap entrypoint. The hook always clears persisted configuration; it removes module-owned records and files only when `deleteContent` is true. Cognis invokes the hook before deleting the checkout, while capabilities remain available through `ctx.getCapability`.
