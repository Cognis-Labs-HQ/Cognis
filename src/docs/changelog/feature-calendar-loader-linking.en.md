# Reliable Calendar Tests

**Feature Branch:** feature-calendar-loader-linking

## Link Shared Imports Once

Calendar popup tests now load each local module once and link the complete dependency graph before evaluation. A controlled overlapping-import test covers delayed file reads so shared dependencies cannot cause intermittent module-link failures. Calendar runtime behavior is unchanged.

## Commits

- [983792abacfce6de3bda6ec69a6b9b85c8c1e634](https://github.com/Cognis-Labs-HQ/Cognis/commit/983792abacfce6de3bda6ec69a6b9b85c8c1e634)
