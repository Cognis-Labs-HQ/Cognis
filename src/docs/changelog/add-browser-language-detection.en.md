# PR Changelog — Add Browser Language Detection

## Summary

The UI language bootstrap now prioritizes browser language preferences for first
load and applies them when supported by the app language packs.

The registration page language selector now defaults to the detected supported
language and keeps that value until the user selects a different language.

Language priority now re-evaluates browser/system preferences on each refresh,
so switching the browser or OS language is reflected immediately, with English
kept as guaranteed fallback.

## Changed files/components

- `src/ui/reuse/i18n.js`
- `src/ui/app/register/index.js`
- `src/ui/tests/browser-language-detection.test.js`

## Commits

- [0b39a0e](https://github.com/le-firehawk/Cognis/commit/0b39a0e)
- [d9550aa2](https://github.com/le-firehawk/Cognis/commit/d9550aa2)
- [a70d7e70](https://github.com/le-firehawk/Cognis/commit/a70d7e70)
- [c8634d6e](https://github.com/le-firehawk/Cognis/commit/c8634d6e)
