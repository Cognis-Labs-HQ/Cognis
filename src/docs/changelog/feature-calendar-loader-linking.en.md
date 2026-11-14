# Reliable Calendar Tests

**Feature Branch:** feature-calendar-loader-linking

## Link Shared Imports Once

Calendar popup tests now load each local module once and link the complete dependency graph before evaluation. A controlled overlapping-import test covers delayed file reads so shared dependencies cannot cause intermittent module-link failures. Calendar runtime behavior is unchanged.

## Commits

- [fa0627211544875e4063801f7f63a95f61f028c9](https://github.com/Cognis-Labs-HQ/Cognis/commit/fa0627211544875e4063801f7f63a95f61f028c9)
