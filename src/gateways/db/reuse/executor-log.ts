import type { BootstrapLog } from "@cognis/core";

export function summarizeStatement(sql: string): string {
    const statement = sql.trim().split(/\s+/, 1)[0];
    return statement ? statement.toUpperCase() : "UNKNOWN";
}

export function getErrorCode(error: unknown): string | undefined {
    const code = (error as { code?: unknown })?.code;
    if (typeof code === "string" || typeof code === "number") {
        return String(code);
    }
    return undefined;
}

function buildDatabaseErrorMetadata(error: unknown): Record<string, unknown> {
    const metadata: Record<string, unknown> = {
        errorName: error instanceof Error ? error.name : typeof error,
    };
    const errorCode = getErrorCode(error);
    if (errorCode) {
        metadata.errorCode = errorCode;
    }
    return metadata;
}
export { buildDatabaseErrorMetadata as buildDbErrorMeta };

function writeDatabaseLog(
    log: BootstrapLog | undefined,
    level: "debug" | "info" | "warn" | "error",
    message: string,
    metadata?: Record<string, unknown>,
): void {
    log?.(level, message, metadata);
}
export { writeDatabaseLog as writeDbLog };
