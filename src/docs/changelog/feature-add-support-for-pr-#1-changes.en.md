# Registration Integrations

**Feature Branch:** feature-add-support-for-pr-#1-changes

## Versioned document storage

Core now exposes an append-only, database-backed document version store capability for independently delivered modules.

## Registration extensions

The host registration flow now composes module fields, validates their values, and completes authenticated registration work before navigation.

## Module artwork fallback

Broken or invalid module icons and banners now switch to the standard unknown-module artwork without opening a runtime error popup.

## Host navigation capability

The module lifecycle now recognizes the app router as the provider of `ui:navigate`, allowing modules that require host navigation to be enabled.

## Commits

- [9d24852](https://github.com/Cognis-Labs-HQ/Cognis/commit/9d248526)
- [8b480faf](https://github.com/Cognis-Labs-HQ/Cognis/commit/8b480fafbceca1dd52b9c693dc1f0d4381d473b8)
- [84f84a43](https://github.com/Cognis-Labs-HQ/Cognis/commit/84f84a43659185eb65e48004cc9a898b69aa4458)
- [2ad50da](https://github.com/Cognis-Labs-HQ/Cognis/commit/2ad50dacc8f0a73aa965b85410054a881a05cd17)
- [1b13f90](https://github.com/Cognis-Labs-HQ/Cognis/commit/1b13f90326737588d470ac1e4919e36ed9fba4dd)
