export {
    Logger,
    createLogEntry,
    formatConsoleLog,
    writeConsoleLog,
} from "../../gateways/logging/logger.js";
export type {
    ConsoleLogFormat,
    LogEntry,
    LogLevel,
} from "../../gateways/logging/logger.js";

import {
    writeConsoleLog,
    type LogLevel,
} from "../../gateways/logging/logger.js";

export type AppLog = (
    level: LogLevel,
    message: string,
    metadata?: Record<string, unknown>,
) => void;

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
    debug: 10,
    info: 20,
    warn: 30,
    error: 40,
};

export function createConsoleLog(minimumLevel: LogLevel = "info"): AppLog {
    return (level, message, metadata) => {
        if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[minimumLevel]) {
            return;
        }
        writeConsoleLog(level, message, metadata);
    };
}

let appLogger: AppLog = createConsoleLog();

export function setAppLogger(log?: AppLog): void {
    appLogger = log ?? createConsoleLog();
}

export function logAppEvent(
    level: LogLevel,
    message: string,
    metadata?: Record<string, unknown>,
): void {
    appLogger(level, message, metadata);
}
