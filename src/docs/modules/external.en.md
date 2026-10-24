# External Modules

External-module bootstrap has a bounded two-minute default budget, allowing validated content-pack ingestion to finish before capabilities are published. An explicit host timeout override still applies. Failures and deadline expiry remove scoped contributions and keep the module unavailable. Packaged audio reuses persisted versioned recordings on reactivation, recreating missing files through the Files gateway. Library record and relationship reconciliation still runs, including for unchanged packs.

External modules extend Cognis with independently installed server and browser behavior while remaining isolated behind manifest, capability, flow, route, integrity, and lifecycle contracts.

## Usage examples

A repository declares its stable identity and bootstrap entrypoint in `manifest.json`:

<!-- prettier-ignore -->
```json
{
  "uuid": "123e4567-e89b-42d3-a456-426614174000",
  "id": "example-module",
  "version": "1.0.0",
  "entrypoints": { "bootstrap": "bootstrap.js" }
}
```

The bootstrap contributes behavior only through its scoped context and returns cleanup for resources it owns:

<!-- prettier-ignore -->
```js
export async function bootstrapModule(ctx) {
  ctx.registerFlow({ id: 'example-module:constructPage', stages: ['content'] });
  ctx.flow.extend('example-module:constructPage', 'content',
    { id: 'example-module:content' }, async () => ({ ready: true }));
}
```

An administrator installs the repository from **Modules**, reviews its integrity and dependencies, explicitly enables it, and can later disable it to remove all registered UI and backend behavior without restarting Cognis.

## Technical specification

### Stable identity

Every module has a human-readable `id` and an RFC 4122 `uuid`. The ID may be renamed; the UUID must never change, move between products, or be reused. Every `requires` entry is a component UUID. Cognis uses UUIDs for dependency and lifecycle decisions and names only for display and URLs.

### Repository contract

One Git repository delivers one module. Its root contains `manifest.json`, `package.json`, `routes.json`, and the required `bootstrap.js` and optional entry points `api/index.js`, `ui/index.js`, and `cli/index.js`. `bootstrap.js` is the sole system integration entry and receives `ctx`; it may import only files within its repository; host and foreign-component behavior comes through ctx capabilities and flows. Exported capabilities and flow stages must use `ctx` so lifecycle cleanup can track them. Security-sensitive registrations remain restricted and require `privileged: true`; ordinary imports, API URLs, and shared style classes do not make a module privileged.

`package.json` must use `"type": "module"` and its version must exactly match `manifest.json`. `routes.json` is always present and contains an array, including an empty array when the module claims no routes. Every declared entry point must resolve to a regular file inside the checkout. Keep orchestration in the declared entry points and place implementation code in the prescribed concern directories; Cognis does not import any other module path.

Every external module declares `entrypoints.bootstrap`. Cognis imports only that file and calls `bootstrapModule(ctx)` when the module is enabled. The scoped context provides API route registration, module static directories, SPA routes, navigation, settings and page extensions, capability contribution, flow creation and stage injection. Put localized documentation under `docs/` and module release notes under `docs/changelog/`; both are discovered from installed repositories without core path registration. Browser assets remain module-owned and are exposed only through `ctx.registerStaticDir`. A module can publish a dedicated browser capability provider with `ctx.registerCapabilityProvider({ scriptUrl, providesCapabilities })`; Cognis includes it in the provider catalog only while that module is enabled and removes it during lifecycle cleanup.

An enabled module can deliberately serve a page to both anonymous and authenticated visitors by passing `public: true` to `ctx.registerSpaRoute`. Public routes must not declare a role-based `access` policy. Cognis exposes only explicitly public route descriptors to anonymous browser clients and serves their SPA shell without redirecting to `/login`; every route remains authenticated by default.

Security-sensitive flow hooks and gateway-owned route contributions require `privileged: true` in the module manifest. Declaring a module as an SSO provider does not grant this access. Privileged modules installed from the hardcoded `Cognis-Labs-HQ` GitHub organization are recognized as trusted; every other source that requests privilege produces an explicit security warning. Modules still cannot register protected core routes directly: a privileged authentication module contributes callback routes through its registered auth adapter's constrained `routeNamespace` and `registerRoutes(router)` contract.

Every module contribution is owner-protected: API routes, capabilities, flows, flow hooks, static prefixes, and UI registrations reject cross-owner replacement or collision and are removed only with their recorded owner. For cross-module integration, `await ctx.getModuleAssurance(moduleId)` returns the target UUID, version, privilege provenance, source repository, and runtime integrity state (`verified`, `unverified`, or `failed`). Installed manifests are sealed in installer-owned provenance and declared files are re-hashed at runtime, allowing a consumer to require an expected UUID and `verified` integrity before using another module's capabilities.

Unprivileged modules can cooperate without claiming host or foreign namespaces. The provider publishes a capability or flow under its own `<provider-module-id>:` prefix; the consumer declares the provider UUID in `requires`, resolves that namespaced contract through `ctx`, and may verify it with `getModuleAssurance`. For example, a Whiteboard module can publish `nextcloud-whiteboard:openBoard` for a Jitsi module to consume. Extending a non-security-sensitive published flow also remains unprivileged. Only creating registrations outside the module's own namespace or extending protected security flows requires `privileged: true`.

Modules that publish legal, support, or other documents relevant before authentication can call `ctx.registerAuthFooterPlugin({ scriptUrl })`. Cognis loads enabled contributors on both login and registration pages. The browser module exports an asynchronous `listAuthFooterLinks()` function that consults its authoritative state and returns only links that are currently eligible, such as published documents. Cognis replaces that provider's previous link set with the returned descriptors and renders the result in the shared strip below the authentication panels; returning an empty array withdraws every link from that provider.

`bootstrapModule` may return a disposer, and a module may additionally export `teardownModule(ctx)`. On disable or uninstall, Cognis invokes those hooks and then removes every route, static directory, UI contribution, capability, created flow, and injected flow stage recorded by the scoped context. Modules must not retain timers, listeners, sockets, or other work after their disposer completes. Contributions made by importing core internals or by bypassing the supplied `ctx` cannot be tracked and are unsupported.

The manifest declares `uuid`, `id`, `name`, `version`, `publisher`, `class`, `coreApiVersion`, `summary`, `description`, `categories`, `recommended`, `license`, `homepage`, `repository`, `support`, `capabilities`, UUID-based `requires`, `entrypoints`, and `assets`. Asset paths are repository-relative. `assets.icon` identifies the square store icon, `assets.banner` identifies the detail hero, and `assets.screenshots` is an ordered gallery. Paths must remain inside the repository.

Localization keys must use periods as word separators: write `module.example.canvas.label`, not `module.example.canvas_label` or `module.example.canvas-label`. Period-delimited segments preserve predictable ownership, lookup, validation, and tooling behavior. The registered module ID remains the one intentional exception when its immutable ID already contains a hyphen.

### Sources and private repositories

Cognis includes the `https://github.com/Cognis-Labs-HQ` organization as an immutable trusted source by default. Administrators can add further GitHub organizations or GitLab groups from Modules in the user menu, then Module Sources. Cognis queries the provider API, treats each repository containing a valid root manifest as a module, and derives the catalog dynamically. A source can reference an optional PAT stored in the signed-in administrator's keyring; the source record stores only the keyring identifier. Use a least-privilege, read-only token with repository and metadata access. Tokens are supplied only for discovery and cloning and are never written to source configuration. Private repositories are excluded unless **Scan Private Repositories** is enabled; enabling it makes the PAT mandatory.

### GitHub PAT permissions for private scans

Prefer a fine-grained PAT and configure it as follows:

- **Resource owner:** select the GitHub organization configured as the Cognis module source.
- **Repository access:** select **All repositories**, or every private repository Cognis must discover and install.
- **Repository permissions:** set **Metadata** and **Contents** to **Read-only**. Metadata permits repository listing; Contents permits manifest discovery and authenticated Git cloning.
- **Organization permissions:** none are required. Cognis does not require **Administration**, **Members**, **Secrets**, or any Copilot permission.
- **Approval and SSO:** complete organization approval and SAML SSO authorization when required by organization policy.

For a personal access token (classic), grant the `repo` scope and authorize it for organization SSO when applicable. The token owner must already be allowed to access every selected private repository. Cognis rejects the source setting when the token cannot list a private repository and read its contents.

### Installation and safety

Installation clones the selected HTTPS repository without an interactive credential prompt, validates the downloaded root manifest and immutable UUID, and atomically moves it under the external module root. Before committing the checkout, Cognis verifies the package and manifest versions, route declaration, entry points, required artwork, safe repository-relative paths, and every declared SHA-256 file digest. A failed check removes the temporary checkout and leaves the installed version untouched. Updating repeats that operation for the same UUID. Uninstalling removes that UUID's checkout. Enabling remains a separate lifecycle action so code is not executed merely by browsing or installing it. Routes must be declared in `routes.json`; protected core prefixes cannot be claimed.

Repository owners should sign releases, pin dependencies, publish checksums in `files`, avoid generated secrets, and document all requested capabilities. Screenshots must not contain credentials or personal data. Cognis administrators remain responsible for reviewing third-party code before enabling it.

### Extraction checklist

Before moving a bundled module into its own repository, copy the module directory without changing its UUID, retain the readable ID, and preserve the root `manifest.json`, `package.json`, and `routes.json`. Make the repository URL, homepage, and support links point at the new project; keep manifest and package versions synchronized; ensure every declared entry point and asset exists with exact filename casing; regenerate `files` SHA-256 values after the final change; and run the module tests without relying on monorepo-relative imports. Runtime interaction with Cognis and other components must occur only through the bootstrap `ctx` capabilities and flows. Test enable-disable-enable and uninstall cycles so every contribution is demonstrably removable and repeatable.

### Store assets and tags

A module may declare `tags` alongside its broader `categories`; both participate in marketplace filtering. Store artwork lives at the repository root under `assets/`: provide `assets/icon.svg` or `assets/icon.png` for the catalog icon, and `assets/banner.svg`, `assets/banner.png`, or `assets/banner.jpg` for the detail-page hero. Declare the chosen paths as `assets.icon` and `assets.banner` in `manifest.json`. Optional gallery images are listed in `assets.screenshots`. Keep artwork free of secrets and personal data. Installed module detail pages select `README.<locale>.md` for the active UI language, then fall back to `README.en.md`, `README.md`, and the catalog description in that order. The optional root `README.md` compatibility alias is not required or checksum-validated; localized `README.<locale>.md` files remain eligible for the manifest integrity inventory.

Module artwork is fetched independently of code installation. Public GitHub assets stream from raw.githubusercontent.com; private and enterprise repositories use authenticated raw responses, while GitLab uses its raw-file endpoint. Cognis stores the bytes and media type in a separate content-hash cache and serves them through its authenticated catalog asset endpoint. This avoids GitHub Contents JSON inline-size limits. Empty assets and downloads above the existing 10 MiB bound are rejected. Logs identify source, repository, reference, path, transport, stage and HTTP status or failure reason. Refresh the catalog to retry failed retrieval. Missing icons retain the question-mark SVG; missing or undecodable banners display a localized Image Not Available message.

### Module preferences

A module can expose administrator-editable settings with `ui.preferences`. Each field declares a stable `key`, a localized `labelKey`, an optional `descriptionKey`, a `type` of `boolean`, `string`, or `number`, an optional matching `default`, a `password` type for concealed sensitive strings, and `required: true` when enablement must be blocked until the module-owned config endpoint returns a value; `ui.stringsBaseUrl` identifies the module-owned translations. When it is omitted, Cognis discovers the standard `ui/languages/<locale>/strings.xml` bundle automatically. Cognis renders this manifest contract in the installed-module detail view, polls `GET /api/v1/modules/<id>/config`, and submits changes with `PUT` to that same module-owned endpoint. The module validates, applies, and persists its operational configuration. It must not provide a second settings UI or use Cognis user preferences as configuration storage. Disabling or restarting a module must preserve this persisted configuration; only the uninstall flow may clear it. For each persisted password, the config response returns `<key>Configured: true` instead of the secret; Cognis renders `****`, treats the required field as satisfied, and submits an empty value when the mask is unchanged so the module preserves its stored password.

### Logging and user feedback

Server bootstrap and route code writes structured application logs through `ctx.log(level, message, meta)`. Cognis scopes each entry to the module before forwarding it to the Logging gateway. Browser code obtains `ui:log`, `ui:showToast`, and `ui:openErrorPopup` from `uiCtx.capabilities`; `ui:log` forwards authenticated entries to the server log, while the feedback capabilities use the host's themed and accessible UI. Modules must use these processes instead of relying on browser console output for operational failures or implementing their own notification surfaces.

### Release-channel refresh and browser clients

For an installed module, catalog refresh resolves the installed branch or release first and uses the repository default branch only when no channel is recorded. Modules consume gateway-owned browser data through declared `uiCtx.capabilities` clients; current host clients include `social:profileUiClient`, `social:messagesUiClient`, `files:uiClient`, and `share:uiClient`. Declare every required UI capability so Cognis loads its active provider before mounting the module route.

Marketplace installation fetches only the selected catalog commit with a shallow Git checkout. Each transfer has a fifteen-minute deadline and aborts if throughput remains below 1 KiB/s for two minutes. Transient failures receive at most three attempts; interrupted Git transfers restart rather than resume. The browser waits for the server job result and distinguishes an installation timeout from a confirmed connection-establishment timeout. Repository validation and manifest checksums still run before installation is committed.

Modules that persist configuration or content outside their checkout must export `uninstallModule(ctx, { deleteContent })` from the declared bootstrap entrypoint. The hook removes module-owned records and files only when `deleteContent` is true. After the hook succeeds, Cognis clears the persisted module configuration and deletes the checkout; a failed hook leaves both intact so the administrator can retry. Cognis invokes the hook before deleting the checkout, while capabilities remain available through `ctx.getCapability`.

Uninstall hooks resolve current public provider capabilities through the same boundary as bootstrap. Route-provided capabilities retain precedence; private system capabilities are not exposed. Providers needed for data removal must remain enabled while the dependent module is uninstalled.

### UI viewport ownership

Cognis owns the dashboard shell and every reusable component emitted by a host capability, including the structural `profile-capability-*` avatar classes. A module owns only descendants it renders inside the content root passed to `mount()`. Every module selector must end at a module-namespaced class or ID; a host theme selector may appear only as an ancestor of that module-owned target. Modules may pass their own layout classes to host renderers, but must not copy host stylesheets, redefine host capability classes, select shell elements, or mutate `document.body` or `document.head`. Application-wide behavior belongs in declared `uiCtx` capabilities or flows with removable hooks.

Browser modules obtain reusable host utilities and common CSS through the `ui:reuse` capability instead of importing host internals or copying styles. `importModule(path)` loads any production module below `src/ui/reuse/`; `loadStylesheet(path)` and `loadStylesheets(paths)` load files below `src/ui/styles/reuse/`; and `loadCommonStyles()` loads the complete immutable `stylesheets` catalog. `moduleUrl(path)` and `stylesheetUrl(path)` are available when another host capability accepts a URL. Paths are relative, must use the expected extension, and cannot traverse directories or select test files.

```js
const reuse = uiCtx.capabilities.get("ui:reuse");
const { createPageComposer } = await reuse.importModule(
    "page-composer/index.js",
);
await reuse.loadStylesheets(["layout.css", "page-sections.css"]);
```

Modules that must load a runtime script declare `ui:resourceLoader` and call its validated, reference-counted `loadScript({ id, src, globalName })` method. They must dispose the returned handle during unmount and must not append scripts directly to the document.

## Installation dependencies

External manifests may declare `hardDependencies` and `softDependencies` as arrays of module UUIDs or IDs. Hard dependencies are discouraged because administrators must install and enable them before installation can continue. Soft dependencies are optional selections in the installation dialog.

Disabled modules never import or execute their normal bootstrap. A module that must expose configuration while disabled declares `entrypoints.disabledApi`; that isolated file exports `registerDisabledApiRoutes(ctx)` and may register only routes explicitly marked `allowWhenDisabled`. It may also register module-owned configuration flows and hooks on those flows. These registrations are removed on refresh or failed setup; public capabilities remain unavailable until enablement.

Wait for active module requests before disposing their flows, and defer new module requests until reconciliation finishes, including failed activation. Consent checks retain a complete route and flow lifecycle while unrelated Study modules are enabled.

### Activation guidance

A module that contributes configuration surfaces elsewhere in Cognis can declare `ui.activationGuidance` instead of creating an empty module-settings form. The contract provides localized `titleKey`, optional `descriptionKey`, and ordered `steps`. Each step has a stable `id`, localized `labelKey`, optional `descriptionKey`, and optional `targets`. An adapter target uses `{ "kind": "adapter", "gatewayId": "<gateway>", "adapterId": "<adapter>" }`. After successful enablement, Cognis presents every step and offers to open Administration. A module can list multiple adapter targets without core knowing the provider names.

### Public capability lookup

External modules publish shared server capabilities with `ctx.contributePublicCapability(key, value)`. Module `ctx.getCapability`, `ctx.capabilities.get`, `has`, and `require` resolve public capabilities from the live system registry, including capabilities published after the consumer bootstraps. Private system capabilities remain outside this surface; `system:ctx` is never exposed to modules. Refresh requests execute sequentially so teardown and registration cannot overlap. Disabling a provider removes its contributions; re-enabling it republishes them. A failed refresh rejects its caller without blocking later refreshes.

### Template-based development

All new modules must start from [cognis-module-template](https://github.com/Cognis-Labs-HQ/cognis-module-template), with a new product UUID and replaced identity, repository, artwork and example content. Keep its AGENTS.md guidance and validation scripts. Follow the [contributor standard](/docs/standard): API handlers under `api/routes/<domain>/index.js`, CSS under `ui/styles/`, templates under `ui/templates/`, layer-owned tests, and release notes under `docs/changelog/`. Jitsi Meet proves this layout while retaining its public route URLs. Imports remain repository-local; use ctx for every foreign component. Never import core internals or a sibling implementation.

### Provider and resource lifecycle

Server registrations that return cleanup functions must be attached with `ctx.registerDisposer(dispose)`. Cognis runs these in reverse order on refresh, disable and failed bootstrap, including disabled configuration entrypoints. The public `system:health:contribute(id, callback)` and `auth:registerKeyringDataOwner(id, purge)` return owned disposers. Keyring cleanup resets only dependent data; it does not delete account identity or unrelated shared content.

Browser provider scripts export `mountProvider(scopedUiCtx)`, rather than contributing capabilities or binding listeners at import time. The scoped context owns capabilities, created flows and stage hooks; its AbortSignal cancels listeners, and a returned disposer releases other resources. Catalog reconciliation mounts a URL once even when both navbar and capability catalogs include it, and re-mounts cached scripts on re-enable. Use `ui:navbarLinks.contribute(id, { href, label, visible })` for host-owned navigation links. Route page scripts retain their own `mount`/`unmount` contract.

### Command and compatibility scope

Npm scripts run inside their repository; `npm --prefix <module-checkout> test` selects it explicitly. Installed module operations use `cognisctl modules:<module-id>:<action>`. These are distinct interfaces. Required capability declarations control availability; a reported tested provider version is diagnostic provenance, not an enforced minimum or tested ceiling. Declare actual dependencies and test the installed public contract; never advertise version enforcement that the code does not perform.

## Module identity diagnostics and browser provider ownership

An administrator installing a module with an ID already owned by another UUID receives a conflict containing `moduleId`, `installedModuleUuid` and `requestedModuleUuid`. The server and module lifecycle UI log these identities; non-administrators cannot access them. A matching ID and UUID remains a valid update. Do not change published UUIDs or overwrite a conflicting installation to bypass this check. Browser provider lifecycle ownership is shared through `ui:providerLifecycle`, so bundled and directly served loader instances reconcile one provider catalog and cannot mount the same provider twice.

## Scoped browser actions and authoritative administration

Browser providers obtain `ui:scopedActions` from their scoped ctx. Calling it with `(ctx, moduleId, actions)` registers an executable flow for each named action and returns the published action functions. Use these functions for administration reads and mutations; the host owns flow disposal and stale handles reject after teardown. Backend administrator privileges come from the current enabled account role, rather than caller-supplied role fields.

The host `mountWhenDirect` helper supplies `mount(root, { signal })` with an AbortSignal that ends on committed route navigation or page exit. Pages bind cleanup to that signal and check it after asynchronous initialization. Failed mounts abort owned resources; cancelled work cannot publish errors on the destination page. Markdown link labels separate escaped characters from ordinary characters to avoid ambiguous backtracking. CI requests read-only repository contents.

A cancelled direct page releases its shared loading token immediately, even while translation, provider or composer initialization is pending. Resource cleanup remains bound to the same host signal.

## Preserve module IDs in locale keys

Locale keys use `module.<manifest.id>.<feature>.<label>`. Keep a multiword module ID intact with its hyphens; for `terms-of-service`, use `module.terms-of-service.admin.title`. The suffix after the module ID uses lowercase period-delimited words. Manifest metadata, XML bundles and code references must use the same namespace.

Marketplace presentation keeps cached names, descriptions, categories and tags with their catalog locale bundle when an installed module uses a different namespace. Installed preferences retain their own locale URL; a fresh catalog discovery replaces the cached presentation.

### Keep legal footer links available

All browser clients use the footer registry owned by `ctx`, including separately loaded static and bundled scripts. Footer descriptors may request `target: "_blank"`; the renderer adds `noopener noreferrer`. Authentication providers supply translated labels and authentication contexts, while signed-in legal links explicitly belong to the application context. History and browser-cache restoration refresh published legal links without replacing core License or Changelogs links.

Core’s shared `createI18n` and `extendI18n` resolve missing or empty preferred-locale values from English XML per key across core, module and component bundles. Unresolved keys throw `missing_translation:<key>`. Modules supply their bundle URLs and use the host resolver; they do not implement their own fallback policy.

Core adds the installed module revision to module-owned UI asset URLs when registering contributions. Module scripts and locale files revalidate instead of inheriting the host release’s immutable cache lifetime. The service worker fetches module assets directly without cached fallback and rotates its asset caches. Updating a module changes its entry import identity, preventing stale scripts from requesting removed dependencies.

Standalone authentication callbacks use `navigateToDocument(path, { signal })` from `page-entry.js` for server document transitions. The helper validates same-origin HTTP(S) URLs without embedded credentials, honors the existing navigation guard, and prevents cancelled work from navigating. Dashboard navigation and missing-renderer behavior remain owned by the unchanged SPA router. `ui:log` skips anonymous requests and contains delivery failures; the logging endpoint still requires authentication.

External SSO callbacks require both `mountWhenDirect` and `navigateToDocument` from the host `page-entry.js`. Run `npm run check:ui-host` against the source checkout and `npm run check:ui-build` against built assets. After deployment, run `npm run check:ui-host -- --origin https://your-cognis-host.example` from a network that reaches the host. The remote check only reads public JavaScript, sends no credentials, and parses exports without executing downloaded code. Proxy-based environments can enable Node’s environment proxy support with `NODE_USE_ENV_PROXY=1`.

Deploy the matching Core host before updating callback modules, including the host UI assets and asset manifest; restart the serving process if it still uses the previous release. Refresh the callback page only after the public host-export check passes. A module version does not prove which host asset is being served. Registration authorization remains required for unknown external identities when public registration is disabled; returning mapped identities do not repeat account-creation authorization. HTTP 403 alone cannot identify the denial reason: inspect the response error code and registration continuation fields without sharing credentials or cookies.

## Component isolation and lifecycle

The API delegates extension namespaces through active gateway-owned policies; Study owns the language namespace rules. Library provider capabilities withdraw when the adapter or its Study dependencies are disabled, reject retained handles, and return when enabled. Study adapter bootstrap exposes `onAvailabilityChange(listener)` for lifecycle-bound contributions; failed bootstrap withdraws them.
