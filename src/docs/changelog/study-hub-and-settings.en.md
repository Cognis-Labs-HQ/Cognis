# Study Hub Page and Settings Removal

## Summary

Replaces the Study section in User Settings with a dedicated `/study` page. The Study navbar button now navigates directly to `/study` instead of opening a popup. The new page renders an animated welcome/onboarding screen when no languages are selected, and a study hub showing each selected language with links to its registered modules once languages are chosen.

## Changed Files / Components

- `src/gateways/study/bootstrap.ts` — Removed settings section registration; added `/study` page route; bumped version to 1.3.0
- `src/gateways/study/manifest.json` — Bumped version to 1.3.0
- `src/gateways/study/ui/study-prefs.js` — Deleted (no longer referenced after settings removal)
- `src/gateways/study/ui/navbar.js` — Simplified to a plain nav link; removed popup click handler
- `src/gateways/study/ui/study.html` — New HTML shell for the `/study` page
- `src/gateways/study/ui/study.js` — New study hub page module using `createPageComposer`
- `src/gateways/study/ui/study.css` — New CSS for the study hub and welcome screen
- `src/ui/reuse/app-router.js` — Added `/study` route entry
- `src/ui/layouts/dashboard-layout.js` — Updated study shortcut to point to `/study`
- `src/ui/styles/settings.css` — Removed dead study CSS classes
- `src/ui/languages/*/strings.xml` — Replaced `ui.app.settings.study.*` keys with `ui.app.study.*` and added `ui.page.title.study` (all 4 languages)
- `src/docs/versions.en.md` — Updated Study Gateway version to 1.3.0

## Commits

- https://github.com/le-firehawk/Cognis/commit/1170b58
