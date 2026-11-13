# Tooling

## Overview

The `src/tooling/` directory contains all developer tooling for the Cognis codebase: linting scripts, TypeScript source checks, a container healthcheck script, and the `cognisctl` operational CLI. These tools maintain code quality, validate the codebase before commits, and provide operational control of a running Cognis instance.

## Responsibilities

- Enforce readability rules (no tabs, no trailing whitespace, no consecutive blank lines) via `lint-readable.mjs`.
- Enforce placeholder standards via `lint-placeholder.mjs`, which delegates to Prettier.
- Check all TypeScript sources and tests with `npm run typecheck`.
- Provide a `/health` readiness check implementation via `healthcheck.mjs`.
- Expose operational management commands via `cognisctl` (`src/tooling/cli/index.ts`).

Tests run through `npm test`; production assets are built through `npm run build`. Deployment management is separate.

## Architecture

### Linting

All linting runs via `npm run lint`, which executes both lint scripts in sequence:

1. **`lint-readable.mjs`** — Uses `ripgrep` to enumerate all `.ts`, `.js`, `.html`, and `.css` files under `src/api/`, `src/core/`, and `src/ui/`. Fails if any file contains a tab character, trailing whitespace, or three or more consecutive blank lines. Requires `ripgrep` to be installed on the host.

2. **`lint-placeholder.mjs`** — Runs `npx prettier --check .` to enforce the Prettier style. Any file not matching the Prettier config fails the lint.

### Prettier configuration

```json
{
    "tabWidth": 4,
    "trailingComma": "all",
    "singleQuote": false
}
```

Note that documentation code examples use two-space indentation for readability; Prettier enforces four-space indentation in all source files.

### TypeScript source checks

Run `npm run typecheck` before committing. `npm run ci:test` checks types before running tests; both CI pipelines use the same checker. `npm run build` separately emits production assets through esbuild for Node 24.

The root `tsconfig.json` is the authoritative strict, no-emit project. It includes every `.ts`, `.tsx`, `.mts` and `.cts` file under `src`, including declarations, tests, optional components and nested components. Only generated `dist` directories and dependencies are excluded. New components need no reference-list update.

NodeNext resolution, ES2024 and DOM libraries support the server and browser contracts. `@cognis/core` resolves to this checkout’s source. Imported first-party JavaScript contributes inferred types with `allowJs`; `checkJs` remains disabled, so this is not whole-JavaScript verification. Component configurations do not limit root coverage.

Coverage tests compare the compiler inventory with the nonempty source inventory, run the real npm command on static fixtures, reject production and test errors independently, and verify repeated clean runs emit no files.

### `cognisctl` CLI

`cognisctl` is the primary operational control surface. It auto-discovers command modules from:

- `src/tooling/cli/commands/` — core built-in commands
- Any `cli/index.js` exported by an installed module under `COGNIS_EXTERNAL_MODULES_ROOT`

Commands are grouped by namespace:

| Namespace            | Example commands                                                                                                              |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `user:*`             | `user:create`, `user:role`, `user:set-password`, `user:disable`, `user:enable`, `user:delete`                                 |
| `user:preferences:*` | `user:preferences:clear`                                                                                                      |
| `system:*`           | `system:health`, `system:info`                                                                                                |
| `component:*`        | `component:list`, `component:enable`, `component:disable`, `component:config:get`, `component:config:set`, `component:import` |
| `api:*`              | `api:token` (mints a temporary 1-hour admin emergency token for curl)                                                         |

All CLI commands that require authentication read the API token from the path specified in `COGNIS_CLI_TOKEN_PATH`.

Built-in `cognisctl` commands can render response-aware terminal output with headings, aligned fields, and ANSI colors when the terminal supports them; commands without a custom renderer fall back to formatted JSON.

### Healthcheck

`healthcheck.mjs` is used as the Docker `HEALTHCHECK` command. It issues a `GET /health` request to the running server and exits with code 0 on success or 1 on failure.

## Configuration

| Variable                       | Default            | Description                                                                            |
| ------------------------------ | ------------------ | -------------------------------------------------------------------------------------- |
| `COGNIS_CLI_TOKEN_PATH`        | —                  | Path to a file containing the API token used by `cognisctl` for authenticated commands |
| `COGNIS_EXTERNAL_MODULES_ROOT` | `external-modules` | Used by the CLI to discover module-contributed subcommands                             |
| `COGNIS_GATEWAY_CLI_PATHS`     | —                  | Optional path list for gateway-contributed CLI commands                                |
| `COGNIS_ADAPTER_CLI_PATHS`     | —                  | Optional path list for adapter-contributed CLI commands                                |
