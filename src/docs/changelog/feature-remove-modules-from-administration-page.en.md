# Module Marketplace

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
