# Production Asset Revisions
## Immutable versioned assets
UI assets now carry a deployment revision and use long-lived immutable caching, while mutable documents remain revalidated.
## Efficient validation
Unversioned assets support validators and streaming so current client copies return 304 without reading file contents.
