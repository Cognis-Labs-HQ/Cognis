import { randomUUID } from "node:crypto";
import { AnalyticsStore } from "./store.js";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function sendJson(res, status, payload) {
    res.writeHead(status, { "content-type": "application/json" });
    res.end(JSON.stringify(payload));
}

function parseDays(value, fallback = 30) {
    const parsed = Number.parseInt(String(value ?? ""), 10);
    if (!Number.isFinite(parsed) || parsed < 1) return fallback;
    return Math.min(parsed, 365);
}

function parseLimit(value, fallback = 50) {
    const parsed = Number.parseInt(String(value ?? ""), 10);
    if (!Number.isFinite(parsed) || parsed < 1) return fallback;
    return Math.min(parsed, 200);
}

function toDateString(value) {
    if (!value) return null;
    const timestamp = Date.parse(String(value));
    if (Number.isNaN(timestamp)) return null;
    return new Date(timestamp).toISOString().slice(0, 10);
}

async function computeMetrics(db, days) {
    const result = await db.executeCommand({
        option: "SELECT",
        table: "accounts",
        columns: ["id", "role", "created_at", "last_login"],
    });

    const rows = result.rows ?? [];
    const now = Date.now();
    const cutoffDays = now - days * MS_PER_DAY;
    const cutoff7d = now - 7 * MS_PER_DAY;

    let activeUsers7d = 0;
    let newUsersDays = 0;
    const roleBreakdown = {};

    for (const row of rows) {
        const role = String(row.role ?? "user");
        roleBreakdown[role] = (roleBreakdown[role] ?? 0) + 1;

        if (row.last_login) {
            const loginMs = Date.parse(String(row.last_login));
            if (Number.isFinite(loginMs) && loginMs >= cutoff7d) {
                activeUsers7d++;
            }
        }

        if (row.created_at) {
            const createdMs = Date.parse(String(row.created_at));
            if (Number.isFinite(createdMs) && createdMs >= cutoffDays) {
                newUsersDays++;
            }
        }
    }

    return {
        totalUsers: rows.length,
        activeUsers7d,
        newUsersDays,
        days,
        roleBreakdown,
    };
}

async function computeSeries(db, days) {
    const cutoff = new Date(Date.now() - days * MS_PER_DAY).toISOString();

    const result = await db.executeCommand({
        option: "SELECT",
        table: "accounts",
        columns: ["created_at"],
        where: [{ column: "created_at", operator: ">=", value: cutoff }],
    });

    const rows = result.rows ?? [];
    const countByDate = {};

    for (const row of rows) {
        const date = toDateString(row.created_at);
        if (!date) continue;
        countByDate[date] = (countByDate[date] ?? 0) + 1;
    }

    const series = [];
    for (let offset = days - 1; offset >= 0; offset--) {
        const date = new Date(Date.now() - offset * MS_PER_DAY)
            .toISOString()
            .slice(0, 10);
        series.push({ date, count: countByDate[date] ?? 0 });
    }

    return series;
}

export function registerApiRoutes(router, ctx) {
    const db = ctx.getCapability("db:executor");
    const store = db ? new AnalyticsStore({ db }) : null;

    if (store) {
        store.ensureSchema().catch(() => {});
    }

    router.get(
        "/api/v1/modules/analytics/metrics",
        async (req, res) => {
            const url = new URL(req.url, "http://localhost");
            const days = parseDays(url.searchParams.get("days"), 30);

            if (!db) {
                sendJson(res, 503, {
                    error: {
                        code: "db_unavailable",
                        message: "Database is not available.",
                    },
                });
                return;
            }

            try {
                const metrics = await computeMetrics(db, days);
                sendJson(res, 200, { data: metrics });
            } catch {
                sendJson(res, 500, {
                    error: {
                        code: "query_failed",
                        message: "Failed to compute analytics metrics.",
                    },
                });
            }
        },
        { access: { minRole: "admin" } },
    );

    router.get(
        "/api/v1/modules/analytics/series",
        async (req, res) => {
            const url = new URL(req.url, "http://localhost");
            const days = parseDays(url.searchParams.get("days"), 30);

            if (!db) {
                sendJson(res, 503, {
                    error: {
                        code: "db_unavailable",
                        message: "Database is not available.",
                    },
                });
                return;
            }

            try {
                const series = await computeSeries(db, days);
                sendJson(res, 200, { data: series });
            } catch {
                sendJson(res, 500, {
                    error: {
                        code: "query_failed",
                        message: "Failed to compute registration series.",
                    },
                });
            }
        },
        { access: { minRole: "admin" } },
    );

    router.get(
        "/api/v1/modules/analytics/events",
        async (req, res) => {
            const url = new URL(req.url, "http://localhost");
            const limit = parseLimit(url.searchParams.get("limit"), 50);

            if (!store) {
                sendJson(res, 200, { data: [] });
                return;
            }

            try {
                const events = await store.getRecentEvents(limit);
                sendJson(res, 200, { data: events });
            } catch {
                sendJson(res, 200, { data: [] });
            }
        },
        { access: { minRole: "admin" } },
    );

    router.post(
        "/api/v1/modules/analytics/events",
        async (req, res) => {
            if (!store) {
                sendJson(res, 503, {
                    error: {
                        code: "db_unavailable",
                        message: "Database is not available.",
                    },
                });
                return;
            }

            let body;
            try {
                const chunks = [];
                for await (const chunk of req) {
                    chunks.push(chunk);
                }
                body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
            } catch {
                sendJson(res, 400, {
                    error: {
                        code: "invalid_body",
                        message: "Invalid JSON body.",
                    },
                });
                return;
            }

            const eventType = String(body.eventType ?? "")
                .trim()
                .slice(0, 64);
            if (!eventType) {
                sendJson(res, 400, {
                    error: {
                        code: "missing_event_type",
                        message: "eventType is required.",
                    },
                });
                return;
            }

            const id = randomUUID();
            const meta =
                body.meta && typeof body.meta === "object" ? body.meta : null;

            try {
                await store.recordEvent(id, eventType, null, meta);
                sendJson(res, 201, { data: { id } });
            } catch {
                sendJson(res, 500, {
                    error: {
                        code: "record_failed",
                        message: "Failed to record event.",
                    },
                });
            }
        },
        { access: { minRole: "admin" } },
    );
}

export function registerUi(ctx) {
    ctx.registerAdminSection({
        id: "analytics",
        label: "Analytics",
        scriptUrl: "/static/modules/analytics/admin-section.js",
        stringsBaseUrl: "/static/modules/analytics/languages",
        access: { minRole: "admin" },
    });
}
