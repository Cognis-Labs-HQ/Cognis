# Technical Reference

The public interfaces and operational rules of Guided Tutorials.

## Interfaces

Components resolve `ui:tutorials` from browser ctx. The host installs it through installTutorials; registration and session actions execute named `ui:tutorial:*` flows. Page Composer contributes page-bound guides rather than components importing tutorial internals.

## Configuration

Guides declare stable owner/guide/step identities, localized strings, page matching, visible targets and explicit highlightNext. Optional branches use targetAvailable and signals scoped to the opening action; language guides require enrollment.

## Behavior

Page discovery waits for account completion state and skips completed guides. Header replay starts a new session without clearing completion. Back and Restart retain the session example; cancelled openings and unmounted pages dispose pending targets. Completion is acknowledged only after persistence succeeds.

## Security

Guide visibility and step conditions respect account roles and current resource access. A failed completion read is an error, not permission to replay automatically; private progress is stored per authenticated account.

## Reference

- [src/ui/reuse/tutorials/index.js](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/ui/reuse/tutorials/index.js)
- [src/ui/reuse/tutorials/runtime.js](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/ui/reuse/tutorials/runtime.js)
