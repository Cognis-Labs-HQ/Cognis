# Callback Navigation

**Feature Branch:** fix-x-sso-held-login-pr226

## Preserve Authorization

Standalone authentication callbacks use `navigateToDocument(path, { signal })` from `page-entry.js` for server document transitions. The helper validates same-origin HTTP(S) URLs without embedded credentials, honors the existing navigation guard, and prevents cancelled work from navigating. Dashboard navigation and missing-renderer behavior remain owned by the unchanged SPA router. `ui:log` skips anonymous requests and contains delivery failures; the logging endpoint still requires authentication.

## Commits

- [72dfbc8](https://github.com/Cognis-Labs-HQ/Cognis/commit/72dfbc8c8f0b8b456ec5b59e5e2ad5e6652a2cad)
- [9a9387b](https://github.com/Cognis-Labs-HQ/Cognis/commit/9a9387b199dfa3208b83a51aa66d3820a915297a)
- [aad15f0](https://github.com/Cognis-Labs-HQ/Cognis/commit/aad15f0cca5eaa3e93ac08eec5e27f72d8b95163)
