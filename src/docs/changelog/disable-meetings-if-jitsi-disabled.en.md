# Hide Administration → Meetings When Jitsi Meet Is Disabled

## Summary

- The Administration → Meetings section is now hidden when the Jitsi Meet module is disabled.
- Added `isEnabled` support to the `AdminSection` interface so any module-contributed admin section respects the module's enabled state.
- The `/api/v1/admin/sections` endpoint now filters out sections whose `isEnabled` predicate returns false.
- Module extension routes now inject `isEnabled` on `registerAdminSection`, consistent with how `registerNavbarPlugin`, `registerSpaRoute`, and `registerSettingsSection` already behave.

## Changed Files/Components

- `src/api/ui-registry.ts`
- `src/api/routes/gateways/index.ts`
- `src/modules/routes/module-extensions.ts`
- `src/api/tests/gateways/gateway-routes.test.ts`
- `src/api/package.json`
- `src/modules/package.json`
- `src/docs/versions.en.md`

## Commit Links

- https://github.com/le-firehawk/Cognis/commit/46e8aae8353774aef82d36f294e0cb566ba29cc3
