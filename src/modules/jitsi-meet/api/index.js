import { createHash } from "node:crypto";
import { requireAuth } from "../../../api/auth/guard.js";

const MODULE_ID = "jitsi-meet";
const SETTINGS_KEY = "jitsi-meet-settings";
const DEFAULT_MEETING_TITLE = "Cognis Meeting";

function sendJson(res, status, payload) {
    res.writeHead(status, { "content-type": "application/json" });
    res.end(JSON.stringify(payload));
}

async function readJson(req) {
    const chunks = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    if (chunks.length === 0) return {};
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function roomHashFor(a, b) {
    const pair = [a, b].sort().join(":");
    return createHash("sha256").update(`cognis:jitsi:${pair}`).digest("hex");
}

function normalizeSettings(raw) {
    let parsed = null;
    if (raw) {
        parsed = JSON.parse(raw);
    }
    return {
        domain: String(parsed?.domain ?? "meet.jit.si").trim() || "meet.jit.si",
        tenant: String(parsed?.tenant ?? "").trim(),
        authenticationRequired: Boolean(parsed?.authenticationRequired),
        authMode: parsed?.authMode === "jwt" ? "jwt" : "none",
    };
}

function sanitizeDomain(value) {
    return String(value ?? "")
        .trim()
        .replace(/^https?:\/\//i, "")
        .replace(/\/+$/g, "");
}

function getPlaceholder(dbType, index) {
    return dbType === "postgresql" ? `$${index}` : "?";
}

async function ensureSchema(dbExecutor, dbType) {
    if (!dbExecutor) return;
    if (dbType === "postgresql") {
        await dbExecutor.execute(`CREATE TABLE IF NOT EXISTS jitsi_meetings (
      pair_key TEXT PRIMARY KEY,
      user_a TEXT NOT NULL,
      user_b TEXT NOT NULL,
      room_name TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`);
        return;
    }
    if (dbType === "mariadb") {
        await dbExecutor.execute(`CREATE TABLE IF NOT EXISTS jitsi_meetings (
      pair_key VARCHAR(191) PRIMARY KEY,
      user_a VARCHAR(191) NOT NULL,
      user_b VARCHAR(191) NOT NULL,
      room_name VARCHAR(191) NOT NULL UNIQUE,
      title VARCHAR(255) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`);
        return;
    }
    await dbExecutor.execute(`CREATE TABLE IF NOT EXISTS jitsi_meetings (
      pair_key TEXT PRIMARY KEY,
      user_a TEXT NOT NULL,
      user_b TEXT NOT NULL,
      room_name TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);
}

async function loadSettings(preferenceStore) {
    const raw = preferenceStore
        ? await preferenceStore.get("__system__", SETTINGS_KEY)
        : null;
    return normalizeSettings(raw);
}

function publicUser(profile, displayName) {
    return {
        accountId: profile.account_id,
        handle: profile.handle,
        displayName: profile.display_name ?? displayName ?? profile.handle,
        avatarKey: profile.avatar_key ?? null,
    };
}

async function listFollowers(dbExecutor, accountId, dbType, accountStore) {
    const p1 = getPlaceholder(dbType, 1);
    const result = await dbExecutor.execute(
        `SELECT p.* FROM account_follows f
       JOIN account_profiles p ON p.account_id = f.follower_id
       WHERE f.following_id = ${p1}
       ORDER BY COALESCE(p.display_name, p.handle) ASC`,
        [accountId],
    );
    const rows = result.rows ?? [];
    const users = [];
    for (const row of rows) {
        const displayName = accountStore
            ? await accountStore
                  .getDisplayName(row.account_id)
                  .catch(() => null)
            : null;
        users.push(publicUser(row, displayName));
    }
    return users;
}

async function isFollower(dbExecutor, requesterId, targetId, dbType) {
    const p1 = getPlaceholder(dbType, 1);
    const p2 = getPlaceholder(dbType, 2);
    const result = await dbExecutor.execute(
        `SELECT 1 FROM account_follows WHERE follower_id = ${p1} AND following_id = ${p2}`,
        [targetId, requesterId],
    );
    return Boolean(result.rows?.length);
}

async function getProfile(dbExecutor, accountId, dbType) {
    const p1 = getPlaceholder(dbType, 1);
    const result = await dbExecutor.execute(
        `SELECT * FROM account_profiles WHERE account_id = ${p1}`,
        [accountId],
    );
    return result.rows?.[0] ?? null;
}

async function getMeeting(dbExecutor, requesterId, targetId, title, dbType) {
    const sorted = [requesterId, targetId].sort();
    const pairKey = roomHashFor(sorted[0], sorted[1]);
    const roomName = `cognis-${pairKey.slice(0, 24)}`;
    const p1 = getPlaceholder(dbType, 1);
    const existing = await dbExecutor.execute(
        `SELECT * FROM jitsi_meetings WHERE pair_key = ${p1}`,
        [pairKey],
    );
    if (existing.rows?.[0]) return existing.rows[0];

    if (dbType === "postgresql") {
        await dbExecutor.execute(
            `INSERT INTO jitsi_meetings (pair_key, user_a, user_b, room_name, title)
       VALUES (${p1}, ${getPlaceholder(dbType, 2)}, ${getPlaceholder(dbType, 3)}, ${getPlaceholder(dbType, 4)}, ${getPlaceholder(dbType, 5)})
       ON CONFLICT (pair_key) DO NOTHING`,
            [pairKey, sorted[0], sorted[1], roomName, title],
        );
    } else if (dbType === "mariadb") {
        await dbExecutor.execute(
            `INSERT IGNORE INTO jitsi_meetings (pair_key, user_a, user_b, room_name, title)
       VALUES (?, ?, ?, ?, ?)`,
            [pairKey, sorted[0], sorted[1], roomName, title],
        );
    } else {
        await dbExecutor.execute(
            `INSERT OR IGNORE INTO jitsi_meetings (pair_key, user_a, user_b, room_name, title)
       VALUES (?, ?, ?, ?, ?)`,
            [pairKey, sorted[0], sorted[1], roomName, title],
        );
    }
    const created = await dbExecutor.execute(
        `SELECT * FROM jitsi_meetings WHERE pair_key = ${p1}`,
        [pairKey],
    );
    return (
        created.rows?.[0] ?? { pair_key: pairKey, room_name: roomName, title }
    );
}

export function registerApiRoutes(router, context = {}) {
    const { dbExecutor, preferenceStore, accountStore, log } = context;
    const dbType = context.dbType ?? "sqlite";
    const schemaReady = ensureSchema(dbExecutor, dbType).catch((error) => {
        log?.("error", "Failed to initialize Jitsi Meet module schema.", {
            component: MODULE_ID,
            error: error instanceof Error ? error.message : String(error),
        });
    });

    router.get("/api/v1/modules/jitsi-meet/settings", async (req, res) => {
        const claims = requireAuth(req, res, "user");
        if (!claims) return;
        const settings = await loadSettings(preferenceStore);
        log?.("debug", "Read Jitsi Meet settings.", {
            component: MODULE_ID,
            accountId: claims.sub,
        });
        sendJson(res, 200, { data: settings });
    });

    router.post("/api/v1/modules/jitsi-meet/settings", async (req, res) => {
        const claims = requireAuth(req, res, "admin");
        if (!claims) return;
        const body = await readJson(req);
        const settings = {
            domain: sanitizeDomain(body.domain) || "meet.jit.si",
            tenant: String(body.tenant ?? "").trim(),
            authenticationRequired: Boolean(body.authenticationRequired),
            authMode: body.authMode === "jwt" ? "jwt" : "none",
        };
        await preferenceStore?.set(
            "__system__",
            SETTINGS_KEY,
            JSON.stringify(settings),
        );
        log?.("info", "Updated Jitsi Meet settings.", {
            component: MODULE_ID,
            accountId: claims.sub,
            domain: settings.domain,
            authenticationRequired: settings.authenticationRequired,
            authMode: settings.authMode,
        });
        sendJson(res, 200, { data: settings });
    });

    router.get("/api/v1/modules/jitsi-meet/followers", async (req, res) => {
        const claims = requireAuth(req, res, "user");
        if (!claims) return;
        if (!dbExecutor) {
            sendJson(res, 503, {
                error: {
                    code: "db_unavailable",
                    message: "Database unavailable.",
                },
            });
            return;
        }
        await schemaReady;
        const users = await listFollowers(
            dbExecutor,
            claims.sub,
            dbType,
            accountStore,
        );
        log?.("debug", "Listed Jitsi Meet follower candidates.", {
            component: MODULE_ID,
            accountId: claims.sub,
            count: users.length,
        });
        sendJson(res, 200, { data: users });
    });

    router.post("/api/v1/modules/jitsi-meet/meeting", async (req, res) => {
        const claims = requireAuth(req, res, "user");
        if (!claims) return;
        if (!dbExecutor) {
            sendJson(res, 503, {
                error: {
                    code: "db_unavailable",
                    message: "Database unavailable.",
                },
            });
            return;
        }
        await schemaReady;
        const body = await readJson(req);
        const targetId = String(body.accountId ?? "").trim();
        if (!targetId || targetId === claims.sub) {
            sendJson(res, 400, {
                error: { code: "bad_request", message: "Select a follower." },
            });
            return;
        }
        const allowed = await isFollower(
            dbExecutor,
            claims.sub,
            targetId,
            dbType,
        );
        if (!allowed) {
            sendJson(res, 403, {
                error: {
                    code: "not_follower",
                    message: "Meetings can only be created with followers.",
                },
            });
            return;
        }
        const title =
            String(body.title ?? DEFAULT_MEETING_TITLE).trim() ||
            DEFAULT_MEETING_TITLE;
        const settings = await loadSettings(preferenceStore);
        const meeting = await getMeeting(
            dbExecutor,
            claims.sub,
            targetId,
            title,
            dbType,
        );
        const ownProfile = await getProfile(dbExecutor, claims.sub, dbType);
        const displayName = accountStore
            ? await accountStore.getDisplayName(claims.sub).catch(() => null)
            : null;
        log?.("info", "Resolved Jitsi Meet pairing.", {
            component: MODULE_ID,
            accountId: claims.sub,
            targetAccountId: targetId,
            roomName: meeting.room_name,
        });
        sendJson(res, 200, {
            data: {
                roomName: meeting.room_name,
                title: meeting.title ?? title,
                domain: settings.domain,
                tenant: settings.tenant,
                authenticationRequired: settings.authenticationRequired,
                authMode: settings.authMode,
                user: ownProfile
                    ? publicUser(ownProfile, displayName)
                    : {
                          accountId: claims.sub,
                          handle: claims.sub,
                          displayName: displayName ?? claims.sub,
                          avatarKey: null,
                      },
            },
        });
    });
}
