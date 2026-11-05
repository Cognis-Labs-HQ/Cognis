# Component Recovery

## Failure Isolation

Browser provider catalogs carry server-resolved module, gateway or adapter ownership. A failing optional owner loses all its provider capabilities, flows and listeners; healthy owners continue loading and the UI shows a localized error toast. The same catalog is quarantined until an explicit refresh or ownership revision changes. Required, critical, unknown-owner and offline-policy providers fail closed. Components marked required or critical are protected from automatic and manual disabling; protected consumers also prevent disabling their dependencies.

Unexpected server route exceptions are attributed at their registered gateway, adapter or module boundary. Expected client errors and malformed JSON do not enter the failure budget. Administrator-observed server faults share the repeated-failure protection; request data cannot choose another owner. Responses from other components continue normally.

## Automatic Disabling

Three distinct administrator-reported provider failures within five minutes trigger the existing authenticated disable operation. Reports are matched to the current server registry, deduplicated by occurrence, bounded in memory and scoped by component version. Non-administrator reports do not count toward a global disable. Counters reset when the server restarts or their window expires. A successful disable persists through the normal lifecycle and emits a catalog refresh. Repair or upgrade the component before re-enabling it.

## CLI Operations

Use the commands below from the running Cognis container with its normal CLI credentials. Adapter selections use gateway ID followed by adapter ID. `--all` may be restricted to a type or an adapter gateway. Bulk operations respect dependency order, skip protected or host-managed targets, continue after individual failures, print every result and exit nonzero if any target failed. Single-target enable and disable now use the same results-array response. Configuration updates and repository imports remain individually scoped.

```sh
cognisctl component:info module study-language-en
cognisctl component:info --all
cognisctl component:release-channel list module study-language-en
cognisctl component:release-channel set module study-language-en feature-guided-tutorials
cognisctl component:release-channel get module study-language-en
cognisctl component:upgrade module study-language-en
cognisctl component:upgrade module --all
cognisctl component:disable module --all
cognisctl component:enable adapter study --all
```

## Channels And Upgrades

Release-channel get, set and list use branches and releases from the configured marketplace source. Choices are persisted atomically in `config/component-channels.json`. Upgrade uses that choice or the installed branch and the existing installer, dependency checks, integrity policy and authorization. Previously enabled modules are temporarily disabled while updating. Pending install jobs are polled until completion; failed installs attempt normal validated re-enablement. Successful updates report any required server restart. A timeout leaves uncertain work disabled rather than activating it. Bundled gateways, adapters and core modules are upgraded with the host deployment; their independent channel list is empty and setting a channel is rejected.

## Public Contracts

The version-one `component:management` contract belongs to the API component and is published through `system:contracts`. Inspection, release choices, mutations and failure reports execute named `component:*` flows. `/api/v1/components` and its management operations require administrator authorization; authenticated users may report a registered provider failure, but cannot use that report to disable a component globally. Domain actions still pass through the original authenticated management routes. Provider metadata includes canonical ownership, version and required/critical protection, including content-hashed assets.

## CLI Output And Progress

All CLI commands use concise human output by default. Lists show at most twenty entries; large fields and nested payloads are summarized. Component lifecycle summaries identify every target, success, skip or failure, installed version and required restart. Empty results are explicit. Run the same command with `-v` or `--verbose`, before or after the command name, for the complete response. This includes registered gateway, adapter and module commands. Use `--` before a literal argument equal to a global flag.

`-v` now means verbose output; use `--version` to print the CLI version. Scripts consuming verbose structured responses should read stdout. Progress goes to stderr, starts immediately when the command executes, and reports elapsed time during long operations. Module upgrades additionally stream real selection, temporary disable, installation, waiting, recovery and result states. No download percentage is invented. Older JSON-only servers still work with elapsed-time progress. Interrupted streams exit with an error and advise checking component state before retrying. Batch failures retain a nonzero exit status in both output modes.

```sh
cognisctl component:upgrade module study-language-en
cognisctl component:upgrade module --all -v
cognisctl -v component:info module study-language-en
cognisctl --version
```
