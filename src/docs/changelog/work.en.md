# Enforce UI Reuse
**Feature Branch:** work

## Guard page composition
Automated architecture coverage now rejects core and installed external-module pages that publish a mount function without using the Cognis page composer.

## Guard reusable utilities
External browser modules can no longer redeclare a function already offered by the Cognis UI reuse surface, and direct mount-root rendering is reported alongside missing composer use.


## Guard form composition
Core and external-module browser code must use the Cognis form builder whenever it publishes a form or handles a submission. The builder now supports trusted complex content and validated form attributes so bespoke forms retain the shared wrapper.

## Commits
- [57d2cdca](https://github.com/Cognis-Labs-HQ/Cognis/commit/57d2cdca)
- [6ce9fafe](https://github.com/Cognis-Labs-HQ/Cognis/commit/6ce9fafe)
