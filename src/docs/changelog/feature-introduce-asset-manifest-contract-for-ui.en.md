# Production Asset Revisions

**Feature Branch:** feature-introduce-asset-manifest-contract-for-ui

## Immutable versioned assets

UI assets now carry a deployment revision and use long-lived immutable caching, while mutable documents remain revalidated.

## Efficient validation

Unversioned assets support validators so current client copies return 304 without reading file contents.

## Deployment-specific asset revisions

Production container builds now embed the Git commit revision in asset URLs, preventing immutable browser and CDN caches from retaining an older application release.

## Safe and offline-ready asset delivery

Static directories are rejected before response headers are sent, and unversioned application dependencies remain available through the service worker when the network is unavailable.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/9545de212904420948eebc1b442bc6dd85bb5f79
