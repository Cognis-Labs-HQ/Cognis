import { open, readFile, stat } from "node:fs/promises";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { Logger } from "./logger.js";
import { type BootstrapLog, type GatewayBootstrapContext } from "../shared.js";
import {
    resolveRouteContext,
    type RouteContext,
} from "../../api/reuse/route-context.js";

type LogLevel = "debug" | "info" | "warn" | "error";

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
    filePath: string,
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
 * start if it fails to initialize. It declares a dependency on the files
 * gateway (requires: ["files"] in manifest.json) so the files gateway always
 * bootstraps first.
 */
export async function bootstrap(ctx: GatewayBootstrapContext): Promise<void> {
    const log = ctx.log;
    const routeContext =
        ctx.capabilities.get<RouteContext>("auth:routeContext");
    const level =
        (process.env.LOG_LEVEL as
            | "debug"
            | "info"
            | "warn"
            | "error"
            | undefined) ?? "info";
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

    const logger = new Logger(level, filePath, fileAppend, consoleFormat, {
        maxBytes: rotateMaxBytes,
        maxFiles: rotateMaxFiles,
        compressRotated: rotateCompress,
    });

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
        createLoggingRoutes(filePath, log, routeContext),
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
        version: "1.5.1",
        required: true,
        description:
            "Structured application logging to stdout/stderr and file.",
        publisher: "Cognis Labs HQ",
    });

    log?.("info", "Logging gateway initialized.", {
        component: "logging-gateway",
        operation: "bootstrap",
        filePath,
        level,
        consoleFormat,
        rotateMaxBytes,
        rotateMaxFiles,
        rotateCompress,
    });
}
