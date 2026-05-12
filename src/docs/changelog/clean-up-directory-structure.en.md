# PR Changelog — Clean Up Directory Structure

## Summary

Removed the legacy Japanese Study adapter under `src/adapters/study/japanese/`
to reduce duplicate and confusing structure now that Japanese study content is
provided by language modules.

Updated the Study gateway to stop hardcoding a legacy adapter skip and keep
adapter discovery/bootstrap generic.

Updated the profile page to replace inline hint text with an info tooltip for
post visibility guidance.

Moved gateway/adapter-specific HTML pages, JavaScript app modules, and CSS
stylesheets from `src/ui/` into their owning adapter and gateway directories,
following the component self-containment principle. Profile, messages, and
classes adapters now each serve their own `index.html`, `app.js`, and CSS from
a `ui/` subdirectory. Notification and study preferences modules are moved to
their respective gateway `ui/` directories with a `createSettingsSection` export.

Added a `SettingsSection` plugin system to `UIRegistry` so gateways can
dynamically register settings page sections. A new
`GET /api/v1/ui/settings-sections` endpoint exposes registered sections to the
client. The settings page now dynamically imports and mounts contributed
sections, removing hardcoded imports for notifications and study preferences.

## Changed Files/Components

- Study gateway:
    - `src/gateways/study/gateway.ts`
    - `src/gateways/study/bootstrap.ts`
    - `src/gateways/study/manifest.json`
- Removed legacy adapter:
    - `src/adapters/study/japanese/` (removed)
- Profile adapter:
    - `src/adapters/social/profile/index.ts`
    - `src/adapters/social/profile/ui/app.js` (moved from `src/ui/app/profile/index.js`)
    - `src/adapters/social/profile/ui/index.html` (moved from `src/ui/public/pages/profile.html`)
    - `src/adapters/social/profile/ui/profile.css` (moved from `src/ui/styles/profile.css`)
- Messages adapter:
    - `src/adapters/social/messages/index.ts`
    - `src/adapters/social/messages/ui/app.js` (moved from `src/ui/app/messages/index.js`)
    - `src/adapters/social/messages/ui/index.html` (moved from `src/ui/public/pages/messages.html`)
    - `src/adapters/social/messages/ui/messages.css` (moved from `src/ui/styles/messages.css`)
- Classes adapter:
    - `src/adapters/study/classes/index.ts`
    - `src/adapters/study/classes/ui/app.js` (moved from `src/ui/app/classes/index.js`)
    - `src/adapters/study/classes/ui/index.html` (moved from `src/ui/public/pages/classes.html`)
    - `src/adapters/study/classes/ui/classes.css` (moved from `src/ui/styles/classes.css`)
- Notify gateway:
    - `src/gateways/notify/bootstrap.ts`
    - `src/gateways/notify/ui/notification-prefs.js` (moved from `src/ui/app/settings/notification-prefs.js`)
- Study gateway:
    - `src/gateways/study/ui/study-prefs.js` (moved from `src/ui/app/settings/study-prefs.js`)
- UI infrastructure:
    - `src/api/ui-registry.ts`
    - `src/api/routes/ui/index.ts`
    - `src/ui/app/settings/index.js`
    - `src/ui/reuse/app-router.js`
- Tests:
    - `src/ui/tests/app-router.test.js`
    - `src/ui/tests/regression-followups.test.js`

## Commits

- [e349311](https://github.com/le-firehawk/Cognis/commit/e349311)
- [e81c254](https://github.com/le-firehawk/Cognis/commit/e81c254)
