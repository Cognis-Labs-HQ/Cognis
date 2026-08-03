# Reliable App Asset Caching

## Deployment-specific asset revisions

Production container builds now embed the Git commit revision in asset URLs, preventing immutable browser and CDN caches from retaining an older application release.

## Safe and offline-ready asset delivery

Static directories are rejected before response headers are sent, and unversioned application dependencies remain available through the service worker when the network is unavailable.
