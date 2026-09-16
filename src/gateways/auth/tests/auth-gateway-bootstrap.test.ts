import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import {
    CTX_CAPABILITY,
    GatewayRegistry,
    CapabilityStore,
    createCtx,
    type Ctx,
} from "@cognis/core";
import { RouteRegistry } from "../../../api/reuse/route-registry.js";
import { UIRegistry } from "../../../api/reuse/ui-registry.js";
import { bootstrap } from "../bootstrap.js";
import {
    contributeTestKeyring,
    makeInMemoryDb,
    type InMemoryDb,
} from "./auth-gateway-test-helpers.js";

test("keyring manifest declares the Authentication gateway as its parent", async () => {
    const manifest = JSON.parse(
        await readFile("src/adapters/auth/keyring/manifest.json", "utf8"),
    ) as { gateway?: string; name?: string };

    assert.equal(manifest.gateway, "auth");
    assert.equal(manifest.name, "User Keyring");
});

test("keyring adapter purges a vault after every persisted user deletion", async () => {
    const { bootstrapAuthAdapter } =
        await import("../../../adapters/auth/keyring/index.js");
    const commands: Array<Record<string, unknown>> = [];
    const capabilities = new CapabilityStore();
    capabilities.contribute("db:executor", {
        async ensureTable() {},
        async executeCommand(command: Record<string, unknown>) {
            commands.push(command);
            return { rows: [] };
        },
    });
    const systemCtx = createCtx();
    systemCtx.registerFlow({
        id: "deprovision-user",
        stages: ["persist-state", "cleanup-dependencies"],
    });
    systemCtx.flow.extend(
        "deprovision-user",
        "persist-state",
        { id: "test:persist-user-deletion" },
        () => ({ persisted: true }),
    );
    await bootstrapAuthAdapter({
        adapterRoot: "src/adapters/auth/keyring",
        capabilities,
        flow: systemCtx.flow,
    });

    const results = [];
    for (let deletionAttempt = 0; deletionAttempt < 3; deletionAttempt += 1) {
        results.push(
            await systemCtx.flow.run("deprovision-user", {
                username: "LDAP.User",
                action: "delete",
            }),
        );
    }

    assert.equal(
        commands.filter(
            (command) =>
                command.option === "DELETE" &&
                command.table === "auth_keyring_vaults" &&
                JSON.stringify(command.where).includes("ldap.user"),
        ).length,
        3,
    );
    for (const result of results) {
        assert.ok(
            result.stageResults["cleanup-dependencies"].some(
                (entry) =>
                    (entry as { purged?: boolean; accountId?: string })
                        .purged === true &&
                    (entry as { accountId?: string }).accountId === "ldap.user",
            ),
        );
    }
});

function createDbExecutor(): InMemoryDb {
    return makeInMemoryDb();
}

function makeBaseCtx(capabilities: CapabilityStore, dbExecutor: InMemoryDb) {
    const systemCtx = createCtx();
    capabilities.contribute(CTX_CAPABILITY, systemCtx);
    capabilities.contribute("db:executor", dbExecutor);
    contributeTestKeyring(capabilities);
    return { flow: systemCtx.flow };
}

test("auth gateway bootstrap registers in GatewayRegistry", async () => {
    const gatewayRegistry = new GatewayRegistry();
    const routeRegistry = new RouteRegistry();
    const capabilities = new CapabilityStore();
    const dbExecutor = createDbExecutor();

    await bootstrap({
        adaptersRoot: "/nonexistent",
        routeRegistry,
        gatewayRegistry,
        capabilities,
        ...makeBaseCtx(capabilities, dbExecutor),
    });

    const gateways = gatewayRegistry.list();
    const authGw = gateways.find((g) => g.id === "auth");
    assert.ok(authGw, "auth gateway should be registered");
    assert.equal(authGw.required, true);
});

test("keyring cleanup preserves account identity and unrelated account owners", async () => {
    const gatewayRegistry = new GatewayRegistry();
    const routeRegistry = new RouteRegistry();
    const capabilities = new CapabilityStore();
    const dbExecutor = createDbExecutor();
    await bootstrap({
        adaptersRoot: "/nonexistent",
        routeRegistry,
        gatewayRegistry,
        capabilities,
        ...makeBaseCtx(capabilities, dbExecutor),
    });
    let profilePurges = 0;
    let messagePurges = 0;
    capabilities.require<
        (ownerId: string, purge: (accountId: string) => Promise<void>) => void
    >("auth:registerAccountDataOwner")("profile", async () => {
        profilePurges += 1;
    });
    capabilities.require<
        (ownerId: string, purge: (accountId: string) => Promise<void>) => void
    >("auth:registerKeyringDataOwner")("messages", async (accountId) => {
        assert.equal(accountId, "alice");
        messagePurges += 1;
    });
    const getAccountInstanceId = capabilities.require<
        (accountId: string) => Promise<string>
    >("auth:getAccountInstanceId");
    await getAccountInstanceId("Alice");

    await capabilities.require<(accountId: string) => Promise<void>>(
        "auth:purgeKeyringDependentData",
    )("Alice");

    assert.equal(messagePurges, 1);
    assert.equal(profilePurges, 0);
    const bootstrapSource = await readFile(
        "src/gateways/auth/bootstrap/index.ts",
        "utf8",
    );
    const keyringPurgeBlock = bootstrapSource.match(
        /"auth:purgeKeyringDependentData",[\s\S]*?\n\s*\},\n\s*\);/,
    )?.[0];
    assert.ok(keyringPurgeBlock);
    assert.doesNotMatch(keyringPurgeBlock, /accountInstanceStore\.delete/);
});

test("auth gateway contributes account and token lifecycle capabilities", async () => {
    const gatewayRegistry = new GatewayRegistry();
    const routeRegistry = new RouteRegistry();
    const capabilities = new CapabilityStore();
    const dbExecutor = createDbExecutor();

    await bootstrap({
        adaptersRoot: "/nonexistent",
        routeRegistry,
        gatewayRegistry,
        capabilities,
        ...makeBaseCtx(capabilities, dbExecutor),
    });

    assert.ok(
        capabilities.get("auth:accountStore"),
        "auth:accountStore should be contributed",
    );
    assert.equal(
        typeof capabilities.get("auth:revokeAccessTokensForSubject"),
        "function",
        "auth:revokeAccessTokensForSubject should be contributed for lifecycle cleanup flows",
    );
    const getAccountInstanceId = capabilities.get<
        (accountId: string) => Promise<string>
    >("auth:getAccountInstanceId");
    assert.equal(typeof getAccountInstanceId, "function");
});

test("auth gateway exposes provider registration to modules", async () => {
    const gatewayRegistry = new GatewayRegistry();
    const routeRegistry = new RouteRegistry();
    const capabilities = new CapabilityStore();
    const dbExecutor = createDbExecutor();

    await bootstrap({
        adaptersRoot: "/nonexistent",
        routeRegistry,
        gatewayRegistry,
        capabilities,
        ...makeBaseCtx(capabilities, dbExecutor),
    });

    const registerProvider = capabilities.require<
        (provider: {
            id: string;
            name: string;
            locked: boolean;
            authenticate: () => Promise<null>;
            configure: () => void;
            getConfigSchema: () => [];
        }) => () => void
    >("auth:registerProvider");
    const unregisterProvider = registerProvider({
        id: "module-provider",
        name: "Module Provider",
        locked: true,
        async authenticate() {
            return null;
        },
        configure() {},
        getConfigSchema() {
            return [];
        },
    });

    const getLoginMethods = capabilities.require<
        () => Array<{ id: string; name: string }>
    >("auth:getLoginMethods");
    assert.ok(
        getLoginMethods().some((method) => method.id === "module-provider"),
    );
    unregisterProvider();
    assert.ok(
        getLoginMethods().every((method) => method.id !== "module-provider"),
    );
});

test("auth bootstrap registers canonical ctx flow skeletons", async () => {
    const gatewayRegistry = new GatewayRegistry();
    const routeRegistry = new RouteRegistry();
    const capabilities = new CapabilityStore();
    const dbExecutor = createDbExecutor();

    await bootstrap({
        adaptersRoot: "/nonexistent",
        routeRegistry,
        gatewayRegistry,
        capabilities,
        ...makeBaseCtx(capabilities, dbExecutor),
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
            methods: [{ id: "local", name: "Local", forgotPassword: true }],
        },
    ]);

    const loginResult = await flowCtx.runFlow("login");
    assert.deepEqual(loginResult.stageResults["resolve-provider"], [
        {
            defaultProviderId: "local",
            enabledMethods: [
                { id: "local", name: "Local", forgotPassword: true },
            ],
        },
    ]);

    const settingsResult = await flowCtx.runFlow("construct-settings-ui");
    assert.deepEqual(settingsResult.stageResults["resolve-sections"], [
        {
            gatewayId: "auth",
            sectionId: "security",
            scriptUrl: "/static/gateways/auth/security-prefs/index.js",
            stringsBaseUrl: "/static/gateways/auth/languages",
        },
    ]);
    const settingsSections = settingsResult.data["sections"] as unknown[];
    assert.ok(
        Array.isArray(settingsSections),
        "data.sections must be an array",
    );
    assert.ok(
        settingsSections.some(
            (section) =>
                typeof section === "object" &&
                section !== null &&
                (section as Record<string, unknown>)["scriptUrl"] ===
                    "/static/gateways/auth/security-prefs/index.js",
        ),
        "data.sections must include the security section",
    );
});

test("auth bootstrap hook directory contributes route-level TFA login capabilities", async () => {
    const gatewayRegistry = new GatewayRegistry();
    const routeRegistry = new RouteRegistry();
    const capabilities = new CapabilityStore();
    const dbExecutor = createDbExecutor();

    await bootstrap({
        adaptersRoot: "/nonexistent",
        routeRegistry,
        gatewayRegistry,
        capabilities,
        ...makeBaseCtx(capabilities, dbExecutor),
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
    const dbExecutor = createDbExecutor();

    await bootstrap({
        adaptersRoot: "/nonexistent",
        routeRegistry,
        gatewayRegistry,
        capabilities,
        uiRegistry,
        ...makeBaseCtx(capabilities, dbExecutor),
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

test("auth gateway registers adapter-owned UI directories", async () => {
    const gatewayRegistry = new GatewayRegistry();
    const routeRegistry = new RouteRegistry();
    const capabilities = new CapabilityStore();
    const uiRegistry = new UIRegistry();
    const dbExecutor = createDbExecutor();

    await bootstrap({
        adaptersRoot: new URL("../../../adapters", import.meta.url).pathname,
        routeRegistry,
        gatewayRegistry,
        capabilities,
        uiRegistry,
        ...makeBaseCtx(capabilities, dbExecutor),
    });

    const ldapUiDirectory = uiRegistry.getAdapterStaticDir("auth", "ldap");
    assert.ok(ldapUiDirectory);
    await assert.doesNotReject(access(`${ldapUiDirectory}/config-popup.js`));
    await assert.doesNotReject(
        access(`${ldapUiDirectory}/languages/en/strings.xml`),
    );

    const keyringUiDirectory = uiRegistry.getAdapterStaticDir(
        "auth",
        "keyring",
    );
    assert.ok(keyringUiDirectory);
    await assert.doesNotReject(access(`${keyringUiDirectory}/keyring.js`));
    assert.ok(
        uiRegistry
            .listNavbarPlugins()
            .some(
                (plugin) =>
                    plugin.scriptUrl ===
                    "/static/adapters/auth/keyring/keyring.js",
            ),
    );
});

test("auth gateway bootstrap registers security section without redundant authentication admin section", async () => {
    const gatewayRegistry = new GatewayRegistry();
    const routeRegistry = new RouteRegistry();
    const capabilities = new CapabilityStore();
    const uiRegistry = new UIRegistry();
    const dbExecutor = createDbExecutor();

    await bootstrap({
        adaptersRoot: "/nonexistent",
        routeRegistry,
        gatewayRegistry,
        capabilities,
        uiRegistry,
        ...makeBaseCtx(capabilities, dbExecutor),
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

test("CoreAuthGateway lists adapter publisher metadata", async () => {
    const { CoreAuthGateway } = await import("../gateway.js");
    const gateway = new CoreAuthGateway(makeInMemoryDb());

    gateway.registerAdapter({
        id: "oidc",
        name: "OIDC",
        publisher: "Cognis Labs HQ",
        stringsBaseUrl: "/static/adapters/auth/oidc/languages",
        authenticate: async () => null,
        getConfigSchema: () => [],
        configure: () => undefined,
    });

    assert.equal(gateway.listAdapters()[0]?.publisher, "Cognis Labs HQ");
    assert.equal(
        gateway.listAdapters()[0]?.stringsBaseUrl,
        "/static/adapters/auth/oidc/languages",
    );
});

test("CoreAuthGateway lists a locked keyring without treating it as a login provider", async () => {
    const { CoreAuthGateway } = await import("../gateway.js");
    const { createAdapter } =
        await import("../../../adapters/auth/keyring/index.js");
    const gateway = new CoreAuthGateway(makeInMemoryDb());

    gateway.registerAdapter(createAdapter(), ["db"]);

    const listedKeyring = gateway.listAdapters()[0];
    assert.equal(listedKeyring?.id, "keyring");
    assert.equal(listedKeyring?.name, "User Keyring");
    assert.equal(listedKeyring?.enabled, true);
    assert.equal(listedKeyring?.locked, true);
    assert.deepEqual(listedKeyring?.requires, ["db"]);
    assert.ok(
        listedKeyring?.schema.some((field) => field.key === "maxVaultMiB"),
    );
    assert.deepEqual(gateway.getEnabledAdapters(), []);
});

test("CoreAuthGateway redacts configured passwords and preserves them on blank updates", async () => {
    const { CoreAuthGateway } = await import("../gateway.js");
    const persisted = {
        servers: [
            {
                identifier: "Faculty",
                serverUrl: "ldaps://faculty.example.org",
                bindPassword: "stored-secret",
            },
        ],
    };
    let savedConfig = "";
    const db = {
        ensureTable: async () => undefined,
        executeCommand: async (command: Record<string, unknown>) => {
            if (command.option === "SELECT") {
                return { rows: [{ config_json: JSON.stringify(persisted) }] };
            }
            const values = command.values as Record<string, unknown>;
            savedConfig = String(values.config_json);
            return { rows: [] };
        },
    };
    const gateway = new CoreAuthGateway(db as never);
    gateway.registerAdapter({
        id: "ldap-test",
        name: "LDAP Test",
        authenticate: async () => null,
        getConfigSchema: () => [
            {
                key: "bindPassword",
                label: "Bind password",
                type: "password",
                required: true,
            },
        ],
        configure: () => undefined,
    });

    assert.deepEqual(gateway.redactAdapterConfig("ldap-test", persisted), {
        data: {
            servers: [
                {
                    identifier: "Faculty",
                    serverUrl: "ldaps://faculty.example.org",
                },
            ],
        },
        configuredSecretFields: ["servers.0.bindPassword"],
    });

    await gateway.saveAdapterConfig("ldap-test", {
        servers: [
            {
                identifier: "Faculty",
                serverUrl: "ldaps://faculty.example.org",
                bindPassword: "",
            },
        ],
    });
    assert.equal(
        (
            JSON.parse(savedConfig) as {
                servers: Array<{ bindPassword: string }>;
            }
        ).servers[0].bindPassword,
        "stored-secret",
    );

    await gateway.saveAdapterConfig("ldap-test", {
        servers: [
            {
                identifier: "Faculty",
                serverUrl: "ldaps://faculty.example.org",
                bindPassword: "replacement-secret",
            },
        ],
    });
    assert.equal(
        (
            JSON.parse(savedConfig) as {
                servers: Array<{ bindPassword: string }>;
            }
        ).servers[0].bindPassword,
        "replacement-secret",
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

test("auth bootstrap contributes page script origin registration capability", async () => {
    const gatewayRegistry = new GatewayRegistry();
    const routeRegistry = new RouteRegistry();
    const capabilities = new CapabilityStore();
    const dbExecutor = createDbExecutor();

    await bootstrap({
        adaptersRoot: "/nonexistent",
        routeRegistry,
        gatewayRegistry,
        capabilities,
        ...makeBaseCtx(capabilities, dbExecutor),
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

test("auth bootstrap exposes route authentication capabilities to modules", async () => {
    const gatewayRegistry = new GatewayRegistry();
    const routeRegistry = new RouteRegistry();
    const capabilities = new CapabilityStore();
    const dbExecutor = createDbExecutor();

    await bootstrap({
        adaptersRoot: "/nonexistent",
        routeRegistry,
        gatewayRegistry,
        capabilities,
        ...makeBaseCtx(capabilities, dbExecutor),
    });

    assert.equal(typeof capabilities.get("auth:getAuthClaims"), "function");
    assert.equal(typeof capabilities.get("auth:requireAuth"), "function");
    assert.equal(typeof capabilities.get("auth:requireRoleAccess"), "function");
});
