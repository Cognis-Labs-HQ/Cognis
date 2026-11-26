import catalog from "./levels.json" with { type: "json" };

export type LogLevel = keyof typeof catalog.priorities;
export declare const LEVEL_PRIORITY: Readonly<Record<LogLevel, number>>;
export declare const SUPPORTED_LOG_LEVELS: readonly LogLevel[];
export declare const CONSOLE_LEVELS: Readonly<Record<string, LogLevel>>;
export declare function isLogLevel(level: unknown): level is LogLevel;
