import { open, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { IncomingMessage, ServerResponse } from "node:http";
import { Logger } from "./logger.js";
import {
    readJson,
    type BootstrapLog,
    type GatewayBootstrapContext,
} from "../shared.js";
import {
    resolveRouteContext,
    type RouteContext,
} from "../../api/reuse/route-context.js";
import { loadAdapterAdminCatalog } from "../reuse/adapter-admin-catalog.js";
import type { DbExecutor } from "../db/reuse/db-executor.js";
import {
    LoggingPreferenceStore,
    type LoggingPreferenceValue,
} from "./preference-store.js";

export const SUPPORTED_LOG_LEVELS = ["debug", "info", "warn", "error"] as const;
type LogLevel = (typeof SUPPORTED_LOG_LEVELS)[number];

const ALLOWED_LEVELS = new Set<LogLevel>(["debug", "info", "warn", "error"]);
const DEFAULT_ROTATE_MAX_BYTES = 10 * 1024 * 1024;
const DEFAULT_ROTATE_MAX_FILES = 10;
const MAX_KEYWORD_LENGTH = 120;
const MAX_SNAPSHOT_ENTRIES = 300;
const STREAM_POLL_INTERVAL_MS = 1500;
const STREAM_HEARTBEAT_INTERVAL_MS = 15000;
const LEVEL_PRIORITY: Record<LogLevel, number> = {
    debug: 10,
    info: 20,
    warn: 30,
    error: 40,
};

function parseSeverityThreshold(value: string | null): LogLevel | null {
    if (!value || value === "all") return null;
    const normalizedValue = value.trim().toLowerCase();
    // Severity filtering accepts exactly one threshold level.
    if (normalizedValue.includes(",")) return null;
    if (!ALLOWED_LEVELS.has(normalizedValue as LogLevel)) return null;
    return normalizedValue as LogLevel;
}

function parseKeywordFilter(value: string | null): string {
    if (!value) return "";
    return value.trim().slice(0, MAX_KEYWORD_LENGTH).toLowerCase();
}

function parseTimeRangeFilter(value: string | null): number | null {
    if (!value || value === "all") return null;
    const match = value.match(/^(\d+)(m|h)$/);
    if (!match) return null;
    const [, amountRaw, unit] = match;
    const amount = Number(amountRaw);
    if (!Number.isFinite(amount) || amount <= 0) return null;
    if (unit === "m") return amount * 60 * 1000;
    if (unit === "h") return amount * 60 * 60 * 1000;
    return null;
}

function parseTimestampMs(entry: Record<string, unknown>): number | null {
    const parsed = Date.parse(String(entry.ts ?? ""));
    if (Number.isNaN(parsed)) return null;
    return parsed;
}

function normalizeLogEntry(rawLine: string): Record<string, unknown> {
    try {
        const parsed = JSON.parse(rawLine) as Record<string, unknown>;
        const level = String(parsed.level ?? "info").toLowerCase();
        const ts = parsed.ts ? String(parsed.ts) : new Date().toISOString();
        const message = parsed.message ? String(parsed.message) : rawLine;
        return {
            ...parsed,
            ts,
            level: ALLOWED_LEVELS.has(level as LogLevel) ? level : "info",
            message,
        };
    } catch {
        return {
            ts: new Date().toISOString(),
            level: "info",
            message: rawLine,
            raw: rawLine,
        };
    }
}

function matchesFilters(
    entry: Record<string, unknown>,
    severityThreshold: LogLevel | null,
    keyword: string,
    timeRangeMs: number | null,
): boolean {
    const level = String(entry.level ?? "").toLowerCase() as LogLevel;
    if (!ALLOWED_LEVELS.has(level)) {
        return false;
    }
    if (
        severityThreshold &&
        LEVEL_PRIORITY[level] < LEVEL_PRIORITY[severityThreshold]
    ) {
        return false;
    }
    if (timeRangeMs !== null) {
        const tsMs = parseTimestampMs(entry);
        if (tsMs === null) return false;
        if (Date.now() - tsMs > timeRangeMs) {
            return false;
        }
    }
    if (!keyword) return true;
    return JSON.stringify(entry).toLowerCase().includes(keyword);
}

function writeSseEvent(
    res: ServerResponse,
    event: string,
    payload: Record<string, unknown>,
): void {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

async function readFileChunk(
    filePath: string,
    start: number,
    end: number,
): Promise<string> {
    const length = Math.max(0, end - start);
    if (length === 0) return "";
    const fileHandle = await open(filePath, "r");
    try {
        const buffer = Buffer.alloc(length);
        await fileHandle.read(buffer, 0, length, start);
        return buffer.toString("utf8");
    } finally {
        await fileHandle.close();
    }
}

function createLoggingRoutes(
    getFilePath: () => string,
    log?: BootstrapLog,
    routeContext?: RouteContext,
) {
    const ctx = resolveRouteContext(routeContext);
    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (url.pathname !== "/api/v1/logging/stream" || req.method !== "GET") {
            return false;
        }

        const claims = ctx.requireAuth(req, res, "admin");
        if (!claims) return true;
        const filePath = getFilePath();

        const severityThreshold = parseSeverityThreshold(
            url.searchParams.get("severity"),
        );
        const keyword = parseKeywordFilter(url.searchParams.get("keyword"));
        const timeRangeMs = parseTimeRangeFilter(
            url.searchParams.get("timeRange"),
        );
        let seq = 0;
        let contentLength = 0;
        let pendingLine = "";
        let closed = false;

        const pushEntry = (entry: Record<string, unknown>) => {
            if (!matchesFilters(entry, severityThreshold, keyword, timeRangeMs))
                return;
            writeSseEvent(res, "log", { id: seq++, ...entry });
        };

        const processLines = (lines: string[]) => {
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;
                pushEntry(normalizeLogEntry(trimmed));
            }
        };

        const sendSnapshot = async () => {
            try {
                const raw = await readFile(filePath, "utf8");
                contentLength = raw.length;
                const lines = raw.split("\n");
                pendingLine = lines.pop() ?? "";
                const entries = lines
                    .map((line) => line.trim())
                    .filter((line) => line.length > 0)
                    .map((line) => normalizeLogEntry(line))
                    .filter((entry) =>
                        matchesFilters(
                            entry,
                            severityThreshold,
                            keyword,
                            timeRangeMs,
                        ),
                    );
                for (const entry of entries.slice(-MAX_SNAPSHOT_ENTRIES)) {
                    writeSseEvent(res, "log", { id: seq++, ...entry });
                }
            } catch (error) {
                log?.(
                    "error",
                    "Failed to read log stream snapshot from log file.",
                    {
                        component: "logging-gateway",
                        operation: "stream_snapshot",
                        accountId: claims.sub,
                        path: filePath,
                        error:
                            error instanceof Error
                                ? error.message
                                : String(error),
                    },
                );
                writeSseEvent(res, "snapshot_error", {
                    code: "snapshot_unavailable",
                });
            }
        };

        const pollUpdates = async () => {
            if (closed) return;
            try {
                const fileStats = await stat(filePath);
                if (fileStats.size < contentLength) {
                    contentLength = 0;
                    pendingLine = "";
                    writeSseEvent(res, "reset", { reason: "log_rotated" });
                }
                if (fileStats.size === contentLength) {
                    return;
                }
                const append = await readFileChunk(
                    filePath,
                    contentLength,
                    fileStats.size,
                );
                contentLength = fileStats.size;
                const merged = `${pendingLine}${append}`;
                const chunks = merged.split("\n");
                pendingLine = chunks.pop() ?? "";
                processLines(chunks);
            } catch (error) {
                log?.(
                    "error",
                    "Failed to poll log stream updates from log file.",
                    {
                        component: "logging-gateway",
                        operation: "stream_poll",
                        accountId: claims.sub,
                        path: filePath,
                        error:
                            error instanceof Error
                                ? error.message
                                : String(error),
                    },
                );
            }
        };

        res.writeHead(200, {
            "content-type": "text/event-stream; charset=utf-8",
            "cache-control": "no-cache",
            connection: "keep-alive",
        });
        res.flushHeaders?.();
        res.write("retry: 1500\n\n");

        await sendSnapshot();

        const pollTimer = setInterval(() => {
            void pollUpdates();
        }, STREAM_POLL_INTERVAL_MS);
        pollTimer.unref?.();
        const heartbeatTimer = setInterval(() => {
            if (closed) return;
            res.write(": keepalive\n\n");
        }, STREAM_HEARTBEAT_INTERVAL_MS);
        heartbeatTimer.unref?.();

        const closeStream = () => {
            if (closed) return;
            closed = true;
            clearInterval(pollTimer);
            clearInterval(heartbeatTimer);
            log?.("info", "Closed admin log stream.", {
                component: "logging-gateway",
                operation: "stream_close",
                accountId: claims.sub,
            });
        };

        req.on("close", closeStream);
        res.on("close", closeStream);

        log?.("info", "Opened admin log stream.", {
            component: "logging-gateway",
            operation: "stream_open",
            accountId: claims.sub,
            severityThreshold: severityThreshold ?? "all",
            keyword: keyword || undefined,
            timeRangeMs: timeRangeMs ?? "all",
        });
        return true;
    };
}

type ConfigValue = LoggingPreferenceValue;
type LoggingAdapterContract = {
    id: string;
    name: string;
    stringsBaseUrl: string;
    schema: Array<{
        key: string;
        labelKey: string;
        type: "select" | "text" | "number" | "boolean";
        options?: string[];
    }>;
    validateConfig(config: Record<string, unknown>): {
        field: string;
        messageKey: string;
    } | null;
    toLoggerConfiguration(
        config: Record<string, unknown>,
    ): Record<string, unknown>;
};

async function loadLoggingAdapterContracts(
    adaptersRoot: string,
): Promise<LoggingAdapterContract[]> {
    const manifests = await loadAdapterAdminCatalog(adaptersRoot, "logging");
    return Promise.all(
        manifests.map(async (manifest) => {
            const moduleUrl = pathToFileURL(
                path.join(adaptersRoot, "logging", manifest.id, "index.ts"),
            ).href;
            const adapterModule = (await import(moduleUrl)) as {
                createLoggingAdapter(
                    levels: readonly string[],
                ): LoggingAdapterContract;
            };
            return {
                ...manifest,
                ...adapterModule.createLoggingAdapter(SUPPORTED_LOG_LEVELS),
            };
        }),
    );
}

function createLoggingAdapterRoutes(
    adapters: LoggingAdapterContract[],
    logger: Logger,
    environmentConfig: Record<string, Record<string, ConfigValue>>,
    preferenceStore: LoggingPreferenceStore,
    persistedOverrides: Map<string, Record<string, ConfigValue>>,
    log?: BootstrapLog,
    routeContext?: RouteContext,
) {
    const ctx = resolveRouteContext(routeContext);
    const base = "/api/v1/gateways/logging/adapters";
    const overrides = persistedOverrides;

    const applyConfiguration = () => {
        logger.configure(
            Object.assign(
                {},
                ...adapters.map((adapter) => {
                    const effectiveConfiguration = {
                        ...(environmentConfig[adapter.id] ?? {}),
                        ...(overrides.get(adapter.id) ?? {}),
                    };
                    return adapter.toLoggerConfiguration(
                        effectiveConfiguration,
                    );
                }),
            ),
        );
    };
    applyConfiguration();

    return async (req: IncomingMessage, res: ServerResponse, url: URL) => {
        if (!url.pathname.startsWith(base)) return false;
        const claims = ctx.requireAuth(req, res, "admin");
        if (!claims) return true;
        if (url.pathname === base && req.method === "GET") {
            res.writeHead(200, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    data: adapters.map((adapter) => ({
                        ...adapter,
                        active: true,
                        locked: true,
                        config: overrides.get(adapter.id) ?? {},
                        controls: {
                            config: `${base}/${adapter.id}/config`,
                            enable: `${base}/${adapter.id}/enable`,
                            disable: `${base}/${adapter.id}/disable`,
                        },
                    })),
                }),
            );
            return true;
        }
        const toggleMatch = url.pathname.match(
            new RegExp(`^${base}/([^/]+)/(enable|disable)$`),
        );
        if (
            toggleMatch &&
            req.method === "POST" &&
            adapters.some(({ id }) => id === toggleMatch[1])
        ) {
            res.writeHead(409, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    error: {
                        code: "adapter_locked",
                        message: "Adapter is managed by its gateway",
                    },
                }),
            );
            return true;
        }
        const match = url.pathname.match(
            new RegExp(`^${base}/([^/]+)/config$`),
        );
        const adapter = adapters.find(({ id }) => id === match?.[1]);
        if (!adapter) return false;
        if (req.method === "GET") {
            res.writeHead(200, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    data: overrides.get(adapter.id) ?? {},
                    envValues: environmentConfig[adapter.id],
                    schema: adapter.schema,
                    supportsReset: true,
                }),
            );
            return true;
        }
        if (req.method === "DELETE") {
            await preferenceStore.delete(adapter.id);
            overrides.delete(adapter.id);
            applyConfiguration();
            log?.("info", "Reset logging adapter configuration.", {
                component: "logging-gateway",
                operation: "adapter_config_reset",
                accountId: claims.sub,
                adapterId: adapter.id,
            });
            res.writeHead(204);
            res.end();
            return true;
        }
        if (req.method === "PUT") {
            const body = (await readJson(req)) as Record<string, unknown>;
            const allowedKeys = new Set(adapter.schema.map(({ key }) => key));
            const config = Object.fromEntries(
                Object.entries(body).filter(([key]) => allowedKeys.has(key)),
            ) as Record<string, ConfigValue>;
            const validationError = adapter.validateConfig(config);
            if (validationError) {
                res.writeHead(400, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "invalid_config",
                            field: validationError.field,
                            messageKey: validationError.messageKey,
                        },
                    }),
                );
                return true;
            }
            await preferenceStore.set(adapter.id, config);
            overrides.set(adapter.id, config);
            applyConfiguration();
            log?.("info", "Updated logging adapter configuration.", {
                component: "logging-gateway",
                operation: "adapter_config_update",
                accountId: claims.sub,
                adapterId: adapter.id,
                changedFields: Object.keys(config).sort(),
            });
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { saved: true } }));
            return true;
        }
        return false;
    };
}

/**
 * Standard gateway bootstrap entry point for structured application logging.
 * Reads the file:append capability contributed by the files gateway and passes
 * it to the Logger so all log persistence routes through the file gateway
 * abstraction. Falls back to native appendFile if the capability is absent
 * (e.g. in isolated tests).
 *
 * Creates a Logger instance from environment variables, contributes:
 *
 *   logging:logger  — the full Logger instance
 *   logging:log     — a plain function compatible with BootstrapLog, used by
 *                     the gateway bootstrapper to attach ctx.log after this
 *                     gateway initializes
 *
 * This gateway is marked required: true in its manifest so core refuses to
 * start if it fails to initialize. Its manifest declares database and file
 * gateway dependencies so persistent preferences and file output are available
 * before logging bootstraps.
 */
export async function bootstrap(ctx: GatewayBootstrapContext): Promise<void> {
    const log = ctx.log;
    const routeContext =
        ctx.capabilities.get<RouteContext>("auth:routeContext");
    const dbExecutor = ctx.capabilities.require<DbExecutor>("db:executor");
    const preferenceStore = new LoggingPreferenceStore(dbExecutor);
    await preferenceStore.ensureSchema();
    const level = ALLOWED_LEVELS.has(process.env.LOG_LEVEL as LogLevel)
        ? (process.env.LOG_LEVEL as LogLevel)
        : "info";
    const fileLevel = ALLOWED_LEVELS.has(process.env.LOG_FILE_LEVEL as LogLevel)
        ? (process.env.LOG_FILE_LEVEL as LogLevel)
        : "debug";
    const filePath = process.env.LOG_FILE ?? "/app/logs/app.log";
    const consoleFormat = process.env.LOG_FORMAT === "json" ? "json" : "pretty";
    const parsedRotateMaxBytes = Number.parseInt(
        process.env.LOG_ROTATE_MAX_BYTES ?? String(DEFAULT_ROTATE_MAX_BYTES),
        10,
    );
    const rotateMaxBytes =
        Number.isFinite(parsedRotateMaxBytes) && parsedRotateMaxBytes > 0
            ? parsedRotateMaxBytes
            : DEFAULT_ROTATE_MAX_BYTES;
    const parsedRotateMaxFiles = Number.parseInt(
        process.env.LOG_ROTATE_MAX_FILES ?? String(DEFAULT_ROTATE_MAX_FILES),
        10,
    );
    const rotateMaxFiles =
        Number.isFinite(parsedRotateMaxFiles) && parsedRotateMaxFiles >= 0
            ? parsedRotateMaxFiles
            : DEFAULT_ROTATE_MAX_FILES;
    const rotateCompress =
        process.env.LOG_ROTATE_COMPRESS !== "0" &&
        process.env.LOG_ROTATE_COMPRESS !== "false";

    const fileAppend =
        ctx.capabilities.get<(fp: string, content: string) => Promise<void>>(
            "file:append",
        );

    const logger = new Logger(
        level,
        filePath,
        fileAppend,
        consoleFormat,
        {
            maxBytes: rotateMaxBytes,
            maxFiles: rotateMaxFiles,
            compressRotated: rotateCompress,
        },
        fileLevel,
    );

    ctx.capabilities.contribute("logging:logger", logger);
    ctx.capabilities.contribute(
        "logging:log",
        (
            logLevel: "debug" | "info" | "warn" | "error",
            message: string,
            meta?: Record<string, unknown>,
        ) => {
            void logger.log(logLevel, message, meta);
        },
    );
    ctx.routeRegistry.register(
        createLoggingRoutes(
            () => logger.getConfiguration().filePath,
            log,
            routeContext,
        ),
        "logging",
    );
    const adaptersRoot =
        ctx.adaptersRoot ?? path.resolve(process.cwd(), "src", "adapters");
    const adapterCatalog = await loadLoggingAdapterContracts(adaptersRoot);
    const storedPreferences = await preferenceStore.getAll();
    const persistedOverrides = new Map<string, Record<string, ConfigValue>>();
    for (const adapter of adapterCatalog) {
        const storedConfig = storedPreferences.get(adapter.id);
        if (storedConfig && !adapter.validateConfig(storedConfig)) {
            persistedOverrides.set(adapter.id, storedConfig);
        }
    }
    for (const adapter of adapterCatalog) {
        ctx.uiRegistry?.registerAdapterStaticDir(
            "logging",
            adapter.id,
            path.join(adaptersRoot, "logging", adapter.id),
        );
    }
    ctx.routeRegistry.register(
        createLoggingAdapterRoutes(
            adapterCatalog,
            logger,
            {
                console: { level, format: consoleFormat },
                file: {
                    level: fileLevel,
                    rotateMaxBytes,
                    rotateMaxFiles,
                    rotateCompress,
                },
            },
            preferenceStore,
            persistedOverrides,
            log,
            routeContext,
        ),
        "logging",
    );

    const uiDir = path.resolve(
        process.cwd(),
        "src",
        "gateways",
        "logging",
        "ui",
    );
    ctx.uiRegistry?.registerAdminSection({
        id: "logs",
        label: "Logs",
        scriptUrl: "/static/gateways/logging/admin-section.js",
    });
    ctx.uiRegistry?.registerStaticDir("logging", uiDir);

    ctx.routeRegistry.registerPrefix("/api/v1/logging", "logging");
    ctx.gatewayRegistry.register({
        id: "logging",
        name: "Logging Gateway",
        version: "1.5.10",
        required: true,
        description:
            "Structured application logging to stdout/stderr and file.",
        publisher: "Cognis Labs HQ",
        hasAdapters: true,
    });

    log?.("info", "Logging gateway initialized.", {
        component: "logging-gateway",
        operation: "bootstrap",
        filePath,
        level,
        fileLevel,
        consoleFormat,
        rotateMaxBytes,
        rotateMaxFiles,
        rotateCompress,
    });
}
