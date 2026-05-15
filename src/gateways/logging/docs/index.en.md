# Logging Gateway

## Overview

The Logging Gateway provides structured application logging to stdout/stderr and optionally to a persistent log file. It creates a `Logger` instance from environment variables and contributes it to the capability store so that any component that needs to log can do so through a uniform interface without importing a logger library directly.

The gateway routes all file writes through the `file:append` capability contributed by the files gateway. This means log persistence honours the file gateway abstraction: if the files gateway were replaced with a different backend, log writes would automatically route through the new implementation. If the `file:append` capability is absent (e.g. in isolated unit tests), the logger falls back to Node's native `appendFile` directly.

The logging gateway must bootstrap after the files gateway. This dependency is declared in its `manifest.json` via `requires: ["files"]` so the gateway bootstrapper always initialises files first.

## Responsibilities

- Create a `Logger` instance configured from `LOG_LEVEL`, `LOG_FILE`, `LOG_FORMAT`, and rotation environment variables.
- Contribute `logging:logger` (the full `Logger` instance) and `logging:log` (a plain log function) to the capability store.
- Route log file writes through `file:append` when available.
- Expose `GET /api/v1/logging/stream` for the Administration → Logs page (admin-only SSE stream with severity and keyword filters, plus `LOG_LEVEL` baseline filtering).
- Register the `logging` gateway in the gateway registry.

Not responsible for: log aggregation or log shipping to external systems.

## Architecture

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

Log levels in priority order: `debug` (10), `info` (20), `warn` (30), `error` (40). `LOG_LEVEL` is applied as the baseline filter for the admin log stream endpoint; persistent log-file writes always include all levels.

Persistent log lines remain JSON objects:

```json
{
    "ts": "2024-01-15T10:00:00.000Z",
    "level": "info",
    "message": "Gateway bootstrapped.",
    "gateway": "auth"
}
```

### Capabilities contributed

| Capability       | Type                              | Description                                                       |
| ---------------- | --------------------------------- | ----------------------------------------------------------------- |
| `logging:logger` | `Logger`                          | Full Logger instance                                              |
| `logging:log`    | `(level, message, meta?) => void` | Plain log function; used as `ctx.log` by the gateway bootstrapper |

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

## Configuration

| Variable               | Default             | Description                                                                             |
| ---------------------- | ------------------- | --------------------------------------------------------------------------------------- |
| `LOG_LEVEL`            | `info`              | Baseline severity filter for `/api/v1/logging/stream`: `debug`, `info`, `warn`, `error` |
| `LOG_FILE`             | `/app/logs/app.log` | Absolute path for the persistent log file                                               |
| `LOG_FORMAT`           | `pretty`            | Console output format: `pretty` for readable logs or `json` for raw JSON                |
| `LOG_ROTATE_MAX_BYTES` | `10485760`          | Rotate the active log file when it reaches this size (bytes)                            |
| `LOG_ROTATE_MAX_FILES` | `10`                | Number of rotated log archives to keep (`0` keeps none)                                 |
| `LOG_ROTATE_COMPRESS`  | `true`              | When `true`, rotated logs are gzip-compressed (`.gz`)                                   |
