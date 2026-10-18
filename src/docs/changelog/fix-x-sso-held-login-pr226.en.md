# Callback Navigation

**Feature Branch:** fix-x-sso-held-login-pr226

## Preserve Authorization

`navigateTo` uses guarded same-origin document navigation when a destination has no SPA route, matching host link and browser-history behavior. Cross-origin destinations are rejected. `ui:log` resolves to a delivery boolean, skips anonymous requests, and contains HTTP or network delivery failures without dispatching access-denied or connection-recovery events. User-facing feedback remains the caller’s responsibility; the logging endpoint still requires authentication.

## Commits

- [72dfbc8](https://github.com/Cognis-Labs-HQ/Cognis/commit/72dfbc8c8f0b8b456ec5b59e5e2ad5e6652a2cad)
