import assert from "node:assert/strict";
import test from "node:test";
import { issueAccessToken } from "../../../gateways/auth/access-tokens.js";
import { registerApiRoutes } from "../api/index.js";
import { NextcloudWhiteboardStore } from "../api/store.js";

function createMemoryDb() {
    const tables = new Map();
    const primaryKeys = new Map();
    const applyWhere = (rows, where = []) =>
        rows.filter((row) =>
            where.every((clause) => row[clause.column] === clause.value),
        );
    const db = {
        async ensureTable(definition) {
            if (!tables.has(definition.name)) tables.set(definition.name, []);
            const explicitPrimaryKey = Array.isArray(definition.primaryKey)
                ? definition.primaryKey
                : [];
            const columnPrimaryKey = (definition.columns ?? [])
                .filter((column) => column.primaryKey)
                .map((column) => column.name);
            primaryKeys.set(definition.name, [
                ...explicitPrimaryKey,
                ...columnPrimaryKey,
            ]);
        },
        async executeCommand(command) {
            const rows = tables.get(command.table) ?? [];
            if (command.option === "SELECT") {
                const selected = applyWhere(rows, command.where).slice(
                    0,
                    command.limit ?? rows.length,
                );
                return { rows: selected.map((row) => ({ ...row })) };
            }
            if (command.option === "UPDATE") {
                const selected = applyWhere(rows, command.where);
                for (const row of selected)
                    Object.assign(row, command.set ?? command.values);
                return { rows: [] };
            }
            if (command.option === "INSERT") {
                const values = { ...command.values };
                const conflictColumns =
                    command.conflict?.target ??
                    command.onConflict?.columns ??
                    [];
                const existing = rows.find(
                    (row) =>
                        conflictColumns.length > 0 &&
                        conflictColumns.every(
                            (column) => row[column] === values[column],
                        ),
                );
                if (existing && command.conflict?.action === "update") {
                    Object.assign(existing, command.conflict.update ?? values);
                } else if (existing && command.onConflict) {
                    for (const column of command.onConflict.merge ?? []) {
                        existing[column] = values[column];
                    }
                } else {
                    const primaryKey = primaryKeys.get(command.table) ?? [];
                    const duplicatePrimary = rows.some(
                        (row) =>
                            primaryKey.length > 0 &&
                            primaryKey.every(
                                (column) => row[column] === values[column],
                            ),
                    );
                    if (duplicatePrimary)
                        throw new Error("duplicate key value");
                    rows.push(values);
                }
                tables.set(command.table, rows);
                return { rows: [] };
            }
            return { rows: [] };
        },
        async transaction(callback) {
            await callback(db);
        },
    };
    return db;
}

function createRouterCapture() {
    const routes = new Map();
    return {
        get(path, handler) {
            routes.set(`GET ${path}`, handler);
        },
        post(path, handler) {
            routes.set(`POST ${path}`, handler);
        },
        handler(method, path) {
            const handler = routes.get(`${method} ${path}`);
            assert.ok(handler, `${method} ${path} should be registered`);
            return handler;
        },
    };
}

function decodeJwtPayload(token) {
    const payload = String(token ?? "").split(".")[1] ?? "";
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(Buffer.from(normalized, "base64").toString("utf8"));
}

function createJsonResponse() {
    return {
        statusCode: 0,
        payload: "",
        headers: {},
        writeHead(statusCode, headers = {}) {
            this.statusCode = statusCode;
            this.headers = headers;
        },
        end(payload = "") {
            this.payload = String(payload);
        },
        json() {
            return JSON.parse(this.payload);
        },
    };
}

test("nextcloud whiteboard share route accepts issue-token flow result", async () => {
    const db = createMemoryDb();
    const store = new NextcloudWhiteboardStore({ db });
    await store.ensureSchema();
    const board = await store.createWhiteboard({
        title: "Planning",
        createdBy: "alice",
        participants: [],
    });
    const shareRecord = {
        id: "share-1",
        resourceType: "whiteboard",
        resourceId: board.id,
    };
    const router = createRouterCapture();
    const systemCtx = {
        flow: {
            exists(name) {
                return [
                    "mint-share-token",
                    "resolve-share-token",
                    "construct-share-page",
                    "revoke-share-token",
                ].includes(name);
            },
            extend() {
                return true;
            },
            async run(flowName, input) {
                assert.equal(flowName, "mint-share-token");
                assert.equal(input.resourceType, "whiteboard");
                assert.equal(input.resourceId, board.id);
                return {
                    stageResults: {
                        "issue-token": [{ minted: true, shareRecord }],
                    },
                };
            },
        },
    };
    registerApiRoutes(router, {
        getCapability(key) {
            if (key === "db:executor") return db;
            if (key === "social:profileStore") {
                return {
                    async getProfile(accountId) {
                        return { handle: accountId };
                    },
                };
            }
            if (key === "system:ctx") return systemCtx;
            if (key === "logging:log") return () => {};
            return undefined;
        },
    });
    const token = issueAccessToken("alice", "user", 60);
    const req = {
        url: "/api/v1/modules/nextcloud-whiteboard/share",
        headers: { authorization: `Bearer ${token}` },
        async *[Symbol.asyncIterator]() {
            yield Buffer.from(JSON.stringify({ whiteboardId: board.id }));
        },
    };
    const res = createJsonResponse();

    await router.handler("POST", "/api/v1/modules/nextcloud-whiteboard/share")(
        req,
        res,
    );

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.json().data, shareRecord);
});

test("nextcloud whiteboard share guests use gateway guest profiles", async () => {
    const db = createMemoryDb();
    const store = new NextcloudWhiteboardStore({ db });
    await store.ensureSchema();
    await store.saveConfig({
        serverUrl: "https://whiteboard.example.test",
        apiKey: "session-token-secret-at-least-16-chars",
    });
    const board = await store.createWhiteboard({
        title: "Planning",
        createdBy: "alice",
        participants: [],
    });
    const router = createRouterCapture();
    registerApiRoutes(router, {
        getCapability(key) {
            if (key === "db:executor") return db;
            if (key === "social:profileStore") {
                return {
                    async getProfile() {
                        throw new Error("profile store should not be used");
                    },
                };
            }
            if (key === "share:resolveGuestAccess") {
                return async ({ claims, resourceType, resourceId }) => ({
                    shareGuest: String(claims?.sub ?? "").startsWith("share:"),
                    authorized:
                        resourceType === "whiteboard" &&
                        resourceId === board.id,
                    username: "guest:guest-1",
                    displayName: "Guest #123456",
                });
            }
            if (key === "logging:log") return () => {};
            return undefined;
        },
    });

    const token = issueAccessToken("share:share-1:guest-1", "user", 60);
    const req = {
        url: `/api/v1/modules/nextcloud-whiteboard/whiteboards/session?id=${board.id}`,
        headers: { authorization: `Bearer ${token}` },
    };
    const res = createJsonResponse();

    await router.handler(
        "GET",
        "/api/v1/modules/nextcloud-whiteboard/whiteboards/session",
    )(req, res);

    assert.equal(res.statusCode, 200);
    const sessionPayload = decodeJwtPayload(res.json().data.token);
    assert.equal(sessionPayload.user.id, "guest:guest-1");
    assert.equal(sessionPayload.user.name, "Guest #123456");
});

test("nextcloud whiteboard presence tracks share guests and profile users", async () => {
    const db = createMemoryDb();
    const store = new NextcloudWhiteboardStore({ db });
    await store.ensureSchema();
    const board = await store.createWhiteboard({
        title: "Planning",
        createdBy: "alice",
        participants: [],
    });
    const router = createRouterCapture();
    registerApiRoutes(router, {
        getCapability(key) {
            if (key === "db:executor") return db;
            if (key === "social:profileStore") {
                return {
                    async getProfile(accountId) {
                        return { handle: accountId };
                    },
                    async getProfileByHandle(handle) {
                        return {
                            handle,
                            displayName: handle === "alice" ? "Alice" : handle,
                            avatarKey:
                                handle === "alice" ? "avatars/alice" : null,
                        };
                    },
                };
            }
            if (key === "share:resolveGuestAccess") {
                return async ({ claims, resourceType, resourceId }) => ({
                    shareGuest: String(claims?.sub ?? "").startsWith("share:"),
                    authorized:
                        resourceType === "whiteboard" &&
                        resourceId === board.id,
                    username: "guest:guest-1",
                    displayName: "Guest #123456",
                });
            }
            if (key === "logging:log") return () => {};
            return undefined;
        },
    });

    const ownerToken = issueAccessToken("alice", "user", 60);
    const guestToken = issueAccessToken("share:share-1:guest-1", "user", 60);
    for (const [token, sessionId] of [
        [ownerToken, "owner-session"],
        [guestToken, "guest-session"],
    ]) {
        const res = createJsonResponse();
        await router.handler(
            "POST",
            "/api/v1/modules/nextcloud-whiteboard/whiteboards/presence",
        )(
            {
                headers: { authorization: `Bearer ${token}` },
                async *[Symbol.asyncIterator]() {
                    yield Buffer.from(
                        JSON.stringify({
                            pageId: board.id,
                            sessionId,
                            active: true,
                            pointer:
                                sessionId === "owner-session"
                                    ? {
                                          x: 0.25,
                                          y: 0.75,
                                          style: "laser",
                                          updatedAt: "2026-07-15T00:00:00.000Z",
                                      }
                                    : null,
                            selection:
                                sessionId === "owner-session"
                                    ? {
                                          items: [
                                              {
                                                  x: 0.1,
                                                  y: 0.2,
                                                  width: 0.3,
                                                  height: 0.4,
                                              },
                                          ],
                                          elementIds: ["shape-1"],
                                      }
                                    : null,
                        }),
                    );
                },
            },
            res,
        );
        assert.equal(res.statusCode, 200);
    }

    const listRes = createJsonResponse();
    await router.handler(
        "GET",
        "/api/v1/modules/nextcloud-whiteboard/whiteboards/presence",
    )(
        {
            url: `/api/v1/modules/nextcloud-whiteboard/whiteboards/presence?pageId=${board.id}`,
            headers: { authorization: `Bearer ${ownerToken}` },
        },
        listRes,
    );

    assert.equal(listRes.statusCode, 200);
    const entries = listRes.json().data.presence;
    const ownerPresence = entries.find(
        (entry) =>
            entry.handle === "alice" && entry.avatarKey === "avatars/alice",
    );
    assert.ok(ownerPresence);
    assert.deepEqual(ownerPresence.selection.items, [
        { x: 0.1, y: 0.2, width: 0.3, height: 0.4 },
    ]);
    assert.deepEqual(ownerPresence.selection.elementIds, ["shape-1"]);
    assert.ok(
        entries.some(
            (entry) =>
                entry.guest === true && entry.displayName === "Guest #123456",
        ),
    );

    const inactiveRes = createJsonResponse();
    await router.handler(
        "POST",
        "/api/v1/modules/nextcloud-whiteboard/whiteboards/presence",
    )(
        {
            headers: { authorization: `Bearer ${guestToken}` },
            async *[Symbol.asyncIterator]() {
                yield Buffer.from(
                    JSON.stringify({
                        pageId: board.id,
                        sessionId: "guest-session",
                        active: false,
                    }),
                );
            },
        },
        inactiveRes,
    );
    assert.equal(inactiveRes.statusCode, 200);

    await db.executeCommand({
        option: "UPDATE",
        table: "nextcloud_whiteboard_presence",
        set: {
            last_seen_at: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
        },
        where: [
            { column: "whiteboard_id", value: board.id },
            { column: "session_id", value: "owner-session" },
        ],
    });

    const filteredRes = createJsonResponse();
    await router.handler(
        "GET",
        "/api/v1/modules/nextcloud-whiteboard/whiteboards/presence",
    )(
        {
            url: `/api/v1/modules/nextcloud-whiteboard/whiteboards/presence?pageId=${board.id}`,
            headers: { authorization: `Bearer ${ownerToken}` },
        },
        filteredRes,
    );
    assert.equal(filteredRes.statusCode, 200);
    assert.deepEqual(filteredRes.json().data.presence, []);
});

test("nextcloud whiteboard config route returns 503 when dependencies are unavailable", async () => {
    const router = createRouterCapture();
    registerApiRoutes(router, {
        getCapability() {
            return undefined;
        },
    });

    const res = createJsonResponse();
    await router.handler("GET", "/api/v1/modules/nextcloud-whiteboard/config")(
        {},
        res,
    );

    assert.equal(res.statusCode, 503);
    assert.equal(res.json().error.code, "service_unavailable");
});

test("nextcloud whiteboard config remains available without the profile store", async () => {
    const db = createMemoryDb();
    const router = createRouterCapture();
    registerApiRoutes(router, {
        getCapability(key) {
            if (key === "db:executor") return db;
            return undefined;
        },
    });

    const res = createJsonResponse();
    await router.handler("GET", "/api/v1/modules/nextcloud-whiteboard/config")(
        {},
        res,
    );

    assert.equal(res.statusCode, 200);
    assert.equal(res.json().data.serverUrl, "");
    assert.equal(res.json().data.apiKeyConfigured, false);
});

test("nextcloud whiteboard routes resolve a profile store registered later", async () => {
    const db = createMemoryDb();
    const router = createRouterCapture();
    let profileStore;
    registerApiRoutes(router, {
        getCapability(key) {
            if (key === "db:executor") return db;
            if (key === "social:profileStore") return profileStore;
            if (key === "logging:log") return () => {};
            return undefined;
        },
    });
    router.handler(
        "POST",
        "/api/v1/modules/nextcloud-whiteboard/whiteboards/preflight",
    );
    const readinessResponse = createJsonResponse();
    await router.handler("GET", "/api/v1/modules/nextcloud-whiteboard/ping")(
        {},
        readinessResponse,
    );
    assert.equal(readinessResponse.statusCode, 200);
    assert.equal(readinessResponse.json().data.ready, true);
    assert.equal(readinessResponse.json().data.configComplete, false);
    profileStore = {
        async getProfile(accountId) {
            return { handle: accountId };
        },
    };

    const res = createJsonResponse();
    await router.handler(
        "GET",
        "/api/v1/modules/nextcloud-whiteboard/whiteboards",
    )(
        {
            url: "/api/v1/modules/nextcloud-whiteboard/whiteboards",
            headers: {
                authorization: `Bearer ${issueAccessToken("alice", "user", 60)}`,
            },
        },
        res,
    );

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.json().data, []);
});

test("nextcloud whiteboard config save preserves existing API key when omitted", async () => {
    const db = createMemoryDb();
    const store = new NextcloudWhiteboardStore({ db });
    await store.ensureSchema();
    await store.saveConfig({
        serverUrl: "https://whiteboard.example.test",
        apiKey: "existing-secret-at-least-16-chars",
        imageUploadMaxBytes: 1048576,
    });
    const router = createRouterCapture();
    registerApiRoutes(router, {
        getCapability(key) {
            if (key === "db:executor") return db;
            if (key === "social:profileStore") return { async getProfile() {} };
            if (key === "logging:log") return () => {};
            return undefined;
        },
    });

    const res = createJsonResponse();
    await router.handler("POST", "/api/v1/modules/nextcloud-whiteboard/config")(
        {
            headers: {
                authorization: `Bearer ${issueAccessToken("admin", "admin", 60)}`,
            },
            async *[Symbol.asyncIterator]() {
                yield Buffer.from(
                    JSON.stringify({
                        serverUrl: "https://whiteboard2.example.test",
                        apiKey: "",
                        imageUploadMaxBytes: 2048,
                    }),
                );
            },
        },
        res,
    );

    assert.equal(res.statusCode, 200);
    const saved = await store.getConfig();
    assert.equal(saved.serverUrl, "https://whiteboard2.example.test");
    assert.equal(saved.apiKey, "existing-secret-at-least-16-chars");
    assert.equal(saved.imageUploadMaxBytes, 2048);
});

test("nextcloud whiteboard config save accepts URL updates before an API key is configured", async () => {
    const db = createMemoryDb();
    const router = createRouterCapture();
    registerApiRoutes(router, {
        getCapability(key) {
            if (key === "db:executor") return db;
            if (key === "social:profileStore") return { async getProfile() {} };
            if (key === "logging:log") return () => {};
            return undefined;
        },
    });

    const res = createJsonResponse();
    await router.handler("POST", "/api/v1/modules/nextcloud-whiteboard/config")(
        {
            headers: {
                authorization: `Bearer ${issueAccessToken("admin", "admin", 60)}`,
            },
            async *[Symbol.asyncIterator]() {
                yield Buffer.from(
                    JSON.stringify({
                        serverUrl: "https://whiteboard.example.test",
                        apiKey: "",
                        imageUploadMaxBytes: 4096,
                    }),
                );
            },
        },
        res,
    );

    assert.equal(res.statusCode, 200);
    assert.equal(res.json().data.serverUrl, "https://whiteboard.example.test");
    assert.equal(res.json().data.apiKeyConfigured, false);
    assert.equal(res.json().data.imageUploadMaxBytes, 4096);
});

test("nextcloud whiteboard config validation identifies the invalid field", async () => {
    const db = createMemoryDb();
    const store = new NextcloudWhiteboardStore({ db });
    await store.ensureSchema();
    await store.saveConfig({
        serverUrl: "https://whiteboard.example.test",
        apiKey: "existing-secret-at-least-16-chars",
        imageUploadMaxBytes: 1048576,
    });
    const router = createRouterCapture();
    registerApiRoutes(router, {
        getCapability(key) {
            if (key === "db:executor") return db;
            if (key === "social:profileStore") return { async getProfile() {} };
            if (key === "logging:log") return () => {};
            return undefined;
        },
    });

    const urlRes = createJsonResponse();
    await router.handler("POST", "/api/v1/modules/nextcloud-whiteboard/config")(
        {
            headers: {
                authorization: `Bearer ${issueAccessToken("admin", "admin", 60)}`,
            },
            async *[Symbol.asyncIterator]() {
                yield Buffer.from(
                    JSON.stringify({ serverUrl: "notaurl", apiKey: "" }),
                );
            },
        },
        urlRes,
    );
    assert.equal(urlRes.statusCode, 400);
    assert.equal(
        urlRes.json().error.fieldId,
        "nextcloud-whiteboard-server-url",
    );

    const apiKeyRes = createJsonResponse();
    await router.handler("POST", "/api/v1/modules/nextcloud-whiteboard/config")(
        {
            headers: {
                authorization: `Bearer ${issueAccessToken("admin", "admin", 60)}`,
            },
            async *[Symbol.asyncIterator]() {
                yield Buffer.from(
                    JSON.stringify({
                        serverUrl: "https://whiteboard.example.test",
                        apiKey: "short",
                    }),
                );
            },
        },
        apiKeyRes,
    );
    assert.equal(apiKeyRes.statusCode, 400);
    assert.equal(
        apiKeyRes.json().error.fieldId,
        "nextcloud-whiteboard-api-key",
    );
});
