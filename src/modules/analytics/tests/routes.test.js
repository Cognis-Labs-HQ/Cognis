import test from "node:test";
import assert from "node:assert/strict";
import { registerApiRoutes } from "../api/index.js";

function buildAccountRow(overrides = {}) {
    const now = new Date().toISOString();
    return {
        id: "acc-1",
        role: "user",
        created_at: now,
        last_login: now,
        enabled: 1,
        ...overrides,
    };
}

function buildEventRow(overrides = {}) {
    return {
        id: "evt-1",
        event_type: "page_view",
        account_id: "acc-1",
        created_at: new Date().toISOString(),
        ...overrides,
    };
}

function makeDb({ accountRows = [], eventRows = [] } = {}) {
    const tables = new Map([
        ["accounts", [...accountRows]],
        ["sample_analytics_events", [...eventRows]],
    ]);
    const insertedRows = [];

    return {
        insertedRows,
        async ensureTable(def) {
            if (!tables.has(def.name)) tables.set(def.name, []);
        },
        async executeCommand(command) {
            if (command.option === "INSERT") {
                const rows = tables.get(command.table) ?? [];
                rows.push(command.values);
                tables.set(command.table, rows);
                insertedRows.push(command.values);
                return { rowCount: 1 };
            }
            if (command.option === "SELECT") {
                let rows = tables.get(command.table) ?? [];
                if (command.where) {
                    rows = rows.filter((row) =>
                        command.where.every((clause) => {
                            const rowValue = row[clause.column];
                            if (clause.operator === ">=" && rowValue) {
                                return (
                                    new Date(String(rowValue)) >=
                                    new Date(String(clause.value))
                                );
                            }
                            return true;
                        }),
                    );
                }
                if (command.orderBy) {
                    const [order] = command.orderBy;
                    const direction = order?.direction === "ASC" ? 1 : -1;
                    const col = order?.column ?? "created_at";
                    rows = [...rows].sort((rowA, rowB) => {
                        const valueA = String(rowA[col] ?? "");
                        const valueB = String(rowB[col] ?? "");
                        return valueA < valueB ? -direction : direction;
                    });
                }
                if (command.limit) rows = rows.slice(0, command.limit);
                return { rows };
            }
            return {};
        },
        async transaction(callback) {
            return callback(this);
        },
    };
}

function makeRouter() {
    const handlers = new Map();
    return {
        get(routePath, handler) {
            handlers.set(`GET:${routePath}`, handler);
        },
        post(routePath, handler) {
            handlers.set(`POST:${routePath}`, handler);
        },
        async handle(method, routePath, req, res) {
            const key = `${method}:${routePath}`;
            const handler = handlers.get(key);
            if (!handler) {
                throw new Error(`No handler registered for ${key}`);
            }
            await handler(req, res);
        },
    };
}

function makeRequest(method, urlPath, body = null, token = "") {
    const chunks = body ? [Buffer.from(JSON.stringify(body))] : [];
    return {
        method,
        url: `http://localhost${urlPath}`,
        headers: { authorization: `Bearer ${token}` },
        [Symbol.asyncIterator]: async function* () {
            for (const chunk of chunks) yield chunk;
        },
    };
}

function makeResponse() {
    let statusCode = 0;
    let responsePayload = "";
    return {
        writeHead(code) {
            statusCode = code;
        },
        end(data) {
            responsePayload = data;
        },
        get status() {
            return statusCode;
        },
        get json() {
            return JSON.parse(responsePayload);
        },
    };
}

function setupRoutes(options = {}) {
    const db = makeDb(options);
    const router = makeRouter();
    const ctx = { getCapability: () => db };
    registerApiRoutes(router, ctx);
    return { db, router };
}

test("GET /api/v1/modules/analytics/metrics returns total user count", async () => {
    const { router } = setupRoutes({
        accountRows: [
            buildAccountRow({ id: "u1", role: "admin" }),
            buildAccountRow({ id: "u2", role: "user" }),
            buildAccountRow({ id: "u3", role: "teacher" }),
        ],
    });
    const req = makeRequest("GET", "/api/v1/modules/analytics/metrics");
    const res = makeResponse();
    await router.handle("GET", "/api/v1/modules/analytics/metrics", req, res);
    assert.equal(res.status, 200);
    const { data } = res.json;
    assert.equal(data.totalUsers, 3);
    assert.equal(typeof data.activeUsers7d, "number");
    assert.equal(typeof data.newUsersDays, "number");
    assert.ok(data.roleBreakdown);
});

test("GET /api/v1/modules/analytics/metrics computes role breakdown correctly", async () => {
    const { router } = setupRoutes({
        accountRows: [
            buildAccountRow({ id: "u1", role: "admin" }),
            buildAccountRow({ id: "u2", role: "user" }),
            buildAccountRow({ id: "u3", role: "user" }),
            buildAccountRow({ id: "u4", role: "teacher" }),
        ],
    });
    const req = makeRequest("GET", "/api/v1/modules/analytics/metrics");
    const res = makeResponse();
    await router.handle("GET", "/api/v1/modules/analytics/metrics", req, res);
    const { data } = res.json;
    assert.equal(data.roleBreakdown.admin, 1);
    assert.equal(data.roleBreakdown.user, 2);
    assert.equal(data.roleBreakdown.teacher, 1);
});

test("GET /api/v1/modules/analytics/metrics counts active users within 7 days", async () => {
    const recentLogin = new Date(
        Date.now() - 3 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const oldLogin = new Date(
        Date.now() - 14 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const { router } = setupRoutes({
        accountRows: [
            buildAccountRow({ id: "u1", last_login: recentLogin }),
            buildAccountRow({ id: "u2", last_login: recentLogin }),
            buildAccountRow({ id: "u3", last_login: oldLogin }),
            buildAccountRow({ id: "u4", last_login: null }),
        ],
    });
    const req = makeRequest("GET", "/api/v1/modules/analytics/metrics");
    const res = makeResponse();
    await router.handle("GET", "/api/v1/modules/analytics/metrics", req, res);
    const { data } = res.json;
    assert.equal(data.activeUsers7d, 2);
});

test("GET /api/v1/modules/analytics/metrics returns 503 when db is unavailable", async () => {
    const router = makeRouter();
    const ctx = { getCapability: () => undefined };
    registerApiRoutes(router, ctx);
    const req = makeRequest("GET", "/api/v1/modules/analytics/metrics");
    const res = makeResponse();
    await router.handle("GET", "/api/v1/modules/analytics/metrics", req, res);
    assert.equal(res.status, 503);
});

test("GET /api/v1/modules/analytics/series returns one entry per day for the requested range", async () => {
    const twoDaysAgo = new Date(
        Date.now() - 2 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const { router } = setupRoutes({
        accountRows: [buildAccountRow({ id: "u1", created_at: twoDaysAgo })],
    });
    const req = makeRequest("GET", "/api/v1/modules/analytics/series?days=7");
    const res = makeResponse();
    await router.handle("GET", "/api/v1/modules/analytics/series", req, res);
    assert.equal(res.status, 200);
    const { data } = res.json;
    assert.equal(data.length, 7);
    const total = data.reduce(
        (accumulator, point) => accumulator + point.count,
        0,
    );
    assert.equal(total, 1);
});

test("GET /api/v1/modules/analytics/series returns all-zero counts when no accounts exist", async () => {
    const { router } = setupRoutes({ accountRows: [] });
    const req = makeRequest("GET", "/api/v1/modules/analytics/series?days=7");
    const res = makeResponse();
    await router.handle("GET", "/api/v1/modules/analytics/series", req, res);
    assert.equal(res.status, 200);
    const { data } = res.json;
    assert.equal(data.length, 7);
    assert.ok(data.every((point) => point.count === 0));
});

test("GET /api/v1/modules/analytics/activity-log returns recent events ordered descending", async () => {
    const { router } = setupRoutes({
        eventRows: [
            buildEventRow({
                id: "e1",
                event_type: "login",
                created_at: "2024-01-01T10:00:00Z",
            }),
            buildEventRow({
                id: "e2",
                event_type: "page_view",
                created_at: "2024-01-03T10:00:00Z",
            }),
        ],
    });
    const req = makeRequest(
        "GET",
        "/api/v1/modules/analytics/activity-log?limit=5",
    );
    const res = makeResponse();
    await router.handle(
        "GET",
        "/api/v1/modules/analytics/activity-log",
        req,
        res,
    );
    assert.equal(res.status, 200);
    const { data } = res.json;
    assert.equal(data.length, 2);
    assert.equal(data[0].id, "e2");
    assert.equal(data[1].id, "e1");
});

test("POST /api/v1/modules/analytics/activity-log records an event and returns 201", async () => {
    const { db, router } = setupRoutes();
    const req = makeRequest("POST", "/api/v1/modules/analytics/activity-log", {
        eventType: "custom_action",
        meta: { page: "/home" },
    });
    const res = makeResponse();
    await router.handle(
        "POST",
        "/api/v1/modules/analytics/activity-log",
        req,
        res,
    );
    assert.equal(res.status, 201);
    const { data } = res.json;
    assert.ok(data.id);
    assert.equal(db.insertedRows.length, 1);
    assert.equal(db.insertedRows[0].event_type, "custom_action");
    assert.equal(db.insertedRows[0].meta, JSON.stringify({ page: "/home" }));
});

test("POST /api/v1/modules/analytics/activity-log rejects missing eventType with 400", async () => {
    const { router } = setupRoutes();
    const req = makeRequest("POST", "/api/v1/modules/analytics/activity-log", {
        meta: { page: "/home" },
    });
    const res = makeResponse();
    await router.handle(
        "POST",
        "/api/v1/modules/analytics/activity-log",
        req,
        res,
    );
    assert.equal(res.status, 400);
    const { error } = res.json;
    assert.equal(error.code, "missing_event_type");
});

test("POST /api/v1/modules/analytics/activity-log rejects invalid JSON body with 400", async () => {
    const { router } = setupRoutes();
    const invalidChunks = [Buffer.from("not-valid-json")];
    const req = {
        method: "POST",
        url: "http://localhost/api/v1/modules/analytics/activity-log",
        headers: {},
        [Symbol.asyncIterator]: async function* () {
            for (const chunk of invalidChunks) yield chunk;
        },
    };
    const res = makeResponse();
    await router.handle(
        "POST",
        "/api/v1/modules/analytics/activity-log",
        req,
        res,
    );
    assert.equal(res.status, 400);
    const { error } = res.json;
    assert.equal(error.code, "invalid_body");
});
