# Provider-neutral Focus Control

## Focus any declared collaboration surface

Added secure manifest contracts, staged flows, composer-owned controls, and synchronized overlay lifecycle support without coupling pages to providers.

## Focus any collaborative pane

Focusable composer elements now display a fullscreen icon, and active focus sessions can follow presenters or switch directly between declared collaborative surfaces such as meeting chat and a provider-created whiteboard.

## Movable meeting picture-in-picture

Focus providers can declare picture-in-picture mode, whose resizable meeting pane can be moved while other dashboard content remains available.

## Stable primary navigation

Primary navigation now keeps its application-defined order. Drag controls and user-specific ordering were removed to keep the page shell simple and reliable.

## External component pages

External modules can explicitly expose eligible SPA pages and other components can request them by immutable module UUID and stable route ID without importing provider code or guessing asset paths.

## Built-in pages use the broker

Cognis dashboard and Study pages now publish stable UUID-owned component page declarations, so built-in and external pages use the same request and Focus Control path.

## Authenticated module strings

Protected marketplace string bundles now use the authenticated API client, and module documentation clarifies that periods—not underscores or hyphens—separate words in localization keys.

## Recommendations stay current

Cached marketplace responses now retain Cognis recommendations after page refreshes, and the Modules page polls Cognis every fifteen seconds while mounted.

## Balanced module cards

The Modules grid now reserves more room for each card and arranges lifecycle actions in balanced rows, preventing controls from crowding or overlapping at common desktop widths.

## Navigation stays alphabetical

Dashboard navigation entries are sorted alphabetically whenever a module or another UI provider adds an entry, and the compact navigation drawer is redrawn from the updated order.

## Targeted component windows

Component-page discovery no longer mounts UI. An explicit, user-activated spawn capability opens a navigation-protected window inside the caller-owned stage and returns a discardable handle with automatic cleanup on abort and before every SPA route change.

## Stable user menu

The Cognis shell now reconciles user-menu contributions as providers load, removing duplicate destination entries caused by concurrent external-page and navbar refreshes.

## Validate and retain private repository scanning

Marketplace source settings now retain the private-repository scan preference after restarts. Enabling it validates that the configured PAT can list private repositories and read repository contents before saving, while catalog refreshes report missing credentials, denied private-repository access, and denied content access without discarding cached modules.

## Guard component-page entry evaluation

The component-page broker now evaluates provider entry modules through the same reference-counted import guard as SPA navigation. Entry modules that call `mountWhenDirect(mount)` cannot replace the host page during import; the guard is released before the broker mounts the component into its requested window.
