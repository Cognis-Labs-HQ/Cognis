# Component Recovery

**Feature Branch:** feature-component-recovery

## Failure Isolation

Browser provider catalogs carry server-resolved module, gateway or adapter ownership. A failing optional owner loses all its provider capabilities, flows and listeners; healthy owners continue loading and the UI shows a localized error toast. The same catalog is quarantined until an explicit refresh or ownership revision changes. Required, critical, unknown-owner and offline-policy providers fail closed. Components marked required or critical are protected from automatic and manual disabling; protected consumers also prevent disabling their dependencies.

## Automatic Disabling

Three distinct administrator-reported provider failures within five minutes trigger the existing authenticated disable operation. Reports are matched to the current server registry, deduplicated by occurrence, bounded in memory and scoped by component version. Non-administrator reports do not count toward a global disable. Counters reset when the server restarts or their window expires. A successful disable persists through the normal lifecycle and emits a catalog refresh. Repair or upgrade the component before re-enabling it.

## CLI Operations

Use the commands below from the running Cognis container with its normal CLI credentials. Adapter selections use gateway ID followed by adapter ID. `--all` may be restricted to a type or an adapter gateway. Bulk operations respect dependency order, skip protected or host-managed targets, continue after individual failures, print every result and exit nonzero if any target failed. Single-target enable and disable now use the same results-array response. Configuration updates and repository imports remain individually scoped.

## Channels And Upgrades

Release-channel get, set and list use branches and releases from the configured marketplace source. Choices are persisted atomically in `config/component-channels.json`. Upgrade uses that choice or the installed branch and the existing installer, dependency checks, integrity policy and authorization. Previously enabled modules are temporarily disabled while updating. Pending install jobs are polled until completion; failed installs attempt normal validated re-enablement. Successful updates report any required server restart. A timeout leaves uncertain work disabled rather than activating it. Bundled gateways, adapters and core modules are upgraded with the host deployment; their independent channel list is empty and setting a channel is rejected.

## Commits

- [27dbfaaac](https://github.com/Cognis-Labs-HQ/Cognis/commit/27dbfaaac48ada61ec79bcfb61bc7b630103a2f1) — Isolate component failures and add lifecycle commands.
