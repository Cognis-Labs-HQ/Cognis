# SPA Router Check

## Summary

Completed a SPA consistency pass on page entrypoints by adding router coverage
for the Invite page and enforcing the `mount()` + direct-load guard pattern
across auth and invite pages.

Aligned login/register composer metadata with required `pageContext` title and
subtitle fields, and improved module list rendering for small screens by using
responsive table container styles.

Followed up by removing blocking shell work from the initial dashboard render:
the dashboard template is now prewarmed, navbar plugin loading is deferred, and
page content no longer waits for saved layout preferences to round-trip before
first paint.

Added missing `subtitle` fields to the `pageContext` of the Messages, Classes,
and My Classes adapter pages, bringing them into full compliance with the AI
instructions requirement that every page context carries both a title and a
subtitle resolved through i18n keys.

Fixed the Hiragana Alphabet study component, which had no `componentStringBaseUrls`
in its `createI18n` call (so gateway strings were never loaded), a hardcoded
English page title, no subtitle, and hardcoded English strings in the element
label and render content. All of these are now resolved through the
`gateway.study.*` i18n namespace.

Fixed the English Alphabet study component's hardcoded page title in the same way.

Parallelized all sequential server-side I/O in the Study gateway bootstrap to
eliminate a 2–5 second startup delay that was blocking Node.js from handling
any browser requests until the full initialization completed. The four
discovery and bootstrap phases now run their per-entry work concurrently using
`Promise.all`, and the two independent phases (adapter bootstrap and language
module bootstrap) now run in parallel with each other.

Parallelized all file reads in `LanguageLibraryStore.#loadDataFiles()`: all
character class files are now read simultaneously, and the four data layer files
(alt-characters, definitions, words, sentences) are loaded in one combined
`Promise.all` call instead of sequentially.

Parallelized the two `scanManifestDir` calls at server startup in `main.ts`.

Removed the unused dead-code `ja/library/` subtree whose type definitions and
re-exports were superseded by the shared `reuse/library-store.ts` and not
imported from anywhere.

## Changed components and files

- Router and SPA tests:
    - `src/ui/reuse/app-router.js`
    - `src/ui/tests/app-router.test.js`
- Shell/layout performance:
    - `src/ui/layouts/dashboard-layout.js`
    - `src/ui/reuse/page-composer.js`
    - `src/ui/tests/page-composer-refresh.test.js`
- Page entrypoints:
    - `src/ui/app/invite/index.js`
    - `src/ui/app/login/index.js`
    - `src/ui/app/register/index.js`
    - `src/ui/app/modules/index.js`
- UI language resources:
    - `src/ui/languages/en/strings.xml`
    - `src/ui/languages/de/strings.xml`
    - `src/ui/languages/id/strings.xml`
    - `src/ui/languages/ja/strings.xml`
- New shared server-side response helpers:
    - `src/api/reuse/json-responses.ts` (new)
    - `src/adapters/study/classes/routes.ts`
    - `src/modules/study/languages/en/index.ts`
    - `src/modules/study/languages/ja/index.ts`
- New shared client-side crypto utilities:
    - `src/ui/reuse/crypto-utils.js` (new)
    - `src/adapters/social/messages/ui/app.js`
    - `src/adapters/notify/internal/ui/navbar-plugin.js`
- New shared study language utilities:
    - `src/modules/study/languages/reuse/language-utils.js` (new)
    - `src/gateways/study/ui/study.js`
    - `src/modules/study/languages/reuse/study-sub-navigation.js`
- CSS variable fixes:
    - `src/adapters/notify/internal/ui/notifications.css`
    - `src/gateways/notify/ui/verify-email.css`
- Role scope predicates promoted to `src/ui/reuse/access-role.js`:
    - `src/ui/reuse/access-role.js` — added `isAdminScope`, `isTeacherScope`, `isStudentScope`
    - `src/modules/study/languages/reuse/language-utils.js` — re-exports `isAdminScope`/`isTeacherScope`/`isStudentScope` from access-role.js
    - `src/modules/study/languages/reuse/classroom-page.js` — removed `getRoleFlags()`, imports `isTeacherScope` from access-role.js
    - `src/adapters/study/classes/ui/app.js` — removed local `isAdminRole`/`isTeacherRole` closures, imports from access-role.js; extracted `renderMemberItems()` local helper to remove intra-file duplicate member rendering

- Dynamic SPA route discovery for adapter-owned pages:
    - `src/api/ui-registry.ts` — new `SpaRoute` registry (`registerSpaRoute` / `listSpaRoutes`)
    - `src/api/routes/ui/index.ts` — new authenticated `GET /api/v1/ui/app-routes` endpoint
    - `src/ui/reuse/spa-route-registry.js` (new) — client route loader/cache for app-router
    - `src/ui/reuse/app-router.js` — adapter routes removed from static table; routes now resolve via static + registry-provided sets
    - `src/gateways/social/bootstrap.ts` and `src/gateways/study/bootstrap.ts` — pass SPA route registration through adapter bootstrap contexts
    - `src/adapters/social/messages/index.ts`, `src/adapters/social/profile/index.ts`, `src/adapters/study/classes/index.ts` — adapters self-register their own SPA routes
    - `src/api/tests/ui/ui-registry.test.ts`, `src/api/tests/ui/ui-routes.test.ts`, `src/ui/tests/app-router.test.js` — coverage updated for modular route registration

## Commits

- [5028bb9](https://github.com/le-firehawk/Cognis/commit/5028bb9)
- [ad0f87b](https://github.com/le-firehawk/Cognis/commit/ad0f87b)
- [903e3f3](https://github.com/le-firehawk/Cognis/commit/903e3f3)
- [1f2451b](https://github.com/le-firehawk/Cognis/commit/1f2451b)
- [18e5b71](https://github.com/le-firehawk/Cognis/commit/18e5b71)
