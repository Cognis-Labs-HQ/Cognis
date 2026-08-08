export function createLoggingAdapter(supportedLevels: readonly string[]) {
    return {
        id: "file",
        name: "File Logging",
        schema: [
            {
                key: "level",
                labelKey: "adapter.logging.file.level",
                type: "select",
                options: [...supportedLevels],
            },
            {
                key: "rotateMaxBytes",
                labelKey: "adapter.logging.file.rotate_max_bytes",
                type: "number",
            },
            {
                key: "rotateMaxFiles",
                labelKey: "adapter.logging.file.rotate_max_files",
                type: "number",
            },
            {
                key: "rotateCompress",
                labelKey: "adapter.logging.file.rotate_compress",
                type: "boolean",
            },
        ],
        validateConfig(config: Record<string, unknown>) {
            if (
                typeof config.level !== "string" ||
                !supportedLevels.includes(config.level)
            ) {
                return { field: "level", message: "Unsupported log level" };
            }
            if (
                typeof config.rotateMaxBytes !== "number" ||
                !Number.isFinite(config.rotateMaxBytes) ||
                config.rotateMaxBytes <= 0
            ) {
                return {
                    field: "rotateMaxBytes",
                    message: "Rotation size must be a positive number",
                };
            }
            if (
                typeof config.rotateMaxFiles !== "number" ||
                !Number.isInteger(config.rotateMaxFiles) ||
                config.rotateMaxFiles < 0
            ) {
                return {
                    field: "rotateMaxFiles",
                    message:
                        "Rotated file count must be a non-negative integer",
                };
            }
            if (typeof config.rotateCompress !== "boolean") {
                return {
                    field: "rotateCompress",
                    message: "Compression setting must be a boolean",
                };
            }
            return null;
        },
        toLoggerConfiguration(config: Record<string, unknown>) {
            return {
                fileLevel: config.level,
                rotation: {
                    maxBytes: config.rotateMaxBytes,
                    maxFiles: config.rotateMaxFiles,
                    compressRotated: config.rotateCompress,
                },
            };
        },
    } as const;
}
