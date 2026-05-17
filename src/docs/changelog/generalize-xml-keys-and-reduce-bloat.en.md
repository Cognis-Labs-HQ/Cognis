# i18n String Cleanup

## Summary

Moved component-specific i18n keys out of the core language files and into per-component `languages/` directories. Added `loadComponentStrings` and `extendI18n` to the i18n layer so components can load their own strings without polluting the global namespace. Removed ~90 dead and misplaced keys from the core strings files.

## Changed Files and Components

- `src/ui/reuse/i18n.js` — added `loadComponentStrings`, `extendI18n`, and `componentStringBaseUrls` option
- `src/api/ui-registry.ts` — added `stringsBaseUrl` field to `AdminSection` interface
- `src/ui/app/administration/index.js` — updated `loadGatewaySection` to use `extendI18n`
- `src/adapters/notify/internal/ui/languages/*/strings.xml` — new component strings (en, de, ja, id)
- `src/gateways/notify/ui/languages/*/strings.xml` — new component strings (en, de, ja, id)
- `src/gateways/auth/ui/languages/*/strings.xml` — new component strings (en, de, ja, id)
- `src/gateways/registration/ui/languages/*/strings.xml` — new component strings (en, de, ja, id)
- `src/gateways/study/ui/languages/*/strings.xml` — new component strings (en, de, ja, id)
- `src/gateways/notify/bootstrap.ts` — added `stringsBaseUrl` to admin section registration
- `src/gateways/auth/bootstrap.ts` — added `registerAdminSection` with `stringsBaseUrl`
- `src/gateways/registration/bootstrap.ts` — added `stringsBaseUrl` to admin section registration
- `src/adapters/notify/internal/ui/navbar-plugin.js` — updated to use component string keys
- `src/gateways/notify/ui/admin-section.js` — updated to use component string keys
- `src/gateways/auth/ui/admin-section.js` — updated to use component string keys
- `src/gateways/registration/ui/admin-section.js` — updated to use component string keys
- `src/gateways/study/ui/navbar.js` — updated to use component string keys
- `src/ui/app/profile/index.js` — updated stat labels to use `ui.reuse.profile_preview.*`
- `src/ui/app/settings/index.js` — updated font heading key
- `src/ui/app/settings/study-prefs.js` — updated teacher application keys
- `src/ui/app/classes/index.js` — updated language label key
- `src/ui/app/users/index.js` — updated save_failed key to `ui.reuse.generic.save_failed`
- `src/ui/languages/*/strings.xml` — removed ~90 dead/moved keys, added `ui.reuse.generic.save_failed`

## Commits

- https://github.com/le-firehawk/Cognis/commit/8e82369
- https://github.com/le-firehawk/Cognis/commit/867e397
- https://github.com/le-firehawk/Cognis/commit/8ef54f9
- https://github.com/le-firehawk/Cognis/commit/f624f07
