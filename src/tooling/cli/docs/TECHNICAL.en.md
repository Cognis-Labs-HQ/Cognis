# Technical Reference

The public interfaces and operational rules of Command-Line Tools.

## Interfaces

CLI commands declare name, usage, description, arguments and execute handlers in the command registry. Core and enabled provider plugins register their own command groups; HTTP helpers send protected requests to the running server.

## Configuration

### Prettier configuration

```json
{
    "tabWidth": 4,
    "trailingComma": "all",
    "singleQuote": false
}
```

Note that documentation code examples use two-space indentation for readability; Prettier enforces four-space indentation in all source files.

### Configuration

| Variable                       | Default            | Description                                                                            |
| ------------------------------ | ------------------ | -------------------------------------------------------------------------------------- |
| `COGNIS_CLI_TOKEN_PATH`        | —                  | Path to a file containing the API token used by `cognisctl` for authenticated commands |
| `COGNIS_EXTERNAL_MODULES_ROOT` | `external-modules` | Used by the CLI to discover module-contributed subcommands                             |
| `COGNIS_GATEWAY_CLI_PATHS`     | —                  | Optional path list for gateway-contributed CLI commands                                |
| `COGNIS_ADAPTER_CLI_PATHS`     | —                  | Optional path list for adapter-contributed CLI commands                                |

## Behavior

### Overview

The `src/tooling/` directory contains all developer tooling for the Cognis codebase: linting scripts, TypeScript source checks, a container healthcheck script, and the `cognisctl` operational CLI. These tools maintain code quality, validate the codebase before commits, and provide operational control of a running Cognis instance.

### Responsibilities

- Enforce readability rules (no tabs, no trailing whitespace, no consecutive blank lines) via `lint-readable.mjs`.
- Enforce placeholder standards via `lint-placeholder.mjs`, which delegates to Prettier.
- Check all TypeScript sources and tests with `npm run typecheck`.
- Provide a `/health` readiness check implementation via `healthcheck.mjs`.
- Expose operational management commands via `cognisctl` (`src/tooling/cli/index.ts`).

Tests run through `npm test`; production assets are built through `npm run build`. Deployment management is separate.

### Linting

All linting runs via `npm run lint`, which executes both lint scripts in sequence:

1. **`lint-readable.mjs`** — Uses `ripgrep` to enumerate all `.ts`, `.js`, `.html`, and `.css` files under `src/api/`, `src/core/`, and `src/ui/`. Fails if any file contains a tab character, trailing whitespace, or three or more consecutive blank lines. Requires `ripgrep` to be installed on the host.

2. **`lint-placeholder.mjs`** — Runs `npx prettier --check .` to enforce the Prettier style. Any file not matching the Prettier config fails the lint.

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

### Isolated Test Credentials

`npm test` and `npm run ci:test` allocate a temporary token-store directory for each run and a separate writable file for every test worker. A static preload sets the file before test modules load, ignoring any inherited production token-store path. Tests may deliberately override their own path afterward for restart or failure cases. The runner removes its temporary directory after successful or failed child execution and forwards ordinary termination signals. Forced process termination or host failure can leave temporary files for operating-system cleanup. Production token persistence remains fail-closed and unchanged.

### Interactive CLI Input

Interactive commands require terminals on stdin and stderr. Redirect stdout to save only the final result; prompts and progress stay on stderr. Progress pauses while input is pending and resumes after submission. Each field indicates whether input is visible or hidden. Usernames and roles explicitly marked safe by their command owner are visible; passwords, tokens and undeclared fields remain hidden. Press Enter to submit each value, or Ctrl-C to cancel. Closing input before submission fails without executing the command. For scripts and redirected stdin, pass the documented arguments instead; use the command’s `--help` for usage. Terminal messages select English, German, Indonesian or Japanese from `LC_ALL`, `LC_MESSAGES` or `LANG`, with English fallback.

### Command Input Contracts

HTTP commands own their input schema independently of their help section. Help lists path arguments and JSON body/query fields with required flags. An empty invocation collects all declared inputs together. Partial explicit arguments must include required JSON fields; incomplete input fails before the command request. For example, `cognisctl tfa:preferences:set <username> '{"methodIds":["<configured-method-id>"]}'` sets an existing user's preference order. Use the method IDs reported for that user rather than display labels. Interactive input asks for the username and a comma-separated method order. This does not configure a new TFA method or change authorization requirements.

Command owners can supply `wizardFields` for built-in argument collection and `sensitive` on each `WizardField`, including HTTP body/query fields. Omitted sensitivity is hidden; only an explicit `sensitive: false` permits echo. Mark passwords, tokens and arbitrary JSON hidden, and opt ordinary fields into visibility only when their content is known. Field names and provider IDs never determine secrecy. Malformed JSON errors do not repeat submitted values.

Required fields require a value, not a nonempty collection: `[]` and `{}` remain valid when their declared types allow them. Enter a comma-separated list or a JSON string array in an array prompt; `[]` clears a preference order. Numbers must be finite, booleans accept only explicit true/false choices, and declared types are checked before the command request. String input preserves leading and trailing spaces, including passwords. The owning API still validates IDs and business rules.

Whole-body JSON must be an object in both interactive and explicit modes. An explicit `{}` is sent unchanged; skipped optional input remains omitted. Required query fields are collected and checked too. GET/DELETE use `[query-json]`; POST/PUT with declared query fields use `[body-json] [query-json]` after path arguments. Command owners must use unique names across path, body and query fields. Ambiguous schemas fail at registration before prompts or transport.

Defined query values are always encoded, including an explicit empty string as `key=`. Only omitted values are skipped.

## Security

CLI authentication reads COGNIS_CLI_TOKEN_PATH; the server still enforces role and resource authorization. Keep token files private and avoid including secrets in verbose output or shared command transcripts.

## Reference

- [src/tooling/cli/package.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/tooling/cli/package.json)
- [src/tooling/cli/index.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/tooling/cli/index.ts)
