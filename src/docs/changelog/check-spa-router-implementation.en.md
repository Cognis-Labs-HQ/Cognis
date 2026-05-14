# PR Changelog — Check SPA Router Implementation

## Summary

Completed a SPA consistency pass on page entrypoints by adding router coverage
for the Invite page and enforcing the `mount()` + direct-load guard pattern
across auth and invite pages.

Aligned login/register composer metadata with required `pageContext` title and
subtitle fields, and improved module list rendering for small screens by using
responsive table container styles.

## Changed components and files

- Router and SPA tests:
    - `src/ui/reuse/app-router.js`
    - `src/ui/tests/app-router.test.js`
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

## Commits

- [5028bb9](https://github.com/le-firehawk/Cognis/commit/5028bb9)
