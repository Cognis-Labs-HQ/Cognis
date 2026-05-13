# Student Class Membership, Teacher Class Management & Study Hub

## Summary

Adds a student-facing My Classes page at `/my-classes` for viewing enrolled classes, requesting to join available classes, and leaving classes. Enhances the teacher's Classes page with language filtering, per-class student management, student search, and the ability to invite students and approve or reject join requests.

Replaces the Study section in User Settings with a dedicated study hub at `/study`. A one-time welcome screen at `/study/welcome` lets new users pick languages from those registered by language modules (e.g. Japanese). After completing the introduction, users land on the hub with a per-language sub-navigation toolbar, language-specific module links, and a settings cog that opens an inline language management table. The language list comes from the study gateway directly (registered modules), not from a separate database table.

Additionally, role labels in the Users page and Dashboard are now fully localised.

## Changed Files / Components

- `src/adapters/study/classes/store.ts` — Added `class_memberships` table schema and store methods for student enrollment flows
- `src/adapters/study/classes/routes.ts` — Added student and teacher class management API endpoints
- `src/adapters/study/classes/index.ts` — Added `/my-classes` page route; wired `accountExists` capability
- `src/adapters/study/classes/ui/my-classes.html` — New student page HTML
- `src/adapters/study/classes/ui/my-classes.js` — New student page JavaScript
- `src/adapters/study/classes/ui/app.js` — Enhanced teacher view with language filter and student management
- `src/adapters/study/classes/ui/classes.css` — Added styles for new UI elements
- `src/gateways/study/gateway.ts` — Added `listRegisteredLanguages()` to expose modules as language descriptors
- `src/gateways/study/bootstrap.ts` — Added `/study/welcome` + `/study` page routes (shared HTML); added `GET /api/v1/study/registered-languages` endpoint; version bumped to 1.3.0
- `src/gateways/study/manifest.json` — Version bumped to 1.3.0
- `src/gateways/study/ui/classes-dashboard-element.js` — Added student dashboard element
- `src/gateways/study/ui/navbar.js` — Simplified to a plain nav link; popup handler removed
- `src/gateways/study/ui/study.html` — HTML shell for `/study` and `/study/welcome`
- `src/gateways/study/ui/study.js` — Rewritten: welcome onboarding (full-width, `/study/welcome`), sub-nav hub (`/study`) with settings cog and language management table
- `src/gateways/study/ui/study.css` — Updated styles: full-height welcome, settings cog button, language settings table
- `src/gateways/study/ui/languages/*/strings.xml` — Added `gateway.study.language_settings` and `gateway.study.language` keys (all 4 languages)
- `src/ui/reuse/app-router.js` — Routes `/study/*` to the study hub
- `src/ui/layouts/dashboard-layout.js` — Study shortcut points to `/study`
- `src/ui/styles/settings.css` — Removed dead study CSS classes
- `src/ui/languages/*/strings.xml` — Added `ui.reuse.role_*` keys; restored `ui.app.settings.study.*` (all 4 languages)
- `src/ui/app/users/index.js` — Role labels now use i18n keys
- `src/ui/app/dashboard/index.js` — Role display now uses i18n key
- `src/adapters/study/classes/package.json` — Bumped to 1.2.0
- `src/docs/versions.en.md` — Updated component versions

## Commits

See branch `copilot/create-student-page-view` for commit history.
