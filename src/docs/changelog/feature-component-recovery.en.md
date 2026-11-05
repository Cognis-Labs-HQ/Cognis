# Component Recovery

**Feature Branch:** feature-component-recovery

## Failure Isolation

Browser catalogs resolve provider ownership and installed versions from host registries. A failed optional owner loses its partial capabilities, flows and listeners while healthy owners continue. Explicit refresh or a revision change retries quarantined providers. Required host components retain their existing protection. External modules are always optional: module manifests cannot make Cognis fail closed or become a required host dependency.

Unexpected server route exceptions are attributed at the registered owner boundary. Expected client errors and malformed JSON do not count. Three distinct administrator-observed failures within five minutes invoke the normal authenticated disable operation. Reports are deduplicated, bounded in memory and scoped by installed version; ordinary-user reports cannot cause global disabling. Counters reset on server restart or window expiry. Repair or upgrade a disabled component before enabling it again.

## Management Operations

`component:info`, `component:release-channel get|set|list`, `component:upgrade`, enable and disable support single targets and `--all`, optionally filtered by type or adapter gateway. Operations execute named `component:*` flows through the API-owned version-one `component:management` contract and existing authenticated management routes. The host's existing required/locked controls and dependency checks remain authoritative. Serialized mutations refresh state after acquiring their lock. Adapter-catalog failures stay visible on the owning gateway and as failed discovery results in applicable batches; healthy management and disabling that optional gateway still work. Authorization failures remain fatal.

## Channels And Upgrades

Marketplace branches and releases provide the available channels. Choices persist atomically in `config/component-channels.json`. Upgrades retain existing authorization, integrity, installer and dependency validation. Previously enabled modules are temporarily disabled. Failed installs attempt validated recovery with the caller's supplied disclaimer acknowledgement; uncertain timed-out installs stay disabled. Successful upgrades report restart requirements. Bundled gateways, adapters and core modules upgrade with the host deployment, expose no independent channels and are skipped by mass upgrade. Configuration updates and repository imports remain individually scoped.

## Runtime Identity

Adapter discovery retains canonical manifest IDs for dependencies and separately records runtime adapter IDs for provider ownership. Social profile, messages and call providers therefore keep their installed versions and optional status even though their manifest IDs have a `social-` prefix.

## CLI Output And Progress

All CLI commands use concise human output by default. Lists show at most twenty entries; large fields and nested payloads are summarized. Component lifecycle summaries identify every target, success, skip or failure, installed version and required restart. Empty results are explicit. Run the same command with `-v` or `--verbose`, before or after the command name, for the complete response. This includes registered gateway, adapter and module commands. Use `--` before a literal argument equal to a global flag.

`-v` now means verbose output; use `--version` to print the CLI version. Scripts consuming verbose structured responses should read stdout. Progress goes to stderr, starts immediately when the command executes, and reports elapsed time during long operations. Module upgrades additionally stream real selection, temporary disable, installation, waiting, recovery and result states. No download percentage is invented. Older JSON-only servers still work with elapsed-time progress. Interrupted streams exit with an error and advise checking component state before retrying. Batch failures retain a nonzero exit status in both output modes.

```sh
cognisctl component:upgrade module study-language-en
cognisctl component:upgrade module --all -v
cognisctl -v component:info module study-language-en
cognisctl --version
```

## Commits

- [27dbfaaac](https://github.com/Cognis-Labs-HQ/Cognis/commit/27dbfaaac48ada61ec79bcfb61bc7b630103a2f1) — Isolate component failures and add lifecycle commands.
