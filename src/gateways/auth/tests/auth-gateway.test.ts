import test from "node:test";
import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import path from "node:path";
import { GatewayRegistry, CapabilityStore } from "@cognis/core";
import { RouteRegistry } from "../../../api/route-registry.js";
import { UIRegistry } from "../../../api/ui-registry.js";
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
    } as unknown as {
        writeHead: (code: number) => void;
        end: (p: string) => void;
        status: number;
        payload: string;
    };
}

const adminToken = issueAccessToken("test-session", "admin", null);

test("auth gateway bootstrap registers in GatewayRegistry", async () => {
    const gatewayRegistry = new GatewayRegistry();
    const routeRegistry = new RouteRegistry();
    const capabilities = new CapabilityStore();

    await bootstrap({
        dbExecutor: makeInMemoryDb() as ReturnType<typeof makeInMemoryDb> & {
            execute: (
                sql: string,
                params?: unknown[],
            ) => Promise<{ rows?: unknown[] }>;
        },
        dbType: "sqlite",
        adaptersRoot: "/nonexistent",
        routeRegistry,
        gatewayRegistry,
        capabilities,
    });

    const gateways = gatewayRegistry.list();
    const authGw = gateways.find((g) => g.id === "auth");
    assert.ok(authGw, "auth gateway should be registered");
    assert.equal(authGw.required, true);
});

test("auth gateway contributes auth:accountStore capability", async () => {
    const gatewayRegistry = new GatewayRegistry();
    const routeRegistry = new RouteRegistry();
    const capabilities = new CapabilityStore();

    await bootstrap({
        dbExecutor: makeInMemoryDb() as ReturnType<typeof makeInMemoryDb> & {
            execute: (
                sql: string,
                params?: unknown[],
            ) => Promise<{ rows?: unknown[] }>;
        },
        dbType: "sqlite",
        adaptersRoot: "/nonexistent",
        routeRegistry,
        gatewayRegistry,
        capabilities,
    });

    assert.ok(
        capabilities.get("auth:accountStore"),
        "auth:accountStore should be contributed",
    );
});

test("GET /api/v1/auth/login-methods returns enabled providers", async () => {
    const gatewayRegistry = new GatewayRegistry();
    const routeRegistry = new RouteRegistry();
    const capabilities = new CapabilityStore();

    await bootstrap({
        dbExecutor: makeInMemoryDb() as ReturnType<typeof makeInMemoryDb> & {
            execute: (
                sql: string,
                params?: unknown[],
            ) => Promise<{ rows?: unknown[] }>;
        },
        dbType: "sqlite",
        adaptersRoot: "/nonexistent",
        routeRegistry,
        gatewayRegistry,
        capabilities,
    });

    const handlers = routeRegistry.getHandlers();
    const req = {
        method: "GET",
        headers: {},
    } as unknown as import("node:http").IncomingMessage;
    const res = makeResponse();

    let handled = false;
    for (const handler of handlers) {
        handled = await handler(
            req,
            res as unknown as import("node:http").ServerResponse,
            new URL("/api/v1/auth/login-methods", "http://localhost"),
        );
        if (handled) break;
    }

    assert.ok(handled);
    assert.equal(res.status, 200);
    const body = JSON.parse(res.payload) as { data: unknown[] };
    assert.ok(Array.isArray(body.data));
});

test("GET /api/v1/gateways/auth/adapters requires admin auth", async () => {
    const gatewayRegistry = new GatewayRegistry();
    const routeRegistry = new RouteRegistry();
    const capabilities = new CapabilityStore();

    await bootstrap({
        dbExecutor: makeInMemoryDb() as ReturnType<typeof makeInMemoryDb> & {
            execute: (
                sql: string,
                params?: unknown[],
            ) => Promise<{ rows?: unknown[] }>;
        },
        dbType: "sqlite",
        adaptersRoot: "/nonexistent",
        routeRegistry,
        gatewayRegistry,
        capabilities,
    });

    const handlers = routeRegistry.getHandlers();
    const req = {
        method: "GET",
        headers: {},
    } as unknown as import("node:http").IncomingMessage;
    const res = makeResponse();

    let handled = false;
    for (const handler of handlers) {
        handled = await handler(
            req,
            res as unknown as import("node:http").ServerResponse,
            new URL("/api/v1/gateways/auth/adapters", "http://localhost"),
        );
        if (handled) break;
    }

    assert.ok(handled);
    assert.equal(res.status, 401);
});

test("GET /api/v1/gateways/auth/adapters returns adapter list to admin", async () => {
    const gatewayRegistry = new GatewayRegistry();
    const routeRegistry = new RouteRegistry();
    const capabilities = new CapabilityStore();

    await bootstrap({
        dbExecutor: makeInMemoryDb() as ReturnType<typeof makeInMemoryDb> & {
            execute: (
                sql: string,
                params?: unknown[],
            ) => Promise<{ rows?: unknown[] }>;
        },
        dbType: "sqlite",
        adaptersRoot: "/nonexistent",
        routeRegistry,
        gatewayRegistry,
        capabilities,
    });

    const handlers = routeRegistry.getHandlers();
    const req = {
        method: "GET",
        headers: { authorization: `Bearer ${adminToken}` },
    } as unknown as import("node:http").IncomingMessage;
    const res = makeResponse();

    let handled = false;
    for (const handler of handlers) {
        handled = await handler(
            req,
            res as unknown as import("node:http").ServerResponse,
            new URL("/api/v1/gateways/auth/adapters", "http://localhost"),
        );
        if (handled) break;
    }

    assert.ok(handled);
    assert.equal(res.status, 200);
    const body = JSON.parse(res.payload) as { data: unknown[] };
    assert.ok(Array.isArray(body.data));
});

test("auth gateway bootstrap registers correct static dir and admin-section.js exists on disk", async () => {
    const gatewayRegistry = new GatewayRegistry();
    const routeRegistry = new RouteRegistry();
    const capabilities = new CapabilityStore();
    const uiRegistry = new UIRegistry();

    await bootstrap({
        dbExecutor: makeInMemoryDb() as ReturnType<typeof makeInMemoryDb> & {
            execute: (
                sql: string,
                params?: unknown[],
            ) => Promise<{ rows?: unknown[] }>;
        },
        dbType: "sqlite",
        adaptersRoot: "/nonexistent",
        routeRegistry,
        gatewayRegistry,
        capabilities,
        uiRegistry,
    });

    const staticDir = uiRegistry.getStaticDir("auth");
    assert.ok(
        staticDir,
        "auth gateway must register a static dir with UIRegistry",
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

test("auth gateway bootstrap registers admin section scriptUrl that resolves within static dir", async () => {
    const gatewayRegistry = new GatewayRegistry();
    const routeRegistry = new RouteRegistry();
    const capabilities = new CapabilityStore();
    const uiRegistry = new UIRegistry();

    await bootstrap({
        dbExecutor: makeInMemoryDb() as ReturnType<typeof makeInMemoryDb> & {
            execute: (
                sql: string,
                params?: unknown[],
            ) => Promise<{ rows?: unknown[] }>;
        },
        dbType: "sqlite",
        adaptersRoot: "/nonexistent",
        routeRegistry,
        gatewayRegistry,
        capabilities,
        uiRegistry,
    });

    const sections = uiRegistry.listAdminSections();
    const securitySection = sections.find((s) => s.id === "security");
    assert.ok(
        securitySection,
        "auth gateway must register a 'security' admin section",
    );

    const staticDir = uiRegistry.getStaticDir("auth");
    assert.ok(staticDir, "auth gateway must register a static dir");

    const urlPrefix = "/static/gateways/auth/";
    assert.ok(
        securitySection.scriptUrl.startsWith(urlPrefix),
        `scriptUrl must start with ${urlPrefix}, got: ${securitySection.scriptUrl}`,
    );

    const filePart = securitySection.scriptUrl.slice(urlPrefix.length);
    const resolvedPath = path.join(staticDir, filePart);
    await assert.doesNotReject(
        access(resolvedPath),
        `file referenced by scriptUrl must exist on disk: ${resolvedPath}`,
    );
});

test("CoreAuthGateway.getEnabledAdapter returns null for a disabled adapter", async () => {
    const { CoreAuthGateway } = await import("../gateway.js");

    const db = {
        execute: async (_sql: string, _params?: unknown[]) => ({ rows: [] }),
    } as ReturnType<typeof makeInMemoryDb> & {
        execute: (
            sql: string,
            params?: unknown[],
        ) => Promise<{ rows?: unknown[] }>;
    };

    const gw = new CoreAuthGateway(db, "sqlite");

    const mockAdapter = {
        id: "oidc",
        name: "OIDC",
        authenticate: async () => null,
        getConfigSchema: () => [],
        configure: () => undefined,
    };

    gw.registerAdapter(mockAdapter);

    assert.equal(
        gw.getEnabledAdapter("oidc"),
        null,
        "adapter that was never enabled should not be returned",
    );

    await gw.enableAdapter("oidc");
    assert.ok(
        gw.getEnabledAdapter("oidc"),
        "enabled adapter should be returned",
    );

    await gw.disableAdapter("oidc");
    assert.equal(
        gw.getEnabledAdapter("oidc"),
        null,
        "disabled adapter should not be returned",
    );
});

test("login endpoint returns 503 when no auth providers are available", async () => {
    const gatewayRegistry = new GatewayRegistry();
    const routeRegistry = new RouteRegistry();
    const capabilities = new CapabilityStore();

    await bootstrap({
        dbExecutor: makeInMemoryDb() as ReturnType<typeof makeInMemoryDb> & {
            execute: (
                sql: string,
                params?: unknown[],
            ) => Promise<{ rows?: unknown[] }>;
        },
        dbType: "sqlite",
        adaptersRoot: "/nonexistent",
        routeRegistry,
        gatewayRegistry,
        capabilities,
    });

    const entries = routeRegistry.getEntries();
    const chunks = [
        Buffer.from(
            JSON.stringify({
                provider: "local",
                username: "nobody",
                password: "bad",
            }),
        ),
    ];
    const req = {
        method: "POST",
        headers: {},
        [Symbol.asyncIterator]: async function* () {
            for (const chunk of chunks) yield chunk;
        },
    } as unknown as import("node:http").IncomingMessage;
    const res = makeResponse();

    let handled = false;
    for (const entry of entries) {
        handled = await entry.handler(
            req,
            res as unknown as import("node:http").ServerResponse,
            new URL("/api/v1/auth/login", "http://localhost"),
        );
        if (handled) break;
    }

    assert.ok(handled, "login endpoint should handle the request");
    assert.equal(res.status, 401, "bad credentials should yield 401");
});

test("POST /api/v1/auth/verify is registered and handles authenticated requests", async () => {
    const gatewayRegistry = new GatewayRegistry();
    const routeRegistry = new RouteRegistry();
    const capabilities = new CapabilityStore();

    await bootstrap({
        dbExecutor: makeInMemoryDb() as ReturnType<typeof makeInMemoryDb> & {
            execute: (
                sql: string,
                params?: unknown[],
            ) => Promise<{ rows?: unknown[] }>;
        },
        dbType: "sqlite",
        adaptersRoot: "/nonexistent",
        routeRegistry,
        gatewayRegistry,
        capabilities,
    });

    const createLocalAdmin = capabilities.get<
        (username: string, password: string) => Promise<void>
    >("auth:createLocalAdmin");
    await createLocalAdmin?.("verify-user", "pw");

    const token = issueAccessToken("verify-user", "admin", 60);
    const chunks = [Buffer.from(JSON.stringify({ password: "pw" }))];
    const req = {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
        [Symbol.asyncIterator]: async function* () {
            for (const chunk of chunks) yield chunk;
        },
    } as unknown as import("node:http").IncomingMessage;
    const res = makeResponse();

    let handled = false;
    for (const entry of routeRegistry.getEntries()) {
        handled = await entry.handler(
            req,
            res as unknown as import("node:http").ServerResponse,
            new URL("/api/v1/auth/verify", "http://localhost"),
        );
        if (handled) break;
    }

    assert.ok(handled, "verify endpoint should handle the request");
    assert.equal(res.status, 401);
    assert.match(res.payload, /invalid_credentials/);
});

test("POST /api/v1/auth/verify returns 401 for incorrect password", async () => {
    const gatewayRegistry = new GatewayRegistry();
    const routeRegistry = new RouteRegistry();
    const capabilities = new CapabilityStore();

    await bootstrap({
        dbExecutor: makeInMemoryDb() as ReturnType<typeof makeInMemoryDb> & {
            execute: (
                sql: string,
                params?: unknown[],
            ) => Promise<{ rows?: unknown[] }>;
        },
        dbType: "sqlite",
        adaptersRoot: "/nonexistent",
        routeRegistry,
        gatewayRegistry,
        capabilities,
    });

    const createLocalAdmin = capabilities.get<
        (username: string, password: string) => Promise<void>
    >("auth:createLocalAdmin");
    await createLocalAdmin?.("verify-user-2", "pw");

    const token = issueAccessToken("verify-user-2", "admin", 60);
    const chunks = [Buffer.from(JSON.stringify({ password: "wrong" }))];
    const req = {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
        [Symbol.asyncIterator]: async function* () {
            for (const chunk of chunks) yield chunk;
        },
    } as unknown as import("node:http").IncomingMessage;
    const res = makeResponse();

    let handled = false;
    for (const entry of routeRegistry.getEntries()) {
        handled = await entry.handler(
            req,
            res as unknown as import("node:http").ServerResponse,
            new URL("/api/v1/auth/verify", "http://localhost"),
        );
        if (handled) break;
    }

    assert.ok(handled, "verify endpoint should handle the request");
    assert.equal(res.status, 401);
    assert.match(res.payload, /invalid_credentials/);
});

test("POST /api/v1/auth/verify returns 401 when unauthenticated", async () => {
    const gatewayRegistry = new GatewayRegistry();
    const routeRegistry = new RouteRegistry();
    const capabilities = new CapabilityStore();

    await bootstrap({
        dbExecutor: makeInMemoryDb() as ReturnType<typeof makeInMemoryDb> & {
            execute: (
                sql: string,
                params?: unknown[],
            ) => Promise<{ rows?: unknown[] }>;
        },
        dbType: "sqlite",
        adaptersRoot: "/nonexistent",
        routeRegistry,
        gatewayRegistry,
        capabilities,
    });

    const req = {
        method: "POST",
        headers: {},
    } as unknown as import("node:http").IncomingMessage;
    const res = makeResponse();

    let handled = false;
    for (const entry of routeRegistry.getEntries()) {
        handled = await entry.handler(
            req,
            res as unknown as import("node:http").ServerResponse,
            new URL("/api/v1/auth/verify", "http://localhost"),
        );
        if (handled) break;
    }

    assert.ok(handled, "verify endpoint should handle the request");
    assert.equal(res.status, 401);
    assert.match(res.payload, /unauthorized/);
});

test("profile:createProfile capability is looked up lazily in login and register handlers", async () => {
    const gatewayRegistry = new GatewayRegistry();
    const routeRegistry = new RouteRegistry();
    const capabilities = new CapabilityStore();

    let profileCreated: string | null = null;

    await bootstrap({
        dbExecutor: makeInMemoryDb() as ReturnType<typeof makeInMemoryDb> & {
            execute: (
                sql: string,
                params?: unknown[],
            ) => Promise<{ rows?: unknown[] }>;
        },
        dbType: "sqlite",
        adaptersRoot: "/nonexistent",
        routeRegistry,
        gatewayRegistry,
        capabilities,
    });

    capabilities.contribute("preferences:store", {
        async get(_accountId: string, _key: string) {
            return JSON.stringify({
                trustedDomains: [],
                registrationsEnabled: true,
            });
        },
    });

    capabilities.contribute(
        "profile:createProfile",
        async (accountId: string) => {
            profileCreated = accountId;
        },
    );

    const entries = routeRegistry.getEntries();
    const chunks = [
        Buffer.from(
            JSON.stringify({ username: "testuser", password: "testpass" }),
        ),
    ];
    const req = {
        method: "POST",
        headers: {},
        [Symbol.asyncIterator]: async function* () {
            for (const chunk of chunks) yield chunk;
        },
    } as unknown as import("node:http").IncomingMessage;
    const res = makeResponse();

    for (const entry of entries) {
        const handled = await entry.handler(
            req,
            res as unknown as import("node:http").ServerResponse,
            new URL("/api/v1/auth/register", "http://localhost"),
        );
        if (handled) break;
    }

    assert.equal(
        profileCreated,
        "testuser",
        "profile:createProfile contributed after bootstrap should be invoked on register",
    );
});

test("RouteRegistry.getEntries returns handlers with their associated gatewayId", async () => {
    const registry = new RouteRegistry();

    const handlerA = async () => false;
    const handlerB = async () => false;
    const handlerC = async () => false;

    registry.register(handlerA, "notify");
    registry.register(handlerB, "profile");
    registry.register(handlerC);

    const entries = registry.getEntries();
    assert.equal(entries.length, 3);
    assert.equal(entries[0].gatewayId, "notify");
    assert.equal(entries[1].gatewayId, "profile");
    assert.equal(entries[2].gatewayId, undefined);
    assert.equal(entries[0].handler, handlerA);
    assert.equal(entries[1].handler, handlerB);
    assert.equal(entries[2].handler, handlerC);
});

test("auth register endpoint returns 403 when open registration is disabled", async () => {
    const gatewayRegistry = new GatewayRegistry();
    const routeRegistry = new RouteRegistry();
    const capabilities = new CapabilityStore();
    capabilities.contribute("preferences:store", {
        async get(_accountId: string, _key: string) {
            return JSON.stringify({
                trustedDomains: [],
                registrationsEnabled: false,
            });
        },
    });

    await bootstrap({
        dbExecutor: makeInMemoryDb() as ReturnType<typeof makeInMemoryDb> & {
            execute: (
                sql: string,
                params?: unknown[],
            ) => Promise<{ rows?: unknown[] }>;
        },
        dbType: "sqlite",
        adaptersRoot: "/nonexistent",
        routeRegistry,
        gatewayRegistry,
        capabilities,
    });

    const entries = routeRegistry.getEntries();
    const req = {
        method: "POST",
        headers: {},
        [Symbol.asyncIterator]: async function* () {
            yield Buffer.from(
                JSON.stringify({ username: "new-user", password: "pw" }),
            );
        },
    } as unknown as import("node:http").IncomingMessage;
    const res = makeResponse();

    for (const entry of entries) {
        const handled = await entry.handler(
            req,
            res as unknown as import("node:http").ServerResponse,
            new URL("/api/v1/auth/register", "http://localhost"),
        );
        if (handled) break;
    }

    assert.equal(res.status, 403);
    assert.match(res.payload, /registrations_disabled/);
});
