# Require Admin Control Rules

## Summary

Aligned Administration adapter controls so gateways announce adapter config and toggle endpoints, registration adapters accept empty config saves, and study adapters expose disable handling.

The Administration page now consumes announced adapter controls and re-synchronizes toggle state after refresh so the gateway slider matches the Disabled state when the last active adapter is turned off.

## Changed Files / Components

- `src/api/reuse/adapter-admin-controls.ts` — Added a shared API-layer helper for announcing adapter config, enable, disable, and optional test endpoints.
- `src/ui/app/administration/index.js` — Switched the Administration UI to use announced adapter controls and reapply gateway and adapter toggle state after page-composer refreshes.
- `src/gateways/registration/bootstrap.ts`, `src/gateways/study/bootstrap.ts`, `src/gateways/social/bootstrap.ts`, and `src/gateways/notify/bootstrap.ts` — Announced adapter admin controls in gateway adapter listings and added the missing registration/study admin route handling.
- `src/gateways/study/gateway.ts` — Added runtime study adapter enable/disable support and config saves that honor the enabled flag.
- `src/gateways/registration/tests/bootstrap.test.ts` and `src/gateways/study/tests/bootstrap.test.ts` — Added regression coverage for announced controls and the repaired adapter admin routes.
- `.github/copilot-instructions.md`, `src/gateways/{notify,registration,social,study}/manifest.json`, and `src/docs/versions.en.md` — Documented the adapter admin-control requirement and bumped the affected gateway versions.

## Commits

- https://github.com/le-firehawk/Cognis/commit/6b706ae
