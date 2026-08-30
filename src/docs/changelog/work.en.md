# Reliable Message Styling

**Feature Branch:** work

## Restore all message styles

The Messages page once again loads every adapter-owned stylesheet on direct visits, matching the styles registered for client-side navigation.

## Keep direct-load styling without brittle tests

Like the Profile and Classes pages, Messages has a standalone HTML shell for direct visits, so it retains explicit links matching its SPA route styles. The feature-specific tests now focus on rendered styling behavior instead of demanding a particular loading mechanism.

## Commits

- [1406a2d](https://github.com/Cognis-Labs-HQ/Cognis/commit/1406a2d7a8e98cca18214cfeeb104b3a5054c876)
- [48522be](https://github.com/Cognis-Labs-HQ/Cognis/commit/48522be12b3e38476cf4622d9eecf466bc74e6b1)
