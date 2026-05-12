# PR Changelog — Clean Up Directory Structure

## Summary

Removed the legacy Japanese Study adapter under `src/adapters/study/japanese/`
to reduce duplicate and confusing structure now that Japanese study content is
provided by language modules.

Updated the Study gateway to stop hardcoding a legacy adapter skip and keep
adapter discovery/bootstrap generic.

Updated the profile page to replace inline hint text with an info tooltip for
post visibility guidance.

## Changed Files/Components

- Study gateway:
    - `src/gateways/study/gateway.ts`
    - `src/gateways/study/bootstrap.ts`
    - `src/gateways/study/manifest.json`
- Removed legacy adapter:
    - `src/adapters/study/japanese/` (removed)
- Profile UI:
    - `src/ui/app/profile/index.js`
    - `src/ui/styles/profile.css`

## Commits

- [e349311](https://github.com/le-firehawk/Cognis/commit/e349311)
