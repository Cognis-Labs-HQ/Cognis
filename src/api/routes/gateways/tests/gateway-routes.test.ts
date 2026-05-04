import test from "node:test";
import assert from "node:assert/strict";
import { createGatewayRoutes } from "../index.js";
import { GatewayRegistry } from "../../../gateway-registry.js";
import { issueAccessToken } from "../../../auth/access-tokens.js";

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

const adminToken = issueAccessToken("test-session", "admin", "admin");

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
