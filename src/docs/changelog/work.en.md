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
