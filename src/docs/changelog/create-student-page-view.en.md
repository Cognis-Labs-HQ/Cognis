# Student Class Membership & Teacher Class Management

## Summary

Adds a student-facing My Classes page at `/my-classes` for viewing enrolled classes, requesting to join available classes, and leaving classes. Enhances the teacher's Classes page with language filtering, per-class student management, student search, and the ability to invite students and approve or reject join requests.

Also replaces the Study section in User Settings with a dedicated `/study` hub page. The Study navbar button navigates directly to `/study`. The new page renders an animated welcome screen for new users and a language hub with links to registered study modules.

Additionally, role labels in the Users page and Dashboard are now fully localised.

## Changed Files / Components

- `src/adapters/study/classes/store.ts` — Added `class_memberships` table schema and store methods for student enrollment flows
- `src/adapters/study/classes/routes.ts` — Added student and teacher class management API endpoints
- `src/adapters/study/classes/index.ts` — Added `/my-classes` page route; wired `accountExists` capability
- `src/adapters/study/classes/ui/my-classes.html` — New student page HTML
- `src/adapters/study/classes/ui/my-classes.js` — New student page JavaScript
- `src/adapters/study/classes/ui/app.js` — Enhanced teacher view with language filter and student management
- `src/adapters/study/classes/ui/classes.css` — Added styles for new UI elements
- `src/gateways/study/ui/classes-dashboard-element.js` — Added student dashboard element
- `src/gateways/study/bootstrap.ts` — Removed settings section registration; added `/study` page route; version bumped to 1.3.0
- `src/gateways/study/manifest.json` — Version bumped to 1.3.0
- `src/gateways/study/ui/navbar.js` — Simplified to a plain nav link; popup handler removed
- `src/gateways/study/ui/study.html` — New HTML shell for the `/study` page
- `src/gateways/study/ui/study.js` — New study hub page module using `createPageComposer`
- `src/gateways/study/ui/study.css` — New CSS for the study hub and welcome screen
- `src/gateways/study/ui/languages/*/strings.xml` — Added `gateway.study.*` page strings (all 4 languages)
- `src/ui/reuse/app-router.js` — Added `/study` route
- `src/ui/layouts/dashboard-layout.js` — Updated study shortcut to point to `/study`
- `src/ui/styles/settings.css` — Removed dead study CSS classes
- `src/ui/languages/*/strings.xml` — Added `ui.reuse.role_*` keys; restored `ui.app.settings.study.*` (all 4 languages)
- `src/ui/app/users/index.js` — Role labels now use i18n keys
- `src/ui/app/dashboard/index.js` — Role display now uses i18n key
- `src/adapters/study/classes/package.json` — Bumped to 1.2.0
- `src/docs/versions.en.md` — Updated component versions

## Commits

See branch `copilot/create-student-page-view` for commit history.
