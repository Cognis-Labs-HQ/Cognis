import { mkdir, appendFile } from "node:fs/promises";
import path from "node:path";

export type LogLevel = "debug" | "info" | "warn" | "error";

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

export class Logger {
    private readonly fileAppend: FileAppend;

    constructor(
        private readonly level: LogLevel = "info",
        private readonly filePath = "/tmp/cognis.log",
        fileAppend?: FileAppend,
    ) {
        this.fileAppend = fileAppend ?? defaultFileAppend;
    }

    async log(
        level: LogLevel,
        message: string,
        meta?: Record<string, unknown>,
    ) {
        if (priorities[level] < priorities[this.level]) return;
        const line = JSON.stringify({
            ts: new Date().toISOString(),
            level,
            message,
            ...meta,
        });

        if (level === "error") {
            process.stderr.write(`${line}\n`);
        } else {
            process.stdout.write(`${line}\n`);
        }

        await this.fileAppend(this.filePath, `${line}\n`);
    }

    info(message: string, meta?: Record<string, unknown>) {
        return this.log("info", message, meta);
    }
    warn(message: string, meta?: Record<string, unknown>) {
        return this.log("warn", message, meta);
    }
    error(message: string, meta?: Record<string, unknown>) {
        return this.log("error", message, meta);
    }
}
