# Analytics Content

Module-owned content lives under module paths and is loaded only when enabled.

## External distribution

Analytics is self-contained for extraction into `Cognis-Labs-HQ/cognis-module-analytics`. Its manifest declares `db:executor` in `requiresCapabilities`; the module must not start until Cognis offers that capability. The root manifest, package, routes, license, assets, CLI, API, UI, migration, translated docs, and integrity hashes travel together.
