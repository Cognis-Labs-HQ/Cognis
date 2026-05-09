# Social Gateway

## Overview

The Social Gateway is a thin coordinator that owns no concrete profile, post,
or messaging logic. Its responsibilities are:

1. Discover and bootstrap adapters under `src/adapters/social/<adapter-id>/`,
   mirroring the notify gateway's adapter discovery pattern.
2. Expose the contributed capabilities of those adapters (e.g.
   `social:profileStore`, `profile:createProfile`, `preferences:store`) on
   the shared capability store.
3. Provide a small `SocialAdapterBootstrapCtx` to each adapter, granting it
   the surface it needs to register routes, static assets, navbar plugins,
   and capabilities.

Removing the gateway disables every social adapter at once. Adding a new
social adapter is just placing a directory under `src/adapters/social/` with
a `package.json` whose `main` exports `bootstrapSocialAdapter`.

## Bundled adapters

- **Profile Adapter** (`src/adapters/social/profile/`) — owns profile, post,
  social-graph, file, and preferences logic. Keeps the same HTTP endpoints
  that previously lived in the profile gateway.
- **Messages Adapter** (`src/adapters/social/messages/`) — owns chatrooms
  and encrypted private messaging. See its own docs for the threat model.

Both adapters are independent. The messages adapter consumes
`social:profileStore` from the profile adapter via the capability store; it
does not import the profile adapter directly.
