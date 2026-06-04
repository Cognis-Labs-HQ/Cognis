import test from "node:test";
import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import {
    CTX_CAPABILITY,
    GatewayRegistry,
    CapabilityStore,
    type Ctx,
} from "@cognis/core";
import { RouteRegistry } from "../../../api/reuse/route-registry.js";
import { UIRegistry } from "../../../api/reuse/ui-registry.js";
import { bootstrap } from "../bootstrap.js";
import {
    makeInMemoryDb,
    type InMemoryDb,
} from "./auth-gateway-test-helpers.js";

function createDbExecutor(): InMemoryDb {
    return makeInMemoryDb();
}

test("auth gateway bootstrap registers in GatewayRegistry", async () => {
    const gatewayRegistry = new GatewayRegistry();
    const routeRegistry = new RouteRegistry();
    const capabilities = new CapabilityStore();

    await bootstrap({
        dbExecutor: createDbExecutor(),
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
        dbExecutor: createDbExecutor(),
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

test("auth bootstrap registers canonical ctx flow skeletons", async () => {
    const gatewayRegistry = new GatewayRegistry();
    const routeRegistry = new RouteRegistry();
    const capabilities = new CapabilityStore();

    await bootstrap({
        dbExecutor: createDbExecutor(),
        adaptersRoot: "/nonexistent",
        routeRegistry,
        gatewayRegistry,
        capabilities,
    });

    const flowCtx = capabilities.get<Ctx>(CTX_CAPABILITY);
    if (!flowCtx) {
        assert.fail("auth bootstrap must contribute the shared ctx flow bus");
    }
    assert.deepEqual(
        flowCtx
            .listFlows()
            .filter((flowId) =>
                [
                    "bootstrap-platform",
                    "construct-login-ui",
                    "construct-settings-ui",
                    "ldap-auth",
                    "login",
                ].includes(flowId),
            ),
        [
            "bootstrap-platform",
            "construct-login-ui",
            "construct-settings-ui",
            "ldap-auth",
            "login",
        ],
    );

    const loginUiResult = await flowCtx.runFlow("construct-login-ui");
    assert.deepEqual(loginUiResult.stageResults["resolve-methods"], [
        {
            methods: [{ id: "local", name: "Local" }],
        },
    ]);

    const loginResult = await flowCtx.runFlow("login");
    assert.deepEqual(loginResult.stageResults["resolve-provider"], [
        {
            defaultProviderId: "local",
            enabledMethods: [{ id: "local", name: "Local" }],
        },
    ]);

    const settingsResult = await flowCtx.runFlow("construct-settings-ui");
    assert.deepEqual(settingsResult.stageResults["resolve-sections"], [
        {
            gatewayId: "auth",
            sectionId: "security",
            scriptUrl: "/static/gateways/auth/security-prefs/index.js",
        },
    ]);
});

test("auth bootstrap hook directory contributes route-level TFA login capabilities", async () => {
    const gatewayRegistry = new GatewayRegistry();
    const routeRegistry = new RouteRegistry();
    const capabilities = new CapabilityStore();

    await bootstrap({
        dbExecutor: createDbExecutor(),
        adaptersRoot: "/nonexistent",
        routeRegistry,
        gatewayRegistry,
        capabilities,
    });

    assert.equal(
        typeof capabilities.get("auth:getAccessTokenTtlSeconds"),
        "function",
    );
    assert.equal(
        typeof capabilities.get("auth:buildAccessTokenCookie"),
        "function",
    );
    assert.equal(
        typeof capabilities.get("tfa:createPendingLoginAttempt"),
        "function",
    );
    assert.equal(
        typeof capabilities.get("tfa:getPendingLoginAttempt"),
        "function",
    );
    assert.equal(
        typeof capabilities.get("tfa:clearPendingLoginAttempt"),
        "function",
    );
});

test("auth gateway bootstrap registers correct static dir", async () => {
    const gatewayRegistry = new GatewayRegistry();
    const routeRegistry = new RouteRegistry();
    const capabilities = new CapabilityStore();
    const uiRegistry = new UIRegistry();

    await bootstrap({
        dbExecutor: createDbExecutor(),
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
        dbExecutor: createDbExecutor(),
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
        "/static/gateways/auth/security-prefs/index.js",
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

test("CoreAuthGateway.resetPasswordForAccount supports legacy 2-arg adapter contracts", async () => {
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
    const calls: Array<{ accountId: string; nextPassword: string }> = [];
    gw.registerAdapter({
        id: "legacy",
        name: "Legacy",
        authenticate: async () => null,
        getConfigSchema: () => [],
        configure: () => undefined,
        resetPassword: async (accountId: string, nextPassword?: string) => {
            calls.push({ accountId, nextPassword: String(nextPassword ?? "") });
            return { updated: true };
        },
    });

    await gw.resetPasswordForAccount(
        "legacy",
        "legacy-user",
        "current-pass",
        "next-pass",
    );

    assert.deepEqual(calls, [
        { accountId: "legacy-user", nextPassword: "next-pass" },
    ]);
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

test("auth bootstrap contributes page script origin registration capability", async () => {
    const gatewayRegistry = new GatewayRegistry();
    const routeRegistry = new RouteRegistry();
    const capabilities = new CapabilityStore();

    await bootstrap({
        dbExecutor: createDbExecutor(),
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
