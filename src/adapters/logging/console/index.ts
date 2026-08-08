export function createLoggingAdapter(supportedLevels: readonly string[]) {
    return {
        id: "console",
        name: "Console Logging",
        schema: [
            {
                key: "level",
                labelKey: "adapter.logging.console.level",
                type: "select",
                options: [...supportedLevels],
            },
            {
                key: "format",
                labelKey: "adapter.logging.console.format",
                type: "select",
                options: ["pretty", "json"],
            },
        ],
        validateConfig(config: Record<string, unknown>) {
            if (
                typeof config.level !== "string" ||
                !supportedLevels.includes(config.level)
            ) {
                return { field: "level", message: "Unsupported log level" };
            }
            if (config.format !== "pretty" && config.format !== "json") {
                return {
                    field: "format",
                    message: "Unsupported output format",
                };
            }
            return null;
        },
        toLoggerConfiguration(config: Record<string, unknown>) {
            return {
                consoleLevel: config.level,
                consoleFormat: config.format,
            };
        },
    } as const;
}
