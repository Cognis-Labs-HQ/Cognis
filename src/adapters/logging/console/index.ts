export function createLoggingAdapter(supportedLevels: readonly string[]) {
    return {
        id: "console",
        name: "Console Logging",
        schema: [
            {
                key: "level",
                label: "Log level",
                type: "select",
                options: [...supportedLevels],
            },
            {
                key: "format",
                label: "Output format",
                type: "select",
                options: ["pretty", "json"],
            },
        ],
    } as const;
}
