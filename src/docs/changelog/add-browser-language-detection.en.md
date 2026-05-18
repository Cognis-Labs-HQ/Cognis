# PR Changelog — Add Browser Language Detection

## Summary

The UI language bootstrap now prioritizes browser language preferences for first
load and applies them when supported by the app language packs.

The registration page language selector now defaults to the detected supported
language and keeps that value until the user selects a different language.

Unknown or unsupported language codes are now dropped silently from language
preferences so they never appear as active entries in the settings UI.

Once a user manually customizes their language priority order, that order is
treated as authoritative. Newly supported languages stay in Available, and
later browser/system language-order changes no longer reshuffle the app.

A "Sync from browser" button on the Settings → Languages page lets users bring
their priority back in line with the current browser language order at any time.
Clicking it re-syncs the preferred list to browser languages and resets the
priority mode to auto so future browser changes are reflected again.

The Available Languages table now stays as a live drop zone even when it has no
rows, and the Sync from Browser button now sits adjacent to the Preferred
Languages heading.

## Changed files/components

- `src/ui/reuse/i18n.js`
- `src/ui/app/settings/index.js`
- `src/ui/app/settings/language-prefs.js`
- `src/ui/styles/page-builder.css`
- `src/ui/app/register/index.js`
- `src/ui/tests/browser-language-detection.test.js`
- `src/ui/languages/*/strings.xml`

## Commits

- [0b39a0e](https://github.com/le-firehawk/Cognis/commit/0b39a0e)
- [d9550aa2](https://github.com/le-firehawk/Cognis/commit/d9550aa2)
- [a70d7e70](https://github.com/le-firehawk/Cognis/commit/a70d7e70)
- [c8634d6e](https://github.com/le-firehawk/Cognis/commit/c8634d6e)
- [61a470b9](https://github.com/le-firehawk/Cognis/commit/61a470b9)
