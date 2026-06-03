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
    meta?: Record<string, unknown>,
) => void;

let appLogger: AppLog = (level, message, meta) => {
    writeConsoleLog(level, message, meta);
};

export function setAppLogger(log?: AppLog): void {
    appLogger =
        log ??
        ((level, message, meta) => {
            writeConsoleLog(level, message, meta);
        });
}

export function logAppEvent(
    level: LogLevel,
    message: string,
    meta?: Record<string, unknown>,
): void {
    appLogger(level, message, meta);
}
