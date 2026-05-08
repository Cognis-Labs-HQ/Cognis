# Tooling

## Overview

The `src/tooling/` directory contains all developer tooling for the Cognis codebase: linting scripts, the TypeScript configuration generator, a container healthcheck script, and the `cognisctl` operational CLI. These tools maintain code quality, validate the codebase before commits, and provide operational control of a running Cognis instance.

## Responsibilities

- Enforce readability rules (no tabs, no trailing whitespace, no consecutive blank lines) via `lint-readable.mjs`.
- Enforce placeholder standards via `lint-placeholder.mjs`, which delegates to Prettier.
- Generate a consolidated `tsconfig.json` for the monorepo via `gen-tsconfig.mjs`.
- Provide a `/health` readiness check implementation via `healthcheck.mjs`.
- Expose operational management commands via `cognisctl` (`src/tooling/cli/index.ts`).

Not responsible for: running tests (that is `npm test`), building a production bundle (no build step — TypeScript is run directly via `tsx`), or managing deployments.

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

### TypeScript

The project runs TypeScript directly via `tsx` — there is no separate compile step:

```
npm start        # node --import tsx src/api/main.ts
npm test         # node --import tsx ... *.test.ts
npm run cli      # node --import tsx src/tooling/cli/index.ts
```

`gen-tsconfig.mjs` generates a merged `tsconfig.json` that covers all packages in the monorepo before typechecking.

### `cognisctl` CLI

`cognisctl` is the primary operational control surface. It auto-discovers command modules from:

- `src/tooling/cli/commands/` — core built-in commands
- Any `cli/index.js` exported by an installed module under `COGNIS_MODULES_ROOT`

Commands are grouped by namespace:

| Namespace            | Example commands                                                                              |
| -------------------- | --------------------------------------------------------------------------------------------- |
| `user:*`             | `user:create`, `user:role`, `user:set-password`, `user:disable`, `user:enable`, `user:delete` |
| `user:preferences:*` | `user:preferences:clear`                                                                      |
| `system:*`           | `system:health`, `system:info`                                                                |
| `modules:*`          | `modules:list`, `modules:enable`, `modules:disable`, `modules:install`                        |
| `gateway:*`          | `gateway:list`                                                                                |
| `api:*`              | `api:token` (mints a temporary 1-hour admin emergency token for curl)                         |

All CLI commands that require authentication read the API token from the path specified in `COGNIS_CLI_TOKEN_PATH`.

### Healthcheck

`healthcheck.mjs` is used as the Docker `HEALTHCHECK` command. It issues a `GET /health` request to the running server and exits with code 0 on success or 1 on failure.

## Configuration

| Variable                | Default       | Description                                                                            |
| ----------------------- | ------------- | -------------------------------------------------------------------------------------- |
| `COGNIS_CLI_TOKEN_PATH` | —             | Path to a file containing the API token used by `cognisctl` for authenticated commands |
| `COGNIS_MODULES_ROOT`   | `src/modules` | Used by the CLI to discover module-contributed subcommands                             |
