export function createLoggingAdapter(supportedLevels: readonly string[]) {
    return {
        id: "file",
        name: "File Logging",
        schema: [
            {
                key: "level",
                label: "Log level",
                type: "select",
                options: [...supportedLevels],
            },
            { key: "path", label: "Log file path", type: "text" },
            {
                key: "rotateMaxBytes",
                label: "Rotation size (bytes)",
                type: "number",
            },
            {
                key: "rotateMaxFiles",
                label: "Rotated files to keep",
                type: "number",
            },
            {
                key: "rotateCompress",
                label: "Log Compression",
                type: "boolean",
            },
        ],
    } as const;
}
