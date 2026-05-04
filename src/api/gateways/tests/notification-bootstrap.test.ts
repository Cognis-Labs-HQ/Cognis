import test from "node:test";
import assert from "node:assert/strict";
import { GatewayRegistry } from "../../gateway-registry.js";
import { RouteRegistry } from "../../route-registry.js";
import { bootstrapNotificationGateway } from "../notification-bootstrap.js";
import { issueAccessToken } from "../../auth/access-tokens.js";

function makeInMemoryDb(): {
    rows: Map<string, Record<string, unknown>[]>;
    execute: (sql: string, params?: unknown[]) => Promise<{ rows?: any[] }>;
} {
    const rows = new Map<string, Record<string, unknown>[]>();
    return {
        rows,
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

test("bootstrapNotificationGateway registers gateway with GatewayRegistry", async () => {
    const gatewayRegistry = new GatewayRegistry();
    const routeRegistry = new RouteRegistry();
    const db = makeInMemoryDb();

    await bootstrapNotificationGateway({
        dbExecutor: db,
        dbType: "sqlite",
        adaptersRoot: "/nonexistent",
        routeRegistry,
        gatewayRegistry,
    });

    const gateways = gatewayRegistry.list();
    assert.equal(gateways.length, 1);
    assert.equal(gateways[0].id, "notify");
    assert.equal(gateways[0].name, "Notification Gateway");
});

test("bootstrapNotificationGateway registers routes with RouteRegistry", async () => {
    const gatewayRegistry = new GatewayRegistry();
    const routeRegistry = new RouteRegistry();
    const db = makeInMemoryDb();

    await bootstrapNotificationGateway({
        dbExecutor: db,
        dbType: "sqlite",
        adaptersRoot: "/nonexistent",
        routeRegistry,
        gatewayRegistry,
    });

    assert.ok(
        routeRegistry.getHandlers().length >= 2,
        "Expected at least two handlers registered (notification + adapter routes)",
    );
});

test("gateway adapter route GET /api/v1/gateways/notify/adapters returns empty list when no senders", async () => {
    const gatewayRegistry = new GatewayRegistry();
    const routeRegistry = new RouteRegistry();
    const db = makeInMemoryDb();

    await bootstrapNotificationGateway({
        dbExecutor: db,
        dbType: "sqlite",
        adaptersRoot: "/nonexistent",
        routeRegistry,
        gatewayRegistry,
    });

    const adapterHandler = routeRegistry.getHandlers()[1];
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
    const gatewayRegistry = new GatewayRegistry();
    const routeRegistry = new RouteRegistry();
    const db = makeInMemoryDb();

    await bootstrapNotificationGateway({
        dbExecutor: db,
        dbType: "sqlite",
        adaptersRoot: "/nonexistent",
        routeRegistry,
        gatewayRegistry,
    });

    const adapterHandler = routeRegistry.getHandlers()[1];
    const req = { method: "GET", headers: {} } as any;
    const res = makeResponse();

    await adapterHandler(
        req,
        res,
        new URL("/api/v1/gateways/notify/adapters", "http://localhost"),
    );

    assert.equal(res.status, 401);
});
