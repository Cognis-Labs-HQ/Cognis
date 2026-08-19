# Restore installed module pages

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
