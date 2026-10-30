# Legacy migrations

This directory is the only home for cross-component upgrade transformations from obsolete persisted formats to current Cognis contracts. Runtime compatibility does not belong here or elsewhere in the application.

Each migration must be one-way, idempotent, invoked only by the startup migration runner, and documented with the last source version that needs it and the condition for deleting it. Request handlers, gateways, adapters, modules, and browser code must consume only the current format and must never import this directory.

Component-owned database migrations remain beside their component under `sql/migrate/`. Do not move schema ownership into this directory.
