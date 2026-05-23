import test from "node:test";
import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import { GatewayRegistry, CapabilityStore } from "@cognis/core";
import { RouteRegistry } from "../../../api/route-registry.js";
import { UIRegistry } from "../../../api/ui-registry.js";
import { bootstrap } from "../bootstrap.js";
import { issueAccessToken } from "../access-tokens.js";
import { InMemoryTestExecutor } from "../../../gateways/db/tests/in-memory-test-executor.js";

type HttpIncomingMessage = import("node:http").IncomingMessage;

function makeInMemoryDb() {
    return {
        execute: async (_sql: string, _params?: unknown[]) => ({ rows: [] }),
        executeCommand: async () => ({ rows: [] }),
        ensureTable: async () => {},
        transaction: async <T>(
            cb: (db: ReturnType<typeof makeInMemoryDb>) => Promise<T>,
        ) => cb(makeInMemoryDb()),
    };
}

function makeJsonRequest(
    method: string,
    body: Record<string, unknown>,
    headers: Record<string, string> = {},
) {
    const chunks = [Buffer.from(JSON.stringify(body))];
    return {
        method,
        headers,
        [Symbol.asyncIterator]: async function* () {
            for (const chunk of chunks) yield chunk;
        },
    } as unknown as import("node:http").IncomingMessage;
}

async function dispatchRoute(
    routeRegistry: RouteRegistry,
    req: import("node:http").IncomingMessage,
    pathname: string,
) {
    const res = makeResponse();
    let handled = false;
    for (const entry of routeRegistry.getEntries()) {
        handled = await entry.handler(
            req,
            res as unknown as import("node:http").ServerResponse,
            new URL(pathname, "http://localhost"),
        );
        if (handled) break;
    }
    return { handled, res };
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

test("GET /api/v1/auth/registration-config returns open-registration state", async () => {
    const gatewayRegistry = new GatewayRegistry();
    const routeRegistry = new RouteRegistry();
    const capabilities = new CapabilityStore();
    capabilities.contribute("registration:public:isEnabled", () => true);

    await bootstrap({
        dbExecutor: makeInMemoryDb() as ReturnType<typeof makeInMemoryDb> & {
            execute: (
                sql: string,
                params?: unknown[],
            ) => Promise<{ rows?: unknown[] }>;
        },
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
            new URL("/api/v1/auth/registration-config", "http://localhost"),
        );
        if (handled) break;
    }

    assert.ok(handled);
    assert.equal(res.status, 200);
    const body = JSON.parse(res.payload) as {
        data: { registrationsEnabled: boolean };
    };
    assert.equal(body.data.registrationsEnabled, true);
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

test("auth gateway bootstrap registers correct static dir", async () => {
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
});

test("auth gateway bootstrap registers security section without redundant authentication admin section", async () => {
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
        adaptersRoot: "/nonexistent",
        routeRegistry,
        gatewayRegistry,
        capabilities,
        uiRegistry,
    });

    const sections = uiRegistry.listAdminSections();
    const authenticationSection = sections.find(
        (s) => s.id === "authentication",
    );
    assert.equal(
        authenticationSection,
        undefined,
        "auth gateway must not register a redundant 'authentication' admin section",
    );

    const settingsSections = uiRegistry.listSettingsSections();
    const settingsSecuritySection = settingsSections.find(
        (section) => section.id === "security",
    );
    assert.ok(
        settingsSecuritySection,
        "auth gateway must register a security settings section",
    );
    assert.equal(
        settingsSecuritySection?.scriptUrl,
        "/static/gateways/auth/security-prefs.js",
    );

    const staticDir = uiRegistry.getStaticDir("auth");
    assert.ok(staticDir, "auth gateway must register a static dir");
});

test("CoreAuthGateway.getEnabledAdapter returns null for a disabled adapter", async () => {
    const { CoreAuthGateway } = await import("../gateway.js");

    const db = {
        execute: async (_sql: string, _params?: unknown[]) => ({ rows: [] }),
        executeCommand: async () => ({ rows: [] }),
    } as ReturnType<typeof makeInMemoryDb> & {
        execute: (
            sql: string,
            params?: unknown[],
        ) => Promise<{ rows?: unknown[] }>;
        executeCommand: () => Promise<{ rows?: unknown[] }>;
    };

    const gw = new CoreAuthGateway(db);

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

test("POST /api/v1/auth/verify returns 401 for stale unknown authenticated user", async () => {
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
        adaptersRoot: "/nonexistent",
        routeRegistry,
        gatewayRegistry,
        capabilities,
    });

    const staleIssuedAt = Date.now() - 2 * 60 * 60 * 1000;
    const token = issueAccessToken("verify-user", "admin", 10800, {
        issuedAt: staleIssuedAt,
    });
    const chunks = [
        Buffer.from(JSON.stringify({ password: "test-password-123" })),
    ];
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

test("POST /api/v1/auth/verify returns 200 for fresh authenticated session", async () => {
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
        adaptersRoot: "/nonexistent",
        routeRegistry,
        gatewayRegistry,
        capabilities,
    });

    const token = issueAccessToken("verify-user-fresh", "admin", 60);
    const req = {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
        [Symbol.asyncIterator]: async function* () {
            yield Buffer.from(JSON.stringify({ password: "wrong-password" }));
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
    assert.equal(res.status, 200);
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

test("GET /api/v1/auth/password-change-capability reports support for local accounts", async () => {
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
        adaptersRoot: "/nonexistent",
        routeRegistry,
        gatewayRegistry,
        capabilities,
    });

    const token = issueAccessToken("settings-user", "user", 60);
    const { handled, res } = await dispatchRoute(
        routeRegistry,
        {
            method: "GET",
            headers: { authorization: `Bearer ${token}` },
        } as unknown as HttpIncomingMessage,
        "/api/v1/auth/password-change-capability",
    );

    assert.equal(handled, true);
    assert.equal(res.status, 200);
    const payload = JSON.parse(res.payload) as {
        data: {
            adapterId: string;
            adapterName: string;
            supported: boolean;
        };
    };
    assert.equal(payload.data.adapterId, "local");
    assert.equal(payload.data.adapterName, "Local");
    assert.equal(payload.data.supported, true);
});

test("POST /api/v1/auth/reset-password updates local account credentials", async () => {
    const gatewayRegistry = new GatewayRegistry();
    const routeRegistry = new RouteRegistry();
    const capabilities = new CapabilityStore();
    const db = new InMemoryTestExecutor();

    await bootstrap({
        dbExecutor: db,
        adaptersRoot: "/nonexistent",
        routeRegistry,
        gatewayRegistry,
        capabilities,
    });

    const accountStore = capabilities.get<{
        register: (username: string, password: string) => Promise<unknown>;
        verify: (
            username: string,
            password: string,
        ) => Promise<{ accountId: string } | null>;
    }>("auth:accountStore");
    assert.ok(accountStore, "auth account store capability should exist");
    await accountStore?.register("password-user", "before-reset");

    const resetToken = issueAccessToken("password-user", "user", 60);
    const { handled, res } = await dispatchRoute(
        routeRegistry,
        makeJsonRequest(
            "POST",
            { password: "after-reset" },
            { authorization: `Bearer ${resetToken}` },
        ),
        "/api/v1/auth/reset-password",
    );

    assert.equal(handled, true);
    assert.equal(res.status, 200);

    const oldCredentials = await accountStore?.verify(
        "password-user",
        "before-reset",
    );
    const newCredentials = await accountStore?.verify(
        "password-user",
        "after-reset",
    );
    assert.equal(oldCredentials, null);
    assert.equal(newCredentials?.accountId, "password-user");
});

test("POST /api/v1/auth/emergency-token requires admin auth", async () => {
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
        adaptersRoot: "/nonexistent",
        routeRegistry,
        gatewayRegistry,
        capabilities,
    });

    const userToken = issueAccessToken("regular-user", "user", 60);
    const req = {
        method: "POST",
        headers: { authorization: `Bearer ${userToken}` },
    } as unknown as HttpIncomingMessage;
    const { handled, res } = await dispatchRoute(
        routeRegistry,
        req,
        "/api/v1/auth/emergency-token",
    );

    assert.equal(handled, true);
    assert.equal(res.status, 403);
    assert.match(res.payload, /forbidden/);
});

test("POST /api/v1/auth/emergency-token returns a 1h admin token", async () => {
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
        adaptersRoot: "/nonexistent",
        routeRegistry,
        gatewayRegistry,
        capabilities,
    });

    const req = {
        method: "POST",
        headers: { authorization: `Bearer ${adminToken}` },
    } as unknown as HttpIncomingMessage;
    const { handled, res } = await dispatchRoute(
        routeRegistry,
        req,
        "/api/v1/auth/emergency-token",
    );

    assert.equal(handled, true);
    assert.equal(res.status, 200);
    const body = JSON.parse(res.payload) as {
        data: {
            token: string;
            role: string;
            ttlSeconds: number;
            expiresAt: string;
        };
    };
    assert.ok(body.data.token.startsWith("cgs_"));
    assert.equal(body.data.role, "admin");
    assert.equal(body.data.ttlSeconds, 3600);
    const expiresAtMs = Date.parse(body.data.expiresAt);
    const expectedExpiresAtMs = Date.now() + body.data.ttlSeconds * 1000;
    const MAX_EXPIRY_DRIFT_MS = 5_000;
    assert.ok(expiresAtMs > Date.now());
    assert.ok(
        Math.abs(expiresAtMs - expectedExpiresAtMs) <= MAX_EXPIRY_DRIFT_MS,
    );
});

test("registration:public:register capability is looked up lazily in register handler", async () => {
    const gatewayRegistry = new GatewayRegistry();
    const routeRegistry = new RouteRegistry();
    const capabilities = new CapabilityStore();

    let createdUsername: string | null = null;

    await bootstrap({
        dbExecutor: makeInMemoryDb() as ReturnType<typeof makeInMemoryDb> & {
            execute: (
                sql: string,
                params?: unknown[],
            ) => Promise<{ rows?: unknown[] }>;
        },
        adaptersRoot: "/nonexistent",
        routeRegistry,
        gatewayRegistry,
        capabilities,
    });

    capabilities.contribute("registration:public:isEnabled", () => true);
    capabilities.contribute(
        "registration:public:register",
        async ({ username }: { username: string }) => {
            createdUsername = username;
            return { username, role: "user", enabled: true };
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

    assert.equal(createdUsername, "testuser");
    const body = JSON.parse(res.payload) as {
        data: { verifyToken?: string };
    };
    assert.equal(typeof body.data.verifyToken, "string");
    assert.ok(body.data.verifyToken);
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
    capabilities.contribute("registration:public:isEnabled", () => false);

    await bootstrap({
        dbExecutor: makeInMemoryDb() as ReturnType<typeof makeInMemoryDb> & {
            execute: (
                sql: string,
                params?: unknown[],
            ) => Promise<{ rows?: unknown[] }>;
        },
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

test("login userValidation fails open when SMTP validation is enabled but unavailable", async () => {
    const gatewayRegistry = new GatewayRegistry();
    const routeRegistry = new RouteRegistry();
    const capabilities = new CapabilityStore();
    capabilities.contribute("registration:public:isEnabled", () => true);
    capabilities.contribute(
        "registration:public:register",
        async ({
            username,
            password,
            displayName,
        }: {
            username: string;
            password: string;
            displayName?: string;
        }) => {
            const accountStore = capabilities.get<{
                register: (
                    username: string,
                    password: string,
                    role?: "user" | "teacher" | "moderator" | "admin",
                    displayName?: string,
                ) => Promise<{
                    username: string;
                    role?: string;
                    enabled: boolean;
                }>;
            }>("auth:accountStore");
            return accountStore!.register(
                username,
                password,
                "user",
                displayName,
            );
        },
    );
    capabilities.contribute("preferences:store", {
        async get(_accountId: string, _key: string) {
            return JSON.stringify({
                trustedDomains: [],
                registrationsEnabled: true,
                userValidationMode: "smtp",
            });
        },
    });
    const db = new InMemoryTestExecutor();
    await bootstrap({
        dbExecutor: db,
        adaptersRoot: "/nonexistent",
        routeRegistry,
        gatewayRegistry,
        capabilities,
    });

    const registerResult = await dispatchRoute(
        routeRegistry,
        makeJsonRequest("POST", {
            username: "alice",
            password: "pass123",
            displayName: "Alice Liddell",
        }),
        "/api/v1/auth/register",
    );
    assert.ok(registerResult.handled);
    assert.equal(registerResult.res.status, 201);

    const loginResult = await dispatchRoute(
        routeRegistry,
        makeJsonRequest("POST", {
            provider: "local",
            username: "alice",
            password: "pass123",
        }),
        "/api/v1/auth/login",
    );
    assert.ok(loginResult.handled);
    assert.equal(loginResult.res.status, 200);
    const payload = JSON.parse(loginResult.res.payload) as {
        data: {
            displayName: string;
            requiredUserValidation: boolean;
            userValidationMode: string;
        };
    };
    assert.equal(payload.data.displayName, "Alice Liddell");
    assert.equal(payload.data.userValidationMode, "smtp");
    assert.equal(payload.data.requiredUserValidation, false);
});

test("login userValidation exempts founder admin even when SMTP is available", async () => {
    const gatewayRegistry = new GatewayRegistry();
    const routeRegistry = new RouteRegistry();
    const capabilities = new CapabilityStore();
    capabilities.contribute("preferences:store", {
        async get(_accountId: string, _key: string) {
            return JSON.stringify({
                trustedDomains: [],
                registrationsEnabled: true,
                userValidationMode: "smtp",
            });
        },
    });
    capabilities.contribute("notify:canSendVerificationEmail", () => true);
    const db = new InMemoryTestExecutor();
    await bootstrap({
        dbExecutor: db,
        adaptersRoot: "/nonexistent",
        routeRegistry,
        gatewayRegistry,
        capabilities,
    });

    const createLocalAdmin = capabilities.get<
        (username: string, password: string) => Promise<void>
    >("auth:createLocalAdmin");
    const accountStore = capabilities.get<{
        isFounder: (username: string) => Promise<boolean>;
    }>("auth:accountStore");
    assert.ok(createLocalAdmin);
    assert.ok(accountStore);
    await createLocalAdmin?.("root-admin", "adminpass");
    assert.equal(await accountStore?.isFounder("root-admin"), true);

    const loginResult = await dispatchRoute(
        routeRegistry,
        makeJsonRequest("POST", {
            provider: "local",
            username: "root-admin",
            password: "adminpass",
        }),
        "/api/v1/auth/login",
    );
    assert.ok(loginResult.handled);
    assert.equal(loginResult.res.status, 200);
    const payload = JSON.parse(loginResult.res.payload) as {
        data: {
            role: string;
            isFounder: boolean;
            requiredUserValidation: boolean;
            userValidationMode: string;
        };
    };
    assert.equal(payload.data.role, "owner");
    assert.equal(payload.data.isFounder, true);
    assert.equal(payload.data.userValidationMode, "smtp");
    assert.equal(payload.data.requiredUserValidation, false);
});

test("auth bootstrap contributes page script origin registration capability", async () => {
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
        adaptersRoot: "/nonexistent",
        routeRegistry,
        gatewayRegistry,
        capabilities,
    });

    const registerScriptOrigins = capabilities.get<
        (
            ownerId: string,
            rawOrigins: Array<string | null | undefined>,
        ) => string[]
    >("auth:registerPageScriptOrigins");

    assert.equal(typeof registerScriptOrigins, "function");
    assert.deepEqual(
        registerScriptOrigins?.("test:auth-gateway", [
            "https://meetings.example.test/path",
        ]),
        ["https://meetings.example.test"],
    );
});

test("auth tfa routes expose smtp-tfa availability and setup status", async () => {
    const gatewayRegistry = new GatewayRegistry();
    const routeRegistry = new RouteRegistry();
    const capabilities = new CapabilityStore();
    const preferenceState = new Map<string, string>();
    capabilities.contribute("preferences:store", {
        async get(accountId: string, key: string) {
            return preferenceState.get(`${accountId}:${key}`) ?? null;
        },
        async set(accountId: string, key: string, value: string) {
            preferenceState.set(`${accountId}:${key}`, value);
        },
    });
    let hasVerifiedEmail = false;
    let lastSetupCode = "";
    capabilities.contribute("notify:canSendVerificationEmail", () => true);
    capabilities.contribute(
        "notify:hasVerifiedEmail",
        async () => hasVerifiedEmail,
    );
    capabilities.contribute("notify:dispatch", async ({ body }) => {
        const match = String(body ?? "").match(/(\d{6})/);
        lastSetupCode = match?.[1] ?? "";
        return { dispatched: ["smtp"] };
    });
    await bootstrap({
        dbExecutor: makeInMemoryDb() as ReturnType<typeof makeInMemoryDb> & {
            execute: (
                sql: string,
                params?: unknown[],
            ) => Promise<{ rows?: unknown[] }>;
        },
        adaptersRoot: `${process.cwd()}/src/adapters`,
        routeRegistry,
        gatewayRegistry,
        capabilities,
    });

    const enableResult = await dispatchRoute(
        routeRegistry,
        makeJsonRequest(
            "PUT",
            { enabled: true },
            { authorization: `Bearer ${adminToken}` },
        ),
        "/api/v1/gateways/auth/adapters/smtp-tfa/config",
    );
    assert.equal(enableResult.res.status, 200);

    const methodsResult = await dispatchRoute(
        routeRegistry,
        makeJsonRequest("GET", {}, { authorization: `Bearer ${adminToken}` }),
        "/api/v1/auth/tfa/methods",
    );
    assert.equal(methodsResult.res.status, 200);
    const methodsPayload = JSON.parse(methodsResult.res.payload) as {
        data: Array<{
            id: string;
            available: boolean;
            setupRequestPath?: string;
            setupVerifyPath?: string;
        }>;
    };
    const smtpMethod = methodsPayload.data.find(
        (entry) => entry.id === "smtp-tfa",
    );
    assert.equal(Boolean(smtpMethod), true);
    assert.equal(smtpMethod?.available, true);
    assert.equal(
        smtpMethod?.setupRequestPath,
        "/api/v1/auth/smtp-tfa/setup-request",
    );
    assert.equal(
        smtpMethod?.setupVerifyPath,
        "/api/v1/auth/smtp-tfa/setup-verify",
    );

    const userToken = issueAccessToken("alice", "user", 120);
    const setupRequestWithoutEmail = await dispatchRoute(
        routeRegistry,
        makeJsonRequest("POST", {}, { authorization: `Bearer ${userToken}` }),
        "/api/v1/auth/smtp-tfa/setup-request",
    );
    assert.equal(setupRequestWithoutEmail.res.status, 409);

    hasVerifiedEmail = true;
    const setupRequestResult = await dispatchRoute(
        routeRegistry,
        makeJsonRequest("POST", {}, { authorization: `Bearer ${userToken}` }),
        "/api/v1/auth/smtp-tfa/setup-request",
    );
    assert.equal(setupRequestResult.res.status, 200);
    const setupRequestPayload = JSON.parse(setupRequestResult.res.payload) as {
        data: { challengeId: string };
    };
    assert.equal(lastSetupCode.length, 6);
    assert.equal(setupRequestPayload.data.challengeId.length > 0, true);

    const setupVerifyResult = await dispatchRoute(
        routeRegistry,
        makeJsonRequest(
            "POST",
            {
                challengeId: setupRequestPayload.data.challengeId,
                code: lastSetupCode,
            },
            { authorization: `Bearer ${userToken}` },
        ),
        "/api/v1/auth/smtp-tfa/setup-verify",
    );
    assert.equal(setupVerifyResult.res.status, 200);
    await capabilities
        .get<{
            set(accountId: string, key: string, value: string): Promise<void>;
        }>("preferences:store")
        ?.set("alice", "auth-smtp-tfa", JSON.stringify({ enabled: false }));

    await capabilities
        .get<{
            set(accountId: string, key: string, value: string): Promise<void>;
        }>("preferences:store")
        ?.set(
            "__system__",
            "security-settings",
            JSON.stringify({
                registrationsEnabled: true,
                userValidationMode: "none",
                requireTeacherManualApproval: true,
                activeTfaMethods: ["smtp-tfa"],
                enforceTfaForNewUsers: true,
            }),
        );
    await capabilities
        .get<{
            set(accountId: string, key: string, value: string): Promise<void>;
        }>("preferences:store")
        ?.set(
            "alice",
            "auth-tfa-onboarding-pending",
            JSON.stringify({ enabled: true }),
        );

    const setupStatusResult = await dispatchRoute(
        routeRegistry,
        makeJsonRequest("GET", {}, { authorization: `Bearer ${userToken}` }),
        "/api/v1/auth/tfa/setup-status",
    );
    assert.equal(setupStatusResult.res.status, 200);
    const setupStatusPayload = JSON.parse(setupStatusResult.res.payload) as {
        data: { required: boolean };
    };
    assert.equal(setupStatusPayload.data.required, true);
});
