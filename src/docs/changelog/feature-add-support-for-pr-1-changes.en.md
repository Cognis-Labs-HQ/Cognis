# Registration Integrations

**Feature Branch:** feature-add-support-for-pr-1-changes

## Versioned document storage

Core now exposes a neutral, append-only, database-backed document version store for independently delivered modules. The existing Docs and Changelog archives retain their multilingual, component-versioned filesystem snapshots because converting those static sources to database records would duplicate storage without improving their version model.

## Registration extensions

The host registration flow now composes module fields, validates their values, and completes authenticated registration work before navigation.

## Module artwork fallback

Broken or invalid module icons and banners now switch to the standard unknown-module artwork without opening a runtime error popup.

## Host navigation capability

The module lifecycle now recognizes the app router as the provider of `ui:navigate`, allowing modules that require host navigation to be enabled.

## Safe contribution loading

Administration now imports contributed UI modules under the SPA guard, preventing page entry points from mounting themselves against the Administration URL.

## Resilient artwork fallback

Module artwork now uses the canonical public fallback asset route, and an unavailable fallback is hidden without opening a runtime error popup.

## Reliable registration composition

The registration flow now follows the camel-case ctx naming contract, isolates broken integration hooks so base registration remains available, and documents trusted HTML labels for contributors.

## Protected edits and reusable collapsible sections

Dirty trackers now protect both browser exits and SPA navigation, stale sub-composer observers stop after unmount, and a payload-driven collapsible section composer provides equal-width action rows shared by Administration and external modules.

## Mandatory popups and shared logout

Popups can now opt into mandatory interaction without close, backdrop, or Escape dismissal. The browser ctx also exposes a staged logout flow that revokes the session, locks the keyring, clears local account state, and redirects to login.

## Extensible page footer links

The page shell now exposes `ui:footerLinks`, allowing scoped link contributions on the left or right side of the footer while the host uses the same registry for License and Changelogs.

## Reusable structured pagination

Keyring event history now uses a shared paginator with caller-selected page sizes, structured page results, localized controls, data updates, and a `ui:pagination` ctx capability available to modules.

## Commits

- [2f77a92](https://github.com/Cognis-Labs-HQ/Cognis/commit/2f77a92c78df6da12b4c000b47b2c787ab517695)
- [8b480faf](https://github.com/Cognis-Labs-HQ/Cognis/commit/8b480fafbceca1dd52b9c693dc1f0d4381d473b8)
- [84f84a43](https://github.com/Cognis-Labs-HQ/Cognis/commit/84f84a43659185eb65e48004cc9a898b69aa4458)
- [2ad50da](https://github.com/Cognis-Labs-HQ/Cognis/commit/2ad50dacc8f0a73aa965b85410054a881a05cd17)
- [1b13f90](https://github.com/Cognis-Labs-HQ/Cognis/commit/1b13f90326737588d470ac1e4919e36ed9fba4dd)
- [082e5f2](https://github.com/Cognis-Labs-HQ/Cognis/commit/082e5f2ab7fc36c948c2da97539d1b56cd7fdae0)
- [2be280e](https://github.com/Cognis-Labs-HQ/Cognis/commit/2be280efacce0abf81d80ad3aae9bd23c8db921a)
- [fb19c34e](https://github.com/Cognis-Labs-HQ/Cognis/commit/fb19c34e1ad6b7de4b7c0dd2c6bb8e0fad171484)
- [3f80ad56](https://github.com/Cognis-Labs-HQ/Cognis/commit/3f80ad56eb500d81031d7c3001bc1b5c246f84a1)
- [8f67ef9e](https://github.com/Cognis-Labs-HQ/Cognis/commit/8f67ef9eb42910f9597f694d2d7b819b1ab00940)
- [f7cfe49a](https://github.com/Cognis-Labs-HQ/Cognis/commit/f7cfe49a74f4e104348eae5938747f0d601b2b60)
- [7c16485f](https://github.com/Cognis-Labs-HQ/Cognis/commit/7c16485f5abf7b260cf6bf6311dbf80725e4fb05)
- [e240270a](https://github.com/Cognis-Labs-HQ/Cognis/commit/e240270a5a597aeb07cd3e905343be1f2c2ef4f5)
- [c63e7c8f](https://github.com/Cognis-Labs-HQ/Cognis/commit/c63e7c8f0aab5c4e1e38d5963fd64ab7036a40e5)
