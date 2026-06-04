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
import { InMemoryTestExecutor } from "../../../gateways/db/tests/in-memory-test-executor.js";
import {
    adminToken,
    dispatchRoute,
    HttpIncomingMessage,
    makeInMemoryDb,
    makeJsonRequest,
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
    await bootstrap({
        adaptersRoot: "/nonexistent",
        routeRegistry: input.routeRegistry,
        gatewayRegistry: input.gatewayRegistry,
        capabilities: input.capabilities,
        flow: systemCtx.flow,
    });
}

test("GET /api/v1/auth/password-change-capability reports support for local accounts", async () => {
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

    await bootstrapAuthGateway({
        gatewayRegistry,
        routeRegistry,
        capabilities,
        db: db,
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
            {
                currentPassword: "before-reset",
                password: "after-reset",
            },
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

test("POST /api/v1/auth/reset-password requires current password", async () => {
    const gatewayRegistry = new GatewayRegistry();
    const routeRegistry = new RouteRegistry();
    const capabilities = new CapabilityStore();
    const db = new InMemoryTestExecutor();

    await bootstrapAuthGateway({
        gatewayRegistry,
        routeRegistry,
        capabilities,
        db: db,
    });

    const accountStore = capabilities.get<{
        register: (username: string, password: string) => Promise<unknown>;
    }>("auth:accountStore");
    await accountStore?.register("missing-current-pass", "before-reset");

    const resetToken = issueAccessToken("missing-current-pass", "user", 60);
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
    assert.equal(res.status, 400);
    assert.match(res.payload, /Current password is required/);
});

test("POST /api/v1/auth/reset-password rejects incorrect current password", async () => {
    const gatewayRegistry = new GatewayRegistry();
    const routeRegistry = new RouteRegistry();
    const capabilities = new CapabilityStore();
    const db = new InMemoryTestExecutor();

    await bootstrapAuthGateway({
        gatewayRegistry,
        routeRegistry,
        capabilities,
        db: db,
    });

    const accountStore = capabilities.get<{
        register: (username: string, password: string) => Promise<unknown>;
    }>("auth:accountStore");
    await accountStore?.register("wrong-current-pass", "before-reset");

    const resetToken = issueAccessToken("wrong-current-pass", "user", 60);
    const { handled, res } = await dispatchRoute(
        routeRegistry,
        makeJsonRequest(
            "POST",
            {
                currentPassword: "incorrect",
                password: "after-reset",
            },
            { authorization: `Bearer ${resetToken}` },
        ),
        "/api/v1/auth/reset-password",
    );

    assert.equal(handled, true);
    assert.equal(res.status, 400);
    assert.match(
        res.payload,
        /gateway\.auth\.security\.error\.current_password_incorrect/,
    );
});

test("POST /api/v1/auth/reset-password rejects previously used password", async () => {
    const gatewayRegistry = new GatewayRegistry();
    const routeRegistry = new RouteRegistry();
    const capabilities = new CapabilityStore();
    const db = new InMemoryTestExecutor();

    await bootstrapAuthGateway({
        gatewayRegistry,
        routeRegistry,
        capabilities,
        db: db,
    });

    const accountStore = capabilities.get<{
        register: (username: string, password: string) => Promise<unknown>;
    }>("auth:accountStore");
    await accountStore?.register("password-history-user", "before-reset");

    const resetToken = issueAccessToken("password-history-user", "user", 60);
    const firstReset = await dispatchRoute(
        routeRegistry,
        makeJsonRequest(
            "POST",
            {
                currentPassword: "before-reset",
                password: "after-reset",
            },
            { authorization: `Bearer ${resetToken}` },
        ),
        "/api/v1/auth/reset-password",
    );
    assert.equal(firstReset.res.status, 200);

    const secondReset = await dispatchRoute(
        routeRegistry,
        makeJsonRequest(
            "POST",
            {
                currentPassword: "after-reset",
                password: "before-reset",
            },
            {
                authorization: `Bearer ${issueAccessToken("password-history-user", "user", 60)}`,
            },
        ),
        "/api/v1/auth/reset-password",
    );
    assert.equal(secondReset.handled, true);
    assert.equal(secondReset.res.status, 400);
    assert.match(secondReset.res.payload, /Password was used previously/);
});

test("POST /api/v1/auth/reset-password keeps surrounding whitespace in current password", async () => {
    const gatewayRegistry = new GatewayRegistry();
    const routeRegistry = new RouteRegistry();
    const capabilities = new CapabilityStore();
    const db = new InMemoryTestExecutor();

    await bootstrapAuthGateway({
        gatewayRegistry,
        routeRegistry,
        capabilities,
        db: db,
    });

    const accountStore = capabilities.get<{
        register: (username: string, password: string) => Promise<unknown>;
        verify: (
            username: string,
            password: string,
        ) => Promise<{ accountId: string } | null>;
    }>("auth:accountStore");
    await accountStore?.register("spacey-user", "  before-reset  ");

    const resetToken = issueAccessToken("spacey-user", "user", 60);
    const { handled, res } = await dispatchRoute(
        routeRegistry,
        makeJsonRequest(
            "POST",
            {
                currentPassword: "  before-reset  ",
                password: "after-reset",
            },
            { authorization: `Bearer ${resetToken}` },
        ),
        "/api/v1/auth/reset-password",
    );

    assert.equal(handled, true);
    assert.equal(res.status, 200);
    const nextCredentials = await accountStore?.verify(
        "spacey-user",
        "after-reset",
    );
    assert.equal(nextCredentials?.accountId, "spacey-user");
});

test("POST /api/v1/auth/reset-password backfills previous hash for migrated accounts", async () => {
    const gatewayRegistry = new GatewayRegistry();
    const routeRegistry = new RouteRegistry();
    const capabilities = new CapabilityStore();
    const db = new InMemoryTestExecutor();

    await bootstrapAuthGateway({
        gatewayRegistry,
        routeRegistry,
        capabilities,
        db: db,
    });

    const accountStore = capabilities.get<{
        register: (username: string, password: string) => Promise<unknown>;
    }>("auth:accountStore");
    await accountStore?.register("migrated-history-user", "before-reset");

    await db.executeCommand({
        option: "DELETE",
        table: "local_auth_password_history",
        where: [{ column: "account_id", value: "migrated-history-user" }],
    });

    const firstToken = issueAccessToken("migrated-history-user", "user", 60);
    const firstReset = await dispatchRoute(
        routeRegistry,
        makeJsonRequest(
            "POST",
            {
                currentPassword: "before-reset",
                password: "after-reset",
            },
            { authorization: `Bearer ${firstToken}` },
        ),
        "/api/v1/auth/reset-password",
    );
    assert.equal(firstReset.res.status, 200);

    const secondToken = issueAccessToken("migrated-history-user", "user", 60);
    const secondReset = await dispatchRoute(
        routeRegistry,
        makeJsonRequest(
            "POST",
            {
                currentPassword: "after-reset",
                password: "before-reset",
            },
            { authorization: `Bearer ${secondToken}` },
        ),
        "/api/v1/auth/reset-password",
    );
    assert.equal(secondReset.handled, true);
    assert.equal(secondReset.res.status, 400);
    assert.match(secondReset.res.payload, /Password was used previously/);
});

test("POST /api/v1/auth/reset-password dispatches security notification when notify:dispatch is available", async () => {
    const gatewayRegistry = new GatewayRegistry();
    const routeRegistry = new RouteRegistry();
    const capabilities = new CapabilityStore();
    const db = new InMemoryTestExecutor();

    const dispatched: Array<{
        category: string;
        recipientUsername: string;
        subject: string;
        body: string;
    }> = [];
    capabilities.contribute(
        "notify:dispatch",
        async (envelope: {
            category: string;
            recipientUsername: string;
            subject: string;
            body: string;
        }) => {
            dispatched.push(envelope);
        },
    );

    await bootstrapAuthGateway({
        gatewayRegistry,
        routeRegistry,
        capabilities,
        db: db,
    });

    const accountStore = capabilities.get<{
        register: (username: string, password: string) => Promise<unknown>;
    }>("auth:accountStore");
    await accountStore?.register("notify-reset-user", "old-pass");

    const resetToken = issueAccessToken("notify-reset-user", "user", 60);
    const { handled, res } = await dispatchRoute(
        routeRegistry,
        makeJsonRequest(
            "POST",
            {
                currentPassword: "old-pass",
                password: "new-pass-12",
            },
            { authorization: `Bearer ${resetToken}` },
        ),
        "/api/v1/auth/reset-password",
    );

    assert.equal(handled, true);
    assert.equal(res.status, 200);
    assert.ok(
        dispatched.length > 0,
        "security notification should have been dispatched",
    );
    assert.equal(dispatched[0].category, "security");
    assert.equal(dispatched[0].recipientUsername, "notify-reset-user");
});

test("POST /api/v1/auth/emergency-token requires admin auth", async () => {
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
