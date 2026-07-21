# Module CLI Coverage

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

`component:list` now reports modules, gateways, and adapters by component type. The GitHub import command is now `component:import`, and adapter configuration controls are available through `component:config:get` and `component:config:set`.

## Component Health Surface Cleanup

Removed redundant `gateway:*` and `component:health` CLI surfaces, kept component health under `system:health`, narrowed TFA CLI controls to already configured user methods and recovery/enforcement operations, and surfaced component health status in Administration component details.

## Explicit CLI Targets

The CLI bootstrap token now uses a system subject instead of a normal user identity. TFA and calendar commands that inspect or create user-owned data require an explicit username so `cognisctl` never creates default calendars, TFA records, or other user-scoped state for itself.
