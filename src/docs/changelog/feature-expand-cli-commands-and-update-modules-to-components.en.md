# Module CLI Coverage

**Feature Branch:** feature-expand-cli-commands-and-update-modules-to-components

## Module API commands added

Added Cognisctl commands for module backend endpoints that previously required direct HTTP calls, including Analytics activity views, Jitsi Meet administration, and Nextcloud Whiteboard operations.

## API bootstrap health contributors fixed

Ensured the API bootstrap shares the same health service with the server so component health contributors can register without crashing startup.

# CLI Coverage

## Operational Commands

The CLI now includes commands for TFA, notifications, email addresses, invites, calendars, study languages, message conversations, and shares so administrators can reach more app functions from `cognisctl`.

## Interactive Wizard

Commands with complex payloads can prompt for required values when no arguments are provided, making structured API transactions easier to submit correctly.

# CLI Component Coverage

## Component CLI discovery

The CLI now discovers command plugins from modules, gateways, and adapters, including manifest-declared CLI entrypoints, and gives dynamically registered commands formatted output by default.

## Component operations

`component:list` now reports modules, gateways, and adapters by component type. The GitHub import command is now `component:import`, and module, gateway, and adapter configuration controls are available through `component:config:get` and `component:config:set`.

## Component Health Surface Cleanup

Removed redundant `gateway:*` and `component:health` CLI surfaces, kept component health under `system:health`, narrowed TFA CLI controls to already configured user methods and recovery/enforcement operations, and surfaced component health status in Administration component details.

## Explicit CLI Targets

The CLI bootstrap token now uses a system subject instead of a normal user identity. TFA and calendar commands that inspect user-owned data require an explicit username so `cognisctl` never creates default calendars, TFA records, or other user-scoped state for itself.

## Administrative CLI Scope

Calendar, social, message, share, and notification plugin commands now focus on inspection and administrator-oriented maintenance. User-flow mutations such as creating calendar events, changing calendar shares, sending messages, approving message requests, and creating or deleting social posts were removed from `cognisctl`.

## CLI Output Formatting

API errors now render through a shared pretty formatter that highlights the status, code, message, and details from standard error responses. Dynamically discovered plugin commands, including files, analytics, and Jitsi Meet commands, now default to structured summaries and tables instead of raw JSON.

## Unified Component Config

Jitsi Meet meeting inspection now uses `jitsi-meet:meetings`, and module-specific config commands were folded into `component:config:get` and `component:config:set` so modules, gateways with config endpoints, and adapters share one component configuration surface.

## Whiteboard and Meeting Inspection

`nextcloud-whiteboard:whiteboards` now queries the administrator-wide whiteboard listing instead of requiring a profile-backed user context, and active Jitsi Meet summaries now show invited participant counts separately from active participant counts.

## Disabled Component CLI Filtering

Component CLI plugins now consult component availability before registering commands, so disabled modules, gateways, and adapters do not appear in help or command lookup when the API reports them disabled. The redundant `social:users:search` command was removed.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/555964b626fd72acf48154ab588e2b016f8affdd
