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

## Unchanged Operations

Lifecycle messages use sentence case and preserve component identifiers. Enable and disable skip targets already in the requested state. Upgrade compares the installed commit with the selected catalog branch or release commit before disabling or installing anything; equal version strings alone do not imply equal code. Installed channel provenance is retained when no explicit channel is selected. Refresh the marketplace catalog to discover newer source revisions. Missing revision information requires an explicit `--force` rather than a blind reinstall. `--force` on enable, disable or upgrade repeats the selected operation, including with `--all`, while retaining authorization, integrity, dependency and required-host protections.

```sh
cognisctl component:upgrade module analytics --force
cognisctl component:disable module analytics --force
```

## Tutorial Controls And Copy

Includes the 18-step Dashboard refinement: intentional click exercises open the notification pane and account menu while hover and unrelated actions stay blocked. The guide explains the page-action dock, language, appearance and layout controls. Shared element-scoped surface ownership closes only the matching pane when its group ends, and unavailable controls honour skip policies on first visits. The full catalog has 55 guides and 175 steps, including 22 administrator guides.

## Tutorial recovery and highlights

Restart Tutorial is the persistent recovery action; the tutorial no longer renders a Retry button. UI-facing introductory steps now highlight their referenced regions, including empty Jitsi meeting lists and Find Participants. Learning providers use published Study language targets and the public workspace target. Explicit `highlightNext` remains enabled on explanatory steps and disabled on event-driven stages.

## Queued floating menus

Floating menus use the version-one `ui:floatingMenus` capability and the staged `ui:floatingMenu:request`, `present`, `dismiss` and `release` flows. Equal priorities queue in request order; higher priorities suspend lower menus. A lease exposes `ready` (first grant or cancellation), `present(element, { visible })`, `dismiss(element)` and `dispose()`. Tutorial sessions reserve priority 100 until completion, cancellation or owner removal, including between steps. Composer slots and replay choosers use the same queue. Aborted requests and stale presentations cannot replace newer menus; empty slots yield and page teardown removes observers and reservations.

## Animation-only Next cue

The Next/Finish cue uses only the breathing animation, without a permanent outline. Reduced-motion preferences disable the animation; normal keyboard focus remains visible.

## Precise tutorial targets

Dock callouts retain visible control anchors below the menu reservation and avoid the actual floating action menu. The replay step highlights the ? button itself. The button retains the theme text color during tutorials while replay is guarded against replacing an active guide.

## Completion survives updates

Completion belongs to the stable account and owner/tutorial ID. Content and package updates never reset it. A completed tutorial runs again only when requested through the page-header ? control. Preserve IDs when revising guides; completion remains in the account’s browser storage.

## Commits

- [27dbfaaac](https://github.com/Cognis-Labs-HQ/Cognis/commit/27dbfaaac48ada61ec79bcfb61bc7b630103a2f1) — Isolate component failures and add lifecycle commands.
- [29290416b](https://github.com/Cognis-Labs-HQ/Cognis/commit/29290416bcdb5709d9074fee5c43a7c653eccc6d) — Add concise CLI output, verbose mode and live upgrade progress.
- [5f5201043](https://github.com/Cognis-Labs-HQ/Cognis/commit/5f5201043c021b8587a959533c0b8cc10b0ee05a) — Fix review findings and keep external modules optional.
- [833155c20](https://github.com/Cognis-Labs-HQ/Cognis/commit/833155c20f324a22737d834a8e73aa264ee4b3e5) — Skip redundant component actions unless forced and normalize CLI casing.
- [b4409b89c](https://github.com/Cognis-Labs-HQ/Cognis/commit/b4409b89c29fec24ba2e5246f216e3d1e6f9de9a) — Synchronize tutorial viewport presentation and host version.
- [66080c8dd](https://github.com/Cognis-Labs-HQ/Cognis/commit/66080c8dd041974b6a2f9cf0c9aa7d6a49cc27bb) — Synchronize startup popup readiness from the tutorials branch.
- [acbbf4781](https://github.com/Cognis-Labs-HQ/Cognis/commit/acbbf4781c42eeca29623be59bd3d4f951e62706)
- [fe0e6366e](https://github.com/Cognis-Labs-HQ/Cognis/commit/fe0e6366ee681f493f018a06c8f65cd9a0360b0a)
- [41ad3cfb8](https://github.com/Cognis-Labs-HQ/Cognis/commit/41ad3cfb81333d5ba6970b696d679689a07e987e)
- [7e36ab051](https://github.com/Cognis-Labs-HQ/Cognis/commit/7e36ab0513a43eb2cd62483ca7d2b461fd9989a7)
- [cd556b79d](https://github.com/Cognis-Labs-HQ/Cognis/commit/cd556b79daded5f84a1df77b32cfdb7a98e4f60a)

Component recovery toasts now use the authoritative manifest display name and, when supplied, its component translation catalog. Interpolation preserves the name as opaque text. Provider ownership metadata includes optional `name` and `stringsBaseUrl` fields. Operational failure and repeated-failure disable toasts request `minRole: "admin"`, so only administrators and owners see them; ordinary notifications retain their normal audience. The stack also includes conditional tutorial paths, role-filtered progress, restart actions, live dock geometry and broadcast action priority.

- [72f2c6d69](https://github.com/Cognis-Labs-HQ/Cognis/commit/72f2c6d69731a5b4ae4ebe911917af2becc52ac1)

The tutorial stack fixes search input highlighting above shell headers, advances refinement after any filter-pill click and adds a breathing Next/Finish cue for manual steps with reduced-motion support.

- [09b9c7547](https://github.com/Cognis-Labs-HQ/Cognis/commit/09b9c7547)

The tutorial stack now uses an explicit optional boolean `highlightNext` on each stage, defaulting to false. Existing explanations opt in and automatic exercises opt out. Host and module contributor instructions require user-first tutorial coverage and review whenever UI features change.

- [2b00ca977](https://github.com/Cognis-Labs-HQ/Cognis/commit/2b00ca9777b0c50e528698221a25341a740390f7)

The tutorial stack now returns Back to the start of a completed group or dependency branch. Action-specific highlights use the first visible, usable match inside their declared section where explicitly requested, while unique matching remains the default. Components highlights an editable power switch and skips the step when none is available. The content review refined 34 targets across the host and companion modules.

- [b55cabbc0](https://github.com/Cognis-Labs-HQ/Cognis/commit/b55cabbc0af004f4a0fe80310684a0ebb90bf4ee)
- [7ca378e73](https://github.com/Cognis-Labs-HQ/Cognis/commit/7ca378e7344f489fd43fd081eb6ffbf69160c471)
- [69982a176](https://github.com/Cognis-Labs-HQ/Cognis/commit/69982a1763e33a63ed0418046e82ba43846ad33a)
