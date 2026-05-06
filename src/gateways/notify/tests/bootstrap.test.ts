import test from "node:test";
import assert from "node:assert/strict";
import { GatewayRegistry, CapabilityStore } from "@cognis/core";
import { RouteRegistry } from "../../../api/route-registry.js";
import { bootstrap } from "../bootstrap.js";
import { issueAccessToken } from "../../../api/auth/access-tokens.js";

function makeInMemoryDb() {
    return {
        execute: async (_sql: string, _params?: unknown[]) => ({ rows: [] }),
    };
}

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

const adminToken = issueAccessToken("test-session", "admin", "admin");

async function makeCtx() {
    const gatewayRegistry = new GatewayRegistry();
    const routeRegistry = new RouteRegistry();
    const capabilities = new CapabilityStore();
    const db = makeInMemoryDb();
    return { gatewayRegistry, routeRegistry, capabilities, db };
}

test("bootstrap registers notify gateway with GatewayRegistry", async () => {
    const { gatewayRegistry, routeRegistry, capabilities, db } =
        await makeCtx();

    await bootstrap({
        dbExecutor: db as any,
        dbType: "sqlite",
        adaptersRoot: "/nonexistent",
        routeRegistry,
        gatewayRegistry,
        capabilities,
    });

    const gateways = gatewayRegistry.list();
    assert.equal(gateways.length, 1);
    assert.equal(gateways[0].id, "notify");
    assert.equal(gateways[0].name, "Notification Gateway");
});

test("bootstrap registers routes with RouteRegistry", async () => {
    const { gatewayRegistry, routeRegistry, capabilities, db } =
        await makeCtx();

    await bootstrap({
        dbExecutor: db as any,
        dbType: "sqlite",
        adaptersRoot: "/nonexistent",
        routeRegistry,
        gatewayRegistry,
        capabilities,
    });

    assert.ok(
        routeRegistry.getHandlers().length >= 3,
        "Expected at least three handlers registered (notification routes + email routes + adapter routes)",
    );
});

test("GET /api/v1/gateways/notify/adapters returns empty list when no senders", async () => {
    const { gatewayRegistry, routeRegistry, capabilities, db } =
        await makeCtx();

    await bootstrap({
        dbExecutor: db as any,
        dbType: "sqlite",
        adaptersRoot: "/nonexistent",
        routeRegistry,
        gatewayRegistry,
        capabilities,
    });

    const handlers = routeRegistry.getHandlers();
    const adapterHandler = handlers[handlers.length - 1];
    const req = {
        method: "GET",
        headers: { authorization: `Bearer ${adminToken}` },
    } as any;
    const res = makeResponse();

    const handled = await adapterHandler(
        req,
        res,
        new URL("/api/v1/gateways/notify/adapters", "http://localhost"),
    );

    assert.ok(handled);
    assert.equal(res.status, 200);
    const body = JSON.parse(res.payload);
    assert.ok(Array.isArray(body.data));
});

test("gateway adapter route requires admin auth", async () => {
    const { gatewayRegistry, routeRegistry, capabilities, db } =
        await makeCtx();

    await bootstrap({
        dbExecutor: db as any,
        dbType: "sqlite",
        adaptersRoot: "/nonexistent",
        routeRegistry,
        gatewayRegistry,
        capabilities,
    });

    const handlers = routeRegistry.getHandlers();
    const adapterHandler = handlers[handlers.length - 1];
    const req = { method: "GET", headers: {} } as any;
    const res = makeResponse();

    await adapterHandler(
        req,
        res,
        new URL("/api/v1/gateways/notify/adapters", "http://localhost"),
    );

    assert.equal(res.status, 401);
});
