# PR Changelog — Add Browser Language Detection

## Summary

The UI language bootstrap now prioritizes browser language preferences for first
load and applies them when supported by the app language packs.

The registration page language selector now defaults to the detected supported
language and keeps that value until the user selects a different language.

## Changed files/components

- `src/ui/reuse/i18n.js`
- `src/ui/app/register/index.js`
- `src/ui/tests/browser-language-detection.test.js`

## Commits

- [0b39a0e](https://github.com/le-firehawk/Cognis/commit/0b39a0e)
