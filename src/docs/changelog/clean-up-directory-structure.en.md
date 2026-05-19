# PR Changelog — Clean Up...

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

---

## Pass 2 — Auth, Profile, and Notify UI Co-location

### Summary

Continued co-location of misplaced core files. Auth token utilities (`access-tokens.ts`, `guard.ts`) moved from `src/api/auth/` to `src/gateways/auth/`. The auth route handler and its test moved to `src/gateways/auth/routes/` and `src/gateways/auth/tests/`. The profile route handler and store interface moved from `src/api/routes/profile/` and `src/api/reuse/` into `src/adapters/social/profile/`. The verify-email page (HTML, JS, CSS) moved from `src/ui/` to `src/gateways/notify/ui/`; the notify gateway now owns and serves this page. The `src/modules/study-language-ja/` stub was removed and its manifest merged into the real Japanese module at `src/modules/study/languages/ja/`. Stale `src/docs/profile.*` documents deleted.

### Changed Files

- `src/gateways/auth/{access-tokens,guard}.ts` (moved from `src/api/auth/`)
- `src/gateways/auth/routes/index.ts` (moved from `src/api/routes/auth/index.ts`)
- `src/gateways/auth/tests/{auth-routes,access-token-guard}.test.ts` (moved from `src/api/tests/auth/`)
- `src/adapters/social/profile/profile-store.ts` (moved from `src/api/reuse/profile-store.ts`)
- `src/adapters/social/profile/routes/index.ts` (moved from `src/api/routes/profile/index.ts`)
- `src/adapters/social/profile/routes/tests/profile-routes.test.ts` (moved from `src/api/tests/profile/`)
- `src/gateways/notify/ui/verify-email.{html,js,css}` (moved from `src/ui/`)
- `src/gateways/notify/bootstrap.ts` (registers `GET /verify-email` page route)
- `src/modules/study/languages/ja/manifest.json` (added)
- `src/modules/study-language-ja/` (removed)
- `src/docs/profile.{de,en,id,ja}.md` (removed — superseded by adapter docs)
- All importers of the moved files updated (~30 files)

### Pass 2 Commits

- [34fc21c](https://github.com/le-firehawk/Cognis/commit/34fc21c)
- [47a2c1a](https://github.com/le-firehawk/Cognis/commit/47a2c1a)
- [7916873](https://github.com/le-firehawk/Cognis/commit/7916873)

---

## Pass 3 — Gateway Disable Guard, Japanese Module Fix, AI Instructions

### Summary

Fixed a regression where the Study gateway's settings section and navbar plugin remained visible in the UI after the gateway was disabled. Added `isEnabled` support to the `SettingsSection` interface, mirroring the existing predicate on `NavbarPlugin`, and updated the `GET /api/v1/ui/settings-sections` route to filter sections at response time.

Restored the Japanese language module in the administration modules list. The previous session removed the `src/modules/study-language-ja/` stub without extending the bootstrap scanner to find the real module manifest at `src/modules/study/languages/ja/`; the scanner now also reads that path.

Strengthened the AI contributor instructions: a new "Codebase cleanliness is paramount" section makes explicit that introducing non-conformant code is never acceptable and that all review feedback pointing to violations must be acted on.

### Changed Files

- `.github/copilot-instructions.md` — Added codebase cleanliness mandate.
- `src/api/ui-registry.ts` — `isEnabled` added to `SettingsSection`.
- `src/api/routes/ui/index.ts` — Settings-sections response filtered by `isEnabled`.
- `src/gateways/study/bootstrap.ts` — Settings section and navbar plugin gated by `isEnabled` predicate.
- `src/api/main.ts` — Bootstrap also scans `study/languages/` for language module manifests.
- `src/api/tests/ui/ui-routes.test.ts` — Three new tests for the settings-sections endpoint.

### Pass 3 Commits

- [f4aa63b](https://github.com/le-firehawk/Cognis/commit/f4aa63b)
