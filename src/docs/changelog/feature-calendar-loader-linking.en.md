# Reliable Calendar Tests

**Feature Branch:** feature-calendar-loader-linking

## Link Shared Imports Once

Calendar popup tests now load each local module once and link the complete dependency graph before evaluation. A controlled overlapping-import test covers delayed file reads so shared dependencies cannot cause intermittent module-link failures. Calendar runtime behavior is unchanged.

## Commits

- [3c4b218767135a93f1cb9cd7def3dece4507809e](https://github.com/Cognis-Labs-HQ/Cognis/commit/3c4b218767135a93f1cb9cd7def3dece4507809e)
