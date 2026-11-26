# Technical Reference

The public interfaces and operational rules of Application Logs.

## Interfaces

`logging:recentEntries` returns a copy of up to 30 sanitized diagnostic records with `timestamp`, `level` and `message`. Crash reports consume this public capability instead of wrapping console methods in core. This local history includes anonymous diagnostics; server ingestion and browser output retain their separate gateway policy.

### Capabilities contributed

| Capability       | Type                              | Description                                                       |
| ---------------- | --------------------------------- | ----------------------------------------------------------------- |
| `logging:logger` | `Logger`                          | Full Logger instance                                              |
| `logging:log`    | `(level, message, meta?) => void` | Plain log function; used as `ctx.log` by the gateway bootstrapper |

## Configuration

### Configuration

| Variable               | Default             | Description                                                              |
| ---------------------- | ------------------- | ------------------------------------------------------------------------ |
| `LOG_LEVEL`            | `info`              | Runtime log-stream verbosity filter: `debug`, `info`, `warn`, `error`    |
| `LOG_FILE_LEVEL`       | `debug`             | Persistent file verbosity filter: `debug`, `info`, `warn`, `error`       |
| `LOG_FILE`             | `/app/logs/app.log` | Absolute path for the persistent log file                                |
| `LOG_FORMAT`           | `pretty`            | Console output format: `pretty` for readable logs or `json` for raw JSON |
| `LOG_ROTATE_MAX_BYTES` | `10485760`          | Rotate the active log file when it reaches this size (bytes)             |
| `LOG_ROTATE_MAX_FILES` | `10`                | Number of rotated log archives to keep (`0` keeps none)                  |
| `LOG_ROTATE_COMPRESS`  | `true`              | When `true`, rotated logs are gzip-compressed (`.gz`)                    |

## Behavior

`ui/reuse/levels.json` is the single catalog of severity priorities and console aliases. The shared module derives accepted levels, membership checks and console mappings from it; server filtering, browser ingestion and console capture reuse those definitions.

### Gateway-Controlled Diagnostics

Browser callers bind `ui:log` through the shared ctx capability registry. The host keeps at most 128 deferred capability invocations across all bindings; it has no logging-specific subscription or output policy. The logging provider contributes `ui:log` for its scoped lifetime and owns validation, recent history, delivery and console capture. Provider removal releases the capability; deferred calls can reach a subsequent provider without importing its implementation.

The public browser provider owns the `logging:emit` flow (`validate`, `deliver`, `publish`). Structured metadata is bounded and credentials and raw error messages are removed.

Service workers relay structured `COGNIS_LOG` events to one controlled window, retaining at most 64 events when none is available. The provider accepts messages only from its current service-worker controller and removes its listeners, console capture and subscription on disposal.

`POST /api/v1/logging/entries` remains authenticated. Its 204 response includes `x-cognis-log-console: true` only for administrators when the event meets the current console adapter threshold. The browser publishes only after that permission; rejected or failed deliveries do not print or recursively report themselves. Anonymous events reach the gateway provider but are not submitted to the authenticated endpoint or printed. Server console and file filters remain independent.

### Overview

The Logging Gateway provides structured application logging to stdout/stderr and optionally to a persistent log file. It creates a `Logger` instance from environment variables and contributes it to the capability store so that any component that needs to log can do so through a uniform interface without importing a logger library directly.

The gateway routes all file writes through the `file:append` capability contributed by the files gateway. This means log persistence honours the file gateway abstraction: if the files gateway were replaced with a different backend, log writes would automatically route through the new implementation. If the `file:append` capability is absent (e.g. in isolated unit tests), the logger falls back to Node's native `appendFile` directly.

The logging gateway must bootstrap after the files gateway. This dependency is declared in its `manifest.json` via `requires: ["files"]` so the gateway bootstrapper always initialises files first.

### Responsibilities

- Create a `Logger` instance configured from `LOG_LEVEL`, `LOG_FILE`, `LOG_FORMAT`, and rotation environment variables.
- Contribute `logging:logger` (the full `Logger` instance) and `logging:log` (a plain log function) to the capability store.
- Route log file writes through `file:append` when available.
- Expose `GET /api/v1/logging/stream` for the Administration → Logs page (admin-only SSE stream with severity and keyword filters).
- Register the `logging` gateway in the gateway registry.

Not responsible for: log aggregation or log shipping to external systems.

### Logger class

`Logger` in `src/gateways/logging/logger.ts` accepts a `LogLevel`, a file path, an optional `FileAppend` function, a console-output format, and optional rotation settings. Every call to `log(level, message, meta?)` writes a console line and appends the same event as a single-line JSON object to the log file.

```ts
export class Logger {
    constructor(
        level: LogLevel = "info",
        filePath: string,
        fileAppend?: FileAppend,
        consoleFormat?: ConsoleLogFormat,
        rotationOptions?: LoggerRotationOptions,
    );
    async log(
        level: LogLevel,
        message: string,
        meta?: Record<string, unknown>,
    ): Promise<void>;
    debug(message: string, meta?: Record<string, unknown>): Promise<void>;
    info(message: string, meta?: Record<string, unknown>): Promise<void>;
    warn(message: string, meta?: Record<string, unknown>): Promise<void>;
    error(message: string, meta?: Record<string, unknown>): Promise<void>;
}
```

Log levels in priority order: `debug` (10), `info` (20), `warn` (30), `error` (40). `LOG_LEVEL` filters stdout/stderr and `LOG_FILE_LEVEL` independently filters persistent file writes. Administrators can override either adapter configuration at runtime and reset it to the environment values. Overrides are stored in the database and restored when the gateway starts, so they survive container restarts.

Persistent log lines remain JSON objects:

```json
{
    "ts": "2024-01-15T10:00:00.000Z",
    "level": "info",
    "message": "Gateway bootstrapped.",
    "gateway": "auth"
}
```

### Dependency on files gateway

Bootstrap in `src/gateways/logging/bootstrap.ts` reads `file:append` from the capability store:

```ts
const fileAppend =
    ctx.capabilities.get<(fp: string, content: string) => Promise<void>>(
        "file:append",
    );
const consoleFormat = process.env.LOG_FORMAT === "json" ? "json" : "pretty";
const logger = new Logger(level, filePath, fileAppend, consoleFormat, {
    maxBytes: rotateMaxBytes,
    maxFiles: rotateMaxFiles,
    compressRotated: rotateCompress,
});
```

If `file:append` is absent (the capability store returns `undefined`), the `Logger` constructor uses its own `defaultFileAppend` implementation backed by Node's `appendFile`.

The DB gateway uses the shared logger for its own events but records only summarised database metadata (`provider`, SQL statement type, parameter count, error name/code). Raw database-engine messages are intentionally not forwarded verbatim because the database container already emits them at the source.

### Browser log ingestion

Authenticated browser components submit structured entries with `POST /api/v1/logging/entries` using `{ level, message, meta }`. The gateway validates the level and message, attaches the authenticated account and browser source, and writes the entry through `logging:log`.

### Localized Adapter Fields

Logging adapter definitions use `labelKey`. The gateway serializes catalog and configuration schemas with the browser-facing `label` translation key and supplies each adapter’s `stringsBaseUrl`. Types, options and values retain their provider-owned meaning. Configuration reads remain administrator-only.

## Security

Log inspection and configuration require administrative authorization. Treat log messages and metadata as potentially sensitive: credentials, access tokens and private message contents must not be emitted as diagnostics.

## Reference

### Technical Specification

| Page / surface              | Guide          | Access        |
| --------------------------- | -------------- | ------------- |
| `/administration` · `#logs` | Log Inspection | Administrator |

See the [shared contract](/docs/adapters/social/messages/technical) for this behavior.
