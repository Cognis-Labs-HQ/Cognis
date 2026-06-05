# API Route Decoupling

## Standardised gateway route prefixes

Every gateway now owns its API routes under a dedicated `/api/v1/<gateway-id>/` prefix. Routes that did not match this convention have been renamed: notify gateway routes moved from `/api/v1/notifications/` to `/api/v1/notify/`, and social gateway routes moved from `/api/v1/profile/`, `/api/v1/messages/`, etc. to `/api/v1/social/`.

## Disabled gateway blocks all routes under its prefix

When a gateway is disabled, every HTTP request to any path under its owned prefix now returns a 503 response with `gateway_disabled` instead of falling through to 404.

## Disabled module returns module_disabled

When a module is disabled, requests to its registered routes now return a 503 response with `module_disabled` instead of falling through to 404.
