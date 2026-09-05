# Preserve meetings while entering picture-in-picture

**Feature Branch:** work

## Honor browsing-context preservation requests

Floating windows now honor the provider's `preserveBrowsingContext` option. When the browser cannot move a component with the state-preserving DOM API, Cognis keeps it under its existing parent and uses the top layer there instead of reparenting its live iframe and risking a meeting reconnect.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/e75a1720
