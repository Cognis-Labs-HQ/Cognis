# Trusted Domains List

**Feature Branch:** copilot/implement-trusted-domains-list

## Summary

Added shared trusted-domain validation so the Administration security list now drives both email-domain checks and trusted external HTTP(S) broadcast redirects/links.

Broadcast redirect validation now accepts same-origin URLs and trusted domains, while UI and server checks use the same matching rules, including subdomains.

## Changed Files / Components

- `src/api/reuse/security-settings.ts` and `src/api/routes/system/index.ts` — Centralized security-settings parsing plus shared trusted-domain and trusted-URL validation.
- `src/gateways/registration/bootstrap.ts` — Reused the shared trusted-domain matcher for invite email validation.
- `src/gateways/notify/bootstrap.ts`, `src/gateways/notify/routes/notifications.ts`, and `src/gateways/notify/ui/*` — Allowed trusted external broadcast redirects and reused the shared checks in admin and runtime flows.
- `src/ui/reuse/trusted-domains.js`, `src/ui/app/administration/security.js`, and `src/ui/app/settings/general-prefs.js` — Added shared UI-side trusted-domain loading, cache invalidation, and matching for email and link checks.
- `src/api/tests/security-settings.test.ts`, `src/gateways/notify/routes/tests/notification-routes.test.ts`, and `src/ui/tests/trusted-domains.test.js` — Added coverage for trusted-domain normalization and URL validation behavior.
- `src/api/package.json`, `src/gateways/notify/manifest.json`, `src/gateways/registration/manifest.json`, and `src/docs/versions.en.md` — Bumped component versions for the API, Notification gateway, and Registration gateway.

## Commits

- [85294ff](https://github.com/Cognis-Labs-HQ/Cognis/commit/85294ff)
