# Tooling Component

## Purpose
`tooling/` contains developer scripts and the `cognisctl` operational CLI.

## Cognis CLI (`cognisctl`)

### Authentication model
- `cognisctl` authenticates using the API bootstrap token generated at app startup.
- Token path: `/var/run/cognis/cli-access.token`.
- The CLI includes `Authorization: Bearer <token>` on API requests.

### Help & command UX
- Global help: `cognisctl --help`
- Per-command help: `cognisctl help <command>` or `cognisctl <command> --help`
- Missing required args return explicit missing argument names and usage.

### Built-in commands
- `help [command]`
- `api:request <method> <route> [--body-json <json>]`
- `system:health`
- `modules:list`
- `modules:enable <moduleId>`
- `modules:disable <moduleId>`
- `user:list`
- `user:create <username> <password> <role>`
- `user:role <username> <role>`
- `user:set-password <username> <password>`
- `user:disable <username>`
- `user:enable <username>`
- `user:delete <username>`
- `user:preferences:clear <username>`

> Preference management is intentionally coarse (`clear` only), to avoid low-level direct user config edits from CLI.

### Module plugin system
Modules can contribute CLI subcommands by exporting `registerCommands` from:

```text
modules/<moduleId>/cli/index.js
```

The plugin receives a registrar and can register namespaced subcommands.

## Scripts
- `tooling/scripts/lint-placeholder.mjs`
- `tooling/scripts/lint-readable.mjs`
