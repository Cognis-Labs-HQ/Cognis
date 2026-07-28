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
import { InMemoryTestExecutor } from "../../../gateways/db/tests/in-memory-test-executor.js";
import {
    contributeTestKeyring,
    dispatchRoute,
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
    contributeTestKeyring(input.capabilities);
    await bootstrap({
        adaptersRoot: "/nonexistent",
        routeRegistry: input.routeRegistry,
        gatewayRegistry: input.gatewayRegistry,
        capabilities: input.capabilities,
        flow: systemCtx.flow,
    });
}

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
    await bootstrapAuthGateway({
        gatewayRegistry,
        routeRegistry,
        capabilities,
        db: db,
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
    await bootstrapAuthGateway({
        gatewayRegistry,
        routeRegistry,
        capabilities,
        db: db,
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

test("login ignores standalone TFA capabilities when TFA gateway flow hook is not active", async () => {
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
    const db = new InMemoryTestExecutor();
    await bootstrapAuthGateway({
        gatewayRegistry,
        routeRegistry,
        capabilities,
        db: db,
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

    capabilities.contribute("tfa:getUserStatus", async () => ({
        requiresSetup: false,
        hasConfiguredMethod: true,
    }));
    capabilities.contribute("tfa:getLoginMethods", async () => []);

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
        data: { token?: string; tfaRequired?: boolean };
    };
    assert.equal(typeof payload.data.token, "string");
    assert.equal(payload.data.tfaRequired, undefined);
    assert.equal(typeof loginResult.res.headers["set-cookie"], "string");
});

test("login succeeds without TFA flow hook even when tfa:getLoginMethods is absent", async () => {
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
    const db = new InMemoryTestExecutor();
    await bootstrapAuthGateway({
        gatewayRegistry,
        routeRegistry,
        capabilities,
        db: db,
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

    capabilities.contribute("tfa:getUserStatus", async () => ({
        requiresSetup: false,
        hasConfiguredMethod: true,
    }));

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
        data: { token?: string; tfaRequired?: boolean };
    };
    assert.equal(typeof payload.data.token, "string");
    assert.equal(payload.data.tfaRequired, undefined);
    assert.equal(typeof loginResult.res.headers["set-cookie"], "string");
});
