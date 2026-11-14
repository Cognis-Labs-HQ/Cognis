# Shared Password Labels

**Feature Branch:** feature-password-popup-localization

## Share Password Labels

Move password requirements and matching feedback into shared host XML catalogs and update both Security and Registration. Security can open its password form without loading the optional Registration catalog. Preserve all four translations, existing validation and strict same-key English fallback.

## Preserve Form Behavior

Regression coverage exercises registered Auth Settings construction, the real mounted Security section, popup, form builder and XML resolver, plus the mounted Registration page. It covers repeated open/cancel/remount, discard decisions, selected locale preservation, validation, synthetic success/failure and explicit missing-English errors. An all-zero policy payload retains the real minimum-length default; a separately injected defensive zero-criteria case is not a supported server policy.

## Coordinate Catalog Releases

Auth 2.2.13 and Registration 1.2.9 require the matching shared host catalogs. There is no separate UI package version or Auth/Registration lockfile dependency ceiling. Integrations must use the new shared keys. No dependency, server route, password policy, or authentication contract changes. Programmatic DOM tests do not establish browser pixels or deployed incident clearance.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/cc70eac432da743ba23acd4dd091dba3e068b7b9
