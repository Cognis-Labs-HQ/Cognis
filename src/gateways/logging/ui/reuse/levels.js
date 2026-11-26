/** Shared logging levels, priorities and native console aliases for the gateway. */
import catalog from "./levels.json" with { type: "json" };

export const LEVEL_PRIORITY = Object.freeze(catalog.priorities);
export const SUPPORTED_LOG_LEVELS = Object.freeze(Object.keys(LEVEL_PRIORITY));
const allowedLevels = new Set(SUPPORTED_LOG_LEVELS);
export const CONSOLE_LEVELS = Object.freeze({
    ...Object.fromEntries(SUPPORTED_LOG_LEVELS.map((level) => [level, level])),
    ...catalog.consoleAliases,
});

export function isLogLevel(level) {
    return allowedLevels.has(level);
}
