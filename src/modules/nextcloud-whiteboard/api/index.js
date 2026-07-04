import { randomUUID } from "node:crypto";
import { readJson } from "../../../api/reuse/read-json.js";
import {
    getWhiteboardConfig,
    normalizeWhiteboardConfig,
    setWhiteboardConfig,
} from "./config-state.js";

const MODULE_CONFIG_TABLE = "nextcloud_whiteboard_module_config";
const CLASSROOM_WHITEBOARDS_TABLE = "classroom_whiteboards";

function sendJson(res, status, payload) {
    res.writeHead(status, { "content-type": "application/json" });
    res.end(JSON.stringify(payload));
}

function sendError(res, status, code, message) {
    sendJson(res, status, {
        error: {
            code,
            message,
        },
    });
}

async function ensureSchema(dbExecutor) {
    await dbExecutor.executeSchemaCommand({
        option: "CREATE_TABLE",
        table: {
            name: MODULE_CONFIG_TABLE,
            columns: [
                {
                    name: "id",
                    type: "INTEGER",
                    constraints: ["PRIMARY KEY"],
                },
                {
                    name: "whiteboard_url",
                    type: "TEXT",
                    constraints: ["NOT NULL"],
                },
                {
                    name: "whiteboard_secret",
                    type: "TEXT",
                    constraints: ["NOT NULL"],
                },
                {
                    name: "token_expiry_seconds",
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

async function loadStoredConfig(dbExecutor) {
    const result = await dbExecutor.executeCommand({
        option: "SELECT",
        table: MODULE_CONFIG_TABLE,
        columns: [
            "whiteboard_url",
            "whiteboard_secret",
            "token_expiry_seconds",
        ],
        where: [{ column: "id", value: 1 }],
    });
    const row = result.rows?.[0];
    if (!row) return null;
    return normalizeWhiteboardConfig({
        whiteboardUrl: row.whiteboard_url,
        whiteboardSecret: row.whiteboard_secret,
        tokenExpirySeconds: row.token_expiry_seconds,
    });
}

async function saveConfig(dbExecutor, nextConfig) {
    const existingConfig = await loadStoredConfig(dbExecutor);
    if (existingConfig) {
        await dbExecutor.executeCommand({
            option: "UPDATE",
            table: MODULE_CONFIG_TABLE,
            values: {
                whiteboard_url: nextConfig.whiteboardUrl,
                whiteboard_secret: nextConfig.whiteboardSecret,
                token_expiry_seconds: nextConfig.tokenExpirySeconds,
                updated_at: new Date().toISOString(),
            },
            where: [{ column: "id", value: 1 }],
        });
        return;
    }
    await dbExecutor.executeCommand({
        option: "INSERT",
        table: MODULE_CONFIG_TABLE,
        values: {
            id: 1,
            whiteboard_url: nextConfig.whiteboardUrl,
            whiteboard_secret: nextConfig.whiteboardSecret,
            token_expiry_seconds: nextConfig.tokenExpirySeconds,
            updated_at: new Date().toISOString(),
        },
    });
}

async function ensureWhiteboardsSchema(dbExecutor) {
    await dbExecutor.ensureTable({
        name: CLASSROOM_WHITEBOARDS_TABLE,
        columns: [
            { name: "id", type: "text", notNull: true },
            { name: "class_id", type: "text", notNull: true },
            { name: "name", type: "text", notNull: true, default: "" },
            { name: "file_key", type: "text" },
            { name: "created_by", type: "text", notNull: true },
            {
                name: "created_at",
                type: "timestamp",
                notNull: true,
                default: "now",
            },
        ],
        primaryKey: ["id"],
    });
}

function mapWhiteboardRow(raw) {
    return {
        id: String(raw.id),
        classId: String(raw.class_id),
        name: String(raw.name ?? ""),
        fileKey: raw.file_key == null ? null : String(raw.file_key),
        createdBy: String(raw.created_by),
        createdAt: String(raw.created_at),
    };
}

/**
 * Creates a store object that performs raw whiteboard CRUD operations on
 * `classroom_whiteboards`. Access control is the caller's responsibility.
 */
export function createClassroomWhiteboardStore(dbExecutor) {
    return {
        async list(classId) {
            const result = await dbExecutor.executeCommand({
                option: "SELECT",
                table: CLASSROOM_WHITEBOARDS_TABLE,
                columns: [
                    "id",
                    "class_id",
                    "name",
                    "file_key",
                    "created_by",
                    "created_at",
                ],
                where: [{ column: "class_id", value: classId }],
                orderBy: [{ column: "created_at", direction: "ASC" }],
            });
            return (result.rows ?? []).map(mapWhiteboardRow);
        },

        async create(classId, createdBy, name) {
            const id = randomUUID();
            const createdAt = new Date().toISOString();
            await dbExecutor.executeCommand({
                option: "INSERT",
                table: CLASSROOM_WHITEBOARDS_TABLE,
                values: {
                    id,
                    class_id: classId,
                    name: String(name).trim() || "Whiteboard",
                    file_key: null,
                    created_by: createdBy,
                    created_at: createdAt,
                },
            });
            return {
                id,
                classId,
                name: String(name).trim() || "Whiteboard",
                fileKey: null,
                createdBy,
                createdAt,
            };
        },

        async delete(classId, boardId) {
            await dbExecutor.executeCommand({
                option: "DELETE",
                table: CLASSROOM_WHITEBOARDS_TABLE,
                where: [
                    { column: "id", value: boardId },
                    { column: "class_id", value: classId },
                ],
            });
        },

        async get(classId, boardId) {
            const result = await dbExecutor.executeCommand({
                option: "SELECT",
                table: CLASSROOM_WHITEBOARDS_TABLE,
                columns: [
                    "id",
                    "class_id",
                    "name",
                    "file_key",
                    "created_by",
                    "created_at",
                ],
                where: [
                    { column: "id", value: boardId },
                    { column: "class_id", value: classId },
                ],
            });
            const row = result.rows?.[0];
            return row ? mapWhiteboardRow(row) : null;
        },

        async setFileKey(classId, boardId, fileKey) {
            await dbExecutor.executeCommand({
                option: "UPDATE",
                table: CLASSROOM_WHITEBOARDS_TABLE,
                values: { file_key: fileKey },
                where: { id: boardId, class_id: classId },
            });
        },
    };
}

export function registerApiRoutes(router, ctx) {
    const dbExecutor = ctx.getCapability("db:executor");
    const log = ctx.getCapability("logging:log");
    if (!dbExecutor) {
        router.get(
            "/api/v1/modules/nextcloud-whiteboard/config",
            (_req, res) => {
                sendError(
                    res,
                    503,
                    "service_unavailable",
                    "Database executor is unavailable.",
                );
            },
        );
        router.post(
            "/api/v1/modules/nextcloud-whiteboard/config",
            (_req, res) => {
                sendError(
                    res,
                    503,
                    "service_unavailable",
                    "Database executor is unavailable.",
                );
            },
        );
        return;
    }

    const initializeStoredConfig = async () => {
        try {
            await ensureSchema(dbExecutor);
            await ensureWhiteboardsSchema(dbExecutor);
            const storedConfig = await loadStoredConfig(dbExecutor);
            if (storedConfig) {
                setWhiteboardConfig(storedConfig);
            }
        } catch (error) {
            log?.(
                "error",
                "Nextcloud Whiteboard config initialization failed.",
                {
                    component: "nextcloud-whiteboard-module",
                    operation: "initialize_config",
                    error:
                        error instanceof Error ? error.message : String(error),
                },
            );
        }
    };
    void initializeStoredConfig();

    router.get(
        "/api/v1/modules/nextcloud-whiteboard/config",
        async (_req, res) => {
            sendJson(res, 200, { data: getWhiteboardConfig() });
        },
        { access: { minRole: "admin" }, allowWhenDisabled: true },
    );

    router.post(
        "/api/v1/modules/nextcloud-whiteboard/config",
        async (req, res) => {
            const body = await readJson(req);
            const nextConfig = normalizeWhiteboardConfig({
                whiteboardUrl: body?.whiteboardUrl,
                whiteboardSecret: body?.whiteboardSecret,
                tokenExpirySeconds: body?.tokenExpirySeconds,
            });
            try {
                await ensureSchema(dbExecutor);
                await saveConfig(dbExecutor, nextConfig);
                setWhiteboardConfig(nextConfig);
            } catch (error) {
                log?.("error", "Nextcloud Whiteboard config save failed.", {
                    component: "nextcloud-whiteboard-module",
                    operation: "save_config",
                    error:
                        error instanceof Error ? error.message : String(error),
                });
                sendError(
                    res,
                    500,
                    "internal_error",
                    "Failed to save Nextcloud Whiteboard configuration.",
                );
                return;
            }
            sendJson(res, 200, { data: nextConfig });
        },
        { access: { minRole: "admin" }, allowWhenDisabled: true },
    );
}
