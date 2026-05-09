import path from "node:path";
import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import {
    requireAuth,
    readJson,
    type GatewayBootstrapContext,
} from "../shared.js";
import type { DbExecutor } from "../db/reuse/db-executor.js";
import type { SupportedDbType } from "../db/executor.js";

function placeholder(dbType: SupportedDbType, index: number): string {
    return dbType === "postgresql" ? `$${index}` : "?";
}

/**
 * Creates and migrates the meetings schema in the active database.
 * Handles all three supported DB dialects.
 */
async function ensureSchema(
    db: DbExecutor,
    dbType: SupportedDbType,
): Promise<void> {
    if (dbType === "postgresql") {
        await db.execute(`CREATE TABLE IF NOT EXISTS meeting_rooms (
            id TEXT PRIMARY KEY,
            participant_a TEXT NOT NULL,
            participant_b TEXT NOT NULL,
            room_name TEXT NOT NULL UNIQUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`);
        await db.execute(`CREATE TABLE IF NOT EXISTS meeting_settings (
            setting_key TEXT PRIMARY KEY,
            setting_value TEXT NOT NULL
        )`);
        await db.execute(
            `CREATE UNIQUE INDEX IF NOT EXISTS idx_meeting_rooms_pair
             ON meeting_rooms (
               LEAST(participant_a, participant_b),
               GREATEST(participant_a, participant_b)
             )`,
        );
    } else if (dbType === "mariadb") {
        await db.execute(`CREATE TABLE IF NOT EXISTS meeting_rooms (
            id VARCHAR(64) PRIMARY KEY,
            participant_a VARCHAR(255) NOT NULL,
            participant_b VARCHAR(255) NOT NULL,
            room_name VARCHAR(255) NOT NULL UNIQUE,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`);
        await db.execute(`CREATE TABLE IF NOT EXISTS meeting_settings (
            setting_key VARCHAR(128) PRIMARY KEY,
            setting_value TEXT NOT NULL
        )`);
    } else {
        await db.execute(`CREATE TABLE IF NOT EXISTS meeting_rooms (
            id TEXT PRIMARY KEY,
            participant_a TEXT NOT NULL,
            participant_b TEXT NOT NULL,
            room_name TEXT NOT NULL UNIQUE,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`);
        await db.execute(`CREATE TABLE IF NOT EXISTS meeting_settings (
            setting_key TEXT PRIMARY KEY,
            setting_value TEXT NOT NULL
        )`);
    }
}

/**
 * Deterministic canonical room name for the ordered pair of two account IDs.
 * The pair is sorted so room(a,b) === room(b,a).
 */
function canonicalRoomName(a: string, b: string): string {
    const [first, second] = [a, b].sort();
    return `cognis-${first.replace(/[^a-zA-Z0-9]/g, "")}-${second.replace(/[^a-zA-Z0-9]/g, "")}`;
}

async function getOrCreateRoom(
    db: DbExecutor,
    dbType: SupportedDbType,
    accountA: string,
    accountB: string,
): Promise<{ id: string; roomName: string }> {
    const [pa, pb] = [accountA, accountB].sort();
    const ph = (i: number) => placeholder(dbType, i);

    const existing = await db.execute(
        `SELECT id, room_name FROM meeting_rooms
         WHERE participant_a = ${ph(1)} AND participant_b = ${ph(2)}`,
        [pa, pb],
    );
    if (existing.rows && existing.rows.length > 0) {
        const row = existing.rows[0] as any;
        return { id: String(row.id), roomName: String(row.room_name) };
    }

    const id = randomUUID();
    const roomName = canonicalRoomName(pa, pb);

    if (dbType === "mariadb") {
        await db.execute(
            `INSERT IGNORE INTO meeting_rooms (id, participant_a, participant_b, room_name)
             VALUES (${ph(1)}, ${ph(2)}, ${ph(3)}, ${ph(4)})`,
            [id, pa, pb, roomName],
        );
    } else if (dbType === "postgresql") {
        await db.execute(
            `INSERT INTO meeting_rooms (id, participant_a, participant_b, room_name)
             VALUES (${ph(1)}, ${ph(2)}, ${ph(3)}, ${ph(4)})
             ON CONFLICT DO NOTHING`,
            [id, pa, pb, roomName],
        );
    } else {
        await db.execute(
            `INSERT OR IGNORE INTO meeting_rooms (id, participant_a, participant_b, room_name)
             VALUES (${ph(1)}, ${ph(2)}, ${ph(3)}, ${ph(4)})`,
            [id, pa, pb, roomName],
        );
    }

    const after = await db.execute(
        `SELECT id, room_name FROM meeting_rooms
         WHERE participant_a = ${ph(1)} AND participant_b = ${ph(2)}`,
        [pa, pb],
    );
    const row = after.rows?.[0] as any;
    return { id: String(row.id), roomName: String(row.room_name) };
}

async function getSetting(
    db: DbExecutor,
    dbType: SupportedDbType,
    key: string,
): Promise<string | null> {
    const ph = (i: number) => placeholder(dbType, i);
    const result = await db.execute(
        `SELECT setting_value FROM meeting_settings WHERE setting_key = ${ph(1)}`,
        [key],
    );
    return (result.rows?.[0] as any)?.setting_value ?? null;
}

async function setSetting(
    db: DbExecutor,
    dbType: SupportedDbType,
    key: string,
    value: string,
): Promise<void> {
    const ph = (i: number) => placeholder(dbType, i);
    if (dbType === "mariadb") {
        await db.execute(
            `INSERT INTO meeting_settings (setting_key, setting_value) VALUES (${ph(1)}, ${ph(2)})
             ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
            [key, value],
        );
    } else if (dbType === "postgresql") {
        await db.execute(
            `INSERT INTO meeting_settings (setting_key, setting_value) VALUES (${ph(1)}, ${ph(2)})
             ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value`,
            [key, value],
        );
    } else {
        await db.execute(
            `INSERT INTO meeting_settings (setting_key, setting_value) VALUES (${ph(1)}, ${ph(2)})
             ON CONFLICT (setting_key) DO UPDATE SET setting_value = excluded.setting_value`,
            [key, value],
        );
    }
}

function createMeetingRoutes(db: DbExecutor, dbType: SupportedDbType) {
    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (!url.pathname.startsWith("/api/v1/meetings")) return false;

        if (url.pathname === "/api/v1/meetings/settings") {
            if (req.method === "GET") {
                const claims = requireAuth(req, res, "user");
                if (!claims) return true;
                const serverUrl = await getSetting(db, dbType, "jitsi_server_url");
                const appId = await getSetting(db, dbType, "jitsi_app_id");
                res.writeHead(200, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        data: {
                            serverUrl: serverUrl ?? "",
                            appId: appId ?? "",
                        },
                    }),
                );
                return true;
            }

            if (req.method === "PUT") {
                const claims = requireAuth(req, res, "admin");
                if (!claims) return true;
                const body = await readJson(req);
                const serverUrl = String(body?.serverUrl ?? "").trim();
                const appId = String(body?.appId ?? "").trim();
                if (serverUrl && !/^https?:\/\/.+/.test(serverUrl)) {
                    res.writeHead(400, { "content-type": "application/json" });
                    res.end(
                        JSON.stringify({
                            error: {
                                code: "invalid_server_url",
                                message: "serverUrl must be an http or https URL",
                            },
                        }),
                    );
                    return true;
                }
                await setSetting(db, dbType, "jitsi_server_url", serverUrl);
                await setSetting(db, dbType, "jitsi_app_id", appId);
                res.writeHead(200, { "content-type": "application/json" });
                res.end(JSON.stringify({ data: { serverUrl, appId } }));
                return true;
            }
        }

        if (url.pathname === "/api/v1/meetings/room" && req.method === "POST") {
            const claims = requireAuth(req, res, "user");
            if (!claims) return true;
            const body = await readJson(req);
            const peerHandle = String(body?.peerHandle ?? "").trim();
            if (!peerHandle) {
                res.writeHead(400, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "bad_request",
                            message: "peerHandle is required",
                        },
                    }),
                );
                return true;
            }
            const serverUrl = await getSetting(db, dbType, "jitsi_server_url");
            if (!serverUrl) {
                res.writeHead(503, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "not_configured",
                            message: "Meetings gateway is not configured. Ask your administrator to set the Jitsi server URL.",
                        },
                    }),
                );
                return true;
            }
            const room = await getOrCreateRoom(db, dbType, claims.sub, peerHandle);
            const appId = await getSetting(db, dbType, "jitsi_app_id");
            res.writeHead(200, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    data: {
                        roomId: room.id,
                        roomName: room.roomName,
                        serverUrl,
                        appId: appId ?? "",
                    },
                }),
            );
            return true;
        }

        return false;
    };
}

function createMeetingsPageRoutes(isGatewayEnabled?: () => boolean) {
    const PUBLIC_ROOT = path.resolve(process.cwd(), "src", "ui", "public");
    const { readFile } = await import("node:fs/promises");

    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (req.method && req.method !== "GET") return false;
        if (isGatewayEnabled && !isGatewayEnabled()) return false;
        if (url.pathname !== "/meetings") return false;

        const { getCookieSession, setPageSecurityHeaders } = await import(
            "../../api/auth/guard.js"
        );
        const session = getCookieSession(req);
        if (!session) {
            res.writeHead(302, { location: "/login" });
            res.end();
            return true;
        }
        try {
            const file = await readFile(
                path.join(PUBLIC_ROOT, "pages", "meetings.html"),
            );
            setPageSecurityHeaders(res);
            res.writeHead(200, {
                "content-type": "text/html; charset=utf-8",
                "cache-control": "no-store",
            });
            res.end(file);
        } catch {
            res.writeHead(404, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    error: { code: "not_found", message: "Asset not found." },
                }),
            );
        }
        return true;
    };
}

export async function bootstrap(ctx: GatewayBootstrapContext): Promise<void> {
    const db = (ctx.capabilities.get<DbExecutor>("db:executor") ??
        ctx.dbExecutor)!;
    const dbType =
        ctx.capabilities.get<SupportedDbType>("db:type") ??
        ctx.dbType ??
        "sqlite";

    if (!db) {
        ctx.log?.(
            "warn",
            "Meetings gateway: no db:executor found — skipping initialization.",
            { component: "meetings-gateway" },
        );
        return;
    }

    await ensureSchema(db, dbType);
    ctx.log?.("info", "Meetings gateway schema ready.", {
        component: "meetings-gateway",
        dbType,
    });

    ctx.routeRegistry.register(
        createMeetingRoutes(db, dbType),
        "meetings",
    );

    const pageRoutes = await buildPageRoutes(ctx);
    ctx.routeRegistry.register(pageRoutes, "meetings");

    ctx.gatewayRegistry.register({
        id: "meetings",
        name: "Meetings Gateway",
        version: "1.0.0",
        description:
            "Jitsi Meet video meetings between followers, with persistent room URLs and an in-app control overlay.",
        publisher: "Cognis Labs",
    });

    const uiDir = path.resolve(
        process.cwd(),
        "src",
        "gateways",
        "meetings",
        "ui",
    );
    ctx.uiRegistry?.registerStaticDir("meetings", uiDir);
    ctx.uiRegistry?.registerAdminSection({
        id: "meetings",
        label: "Meetings",
        scriptUrl: "/static/gateways/meetings/admin-section.js",
    });

    ctx.log?.("info", "Meetings gateway initialized.", {
        component: "meetings-gateway",
    });
}

async function buildPageRoutes(ctx: GatewayBootstrapContext) {
    const PUBLIC_ROOT = path.resolve(process.cwd(), "src", "ui", "public");
    const { readFile } = await import("node:fs/promises");
    const { getCookieSession, setPageSecurityHeaders } = await import(
        "../../api/auth/guard.js"
    );

    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (req.method && req.method !== "GET") return false;
        if (ctx.gatewayRegistry.get("meetings")?.status === "disabled") return false;
        if (url.pathname !== "/meetings") return false;

        const session = getCookieSession(req);
        if (!session) {
            res.writeHead(302, { location: "/login" });
            res.end();
            return true;
        }
        try {
            const file = await readFile(
                path.join(PUBLIC_ROOT, "pages", "meetings.html"),
            );
            setPageSecurityHeaders(res);
            res.writeHead(200, {
                "content-type": "text/html; charset=utf-8",
                "cache-control": "no-store",
            });
            res.end(file);
        } catch {
            res.writeHead(404, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    error: { code: "not_found", message: "Asset not found." },
                }),
            );
        }
        return true;
    };
}
