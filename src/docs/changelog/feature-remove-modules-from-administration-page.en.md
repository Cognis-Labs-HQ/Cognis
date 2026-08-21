# Module Marketplace

## Clear release-channel state

Release-channel choices now use neutral controls with an unmistakable selected state. Module details show the installed channel and its actual manifest version together, while updated modules display a restart warning until the Cognis container restarts and activates every injected route.

## Consistent module action menus

Installed-module details now use the shared anchored hamburger menu for advanced actions, matching the appearance and interaction of action menus elsewhere in Cognis.

## A dedicated app store

Modules now have a separate Administration page with installed, available, recommended, and category views plus configurable GitHub and GitLab sources.

## External repository support

Administrators can discover public or private repositories with optional keyring-protected PATs, and Cognis validates manifests and immutable UUIDs during installation.

## UUID dependencies

All component manifests now retain readable names and IDs while using stable UUIDs for dependency declarations.

## Reliable marketplace controls

Module cards, filters, source settings, and lifecycle controls now update the marketplace content immediately without resetting the surrounding page layout. Module details retain the store navigation, and consistently sized cards keep descriptions and lifecycle actions aligned.

External checkouts now pass a repository-readiness gate covering root package and route contracts, declared entry points and artwork, safe paths, and optional file checksums before an install can replace the active checkout.

Installed repositories are now discovered as complete runtime components. Their bootstrap entrypoint can contribute routes, UI, documentation, changelogs, capabilities, and flow stages through a tracked `ctx` scope; disabling or uninstalling invokes teardown and removes every tracked contribution.

Jitsi Meet has been removed from the bundled source tree and is now expected to arrive through the marketplace. Cognis Labs HQ on GitHub is always present as an immutable trusted module source.

## Skip invalid repositories

The Module Marketplace now ignores repositories that do not provide a complete, valid module manifest. One unrelated repository or an unavailable source can no longer prevent the Modules page from loading.

## Fall back from missing icons

Module cards now replace unavailable remote artwork with a theme-aware question-mark icon without opening the runtime error popup.

## Refresh module sources

The Modules page now provides a Refresh control beside Module Sources to re-query every configured provider and rebuild the visible catalog.

## Manage and discover sources progressively

Module Sources now opens as a dedicated list-and-editor manager. The trusted default organization remains visible and read-only, while custom sources can be added, edited, or removed. The Modules page renders immediately with known modules and adds discoveries independently as each configured source responds.

## Select branches and detect updates

Marketplace details now list every repository branch and select the repository default automatically. Installs record the chosen branch and commit, allowing module cards and details to offer an Update action whenever that branch advances.

## Serve marketplace artwork safely

Marketplace artwork is now fetched by the server and exposed through unguessable same-origin URLs. Missing artwork uses the bundled question-mark icon without weakening the Content Security Policy.

## Curate recommended modules

Recommended status now comes from an administrator-configurable published UUID list rather than module manifests. Marketplace settings now contain both recommendation and source configuration.

## Complete module installation

Installed modules are imported into the runtime immediately and remain disabled until an administrator activates them. Marketplace images load through public, unguessable same-origin asset URLs.

## Refine marketplace details

Licenses are displayed separately from tags, details use the full results width, and compact SVG controls replace text-heavy back and refresh actions.

## Separate installation from activation

Installing a module now leaves it disabled until an administrator explicitly enables it. Enabling or disabling a module refreshes browser navbar plugins immediately so newly registered navigation contributions appear without a page reload.

## Theme marketplace controls

Back and refresh controls now use dedicated light and dark SVG assets selected by the active dashboard theme.

## Keep discovered modules available

Marketplace manifests are cached per configured source. Uninstalling a module returns it to Available immediately, temporary source failures retain the cached entry, and a module disappears only after every configured source successfully confirms it is absent.

## Keep core out of modules

Cognis Core is no longer returned by the module administration list because the platform core is not an installable module.

## Verify declared licenses

License metadata is displayed only when a recognized license file exists at the repository root. Installation validation rejects declared license metadata without that repository evidence.

## Allow module installation time

Marketplace installs now use a two-minute request window so cloning and validating larger repositories such as Jitsi Meet does not fail at the generic thirty-second API timeout.

## Show all modules first

The module status filter now includes All and selects it by default, presenting installed, available, and recommended modules together when the page opens.

## Install releases with responsive feedback

Module discovery now includes repository tags alongside branches, while the detail selector still defaults to the repository's default branch. Lifecycle buttons show an in-button progress spinner, and module installation uses a bounded two-minute request window suitable for repositories within the supported size.

## Consolidate marketplace settings

Module Sources now lives solely as a dedicated section of the marketplace settings popup. Detail metadata separates provider and version from category tags, and the settings control now has light- and dark-theme artwork.

## Test modules before activation

Enabling a module now executes every standard JavaScript and TypeScript test supplied by its checkout before changing runtime state. Any failing or timed-out test rejects activation and reports the module test failure.

## Include external modules in the core test command

The root `npm test` runner now discovers tests under both the Cognis source tree and the configured external-module checkout root, including checkouts stored outside the repository through `COGNIS_EXTERNAL_MODULES_ROOT`.

## Restore the marketplace catalog immediately

The Modules page now hydrates from the persisted per-source catalog before background discovery begins, so known modules remain visible across navigation and server restarts. Repository refreshes update successful candidates independently and retain cached entries whenever an individual probe is inconclusive.

## Restore Jitsi Meet installation

Installation now accepts catalogs written before release-tag metadata was introduced. This removes the missing `releases` crash that regressed Jitsi Meet installation, while independent repository probing prevents unrelated organization repositories from hiding Jitsi Meet.

## Keep installation errors local

Expected module installation failures no longer trigger the global connection-interrupted recovery state or permanent toast; the marketplace action continues to report its own failure.

## Publish module lifecycle changes immediately

Completed install, enable, disable, update, and uninstall operations now update the marketplace immediately, publish a structured lifecycle event, refresh navbar registrations, and reconcile against authoritative server state without requiring a page reload. The detail-view version selector also follows the active theme.

## Keep module actions synchronized

Module lifecycle progress is now stored by module UUID rather than only on the clicked DOM node, preserving disabled controls and the spinner while moving between cards and details. Successful operations immediately switch to the next valid controls. The release selector no longer applies the conflicting light-mode class, and failed installs now return and display the precise server error while recording structured server and browser logs.

## Make marketplace installation resilient and release-aware

Module installs now run as polled background jobs so reverse proxies cannot turn a healthy clone into a 504. Cognis refreshes configured sources at server startup, compares manifest versions rather than code-only commit changes, supports switching release channels, confirms downgrades, and offers a force-update advanced action.

## Add marketplace media galleries and theme-safe controls

A module repository may provide a root `media/` directory of supported images and videos. The detail view renders those assets in a horizontal gallery, and its native release-channel selector now supplies explicit theme colors without conflicting select classes.

## Retry interrupted module downloads

Module installation now forces Git's more broadly compatible HTTP/1.1 transport and retries transient clone failures such as connection resets, timeouts, DNS failures, and interrupted TLS transfers. Every attempt starts with a clean staging directory, while permanent repository or validation failures still stop immediately and retain their exact diagnostic.

## Diagnose GitHub timeouts

Module downloads now stop a stalled GitHub clone attempt after thirty seconds, retry transient failures, and record the known container-network MTU cause in structured server logs. Administrators receive a focused toast that recommends checking the host or Docker network MTU instead of Cognis overriding deployment networking.

## Complete external module loading

The external-module bootstrap context now ingests every supported HTTP method, navbar and SPA route registrations, settings, administration, page, authentication-typing, static-resource, flow, logging, and scoped capability contributions. External meeting providers can therefore register navigation and routes through the same removable contracts as bundled components.

## Align module detail controls

The advanced hamburger menu now shares the top navigation row with the Back control in module details, leaving install and lifecycle actions in their own action row.

## Persist installed modules and artwork

Docker deployments now store external modules in a dedicated named volume mounted at the configured external-module root, so rebuilding the application container preserves installed modules. Marketplace reconciliation also retains catalog-proxied icon and banner URLs when installed manifest state is merged, preventing artwork from disappearing until a page refresh.

## Preserve activation during force updates

Force Update now temporarily disables an active module before replacing its checkout and re-enables it afterward. If the download or validation fails, Cognis still re-enables the existing checkout so a failed forced update does not leave the module unexpectedly disabled.

## Change release channels deliberately

Installed modules now move release-channel selection into the advanced menu. Administrators choose from a scrollable button list and confirm before Cognis automatically installs that channel. Lifecycle buttons show Installing, Upgrading, Downgrading, or Changing Release Channel with the loading indicator during work, then settle on Installed after success.

## Load external module UI routes from their installation directory

Installed modules are now resolved by their stable UUID in the external module directory. Their declared pages and navigation contributions load automatically on startup instead of being looked up under the bundled module path.

## Finish module bootstrap before serving requests

Cognis now waits for persisted module state restoration and module bootstrap to finish before accepting a request. External module scripts and styles are therefore registered before their pages request them.

## Provide authentication capabilities to modules

The authentication gateway now publishes its request authentication and role-access functions through the capability bus. External modules can bootstrap their protected API routes without importing gateway internals, allowing their UI assets and navigation registrations to remain active.

## Load only declared UI capabilities

Modules can declare `requiresCapabilities` in their manifest. Before mounting a module route, Cognis imports only the registered provider scripts for its declared `ui:*` capabilities, ensuring required UI services are ready without granting unrelated integrations.

## Inspect and document capabilities

Owners can list all registered capability IDs through `GET /api/v1/system/capabilities` or `cognisctl system:capabilities`. Module, Authentication gateway, and Profile adapter documentation now records requirement declarations and the capabilities each provider contributes.

## Show release version direction

Installed module cards and detail views now place the selected channel's different version beneath the current version. Upgrades use an upward arrow, while an uncommon channel downgrade uses a downward arrow in a light orange pill.

## Keep module details stable

Opening or updating a module detail view now preserves the page position. Every displayed version uses a `v` prefix, and updating an enabled module performs the disable, install, and re-enable sequence in one action.

## Stabilize module detail controls

Module detail pages now use router-backed UUID deep links while remaining inside the page composer. Lifecycle refreshes keep the visible button assortment stable, including while an enabled module is temporarily disabled for an upgrade.

## Bootstrap direct module pages once

Direct loads of external module SPA routes now run through a core entrypoint that imports declared capability providers before the module route. Provider and route URLs use the same asset version as router navigation, preventing intermittent missing capabilities and duplicate navbar contributions.

## Prepare bundled modules for extraction

Analytics and Nextcloud Whiteboard are now self-contained external-module repositories with dedicated repository metadata, licenses, READMEs, complete integrity inventories, translated distribution guidance, UUID dependencies, and explicit capability requirements.

## Improve module screenshot browsing

Module detail screenshots now stay within a bounded carousel with previous and next controls, faded adjacent previews, animated transitions, and automatic rotation. Manifests marked with the optional `template: true` field are excluded from marketplace results and direct detail views.

## Enforce unique marketplace modules

Analytics and Nextcloud Whiteboard have moved to their dedicated repositories and are no longer bundled. Marketplace discovery now accepts the first repository for each module UUID, logs and rejects later duplicates, and refreshes presentation metadata from the accepted repository while preserving installed lifecycle state.

## Ignore gateway infrastructure directories

Gateway auto-discovery now bootstraps only directories that contain a gateway manifest, preventing the `gateways/reuse` infrastructure directory from being imported as a gateway in production builds.

## Clarify module lifecycle feedback

Module disable operations are now warning-level events and external-module deletion is logged explicitly. Marketplace refresh actions emit one completion toast per click, while modules remain visible unless their manifest explicitly sets `template` to `true`.

## Recommend Cognis HQ modules

The built-in recommendation list now includes the published Jitsi Meet, Nextcloud Whiteboard, and Analytics module UUIDs from the Cognis Labs HQ organization.

## Expand module lifecycle logging

Module source additions, updates, deletions, scans, and scan result counts are now logged with appropriate severity, while validation and enable failures are recorded as errors. Marketplace image discovery also falls back to a matching PNG or other supported image when a repository manifest names a missing extension, restoring Jitsi Meet artwork while its manifest still points at absent SVG files.

## Prevent module image flashes

Module cards and detail media now remain hidden until each refreshed image has decoded enough to report valid dimensions. Fixed icon dimensions also reserve card space before loading, preventing raw or oversized module artwork from flashing during marketplace refreshes.

## Retain modules through inconclusive scans

Marketplace scans no longer treat an empty repository response, temporary missing manifest, invalid transient response, or source request failure as proof that a previously discovered module was deleted. Cached entries remain visible until their source is explicitly removed, and warning logs identify failed scans and retained module counts.

## Safer, efficient module discovery

Concentrated marketplace refreshes into one authenticated scan, added GitHub user-token support for the trusted source, restored dependency and acknowledgement checks before external code runs, and made GitHub Enterprise manifest requests use the configured API.

## Finish direct module loading

Direct Modules page loads now always release their tracked loading task after the page composer finishes or fails, preventing the loading wheel from remaining visible after a browser refresh.

## Persist and throttle scans

Marketplace catalog data remains the first source of module results after server restarts. Automatic page-load and startup scans no longer consume provider quotas, and source scan attempts are persisted with a one-hour interval so repeated refreshes reuse the on-disk catalog.

## Correct source cache authority

The built-in Cognis Labs HQ source now accepts PAT updates while keeping its identity fields locked. Duplicate module UUIDs resolve to the Cognis source, and marketplace catalogs, scan metadata, and assets are stored under the configured module directory at .cache.

## Apply GitHub credentials now

Configured PAT fields display a masked value without revealing the secret. Saving a new credential clears that source scan cooldown, so the next marketplace request immediately uses the new GitHub authorization instead of returning a prior unauthenticated result.

## Validate provider tokens

New marketplace PATs are checked against their configured provider namespace before storage. Invalid, unauthorized, unavailable, or insufficiently scoped credentials produce a localized warning toast and keep the source editor open for correction.

## Retain PAT configuration

Marketplace credential identifiers are now mirrored into the module directory cache. The built-in Cognis source restores its configured PAT marker after a server or container restart without storing the PAT itself outside the user keyring.

## Reference PAT permissions

Credential warnings are now concise in the UI. Server logs identify the exact validation issue and list the required GitHub fine-grained permissions (repository access, Metadata read, Contents read), classic repo scope for private repositories, organization SSO authorization, and official documentation references.

## Stabilize release changes

Release channel, upgrade, and downgrade installs now persist their selected branch, commit, and version before restart. Restart warnings are raised only for previously enabled modules, affected modules reject further lifecycle actions until restart, and no-op or cancelled channel changes do not collide with later actions.

## Keep module details stable

Module detail actions now use the composer floating menu, while the status and category navigation uses the balanced scrollable side toolbar. Detail selection survives refreshes, lifecycle events, and toasts; only explicit navigation leaves the detail view.

## Align module actions

Floating module actions now share a consistent height and vertical alignment, including the back control. The advanced hamburger remains in the detail header so its popup anchors predictably, and lightweight action refreshes avoid redrawing the entire module card for unrelated clicks.

## Map module actions clearly

Module card actions now wrap into readable grid columns so Installed, Upgrade or Downgrade, Enable, and Uninstall labels remain attached to distinct controls. Enabling a module now activates and persists its disabled gateway dependencies, while genuinely missing dependencies return a specific actionable response instead of a generic 400 error.

## Refresh release-channel versions

An explicit catalog refresh now bypasses the normal provider scan cooldown and re-reads every branch manifest. If a selected branch catches up to the installed version, Cognis immediately removes the stale downgrade action. Actual downgrades now run the selected branch installation and report Downgrading and Module downgraded separately from upgrades.

## Install the selected downgrade revision

Downgrades now install the exact commit advertised by the refreshed catalog even if the branch advances before the install begins. The downgrade indicator has a dedicated dark theme, and module detail headers receive an opaque backing so banner artwork cannot show through the sticky application header.

## Resolve branch versions by commit

Marketplace discovery now reads each branch and release manifest through its immutable provider commit SHA instead of the mutable branch name. This avoids stale GitHub Contents API or intermediary cache responses and makes the catalog version, displayed update direction, and installed revision agree with the branch commit returned by the provider.

## Validate module dependencies before installation

Module manifests may now declare required core components by stable UUID or legacy ID. Cognis validates the authoritative manifest from the checked-out repository before replacing an installed module; installation fails with a specific error when a referenced component is missing or disabled, while active UUID dependencies install normally.

## Resolve adapter UUID dependencies

Jitsi Meet and Nextcloud Whiteboard correctly require the Social Profile adapter UUID, while Jitsi also requires the Social Messages adapter UUID. Installation now auto-discovers adapter manifests and resolves these UUIDs through their owning gateway, accepting them when that gateway is active and rejecting them when it is disabled or absent.

## Resolve enablement adapter dependencies

Module enablement now uses the same discovered core-component catalog as installation. Adapter UUID requirements such as Social Profile and Social Messages resolve to their owning Social gateway instead of being incorrectly reported as unavailable gateways.

## Respect intentionally disabled dependencies

Enabling a module no longer activates disabled gateways to satisfy its manifest. Cognis leaves the dependency disabled, rejects enablement, and returns the human-readable component name—such as Profile Adapter or File Gateway—so the Modules page can toast a clear corrective message.

## Fill module card actions

Module card action buttons now divide the full available row evenly. Cards with one, two, or three actions no longer leave unused button-sized gaps or wrap a lone action onto another row.

## Stabilize module SPA navigation

Module-provided SPA pages now preserve authenticated sessions when a module endpoint alone returns an authorization error; Cognis verifies the account session before treating it as expired. The Profile availability menu also remounts idempotently after dashboard shell refreshes and waits for its stylesheet, preventing missing or duplicated presence controls. The Modules navigation toolbar now grows to its natural height without its own vertical scrollbar, while overflowing main content scrolls within the matching content panel.

## Correct Modules heading and pointer setup

The Modules content card now keeps the stable Modules heading while status filters remain in navigation. Shared pointer tracking now imports its CTX capability bus explicitly, preventing module-provided pages from failing during direct mounts.

## Remove bundled language modules

Cognis English and Cognis Japanese now install exclusively from their standalone marketplace repositories. The bundled module workspace was removed, and runtime discovery, UI routing, integrity checks, CLI plugins, and Study language registration now consume only UUID-addressed installations under `COGNIS_EXTERNAL_MODULES_ROOT`. Shared Study navigation assets are now owned by the Study gateway.

## Use the standard Modules navigation styling

The Modules side navigation now relies entirely on the page composer's established toolbar layout, spacing, active state, responsive behavior, and scrolling defaults instead of applying page-specific overrides.

## Module preferences

Modules can declare administrator-editable boolean, text, and numeric preferences under `ui.preferences`. The installed-module detail view shows Settings only when such fields exist. Values are filtered to declared keys and persisted per administrator through the Cognis preference store.

## Safer lifecycle operations

External enablement now requires acknowledgement before module tests run, and uninstall accepts only canonical UUID install paths. Successful marketplace scans remove withdrawn repositories while inconclusive repository refreshes retain their last known entry.

## Organize module loader internals

All remaining Core module lifecycle and test-runner services now live together under `services/module-loader/`, with their tests mirroring that structure. External-module and Study language framework documentation is now comprehensive and structurally synchronized in every supported language.

## Keep Modules navigation compact

The Modules page now enables the page composer’s sub-page navigation layout, keeping its side menu only as wide as its navigation content requires and preserving the remaining width for module results.

## Secure marketplace loading

The Modules page now suppresses its direct-load mount during router imports and resolves repository credentials through the keyring, allowing locked vaults to be unlocked before private discovery or installation. GitHub repository files and presentation assets now use each source’s configured API host, including GitHub Enterprise.

## Compact navigation and dependency names

The Modules page side menu now sizes dynamically to its longest item, matching the Documentation navigation rather than using a fixed width. Administration resolves UUID-only component dependencies to the names of installed gateways, adapters, and bundled or external modules, while preserving links to the resolved component. Status and category filters visibly identify every active selection, and administrators can combine multiple categories to include modules matching any selected tag.

## Harden runtime module activation

External module bootstrap now times out safely, failed modules are disabled, declared server capabilities are validated before activation, and SPA routes cannot load capabilities from inactive providers. Study language descriptors refresh after module updates. Timed-out bootstraps are also prevented from registering routes or capabilities after their deadline.

## Open module settings quickly

Installed modules that declare administrator-editable preferences now show a themed SVG settings control immediately to the right of the advanced-options menu. The control opens the existing configuration popup so values can be modified and persisted.

## Resolve every component dependency

Gateway bootstrap now preserves manifest UUID metadata even for components with no dependencies, so Administration resolves every UUID to its component name and link. Adapter links expand their owning gateway and scroll to the adapter, module links open the module detail, and repository checks enforce UUID-only manifest dependencies.

## Separate browser capability validation

Module enablement now validates server and browser capabilities through their owning runtime contexts. Browser-only `ui:` requirements are resolved against active UI registry providers during enablement and again before the SPA route mounts, rather than being bypassed or looked up in the server context.

## Stabilize module configuration fields

Module configuration popups now use consistent full-width field geometry and aligned boolean controls. Every declared field description is presented through the reusable information popup beside its label instead of changing the form’s height or input alignment.

## Keep availability controls singular

The profile adapter now claims the availability menu slot synchronously before loading styles, translations, or templates. Concurrent navbar plugin instances reuse that slot, remove stale duplicates, and release a failed claim for retry, preventing duplicate availability dropdowns after module or SPA refreshes.

## Apply module settings deliberately

Module settings now focus the first form control instead of opening its descriptor and show success feedback only after Save completes. Cognis renders manifest-declared fields, loads their values from the module-owned `GET /api/v1/modules/<id>/config` endpoint, and writes changes with `PUT` to that endpoint so the module remains the sole authority for validation, application, and persistence.

## Use module-owned configuration endpoints

Cognis now renders fields declared by module manifests while loading and saving values through each module’s own `GET` and `PUT` configuration endpoint. Modules remain responsible for validating, applying, and persisting their operational settings; Cognis no longer maintains a parallel preference-backed configuration.

## Give modules host logging and feedback processes

Module server contexts now write scoped entries to the application logger. Browser modules can use host capabilities for authenticated server logging, themed toasts, and runtime error popups instead of leaving operational failures only in the browser console.

## Refresh the installed release channel

Marketplace refresh now reads an installed module's active branch or release before the repository default, including its manifest, version, README, and presentation assets. Refresh preserves the home view, keeps an open detail view selected, and redraws its floating actions from the refreshed lifecycle state.

## Supply module UI clients and localized configuration

Profile, Messages, Files, and Share now publish their browser clients as active UI capabilities, so external routes can use gateway-owned data without racing navbar startup or calling gateway endpoints directly. Installed module language bundles remain available before bootstrap, and module settings resolve those strings while reading and writing the module-owned `/config` endpoint.

## Await all module browser clients

Direct and routed module mounts now wait for every active navbar capability provider before importing module UI, ensuring Files, Profile, Messages, Share, feedback, and any other declared host clients are ready. Documentation now has a hidden canonical structure and an automated heading-convention audit across every real non-changelog document.

## Load standalone and navbar capability providers together

The browser provider catalog now includes both navbar-backed clients and standalone host providers. Module routes therefore receive the Files client and feedback capabilities before mounting instead of relying on navbar discovery alone.

## Keep module settings single-mounted

The Modules page now aborts its previous direct-load interaction scope before an SPA remount. Opening a module detail route no longer leaves the home-view settings handler attached, so one settings click opens exactly one popup.

## Detect default-branch module updates

Catalog refresh now compares the installed commit and version with the selected branch head. New default-branch commits produce an Update action even without a version bump, while newer manifest versions produce the Upgrade action and available-version indicator.

## Stabilize capability and navbar refresh lifecycles

Authenticated hard refreshes now load capability providers through the session cookie before module mounts, while visual navbar plugins wait until the dashboard shell exists. Named browser capabilities such as `share:openPopup` resolve through the UI registry regardless of prefix, and Messages and Shares recover cleanly after early provider imports.

## Keep profile presence styled and module replacement live

The profile avatar capability now loads its own availability stylesheet before hydration, keeping module-owned presence cards constrained and restoring their status indicators. Module enablement refreshes installed runtime state before validating the replacement, so uninstalling, reinstalling, and enabling a module no longer requires a server restart.

## Retry browser capabilities after session authentication

Direct and SPA page mounts now reload host UI providers after the authentication flow establishes the browser session. Cookie-restored pages no longer continue into module mounts after an early unauthenticated provider request, and the navbar loader capability now invokes the navbar plugin loader rather than the provider-only loader.
