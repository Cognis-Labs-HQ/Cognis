# Tooling Component

## Purpose
`tooling/` contains developer scripts and the `cognisctl` operational CLI.

## Cognis CLI (`cognisctl`)
### Built-in commands
- `help`
- `system:health`
- `modules:list`
- `modules:enable <moduleId>`
- `modules:disable <moduleId>`
- `auth:create-admin [username] [password]`
- `preferences:get <accountId> <pageId>`

### Module plugin system
Modules can contribute CLI subcommands by exporting `registerCommands` from:

```text
modules/<moduleId>/cli/index.js
```

The plugin receives a registrar and can register namespaced subcommands.

## Scripts
- `tooling/scripts/lint-placeholder.mjs`
- `tooling/scripts/lint-readable.mjs`
