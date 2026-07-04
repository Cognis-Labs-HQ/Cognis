import type { IncomingMessage, ServerResponse } from "node:http";
import { readJson } from "../../../../api/reuse/read-json.js";
import { jsonError, jsonOk } from "../../../../api/reuse/json-responses.js";
import type { RouteContext } from "../../../../api/reuse/route-context.js";
import type { DbExecutor } from "../../../../gateways/db/reuse/db-executor.js";

const CONFIG_TABLE = "file_reader_text_config";
const CONFIG_ROUTE = "/api/v1/gateways/file-reader/adapters/text/config";

async function ensureSchema(dbExecutor: DbExecutor): Promise<void> {
    await dbExecutor.executeSchemaCommand({
        option: "CREATE_TABLE",
        table: {
            name: CONFIG_TABLE,
            columns: [
                {
                    name: "id",
                    type: "INTEGER",
                    constraints: ["PRIMARY KEY"],
                },
                {
                    name: "max_file_bytes",
                    type: "INTEGER",
                    constraints: ["NOT NULL"],
                },
                {
                    name: "updated_at",
                    type: "TIMESTAMP",
                    constraints: ["DEFAULT CURRENT_TIMESTAMP"],
                },
            ],
        },
    });
}

async function loadStoredMaxFileBytes(
    dbExecutor: DbExecutor,
): Promise<number | null> {
    const result = await dbExecutor.executeCommand({
        option: "SELECT",
        table: CONFIG_TABLE,
        columns: ["max_file_bytes"],
        where: [{ column: "id", value: 1 }],
    });
    const row = result.rows?.[0];
    if (!row) return null;
    return Number(row.max_file_bytes) || null;
}

async function saveMaxFileBytes(
    dbExecutor: DbExecutor,
    value: number,
    existing: boolean,
): Promise<void> {
    if (existing) {
        await dbExecutor.executeCommand({
            option: "UPDATE",
            table: CONFIG_TABLE,
            values: {
                max_file_bytes: value,
                updated_at: new Date().toISOString(),
            },
            where: [{ column: "id", value: 1 }],
        });
    } else {
        await dbExecutor.executeCommand({
            option: "INSERT",
            table: CONFIG_TABLE,
            values: {
                id: 1,
                max_file_bytes: value,
                updated_at: new Date().toISOString(),
            },
        });
    }
}

export function createTextAdapterConfigRoutes(options: {
    ctx: RouteContext;
    dbExecutor: DbExecutor;
    defaultMaxFileBytes: number;
    minMaxFileBytes: number;
    maxMaxFileBytes: number;
    normalizeMaxFileBytes: (input: unknown) => number;
    onConfigChanged: (value: number) => void;
    log?: (
        level: string,
        message: string,
        meta?: Record<string, unknown>,
    ) => void;
}) {
    const { ctx, dbExecutor, normalizeMaxFileBytes, onConfigChanged, log } =
        options;

    const initializeConfig = async () => {
        try {
            await ensureSchema(dbExecutor);
            const stored = await loadStoredMaxFileBytes(dbExecutor);
            if (stored !== null) {
                onConfigChanged(normalizeMaxFileBytes(stored));
            }
        } catch (error) {
            log?.(
                "error",
                "File-reader/text adapter: failed to initialize config.",
                {
                    component: "file-reader-text",
                    operation: "initialize_config",
                    error:
                        error instanceof Error ? error.message : String(error),
                },
            );
        }
    };

    void initializeConfig();

    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (url.pathname !== CONFIG_ROUTE) return false;

        if (req.method === "GET") {
            if (!ctx.requireAuth(req, res, "admin")) return true;
            try {
                const stored = await loadStoredMaxFileBytes(dbExecutor);
                jsonOk(res, {
                    data: {
                        maxFileBytes: {
                            effectiveValue:
                                stored ?? options.defaultMaxFileBytes,
                            schemaType: "number",
                            schemaLabel: "Max File Size (bytes)",
                        },
                    },
                    requiredFields: [],
                });
            } catch (error) {
                log?.("error", "File-reader/text: failed to load config.", {
                    component: "file-reader-text",
                    operation: "get_config",
                    error:
                        error instanceof Error ? error.message : String(error),
                });
                jsonError(res, 500, "internal_error", "Failed to load config.");
            }
            return true;
        }

        if (req.method === "PUT" || req.method === "POST") {
            if (!ctx.requireAuth(req, res, "admin")) return true;
            const body = (await readJson(req)) as Record<string, unknown>;
            const raw = (body.config as Record<string, unknown>)?.maxFileBytes;
            if (raw === undefined || raw === null) {
                jsonError(res, 400, "bad_request", "maxFileBytes is required.");
                return true;
            }
            const nextValue = normalizeMaxFileBytes(raw);
            try {
                const existing = await loadStoredMaxFileBytes(dbExecutor);
                await saveMaxFileBytes(
                    dbExecutor,
                    nextValue,
                    existing !== null,
                );
                onConfigChanged(nextValue);
                log?.(
                    "info",
                    "File-reader/text adapter: max file size updated.",
                    {
                        component: "file-reader-text",
                        operation: "update_config",
                        maxFileBytes: nextValue,
                    },
                );
                jsonOk(res, { success: true });
            } catch (error) {
                log?.("error", "File-reader/text: failed to save config.", {
                    component: "file-reader-text",
                    operation: "save_config",
                    error:
                        error instanceof Error ? error.message : String(error),
                });
                jsonError(res, 500, "internal_error", "Failed to save config.");
            }
            return true;
        }

        return false;
    };
}
