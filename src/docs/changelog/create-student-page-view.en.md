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
- `src/modules/study/languages/ja/components/hiragana-alphabet/ui/index.html` — Added global stylesheets (`page-builder.css`, `reuse/page-sections.css`, `study.css`) and full PWA meta boilerplate so the page renders correctly on hard refresh
- `src/modules/study/languages/ja/components/library/ui/index.html` — Same: added global stylesheets and PWA boilerplate; corrected `lang` attribute from `en` to `ja`
- `src/modules/study/languages/en/components/alphabet/ui/index.html` — Same: added global stylesheets and PWA boilerplate
- `src/ui/layouts/dashboard-layout.js` — Fresh-render and shell-reuse paths both add/remove the `.page-subnav` element rather than toggling a `hidden` attribute, matching the pattern used by the toolbar, footer, and header slots
- `src/ui/styles/reuse/layout.css` — `.site-header` is now `position: sticky; top: 0; z-index: 1200`, so the whole header (topbar + navrow + subnav) locks to the top of the viewport immediately on scroll; removed redundant `position: sticky`, `top`, and `z-index` declarations from `.global-navrow` and responsive overrides
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

- `src/gateways/study/ui/study.js` — Wrapped direct-load top-level mount call in try/catch so Study SPA import failures are logged gracefully
- `src/adapters/study/classes/ui/my-classes.js` — Wrapped direct-load top-level mount call in try/catch for resilient SPA imports
- `src/ui/reuse/app-router.js` — Clarified cleaned-path variable naming in route matching logic

- `src/gateways/study/ui/study.js` and `src/gateways/study/ui/study.css` — Removed the "Active Languages" label in study sub-navigation, render language options directly, and moved the settings cog to the right of language options
- `src/gateways/study/ui/study.js` and `src/gateways/study/ui/languages/*/strings.xml` — Added a warning confirmation popup before removing the final active learning language, then route to `/study/welcome` after confirmation
- `src/modules/study/languages/ja/index.ts` — Fronted Japanese module child routes at gateway-visible generic URLs (`/study/hiragana`, `/study/library`)
- `src/modules/study/languages/ja/components/*/ui/app.js` — Converted Japanese language module pages to exported SPA `mount()` entry points using `createPageComposer` and shared page structure
- `src/ui/reuse/app-router.js` — Added SPA route handling for `/study/hiragana` and `/study/library`
- `src/modules/study/languages/ja/{package.json,manifest.json}` and `src/docs/versions.en.md` — Bumped Cognis Japanese module version to `1.1.2`

- `src/ui/styles/reuse/layout.css` — Removed `flex: 1 0 auto` from `.workspace` so it sizes to its content rather than inflating to fill the viewport; applied `margin: auto auto 0` to `.global-footer` so the footer is pushed to the viewport bottom via auto top-margin in the flex column; updated `.page-subnav` background to use `var(--nav-bg)` directly (matching `.global-navrow`) and added `backdrop-filter: blur(8px)` so the bar remains fully opaque when content scrolls beneath it
- `src/ui/styles/reuse/layout.css` and `src/ui/layouts/dashboard-layout.js` — Reduced sub-navigation vertical padding, restored rounded corners on all edges, and added a scroll state for pages with sub-navigation that folds the primary nav row away after the user starts scrolling so the sub-navigation connects directly to the global topbar
- `src/ui/layouts/dashboard-layout.js`, `src/ui/styles/reuse/layout.css`, `src/gateways/study/ui/study.css`, and Study child-page sub-navigation files — Kept the global Study navbar item active on Study subpages, removed the resting gap/radius break between the primary navbar and Study sub-navigation, and restyled Study module links to match the global navbar while leaving the language-switcher buttons unchanged
- `src/adapters/study/classes/{store.ts,routes.ts,package.json}`, `src/modules/study/languages/{en,ja}/index.ts`, new language classroom UI files, Study language reuse assets, Study Library UI/store files, Study gateway language string files, docs, and Copilot instructions — Added per-language classroom pages with classroom seat visualization and teacher/student role behavior, introduced classroom layout/member management APIs, made admin Library access visible from Study sub-navigation regardless of selected language with language filter propagation, and expanded Study Library/Classroom documentation and guidance

- Follow-up polish: removed the extra Library language selector (Library now uses the currently selected Study language context), fixed missing English in Study child-page language options, moved Classroom to the end of Study sub-navigation ordering, added a shaded "No classes available" classroom empty state, and fixed profile dropdown clipping below the global navbar.

- Compliance and real-time updates pass: fixed user menu (profile dropdown) z-index so it renders above the page sub-navigation bar; corrected `hasLibraryModule` check to match on component `id` instead of a hardcoded URL so English Library appears correctly in sub-navigation without duplicating a global `/study/library` link; added `clearStudySubNavCache()` export to `study-sub-navigation.js` and `invalidateStudyChildComponentCache()` export to `app-router.js`, both called when the user saves language preferences so sub-navigation and SPA routes update immediately; fixed `classroom-page.js` and `library-page.js` to load study gateway i18n strings (via `componentStringBaseUrls`) so page titles, subtitles, and all translated labels are correctly resolved; added `subtitle` field to `pageContext` in all Study pages (hub, welcome, settings, alphabet, library, classroom) and new i18n keys in all four language files; added JSDoc module header to `classroom-page.js` per reuse-directory requirements; added module-level JSDoc to `library-store.ts`; added comprehensive tests for `LanguageLibraryStore` and structural tests for `study-sub-navigation.js`; updated AI instructions to require `subtitle` in `pageContext` for all new pages.

## Commits

See branch `copilot/create-student-page-view` for commit history.

- Migrated all English language data from hardcoded UI into the Library: added `data/characters/latin.json` with the 26 Latin letters (A–Z) for the English module; the Alphabet page now fetches characters from the Library API (`/api/v1/study/languages/en/library/characters`) instead of hardcoding them. Added English Library child component with admin CRUD UI, and created English Library API routes in `en/index.ts`. Promoted the generic language library store from `ja/library/reuse/library-store.ts` to `src/modules/study/languages/reuse/library-store.ts` as `LanguageLibraryStore`; both the English and Japanese modules now use this shared implementation. Created `src/modules/study/languages/reuse/library-page.js` with `mountStudyLibraryPage` — a shared function that replaces duplicated Library CRUD UI logic in both language modules' Library components. Removed duplicated Study sub-navigation CSS classes from component-specific stylesheet files (`alphabet.css`, `library.css`). Updated AI copilot instructions and `study-language-framework.en.md` to make clear that the Library is the single canonical data store for all language module content.
