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

## Commits

- [2f77a92](https://github.com/Cognis-Labs-HQ/Cognis/commit/2f77a92c78df6da12b4c000b47b2c787ab517695)
- [8b480faf](https://github.com/Cognis-Labs-HQ/Cognis/commit/8b480fafbceca1dd52b9c693dc1f0d4381d473b8)
- [84f84a43](https://github.com/Cognis-Labs-HQ/Cognis/commit/84f84a43659185eb65e48004cc9a898b69aa4458)
- [2ad50da](https://github.com/Cognis-Labs-HQ/Cognis/commit/2ad50dacc8f0a73aa965b85410054a881a05cd17)
- [1b13f90](https://github.com/Cognis-Labs-HQ/Cognis/commit/1b13f90326737588d470ac1e4919e36ed9fba4dd)
- [082e5f2](https://github.com/Cognis-Labs-HQ/Cognis/commit/082e5f2ab7fc36c948c2da97539d1b56cd7fdae0)
- [2be280e](https://github.com/Cognis-Labs-HQ/Cognis/commit/2be280efacce0abf81d80ad3aae9bd23c8db921a)
- [fb19c34e](https://github.com/Cognis-Labs-HQ/Cognis/commit/fb19c34e1ad6b7de4b7c0dd2c6bb8e0fad171484)
