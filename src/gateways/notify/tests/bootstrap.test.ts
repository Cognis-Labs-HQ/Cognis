import test from "node:test";
import assert from "node:assert/strict";
import { GatewayRegistry, CapabilityStore, createCtx } from "@cognis/core";
import { RouteRegistry } from "../../../api/reuse/route-registry.js";
import { bootstrap } from "../bootstrap.js";
import { issueAccessToken } from "../../auth/access-tokens.js";
import { createGatewayAdapterRoutes } from "../bootstrap/adapter-routes.js";

function makeInMemoryDb() {
    return {
        executeCommand: async () => ({ rows: [], rowCount: 0 }),
        ensureTable: async () => {},
        transaction: async <T>(
            cb: (db: ReturnType<typeof makeInMemoryDb>) => Promise<T>,
        ) => cb(makeInMemoryDb()),
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

const adminToken = issueAccessToken("test-session", "admin", 60);

test("SMTP adapter test endpoint sends through the ctx email capability", async () => {
    const requests: Array<Record<string, unknown>> = [];
    const gatewayRegistry = new GatewayRegistry();
    gatewayRegistry.register({
        id: "notify",
        name: "Notification Gateway",
        version: "1.0.0",
    });
    const route = createGatewayAdapterRoutes(
        "notify",
        {
            getSender: () => ({ senderId: "smtp" }),
        } as never,
        gatewayRegistry,
        undefined,
        async (input) => {
            requests.push(input);
            return { sent: true };
        },
    );
    const response = makeResponse();

    await route(
        {
            method: "POST",
            headers: { authorization: `Bearer ${adminToken}` },
            async *[Symbol.asyncIterator]() {
                yield Buffer.from(JSON.stringify({ to: "admin@example.test" }));
            },
        } as never,
        response,
        new URL("http://localhost/api/v1/gateways/notify/adapters/smtp/test"),
    );

    assert.equal(response.status, 200);
    assert.equal(requests[0]?.templateId, "notify-test");
    assert.equal(requests[0]?.recipientEmail, "admin@example.test");
});

async function makeCtx() {
    const gatewayRegistry = new GatewayRegistry();
    const routeRegistry = new RouteRegistry();
    const capabilities = new CapabilityStore();
    const db = makeInMemoryDb();
    const systemCtx = createCtx();
    capabilities.contribute("db:executor", db);
    return {
        gatewayRegistry,
        routeRegistry,
        capabilities,
        db,
        flow: systemCtx.flow,
    };
}

test("bootstrap registers notify gateway with GatewayRegistry", async () => {
    const { gatewayRegistry, routeRegistry, capabilities, flow } =
        await makeCtx();

    await bootstrap({
        adaptersRoot: "/nonexistent",
        routeRegistry,
        gatewayRegistry,
        capabilities,
        flow,
    });

    const gateways = gatewayRegistry.list();
    assert.equal(gateways.length, 1);
    assert.equal(gateways[0].id, "notify");
    assert.equal(gateways[0].name, "Notification Gateway");
});

test("bootstrap contributes LDAP email provisioning capability", async () => {
    const { gatewayRegistry, routeRegistry, capabilities, flow } =
        await makeCtx();

    await bootstrap({
        adaptersRoot: "/nonexistent",
        routeRegistry,
        gatewayRegistry,
        capabilities,
        flow,
    });

    const provision = capabilities.get<
        (accountId: string, emails: string[]) => Promise<void>
    >("notify:provisionUserEmails");
    assert.ok(provision);
    await assert.doesNotReject(
        provision("ldap-user", [
            "primary@example.org",
            "secondary@example.org",
        ]),
    );
});

test("bootstrap registers routes with RouteRegistry", async () => {
    const { gatewayRegistry, routeRegistry, capabilities, flow } =
        await makeCtx();

    await bootstrap({
        adaptersRoot: "/nonexistent",
        routeRegistry,
        gatewayRegistry,
        capabilities,
        flow,
    });

    assert.ok(
        routeRegistry.getHandlers().length >= 3,
        "Expected at least three handlers registered (notification routes + email routes + adapter routes)",
    );
});

test("GET /api/v1/gateways/notify/adapters returns empty list when no senders", async () => {
    const { gatewayRegistry, routeRegistry, capabilities, flow } =
        await makeCtx();

    await bootstrap({
        adaptersRoot: "/nonexistent",
        routeRegistry,
        gatewayRegistry,
        capabilities,
        flow,
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
    const { gatewayRegistry, routeRegistry, capabilities, flow } =
        await makeCtx();

    await bootstrap({
        adaptersRoot: "/nonexistent",
        routeRegistry,
        gatewayRegistry,
        capabilities,
        flow,
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

import { access } from "node:fs/promises";
import path from "node:path";
import { UIRegistry } from "../../../api/reuse/ui-registry.js";

test("notify gateway bootstrap registers correct static dir and admin-section.js exists on disk", async () => {
    const { gatewayRegistry, routeRegistry, capabilities, flow } =
        await makeCtx();
    const uiRegistry = new UIRegistry();

    await bootstrap({
        adaptersRoot: "/nonexistent",
        routeRegistry,
        gatewayRegistry,
        capabilities,
        flow,
        uiRegistry,
    });

    const staticDir = uiRegistry.getStaticDir("notify");
    assert.ok(
        staticDir,
        "notify gateway must register a static dir with UIRegistry",
    );

    await assert.doesNotReject(
        access(staticDir),
        `static dir must exist on disk: ${staticDir}`,
    );

    const adminSectionPath = path.join(staticDir, "admin-section.js");
    await assert.doesNotReject(
        access(adminSectionPath),
        `admin-section.js must exist in the registered static dir: ${adminSectionPath}`,
    );
});

test("notify gateway bootstrap registers admin section scriptUrl that resolves within static dir", async () => {
    const { gatewayRegistry, routeRegistry, capabilities, flow } =
        await makeCtx();
    const uiRegistry = new UIRegistry();

    await bootstrap({
        adaptersRoot: "/nonexistent",
        routeRegistry,
        gatewayRegistry,
        capabilities,
        flow,
        uiRegistry,
    });

    const sections = uiRegistry.listAdminSections();
    const notifSection = sections.find((s) => s.id === "notifications");
    assert.ok(
        notifSection,
        "notify gateway must register a 'notifications' admin section",
    );

    const staticDir = uiRegistry.getStaticDir("notify");
    assert.ok(staticDir, "notify gateway must register a static dir");

    const urlPrefix = "/static/gateways/notify/";
    assert.ok(
        notifSection.scriptUrl.startsWith(urlPrefix),
        `scriptUrl must start with ${urlPrefix}, got: ${notifSection.scriptUrl}`,
    );

    const filePart = notifSection.scriptUrl.slice(urlPrefix.length);
    const resolvedPath = path.join(staticDir, filePart);
    await assert.doesNotReject(
        access(resolvedPath),
        `file referenced by scriptUrl must exist on disk: ${resolvedPath}`,
    );
});

test("notify gateway bootstrap registers broadcasts admin section scriptUrl that resolves within static dir", async () => {
    const { gatewayRegistry, routeRegistry, capabilities, flow } =
        await makeCtx();
    const uiRegistry = new UIRegistry();

    await bootstrap({
        adaptersRoot: "/nonexistent",
        routeRegistry,
        gatewayRegistry,
        capabilities,
        flow,
        uiRegistry,
    });

    const sections = uiRegistry.listAdminSections();
    const broadcastsSection = sections.find(
        (section) => section.id === "broadcasts",
    );
    assert.ok(
        broadcastsSection,
        "notify gateway must register a 'broadcasts' admin section",
    );

    const staticDir = uiRegistry.getStaticDir("notify");
    assert.ok(staticDir, "notify gateway must register a static dir");

    const urlPrefix = "/static/gateways/notify/";
    assert.ok(
        broadcastsSection.scriptUrl.startsWith(urlPrefix),
        `scriptUrl must start with ${urlPrefix}, got: ${broadcastsSection.scriptUrl}`,
    );

    const filePart = broadcastsSection.scriptUrl.slice(urlPrefix.length);
    const resolvedPath = path.join(staticDir, filePart);
    await assert.doesNotReject(
        access(resolvedPath),
        `file referenced by scriptUrl must exist on disk: ${resolvedPath}`,
    );
});
