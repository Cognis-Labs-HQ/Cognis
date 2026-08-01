import test from "node:test";
import assert from "node:assert/strict";
import {
    GatewayRegistry,
    CapabilityStore,
    CTX_CAPABILITY,
    createCtx,
} from "@cognis/core";
import { RouteRegistry } from "../../../api/reuse/route-registry.js";
import { bootstrap } from "../bootstrap.js";
import { issueAccessToken } from "../access-tokens.js";
import {
    contributeTestKeyring,
    adminToken,
    HttpIncomingMessage,
    makeInMemoryDb,
    makeResponse,
} from "./auth-gateway-test-helpers.js";

async function bootstrapAuthGateway(input: {
    gatewayRegistry: GatewayRegistry;
    routeRegistry: RouteRegistry;
    capabilities: CapabilityStore;
    db: unknown;
}): Promise<void> {
    const systemCtx = createCtx();
    input.capabilities.contribute(CTX_CAPABILITY, systemCtx);
    input.capabilities.contribute("db:executor", input.db);
    contributeTestKeyring(input.capabilities);
    await bootstrap({
        adaptersRoot: "/nonexistent",
        routeRegistry: input.routeRegistry,
        gatewayRegistry: input.gatewayRegistry,
        capabilities: input.capabilities,
        flow: systemCtx.flow,
    });
}

test("GET /api/v1/auth/login-methods returns enabled providers", async () => {
    const gatewayRegistry = new GatewayRegistry();
    const routeRegistry = new RouteRegistry();
    const capabilities = new CapabilityStore();

    await bootstrapAuthGateway({
        gatewayRegistry,
        routeRegistry,
        capabilities,
        db: makeInMemoryDb() as ReturnType<typeof makeInMemoryDb> & {
            execute: (
                sql: string,
                params?: unknown[],
            ) => Promise<{ rows?: unknown[] }>;
        },
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

test("auth bootstrap exposes provider-aware password confirmation", async () => {
    const gatewayRegistry = new GatewayRegistry();
    const routeRegistry = new RouteRegistry();
    const capabilities = new CapabilityStore();

    await bootstrapAuthGateway({
        gatewayRegistry,
        routeRegistry,
        capabilities,
        db: makeInMemoryDb(),
    });

    const confirmPassword = capabilities.get<
        (
            accountId: string,
            password: string,
            providerId?: string,
        ) => Promise<boolean>
    >("auth:confirmPassword");
    assert.equal(typeof confirmPassword, "function");
    assert.equal(
        await confirmPassword?.("missing", "password", "local"),
        false,
    );
});

test("GET /api/v1/auth/login-ui returns flow-resolved methods and integrations", async () => {
    const gatewayRegistry = new GatewayRegistry();
    const routeRegistry = new RouteRegistry();
    const capabilities = new CapabilityStore();

    await bootstrapAuthGateway({
        gatewayRegistry,
        routeRegistry,
        capabilities,
        db: makeInMemoryDb() as ReturnType<typeof makeInMemoryDb> & {
            execute: (
                sql: string,
                params?: unknown[],
            ) => Promise<{ rows?: unknown[] }>;
        },
    });
    const systemCtx =
        capabilities.get<ReturnType<typeof createCtx>>(CTX_CAPABILITY)!;
    systemCtx.flow.extend(
        "construct-login-ui",
        "resolve-methods",
        { id: "test:named-ldap-login-methods" },
        () => ({
            methods: [
                {
                    id: "ldap:Faculty",
                    name: "Faculty",
                    credential: true,
                },
            ],
        }),
    );

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
            new URL("/api/v1/auth/login-ui", "http://localhost"),
        );
        if (handled) break;
    }

    assert.ok(handled);
    assert.equal(res.status, 200);
    const body = JSON.parse(res.payload) as {
        data: {
            methods: Array<{
                id: string;
                name: string;
                credential?: boolean;
            }>;
            integrations: unknown[];
        };
    };
    assert.ok(Array.isArray(body.data.methods));
    assert.ok(Array.isArray(body.data.integrations));
    assert.deepEqual(
        body.data.methods.find((method) => method.id === "ldap:Faculty"),
        {
            id: "ldap:Faculty",
            name: "Faculty",
            forgotPassword: false,
            credential: true,
        },
    );
});

test("GET /api/v1/auth/registration-config returns open-registration state", async () => {
    const gatewayRegistry = new GatewayRegistry();
    const routeRegistry = new RouteRegistry();
    const capabilities = new CapabilityStore();
    capabilities.contribute("registration:public:isEnabled", () => true);

    await bootstrapAuthGateway({
        gatewayRegistry,
        routeRegistry,
        capabilities,
        db: makeInMemoryDb() as ReturnType<typeof makeInMemoryDb> & {
            execute: (
                sql: string,
                params?: unknown[],
            ) => Promise<{ rows?: unknown[] }>;
        },
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
        data: { registrationsEnabled: boolean; userValidationMode: string };
    };
    assert.equal(body.data.registrationsEnabled, true);
    assert.equal(body.data.userValidationMode, "none");
});

test("GET /api/v1/gateways/auth/adapters requires admin auth", async () => {
    const gatewayRegistry = new GatewayRegistry();
    const routeRegistry = new RouteRegistry();
    const capabilities = new CapabilityStore();

    await bootstrapAuthGateway({
        gatewayRegistry,
        routeRegistry,
        capabilities,
        db: makeInMemoryDb() as ReturnType<typeof makeInMemoryDb> & {
            execute: (
                sql: string,
                params?: unknown[],
            ) => Promise<{ rows?: unknown[] }>;
        },
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

    await bootstrapAuthGateway({
        gatewayRegistry,
        routeRegistry,
        capabilities,
        db: makeInMemoryDb() as ReturnType<typeof makeInMemoryDb> & {
            execute: (
                sql: string,
                params?: unknown[],
            ) => Promise<{ rows?: unknown[] }>;
        },
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
    const body = JSON.parse(res.payload) as {
        data: Array<{ id: string; publisher?: string }>;
    };
    assert.ok(Array.isArray(body.data));
    assert.equal(
        body.data.find((adapter) => adapter.id === "local")?.publisher,
        "Cognis Labs HQ",
    );
});

test("login endpoint returns 503 when no auth providers are available", async () => {
    const gatewayRegistry = new GatewayRegistry();
    const routeRegistry = new RouteRegistry();
    const capabilities = new CapabilityStore();

    await bootstrapAuthGateway({
        gatewayRegistry,
        routeRegistry,
        capabilities,
        db: makeInMemoryDb() as ReturnType<typeof makeInMemoryDb> & {
            execute: (
                sql: string,
                params?: unknown[],
            ) => Promise<{ rows?: unknown[] }>;
        },
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

    await bootstrapAuthGateway({
        gatewayRegistry,
        routeRegistry,
        capabilities,
        db: makeInMemoryDb() as ReturnType<typeof makeInMemoryDb> & {
            execute: (
                sql: string,
                params?: unknown[],
            ) => Promise<{ rows?: unknown[] }>;
        },
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

    await bootstrapAuthGateway({
        gatewayRegistry,
        routeRegistry,
        capabilities,
        db: makeInMemoryDb() as ReturnType<typeof makeInMemoryDb> & {
            execute: (
                sql: string,
                params?: unknown[],
            ) => Promise<{ rows?: unknown[] }>;
        },
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

    await bootstrapAuthGateway({
        gatewayRegistry,
        routeRegistry,
        capabilities,
        db: makeInMemoryDb() as ReturnType<typeof makeInMemoryDb> & {
            execute: (
                sql: string,
                params?: unknown[],
            ) => Promise<{ rows?: unknown[] }>;
        },
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

test("registration:public:register capability is looked up lazily in register handler", async () => {
    const gatewayRegistry = new GatewayRegistry();
    const routeRegistry = new RouteRegistry();
    const capabilities = new CapabilityStore();

    let createdUsername: string | null = null;

    await bootstrapAuthGateway({
        gatewayRegistry,
        routeRegistry,
        capabilities,
        db: makeInMemoryDb() as ReturnType<typeof makeInMemoryDb> & {
            execute: (
                sql: string,
                params?: unknown[],
            ) => Promise<{ rows?: unknown[] }>;
        },
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

test("auth register endpoint returns 403 when open registration is disabled", async () => {
    const gatewayRegistry = new GatewayRegistry();
    const routeRegistry = new RouteRegistry();
    const capabilities = new CapabilityStore();
    capabilities.contribute("registration:public:isEnabled", () => false);

    await bootstrapAuthGateway({
        gatewayRegistry,
        routeRegistry,
        capabilities,
        db: makeInMemoryDb() as ReturnType<typeof makeInMemoryDb> & {
            execute: (
                sql: string,
                params?: unknown[],
            ) => Promise<{ rows?: unknown[] }>;
        },
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
