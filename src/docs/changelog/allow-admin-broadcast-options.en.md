# Admin Broadcast Delivery

**Feature Branch:** copilot/allow-admin-broadcast-options

## Summary

Adds a new admin-configurable broadcast system under Notifications that supports two delivery modes: a top-of-page bar and a popup. Admins can define target roles, start and end dates, acknowledgement requirements, redirect behavior on closure, and enabled/disabled status.

The dashboard now loads a notify broadcast navbar plugin that fetches active broadcasts for the signed-in user role and renders them according to the configured mode.

## Changed Files / Components

- `src/gateways/notify/notification-store.ts` — Added broadcast persistence schema and per-user broadcast state tracking.
- `src/gateways/notify/routes/notifications.ts` — Added admin/user broadcast APIs for create/list, enable/disable, active retrieval, acknowledge, and dismiss.
- `src/gateways/notify/ui/admin-section.js` — Added administration UI to configure and manage broadcasts.
- `src/gateways/notify/ui/broadcast-navbar-plugin.js` — New dashboard plugin that displays active broadcasts as bar or popup.
- `src/gateways/notify/ui/broadcast.css` — Styles for broadcast top-bar presentation.
- `src/gateways/notify/ui/languages/*/strings.xml` — Added broadcast i18n keys in all supported languages.
- `src/gateways/notify/bootstrap.ts` — Registered broadcast navbar plugin and bumped gateway registry version.
- `src/gateways/notify/manifest.json` and `src/docs/versions.en.md` — Bumped Notification gateway version to `1.4.0`.
- `src/gateways/notify/routes/tests/notification-routes.test.ts` — Added route tests for new broadcast endpoints.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/e14cbfc
