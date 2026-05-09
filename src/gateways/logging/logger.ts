import { mkdir, appendFile } from "node:fs/promises";
import path from "node:path";

export type LogLevel = "debug" | "info" | "warn" | "error";
export type ConsoleLogFormat = "pretty" | "json";

export interface LogEntry {
    ts: string;
    level: LogLevel;
    message: string;
    meta?: Record<string, unknown>;
}

const priorities: Record<LogLevel, number> = {
    debug: 10,
    info: 20,
    warn: 30,
    error: 40,
};

type FileAppend = (filePath: string, content: string) => Promise<void>;

const defaultFileAppend: FileAppend = async (filePath, content) => {
    await mkdir(path.dirname(filePath), { recursive: true });
    await appendFile(filePath, content, "utf8");
};

function serializeLogEntry(entry: LogEntry): string {
    return JSON.stringify({
        ts: entry.ts,
        level: entry.level,
        message: entry.message,
        ...(entry.meta ?? {}),
    });
}

function formatPrettyValue(value: unknown, indent = "    "): string {
    if (
        value === null ||
        typeof value === "number" ||
        typeof value === "boolean"
    ) {
        return String(value);
    }
    if (typeof value === "string") {
        return value;
    }
    if (value === undefined) {
        return "undefined";
    }
    return JSON.stringify(value, null, 2)
        .split("\n")
        .map((line, index) => (index === 0 ? line : `${indent}${line}`))
        .join("\n");
}

export function createLogEntry(
    level: LogLevel,
    message: string,
    meta?: Record<string, unknown>,
): LogEntry {
    return {
        ts: new Date().toISOString(),
        level,
        message,
        meta:
            meta && Object.keys(meta).length > 0
                ? Object.fromEntries(
                      Object.entries(meta).filter(
                          ([, value]) => value !== undefined,
                      ),
                  )
                : undefined,
    };
}

export function formatConsoleLog(
    entry: LogEntry,
    format: ConsoleLogFormat = "pretty",
): string {
    if (format === "json") {
        return serializeLogEntry(entry);
    }

    const baseLine = `${entry.ts} ${entry.level.toUpperCase().padEnd(5)} ${entry.message}`;
    if (!entry.meta || Object.keys(entry.meta).length === 0) {
        return baseLine;
    }

    const metaLines = Object.entries(entry.meta).map(
        ([key, value]) => `  ${key}: ${formatPrettyValue(value)}`,
    );
    return `${baseLine}\n${metaLines.join("\n")}`;
}

export function writeConsoleLog(
    level: LogLevel,
    message: string,
    meta?: Record<string, unknown>,
    format: ConsoleLogFormat = "pretty",
): void {
    const entry = createLogEntry(level, message, meta);
    const line = formatConsoleLog(entry, format);
    if (level === "error") {
        process.stderr.write(`${line}\n`);
        return;
    }
    process.stdout.write(`${line}\n`);
}

export class Logger {
    private readonly fileAppend: FileAppend;

    constructor(
        private readonly level: LogLevel = "info",
        private readonly filePath = "/tmp/cognis.log",
        fileAppend?: FileAppend,
        private readonly consoleFormat: ConsoleLogFormat = "pretty",
    ) {
        this.fileAppend = fileAppend ?? defaultFileAppend;
    }

    async log(
        level: LogLevel,
        message: string,
        meta?: Record<string, unknown>,
    ): Promise<void> {
        if (priorities[level] < priorities[this.level]) return;
        const entry = createLogEntry(level, message, meta);
        writeConsoleLog(level, message, meta, this.consoleFormat);
        await this.fileAppend(this.filePath, `${serializeLogEntry(entry)}\n`);
    }

    debug(message: string, meta?: Record<string, unknown>): Promise<void> {
        return this.log("debug", message, meta);
    }

    info(message: string, meta?: Record<string, unknown>): Promise<void> {
        return this.log("info", message, meta);
    }

    warn(message: string, meta?: Record<string, unknown>): Promise<void> {
        return this.log("warn", message, meta);
    }

    error(message: string, meta?: Record<string, unknown>): Promise<void> {
        return this.log("error", message, meta);
    }
}
