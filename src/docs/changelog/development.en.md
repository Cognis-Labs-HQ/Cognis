# API Route Decoupling

**Feature Branch:** development

## Standardised gateway route prefixes

Every gateway now owns its API routes under a dedicated `/api/v1/<gateway-id>/` prefix. Routes that did not match this convention have been renamed: notify gateway routes moved from `/api/v1/notifications/` to `/api/v1/notify/`, and social gateway routes moved from `/api/v1/profile/`, `/api/v1/messages/`, etc. to `/api/v1/social/`.

## Disabled gateway blocks all routes under its prefix

When a gateway is disabled, every HTTP request to any path under its owned prefix now returns a 503 response with `gateway_disabled` instead of falling through to 404.

## Disabled module returns module_disabled

When a module is disabled, requests to its registered routes now return a 503 response with `module_disabled` instead of falling through to 404.

# Logging Coverage and Silent-Catch Fixes

## Server-side logging test coverage expanded

New test cases cover the logging stream route returning false for non-matching
paths and non-GET methods, emitting a `snapshot_error` event when the log file
does not yet exist, detecting log rotation via a file-size decrease and emitting
a `reset` event, and applying time range filters expressed in hours. Three
additional logger unit tests cover JSON console format output,
`writeConsoleLog` routing to stdout versus stderr, and `createLogEntry`
correctly omitting the meta field when no meaningful values are present.

## Silent catch blocks eliminated from crash popup and router

The two `catch(() => {})` handlers in `installRuntimeErrorHandlers` now log a
warning instead of swallowing errors that occur inside the popup open call. The
`readAuthSetupRequirement` catch block in the app router now logs the caught
network error. The per-language Study component fetch catch now logs the
language code and error before returning the empty fallback. The `startStream`
catch in the admin logs section now logs the connection failure before setting
the reconnect state, and the malformed SSE event catch logs parse errors
instead of silently discarding them.

## Commits

- [c2dd07a](https://github.com/Cognis-Labs-HQ/Cognis/commit/c2dd07a630b453a51f9793ab2855ab96150b058c)
