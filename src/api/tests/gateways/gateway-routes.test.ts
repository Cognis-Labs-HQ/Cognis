import test from "node:test";
import assert from "node:assert/strict";
import { createGatewayRoutes } from "../../routes/gateways/index.js";
import { GatewayRegistry } from "@cognis/core";
import { issueAccessToken } from "../../auth/access-tokens.js";

function makeResponse() {
    let status = 0;
    let payload = "";
    return {
        writeHead(code: number) {
            status = code;
        },
        end(p: string) {
            payload = p;
        },
        get status() {
            return status;
        },
        get payload() {
            return payload;
        },
    } as any;
}

function makeRequest(method: string, token?: string) {
    return {
        method,
        headers: token ? { authorization: `Bearer ${token}` } : {},
    } as any;
}

const adminToken = issueAccessToken("test-session", "admin", 60);

test("GET /api/v1/gateways returns empty list when no gateways registered", async () => {
    const registry = new GatewayRegistry();
    const handler = createGatewayRoutes(registry);

    const req = makeRequest("GET", adminToken);
    const res = makeResponse();
    const handled = await handler(
        req,
        res,
        new URL("/api/v1/gateways", "http://localhost"),
    );

    assert.ok(handled);
    assert.equal(res.status, 200);
    const body = JSON.parse(res.payload);
    assert.deepEqual(body.data, []);
});

test("GET /api/v1/gateways returns registered gateways", async () => {
    const registry = new GatewayRegistry();
    registry.register({
        id: "notify",
        name: "Notification Gateway",
        version: "0.1.0",
        publisher: "Cognis Labs",
    });
    const handler = createGatewayRoutes(registry);

    const req = makeRequest("GET", adminToken);
    const res = makeResponse();
    const handled = await handler(
        req,
        res,
        new URL("/api/v1/gateways", "http://localhost"),
    );

    assert.ok(handled);
    assert.equal(res.status, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.data.length, 1);
    assert.equal(body.data[0].id, "notify");
    assert.equal(body.data[0].name, "Notification Gateway");
});

test("GET /api/v1/gateways requires admin auth", async () => {
    const registry = new GatewayRegistry();
    const handler = createGatewayRoutes(registry);

    const req = makeRequest("GET");
    const res = makeResponse();
    await handler(req, res, new URL("/api/v1/gateways", "http://localhost"));

    assert.equal(res.status, 401);
});

test("GET /api/v1/gateways/:id returns a single gateway manifest", async () => {
    const registry = new GatewayRegistry();
    registry.register({
        id: "notify",
        name: "Notification Gateway",
        version: "0.1.0",
        description: "Sends notifications.",
        publisher: "Cognis Labs",
    });
    const handler = createGatewayRoutes(registry);

    const req = makeRequest("GET", adminToken);
    const res = makeResponse();
    const handled = await handler(
        req,
        res,
        new URL("/api/v1/gateways/notify", "http://localhost"),
    );

    assert.ok(handled);
    assert.equal(res.status, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.data.id, "notify");
    assert.equal(body.data.description, "Sends notifications.");
});

test("GET /api/v1/gateways/:id returns 404 for unknown gateway", async () => {
    const registry = new GatewayRegistry();
    const handler = createGatewayRoutes(registry);

    const req = makeRequest("GET", adminToken);
    const res = makeResponse();
    const handled = await handler(
        req,
        res,
        new URL("/api/v1/gateways/unknown", "http://localhost"),
    );

    assert.ok(handled);
    assert.equal(res.status, 404);
    const body = JSON.parse(res.payload);
    assert.equal(body.error.code, "not_found");
});

test("non-gateway paths return false", async () => {
    const registry = new GatewayRegistry();
    const handler = createGatewayRoutes(registry);

    const req = makeRequest("GET", adminToken);
    const res = makeResponse();
    const handled = await handler(
        req,
        res,
        new URL("/api/v1/modules", "http://localhost"),
    );

    assert.equal(handled, false);
});

import { UIRegistry } from "../../ui-registry.js";

test("GET /api/v1/admin/sections returns empty array with no uiRegistry", async () => {
    const registry = new GatewayRegistry();
    const handler = createGatewayRoutes(registry);

    const req = makeRequest("GET", adminToken);
    const res = makeResponse();
    const handled = await handler(
        req,
        res,
        new URL("/api/v1/admin/sections", "http://localhost"),
    );

    assert.ok(handled);
    assert.equal(res.status, 200);
    assert.deepEqual(JSON.parse(res.payload).data, []);
});

test("GET /api/v1/admin/sections requires admin auth", async () => {
    const registry = new GatewayRegistry();
    const handler = createGatewayRoutes(registry, new UIRegistry());

    const req = makeRequest("GET");
    const res = makeResponse();
    await handler(
        req,
        res,
        new URL("/api/v1/admin/sections", "http://localhost"),
    );

    assert.equal(res.status, 401);
});

test("GET /api/v1/admin/sections returns registered sections", async () => {
    const registry = new GatewayRegistry();
    const uiReg = new UIRegistry();
    uiReg.registerAdminSection({
        id: "notifications",
        label: "Notifications",
        scriptUrl: "/static/gateways/notify/admin-section.js",
    });
    const handler = createGatewayRoutes(registry, uiReg);

    const req = makeRequest("GET", adminToken);
    const res = makeResponse();
    const handled = await handler(
        req,
        res,
        new URL("/api/v1/admin/sections", "http://localhost"),
    );

    assert.ok(handled);
    assert.equal(res.status, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.data.length, 1);
    assert.equal(body.data[0].id, "notifications");
    assert.equal(
        body.data[0].scriptUrl,
        "/static/gateways/notify/admin-section.js",
    );
});

test("POST /api/v1/gateways/:id/enable sets gateway status to active", async () => {
    const registry = new GatewayRegistry();
    registry.register({
        id: "notify",
        name: "Notification Gateway",
        version: "0.1.0",
    });
    registry.disable("notify");
    const handler = createGatewayRoutes(registry);

    const req = makeRequest("POST", adminToken);
    const res = makeResponse();
    const handled = await handler(
        req,
        res,
        new URL("/api/v1/gateways/notify/enable", "http://localhost"),
    );

    assert.ok(handled);
    assert.equal(res.status, 200);
    assert.equal(JSON.parse(res.payload).data.status, "active");
    assert.equal(registry.get("notify")?.status, "active");
});

test("POST /api/v1/gateways/:id/disable sets gateway status to disabled", async () => {
    const registry = new GatewayRegistry();
    registry.register({
        id: "notify",
        name: "Notification Gateway",
        version: "0.1.0",
    });
    const handler = createGatewayRoutes(registry);

    const req = makeRequest("POST", adminToken);
    const res = makeResponse();
    const handled = await handler(
        req,
        res,
        new URL("/api/v1/gateways/notify/disable", "http://localhost"),
    );

    assert.ok(handled);
    assert.equal(res.status, 200);
    assert.equal(JSON.parse(res.payload).data.status, "disabled");
    assert.equal(registry.get("notify")?.status, "disabled");
});

test("POST /api/v1/gateways/:id/enable returns 404 for unknown gateway", async () => {
    const registry = new GatewayRegistry();
    const handler = createGatewayRoutes(registry);

    const req = makeRequest("POST", adminToken);
    const res = makeResponse();
    const handled = await handler(
        req,
        res,
        new URL("/api/v1/gateways/unknown/enable", "http://localhost"),
    );

    assert.ok(handled);
    assert.equal(res.status, 404);
});

test("POST /api/v1/gateways/:id/enable requires admin auth", async () => {
    const registry = new GatewayRegistry();
    registry.register({
        id: "notify",
        name: "Notification Gateway",
        version: "0.1.0",
    });
    const handler = createGatewayRoutes(registry);

    const req = makeRequest("POST");
    const res = makeResponse();
    await handler(
        req,
        res,
        new URL("/api/v1/gateways/notify/enable", "http://localhost"),
    );

    assert.equal(res.status, 401);
});

test("GET /api/v1/gateways list includes status field", async () => {
    const registry = new GatewayRegistry();
    registry.register({
        id: "notify",
        name: "Notification Gateway",
        version: "0.1.0",
    });
    const handler = createGatewayRoutes(registry);

    const req = makeRequest("GET", adminToken);
    const res = makeResponse();
    await handler(req, res, new URL("/api/v1/gateways", "http://localhost"));

    const body = JSON.parse(res.payload);
    assert.equal(body.data[0].status, "active");
});

test("POST /api/v1/gateways/:id/enable calls persistGatewayState with true", async () => {
    const registry = new GatewayRegistry();
    registry.register({
        id: "notify",
        name: "Notification Gateway",
        version: "0.1.0",
    });
    registry.disable("notify");

    let persisted: { id: string; enabled: boolean } | null = null;
    const handler = createGatewayRoutes(
        registry,
        undefined,
        async (id, enabled) => {
            persisted = { id, enabled };
        },
    );

    const req = makeRequest("POST", adminToken);
    const res = makeResponse();
    await handler(
        req,
        res,
        new URL("/api/v1/gateways/notify/enable", "http://localhost"),
    );

    assert.equal(res.status, 200);
    assert.deepEqual(persisted, { id: "notify", enabled: true });
});

test("POST /api/v1/gateways/:id/disable calls persistGatewayState with false", async () => {
    const registry = new GatewayRegistry();
    registry.register({
        id: "notify",
        name: "Notification Gateway",
        version: "0.1.0",
    });

    let persisted: { id: string; enabled: boolean } | null = null;
    const handler = createGatewayRoutes(
        registry,
        undefined,
        async (id, enabled) => {
            persisted = { id, enabled };
        },
    );

    const req = makeRequest("POST", adminToken);
    const res = makeResponse();
    await handler(
        req,
        res,
        new URL("/api/v1/gateways/notify/disable", "http://localhost"),
    );

    assert.equal(res.status, 200);
    assert.deepEqual(persisted, { id: "notify", enabled: false });
});

test("POST /api/v1/gateways/:id/enable allows re-enabling required gateways", async () => {
    const registry = new GatewayRegistry();
    registry.register({
        id: "db",
        name: "Database Gateway",
        version: "0.1.0",
        required: true,
    });
    registry.disable("db");
    const handler = createGatewayRoutes(registry);

    const req = makeRequest("POST", adminToken);
    const res = makeResponse();
    const handled = await handler(
        req,
        res,
        new URL("/api/v1/gateways/db/enable", "http://localhost"),
    );

    assert.ok(handled);
    assert.equal(res.status, 200);
    assert.equal(JSON.parse(res.payload).data.status, "active");
});

test("POST /api/v1/gateways/:id/disable returns 403 for required gateways", async () => {
    const registry = new GatewayRegistry();
    registry.register({
        id: "db",
        name: "Database Gateway",
        version: "0.1.0",
        required: true,
    });
    const handler = createGatewayRoutes(registry);

    const req = makeRequest("POST", adminToken);
    const res = makeResponse();
    const handled = await handler(
        req,
        res,
        new URL("/api/v1/gateways/db/disable", "http://localhost"),
    );

    assert.ok(handled);
    assert.equal(res.status, 403);
    assert.equal(JSON.parse(res.payload).error.code, "required_gateway");
});
