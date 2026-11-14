# Reliable Calendar Tests

**Feature Branch:** feature-calendar-loader-linking

## Link Shared Imports Once

Calendar popup tests now load each local module once and link the complete dependency graph before evaluation. A controlled overlapping-import test covers delayed file reads so shared dependencies cannot cause intermittent module-link failures. Calendar runtime behavior is unchanged.

## Commits

- [3fe6763b3906be8ba0662b5a2431dcefca4a2f10](https://github.com/Cognis-Labs-HQ/Cognis/commit/3fe6763b3906be8ba0662b5a2431dcefca4a2f10)
