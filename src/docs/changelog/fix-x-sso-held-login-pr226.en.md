# Callback Navigation

**Feature Branch:** fix-x-sso-held-login-pr226

## Preserve Authorization

Document navigation is opt-in: callers that own a server-rendered destination pass `documentNavigation: true` to `navigateTo`. Unknown SPA destinations and malformed URLs resolve to false, preserving caller recovery such as missing share-renderer feedback. Navigation guards and same-origin HTTP checks still apply, including when a guarded transition resumes. `ui:log` resolves to a delivery boolean, skips anonymous requests, and contains HTTP or network delivery failures without dispatching access-denied or connection-recovery events. User-facing feedback remains the caller’s responsibility; the logging endpoint still requires authentication.

## Commits

- [72dfbc8](https://github.com/Cognis-Labs-HQ/Cognis/commit/72dfbc8c8f0b8b456ec5b59e5e2ad5e6652a2cad)
