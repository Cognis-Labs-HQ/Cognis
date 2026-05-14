# Student Class Membership, Teacher Class Management & Study Hub

## Summary

Adds a student-facing My Classes page at `/my-classes` for viewing enrolled classes, requesting to join available classes, and leaving classes. Enhances the teacher's Classes page with language filtering, per-class student management, student search, and the ability to invite students and approve or reject join requests.

Replaces the Study section in User Settings with a dedicated study hub at `/study`. A one-time welcome screen at `/study/welcome` lets new users pick languages from those registered by language modules (e.g. Japanese). After completing the introduction, users land on the hub with a new composer-managed sub-navigation row directly below the global navigation. This row is distinct from the aside toolbar, is populated dynamically from language-module child UIs, and uses `/study/settings` for language settings. The language list comes from the study gateway directly (registered modules), not from a separate database table.

Additionally, role labels in the Users page and Dashboard are now fully localised.

## Changed Files / Components

- `src/adapters/study/classes/store.ts` — Added `class_memberships` table schema and store methods for student enrollment flows
- `src/adapters/study/classes/routes.ts` — Added student and teacher class management API endpoints
- `src/adapters/study/classes/index.ts` — Added `/my-classes` page route; wired `accountExists` capability
- `src/adapters/study/classes/ui/my-classes.html` — New student page HTML
- `src/adapters/study/classes/ui/my-classes.js` — New student page JavaScript
- `src/adapters/study/classes/ui/app.js` — Enhanced teacher view with language filter and student management
- `src/adapters/study/classes/ui/classes.css` — Added styles for new UI elements
- `src/gateways/study/gateway.ts` — Added language-module metadata tracking and enablement-aware registration metadata for Study language modules
- `src/gateways/study/bootstrap.ts` — Added `/study/welcome`, `/study`, and `/study/settings` page routes (shared HTML); added `GET /api/v1/study/registered-languages` endpoint; now filters languages and child routes by module enablement state
- `src/gateways/study/manifest.json` — Version bumped to 1.4.0
- `src/gateways/study/ui/classes-dashboard-element.js` — Added student dashboard element
- `src/gateways/study/ui/navbar.js` — Simplified to a plain nav link; popup handler removed; now fetches registered languages and greys out the link when none are available
- `src/gateways/study/ui/study.html` — HTML shell for `/study` and `/study/welcome`
- `src/gateways/study/ui/study.js` — Rewritten: one-time onboarding (`/study/welcome`), dashboard (`/study`), settings (`/study/settings`), module-driven sub-item navigation, and active-language dropdown in sub-navigation
- `src/gateways/study/ui/study.css` — Updated styles: module sub-navigation layout, active-language dropdown, and 50/50 split language settings panels
- `src/gateways/study/ui/languages/*/strings.xml` — Added `gateway.study.available_languages` and `gateway.study.active_languages` keys (all 4 languages)
- `src/ui/reuse/app-router.js` — Routes only `/study`, `/study/welcome`, and `/study/settings` to the study hub; module pages keep their own handlers
- `src/ui/reuse/page-composer.js` — Added a new composer sub-navigation slot rendered separately from the aside toolbar
- `src/ui/layouts/dashboard-layout.js` — Added `subNavigation` layout slot wiring
- `src/ui/public/templates/dashboard-layout.html` — Added the sub-navigation row placeholder below the global nav
- `src/gateways/study/ui/navbar.js` — Fetches registered languages on load; greys out the Study nav link (sets `aria-disabled`, removes `href`) when no language modules are registered on the instance
- `src/ui/styles/reuse/layout.css` — Added `.topnav a[aria-disabled="true"]` rule to visually dim and disable clicks on greyed-out nav items
- `src/ui/layouts/dashboard-layout.js` — Study shortcut points to `/study`
- `src/ui/styles/settings.css` — Removed dead study CSS classes
- `src/ui/languages/*/strings.xml` — Added `ui.reuse.role_*` keys; restored `ui.app.settings.study.*` (all 4 languages)
- `src/ui/app/users/index.js` — Role labels now use i18n keys
- `src/ui/app/dashboard/index.js` — Role display now uses i18n key
- `src/adapters/study/classes/package.json` — Bumped to 1.2.0
- `src/docs/versions.en.md` — Updated component versions
- `src/gateways/study/tests/bootstrap.test.ts` — Added gateway tests covering Japanese module enable/disable ingestion for registered languages and child routes

- `src/gateways/study/bootstrap.ts` — Replaced direct modules-table checks with Study-owned availability ingestion via `study:setLanguageModuleEnabled` capability
- `src/gateways/study/gateway.ts` — Added in-gateway language module availability state APIs used to gate nav language listings and child routes
- `src/api/server.ts` and `src/api/main.ts` — Wired module enable/disable lifecycle and startup state restore to push language-module availability into Study gateway
- `src/gateways/study/manifest.json` and `src/docs/versions.en.md` — Bumped Study gateway version to 1.5.0

## Commits

See branch `copilot/create-student-page-view` for commit history.
