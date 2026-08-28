# Permanent Refresh Toast

**Feature Branch:** copilot/add-perma-toast-refresh-notification

## Summary

Added a permanent warning toast that prompts users to refresh the page when authenticated API connections fail due to server/network interruption patterns (network failures or retryable 5xx responses).

The page composer now configures a translated shared refresh prompt so the warning stays localized across dashboard pages.

## Changed Files / Components

- `src/ui/reuse/api-client.js` — Adds shared connection-recovery toast handling and prompt configuration.
- `src/ui/reuse/page-composer/init.js` — Registers the translated connection-recovery prompt at page bootstrap.
- `src/ui/languages/en/strings.xml`
- `src/ui/languages/de/strings.xml`
- `src/ui/languages/id/strings.xml`
- `src/ui/languages/ja/strings.xml`
- `src/ui/reuse/tests/api-client.test.js` — Adds regression coverage for permanent refresh toast behavior.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/bbee24a
- https://github.com/Cognis-Labs-HQ/Cognis/commit/3b7bded
