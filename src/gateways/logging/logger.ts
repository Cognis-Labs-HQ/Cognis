import {
    mkdir,
    appendFile,
    stat,
    rename,
    readFile,
    writeFile,
    unlink,
    readdir,
} from "node:fs/promises";
import path from "node:path";
import { gzipSync } from "node:zlib";

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
const ROTATED_LOG_SUFFIX_PATTERN =
    /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z-[a-z0-9]+(?:\.gz)?$/;

type FileAppend = (filePath: string, content: string) => Promise<void>;

export interface LoggerRotationOptions {
    maxBytes?: number;
    maxFiles?: number;
    compressRotated?: boolean;
}

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
    const definedEntries = meta
        ? Object.entries(meta).filter(([, value]) => value !== undefined)
        : [];
    return {
        ts: new Date().toISOString(),
        level,
        message,
        meta:
            definedEntries.length > 0
                ? Object.fromEntries(definedEntries)
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
    private readonly rotationOptions: Required<LoggerRotationOptions>;
    private writeQueue: Promise<void> = Promise.resolve();

    constructor(
        private readonly level: LogLevel = "info",
        private readonly filePath = "/tmp/cognis.log",
        fileAppend?: FileAppend,
        private readonly consoleFormat: ConsoleLogFormat = "pretty",
        rotationOptions?: LoggerRotationOptions,
    ) {
        this.fileAppend = fileAppend ?? defaultFileAppend;
        this.rotationOptions = {
            maxBytes:
                Number.isFinite(rotationOptions?.maxBytes) &&
                Number(rotationOptions?.maxBytes) > 0
                    ? Number(rotationOptions?.maxBytes)
                    : 10 * 1024 * 1024,
            maxFiles:
                Number.isFinite(rotationOptions?.maxFiles) &&
                Number(rotationOptions?.maxFiles) >= 0
                    ? Number(rotationOptions?.maxFiles)
                    : 10,
            compressRotated: rotationOptions?.compressRotated !== false,
        };
    }

    async log(
        level: LogLevel,
        message: string,
        meta?: Record<string, unknown>,
    ): Promise<void> {
        const entry = createLogEntry(level, message, meta);
        const line = `${serializeLogEntry(entry)}\n`;
        if (priorities[level] >= priorities[this.level]) {
            writeConsoleLog(level, message, meta, this.consoleFormat);
        }
        const appendLogEntry = async () => {
            await this.rotateIfNeeded(Buffer.byteLength(line, "utf8"));
            await this.fileAppend(this.filePath, line);
        };
        await this.enqueueWrite(appendLogEntry);
    }

    private async enqueueWrite(
        appendLogEntry: () => Promise<void>,
    ): Promise<void> {
        // Continue queue processing after failures by running appendLogEntry for
        // both fulfilled and rejected prior writes.
        const pendingWrite = this.writeQueue.then(
            appendLogEntry,
            appendLogEntry,
        );
        this.writeQueue = pendingWrite.then(
            () => undefined,
            () => undefined,
        );
        await pendingWrite;
    }

    private async rotateIfNeeded(incomingBytes: number): Promise<void> {
        if (this.rotationOptions.maxBytes <= 0) {
            return;
        }
        let existingSize = 0;
        try {
            const fileStats = await stat(this.filePath);
            existingSize = fileStats.size;
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === "ENOENT") {
                return;
            }
            throw error;
        }
        if (existingSize + incomingBytes <= this.rotationOptions.maxBytes) {
            return;
        }
        const timestamp = new Date()
            .toISOString()
            .replaceAll(":", "-")
            .replaceAll(".", "-");
        // Base-36 produces lowercase alphanumeric output compatible with
        // ROTATED_LOG_SUFFIX_PATTERN.
        const hrtimeIdentifier = process.hrtime.bigint().toString(36);
        const rotatedPath = `${this.filePath}.${timestamp}-${hrtimeIdentifier}`;
        await mkdir(path.dirname(this.filePath), { recursive: true });
        await rename(this.filePath, rotatedPath);
        if (this.rotationOptions.compressRotated) {
            const rotatedContent = await readFile(rotatedPath);
            const compressed = gzipSync(rotatedContent);
            const compressedPath = `${rotatedPath}.gz`;
            await writeFile(compressedPath, compressed);
            await unlink(rotatedPath);
        }
        await this.cleanupRotatedFiles();
    }

    private async cleanupRotatedFiles(): Promise<void> {
        if (this.rotationOptions.maxFiles < 0) {
            return;
        }
        const dirPath = path.dirname(this.filePath);
        const baseName = path.basename(this.filePath);
        const entries = await readdir(dirPath);
        const rotatedCandidates = entries
            .filter(
                (entry) =>
                    entry.startsWith(`${baseName}.`) &&
                    ROTATED_LOG_SUFFIX_PATTERN.test(
                        entry.slice(baseName.length + 1),
                    ),
            )
            .map((entry) => path.join(dirPath, entry));
        const resolved = await Promise.all(
            rotatedCandidates.map(async (file) => ({
                file,
                mtimeMs: (await stat(file)).mtimeMs,
            })),
        );
        resolved.sort((a, b) => b.mtimeMs - a.mtimeMs);
        const removable = resolved.slice(this.rotationOptions.maxFiles);
        await Promise.all(removable.map(({ file }) => unlink(file)));
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
