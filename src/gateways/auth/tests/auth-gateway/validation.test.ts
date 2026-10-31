import test from "node:test";
import assert from "node:assert/strict";
import {
    GatewayRegistry,
    CapabilityStore,
    CTX_CAPABILITY,
    createCtx,
} from "@cognis/core";
import { RouteRegistry } from "../../../../api/reuse/route-registry.js";
import { bootstrap } from "../../bootstrap.js";
import { InMemoryTestExecutor } from "../../../db/tests/in-memory-test-executor.js";
import {
    contributeTestKeyring,
    dispatchRoute,
    makeJsonRequest,
} from "../auth-gateway-test-helpers.js";

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
                userValidationMode: "email",
            });
        },
        async set() {
            throw new Error("preference storage is read-only");
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
    assert.equal(payload.data.userValidationMode, "email");
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
                userValidationMode: "email",
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
    assert.equal(payload.data.userValidationMode, "email");
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

test("external login cannot create an account without registration authorization", async () => {
    const gatewayRegistry = new GatewayRegistry();
    const routeRegistry = new RouteRegistry();
    const capabilities = new CapabilityStore();
    const db = new InMemoryTestExecutor();
    await bootstrapAuthGateway({
        gatewayRegistry,
        routeRegistry,
        capabilities,
        db,
    });
    const registerProvider = capabilities.require<
        (provider: {
            id: string;
            name: string;
            locked: boolean;
            authenticate: () => Promise<{
                accountId: string;
                provider: string;
                emails: string[];
            }>;
            configure: () => void;
            getConfigSchema: () => [];
        }) => Promise<() => void>
    >("auth:registerProvider");
    const unregister = await registerProvider({
        id: "external-sso",
        name: "External SSO",
        locked: true,
        async authenticate() {
            return {
                accountId: "external-user",
                provider: "external-sso",
                emails: ["external@example.com"],
            };
        },
        configure() {},
        getConfigSchema() {
            return [];
        },
    });

    const loginResult = await dispatchRoute(
        routeRegistry,
        makeJsonRequest("POST", { provider: "external-sso" }),
        "/api/v1/auth/login",
    );
    assert.equal(loginResult.res.status, 403);
    const heldPayload = JSON.parse(loginResult.res.payload);
    assert.equal(heldPayload.error.code, "account_creation_required");
    assert.equal(heldPayload.data.emailRequired, false);
    assert.equal(heldPayload.data.registrationTokenRequired, true);
    assert.equal(heldPayload.data.registrationUrl, "/register");
    assert.match(
        String(loginResult.res.headers["set-cookie"]),
        /^cognis_account_creation=account_creation_[A-Za-z0-9_-]+;/,
    );
    const accountStore = capabilities.require<{
        getInfo(accountId: string): Promise<unknown>;
    }>("auth:accountStore");
    assert.equal(
        await accountStore.getInfo("external-sso:external-user"),
        null,
    );
    unregister();
});

test("external login retries account creation through the registration token gate", async () => {
    const gatewayRegistry = new GatewayRegistry();
    const routeRegistry = new RouteRegistry();
    const capabilities = new CapabilityStore();
    const db = new InMemoryTestExecutor();
    await bootstrapAuthGateway({
        gatewayRegistry,
        routeRegistry,
        capabilities,
        db,
    });
    let createdProfileHandle = "";
    let synchronizedProfileHandle = "";
    let synchronizedProfileVisibility = "";
    capabilities.contribute(
        "profile:createProfile",
        async (_accountId: string, handle: string) => {
            createdProfileHandle = handle;
        },
    );
    capabilities.contribute(
        "profile:applyExternalProfile",
        async (_accountId: string, profile: Record<string, unknown>) => {
            synchronizedProfileHandle = String(profile.handle ?? "");
            synchronizedProfileVisibility = String(
                profile.profileVisibility ?? "",
            );
        },
    );
    await capabilities.require<
        (provider: Record<string, unknown>) => Promise<() => void>
    >("auth:registerProvider")({
        id: "external-sso",
        name: "External SSO",
        locked: true,
        authenticate: async () => ({
            accountId: "external-user",
            externalUserId: "provider-user",
            username: "thefirehawk",
            accountNamespace: "x",
            provider: "external-sso",
            email: "not-an-email-address",
            emails: ["also-invalid"],
            profileVisibility: "private",
        }),
        configure() {},
        getConfigSchema: () => [],
    });
    const systemCtx =
        capabilities.require<ReturnType<typeof createCtx>>(CTX_CAPABILITY);
    const authorizationInputs: Array<Record<string, unknown>> = [];
    systemCtx.flow.extend(
        "gateAccountCreation",
        "authorizeCreation",
        { id: "test:registration-token-gate" },
        (stageCtx) => {
            const input = stageCtx.input as Record<string, unknown>;
            authorizationInputs.push(input);
            return input.registrationToken === "invite-token" &&
                input.email === "external@example.com"
                ? { authorized: true }
                : {
                      authorized: false,
                      emailRequired: !input.email,
                      reason: input.registrationToken
                          ? "registration_token_invalid"
                          : "registration_token_required",
                  };
        },
    );

    const heldResult = await dispatchRoute(
        routeRegistry,
        makeJsonRequest("POST", { provider: "external-sso" }),
        "/api/v1/auth/login",
    );
    assert.equal(heldResult.res.status, 403);
    const heldPayload = JSON.parse(heldResult.res.payload);
    assert.equal(heldPayload.data.emailRequired, true);
    assert.equal(heldPayload.data.registrationTokenRequired, true);
    assert.equal(heldPayload.data.registrationUrl, "/register");
    const pendingCookie = String(heldResult.res.headers["set-cookie"])
        .split(";")[0]
        .trim();
    assert.match(
        pendingCookie,
        /^cognis_account_creation=account_creation_[A-Za-z0-9_-]+$/,
    );

    const attemptResult = await dispatchRoute(
        routeRegistry,
        makeJsonRequest("GET", {}, { cookie: pendingCookie }),
        "/api/v1/auth/account-creation-attempt",
    );
    assert.equal(attemptResult.res.status, 200);
    const attemptPayload = JSON.parse(attemptResult.res.payload);
    assert.equal(attemptPayload.data.emailRequired, true);
    assert.ok(attemptPayload.data.expiresAt > Date.now());

    const invalidResult = await dispatchRoute(
        routeRegistry,
        makeJsonRequest(
            "POST",
            {
                email: "external@example.com",
                registrationToken: "expired-token",
            },
            { cookie: pendingCookie },
        ),
        "/api/v1/auth/login",
    );
    assert.equal(invalidResult.res.status, 403);
    assert.equal(
        JSON.parse(invalidResult.res.payload).error.code,
        "registration_token_invalid",
    );

    const completedResult = await dispatchRoute(
        routeRegistry,
        makeJsonRequest(
            "POST",
            {
                email: "external@example.com",
                registrationToken: "invite-token",
            },
            { cookie: pendingCookie },
        ),
        "/api/v1/auth/login",
    );
    assert.equal(completedResult.res.status, 200);
    const assignedId = JSON.parse(completedResult.res.payload).data.accountId;
    assert.match(assignedId, /^u_[a-f0-9]{32}$/);
    assert.deepEqual(authorizationInputs.at(-1), {
        accountId: assignedId,
        providerId: "external-sso",
        email: "external@example.com",
        registrationToken: "invite-token",
    });
    assert.equal(createdProfileHandle, "thefirehawk");
    assert.equal(synchronizedProfileHandle, "thefirehawk");
    assert.equal(synchronizedProfileVisibility, "private");
    const accountStore = capabilities.require<{
        getInfo(accountId: string): Promise<unknown>;
        delete(accountId: string): Promise<void>;
        isExternalIdentityDeleted(
            provider: string,
            externalUserId: string,
        ): Promise<boolean>;
    }>("auth:accountStore");
    assert.notEqual(await accountStore.getInfo(assignedId), null);

    const authorizationsBeforeReturningLogin = authorizationInputs.length;
    const returningLogin = await dispatchRoute(
        routeRegistry,
        makeJsonRequest("POST", { provider: "external-sso" }),
        "/api/v1/auth/login",
    );
    assert.equal(returningLogin.res.status, 200);
    assert.equal(
        authorizationInputs.length,
        authorizationsBeforeReturningLogin,
    );
    assert.equal(
        JSON.parse(returningLogin.res.payload).data.accountId,
        assignedId,
    );

    await accountStore.delete(assignedId);
    // This contract fake does not implement ON DELETE CASCADE.
    for (const table of ["auth_identities", "auth_account_names"])
        await db.executeCommand({
            option: "DELETE",
            table,
            where: [{ column: "account_id", value: assignedId }],
        });
    assert.equal(
        await accountStore.isExternalIdentityDeleted(
            "external-sso",
            "provider-user",
        ),
        true,
    );
    const recreatedResult = await dispatchRoute(
        routeRegistry,
        makeJsonRequest("POST", {
            provider: "external-sso",
            email: "external@example.com",
            registrationToken: "invite-token",
        }),
        "/api/v1/auth/login",
    );
    assert.equal(recreatedResult.res.status, 200);
    const recreatedId = JSON.parse(recreatedResult.res.payload).data.accountId;
    assert.notEqual(recreatedId, assignedId);
    assert.notEqual(await accountStore.getInfo(recreatedId), null);
    assert.equal(
        await accountStore.isExternalIdentityDeleted(
            "external-sso",
            "provider-user",
        ),
        false,
    );
});

test("external login rolls back account when token commit fails", async () => {
    const gatewayRegistry = new GatewayRegistry();
    const routeRegistry = new RouteRegistry();
    const capabilities = new CapabilityStore();
    await bootstrapAuthGateway({
        gatewayRegistry,
        routeRegistry,
        capabilities,
        db: new InMemoryTestExecutor(),
    });
    await capabilities.require<
        (provider: Record<string, unknown>) => Promise<() => void>
    >("auth:registerProvider")({
        id: "external-sso",
        name: "External SSO",
        locked: true,
        authenticate: async () => ({
            accountId: "external-user",
            provider: "external-sso",
            email: "external@example.com",
        }),
        configure() {},
        getConfigSchema: () => [],
    });
    let commitCalled = false;
    capabilities
        .require<ReturnType<typeof createCtx>>(CTX_CAPABILITY)
        .flow.extend(
            "gateAccountCreation",
            "authorizeCreation",
            { id: "test:failing-token-commit" },
            () => ({
                authorized: true,
                commit: async () => {
                    commitCalled = true;
                    return false;
                },
            }),
        );

    const result = await dispatchRoute(
        routeRegistry,
        makeJsonRequest("POST", { provider: "external-sso" }),
        "/api/v1/auth/login",
    );
    assert.equal(result.res.status, 403);
    assert.equal(commitCalled, true);
    const accountStore = capabilities.require<{
        getInfo(accountId: string): Promise<unknown>;
        isExternalIdentityDeleted(
            provider: string,
            externalUserId: string,
        ): Promise<boolean>;
    }>("auth:accountStore");
    assert.equal(
        await accountStore.getInfo("external-sso:external-user"),
        null,
    );
    assert.equal(
        await accountStore.isExternalIdentityDeleted(
            "external-sso",
            "external-user",
        ),
        false,
    );
});

test("external login uses the adapter namespace when the session provider is not namespace-safe", async () => {
    const gatewayRegistry = new GatewayRegistry();
    const routeRegistry = new RouteRegistry();
    const capabilities = new CapabilityStore();
    await bootstrapAuthGateway({
        gatewayRegistry,
        routeRegistry,
        capabilities,
        db: new InMemoryTestExecutor(),
    });
    await capabilities.require<
        (provider: Record<string, unknown>) => Promise<() => void>
    >("auth:registerProvider")({
        id: "external-sso",
        name: "External SSO",
        locked: true,
        authenticate: async () => ({
            accountId: "ExternalUser",
            externalUserId: "opaque-subject",
            provider: "ldap:Students",
            email: "external@example.com",
        }),
        configure() {},
        getConfigSchema: () => [],
    });
    capabilities
        .require<ReturnType<typeof createCtx>>(CTX_CAPABILITY)
        .flow.extend(
            "gateAccountCreation",
            "authorizeCreation",
            { id: "test:allow-invalid-session-provider" },
            () => ({ authorized: true }),
        );

    const result = await dispatchRoute(
        routeRegistry,
        makeJsonRequest("POST", { provider: "external-sso" }),
        "/api/v1/auth/login",
    );

    assert.equal(result.res.status, 200);
    const accountStore = capabilities.require<{
        getInfo(accountId: string): Promise<unknown>;
    }>("auth:accountStore");
    assert.notEqual(
        await accountStore.getInfo(
            JSON.parse(result.res.payload).data.accountId,
        ),
        null,
    );
});

test("external login cannot attach to a local account or bypass registration authorization", async () => {
    const gatewayRegistry = new GatewayRegistry();
    const routeRegistry = new RouteRegistry();
    const capabilities = new CapabilityStore();
    await bootstrapAuthGateway({
        gatewayRegistry,
        routeRegistry,
        capabilities,
        db: new InMemoryTestExecutor(),
    });
    const accountStore = capabilities.require<{
        register(username: string, password: string): Promise<unknown>;
        resolveExternalAccountId(
            provider: string,
            externalUserId: string,
        ): Promise<string | null>;
    }>("auth:accountStore");
    await accountStore.register("external-sso:alice", "password");
    await capabilities.require<
        (provider: Record<string, unknown>) => Promise<() => void>
    >("auth:registerProvider")({
        id: "external-sso",
        name: "External SSO",
        locked: true,
        authenticate: async () => ({
            accountId: "alice",
            externalUserId: "opaque-alice-subject",
            provider: "external-sso",
        }),
        configure() {},
        getConfigSchema: () => [],
    });

    const result = await dispatchRoute(
        routeRegistry,
        makeJsonRequest("POST", { provider: "external-sso" }),
        "/api/v1/auth/login",
    );

    assert.equal(result.res.status, 403);
    assert.equal(
        await accountStore.resolveExternalAccountId(
            "external-sso",
            "opaque-alice-subject",
        ),
        null,
    );
});

test("existing local login survives gateway restart with legacy SSO records present", async () => {
    const executor = new InMemoryTestExecutor();
    const initialCapabilities = new CapabilityStore();
    await bootstrapAuthGateway({
        gatewayRegistry: new GatewayRegistry(),
        routeRegistry: new RouteRegistry(),
        capabilities: initialCapabilities,
        db: executor,
    });
    await initialCapabilities
        .require<{
            register(username: string, password: string): Promise<unknown>;
        }>("auth:accountStore")
        .register("existing-local", "local-password");
    await executor.executeCommand({
        option: "INSERT",
        table: "accounts",
        values: {
            id: "x:alice",
            display_name: "Alice",
            enabled: true,
            role: "user",
        },
    });
    await executor.executeCommand({
        option: "INSERT",
        table: "auth_identities",
        values: {
            id: "external-sso:subject",
            account_id: "x:alice",
            provider: "external-sso",
            external_user_id: "subject",
        },
    });
    const capabilities = new CapabilityStore();
    const routeRegistry = new RouteRegistry();
    await bootstrapAuthGateway({
        gatewayRegistry: new GatewayRegistry(),
        routeRegistry,
        capabilities,
        db: executor,
    });
    const localLogin = await dispatchRoute(
        routeRegistry,
        makeJsonRequest("POST", {
            provider: "local",
            username: "existing-local",
            password: "local-password",
        }),
        "/api/v1/auth/login",
    );
    assert.equal(localLogin.res.status, 200);
    assert.equal(
        JSON.parse(localLogin.res.payload).data.accountId,
        "existing-local",
    );
    await capabilities.require<
        (provider: Record<string, unknown>) => Promise<() => void>
    >("auth:registerProvider")({
        id: "external-sso",
        name: "External SSO",
        locked: true,
        authenticate: async () => ({
            accountId: "alice",
            provider: "external-sso",
            externalUserId: "subject",
        }),
        configure() {},
        getConfigSchema: () => [],
    });
    const legacyLogin = await dispatchRoute(
        routeRegistry,
        makeJsonRequest("POST", { provider: "external-sso" }),
        "/api/v1/auth/login",
    );
    assert.equal(legacyLogin.res.status, 401);
    assert.equal(JSON.parse(legacyLogin.res.payload).data, undefined);
    assert.deepEqual(
        (
            await executor.executeCommand({
                option: "SELECT",
                table: "accounts",
                columns: ["id"],
                orderBy: [{ column: "id", direction: "ASC" }],
            })
        ).rows,
        [{ id: "existing-local" }, { id: "x:alice" }],
    );
});
