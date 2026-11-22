import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { existsSync } from "node:fs";
import { GatewayRegistry, createCtx } from "@cognis/core";
import { RouteRegistry } from "../../../api/reuse/route-registry.js";
import { bootstrap } from "../bootstrap.js";
import { createCapabilities, createEmptyExecutor } from "./reuse/bootstrap.js";

import { UIRegistry } from "../../../api/reuse/ui-registry.js";
import type { DbExecutor } from "../../db/reuse/db-executor.js";
import {
    createRequest,
    createResponse,
    createRouteContext,
} from "./reuse/http.js";

async function dispatchRoute(
    routeRegistry: RouteRegistry,
    request: Parameters<typeof createRequest>[0],
    response: ReturnType<typeof createResponse>,
    url: URL,
): Promise<boolean> {
    for (const routeEntry of routeRegistry.getEntries()) {
        if (
            await routeEntry.handler(
                createRequest(request),
                response.response,
                url,
            )
        )
            return true;
    }
    return false;
}

test("registration gateway bootstrap registers admin section, navbar plugin, and static dir", async () => {
    const systemCtx = createCtx();
    systemCtx.registerFlow({
        id: "gateAccountCreation",
        stages: ["inspectIdentity", "authorizeCreation"],
    });
    systemCtx.registerFlow({
        id: "constructRegistrationUi",
        stages: ["compose-form"],
    });
    const dbExecutor: DbExecutor = {
        executeCommand: async (command: { table?: string }) =>
            command.table === "registration_adapter_configs"
                ? {
                      rows: [
                          { adapter_id: "public", enabled: 0 },
                          { adapter_id: "token", enabled: 1 },
                      ],
                      rowCount: 2,
                  }
                : { rows: [], rowCount: 0 },
        ensureTable: async () => {},
        transaction: async (callback) => callback(dbExecutor),
    };
    const map = createCapabilities(dbExecutor);

    class AssetRegistry extends UIRegistry {
        override resolveAssetUrl(assetUrl: string): string {
            return assetUrl.endsWith("authorization.js")
                ? "/assets/registration-token-authorization.js"
                : assetUrl;
        }
    }
    const uiRegistry = new AssetRegistry();
    await bootstrap({
        capabilities: map,
        routeRegistry: new RouteRegistry(),
        uiRegistry,
        gatewayRegistry: new GatewayRegistry(),
        adaptersRoot: path.resolve(process.cwd(), "src", "adapters"),
        flow: systemCtx.flow,
    });

    assert.equal(
        uiRegistry
            .listAdminSections()
            .some((section) => section.id === "registration"),
        true,
    );
    assert.equal(
        uiRegistry
            .listNavbarPlugins()
            .some(
                (plugin) =>
                    plugin.scriptUrl ===
                        "/static/gateways/registration/navbar.js" &&
                    plugin.providesCapabilities?.includes(
                        "users:getLeadingControls",
                    ),
            ),
        true,
    );
    assert.ok(
        uiRegistry
            .listCapabilityProviders()
            .some(
                (provider) =>
                    provider.providesCapabilities.includes(
                        "registration:pageTutorials",
                    ) && provider.access?.minRole === "admin",
            ),
    );
    const staticDir = uiRegistry.getStaticDir("registration");
    assert.ok(staticDir);
    assert.equal(existsSync(path.resolve(staticDir, "admin-section.js")), true);
    assert.equal(existsSync(path.resolve(staticDir, "navbar.js")), true);
    assert.equal(existsSync(path.resolve(staticDir, "client.js")), true);
    const tokenStaticDir = uiRegistry.getAdapterStaticDir(
        "registration",
        "token",
    );
    assert.ok(tokenStaticDir);
    assert.equal(
        existsSync(path.resolve(tokenStaticDir, "authorization.js")),
        true,
    );
    const registeredTypingMessages = uiRegistry.listAuthTypingMessages();
    assert.equal(registeredTypingMessages.length, 1);
    const msg = registeredTypingMessages[0];
    assert.equal(msg.id, "registration-register-today");
    assert.equal(msg.textKey, "ui.app.login.typing.sample.7");
    assert.equal(msg.ownerType, "adapter");
    assert.equal(msg.ownerId, "public");
    assert.equal(typeof msg.isEnabled, "function");
    const gateResult = await systemCtx.flow.run("gateAccountCreation", {
        accountId: "sso-user",
        providerId: "external-sso",
    });
    assert.deepEqual(gateResult.stageResults["authorizeCreation"], [
        {
            authorized: false,
            emailRequired: true,
            reason: "registration_token_required",
        },
    ]);
    const registrationUi = await systemCtx.flow.run(
        "constructRegistrationUi",
        {},
    );
    assert.deepEqual(registrationUi.stageResults["compose-form"], [
        {
            integrations: [
                {
                    id: "registration-token-authorization",
                    scriptUrl: "/assets/registration-token-authorization.js",
                    stringsBaseUrl:
                        "/static/adapters/registration/token/languages",
                },
            ],
        },
    ]);
});

test("registration:public:isEnabled capability returns false when gateway is disabled", async () => {
    const dbExec = createEmptyExecutor();
    const map = createCapabilities(dbExec);

    const registry = new GatewayRegistry();

    await bootstrap({
        capabilities: map,
        routeRegistry: new RouteRegistry(),
        uiRegistry: new UIRegistry(),
        gatewayRegistry: registry,
        adaptersRoot: path.resolve(process.cwd(), "src", "adapters"),
        flow: createCtx().flow,
    });

    const isEnabled = map.require<() => boolean>(
        "registration:public:isEnabled",
    );
    assert.equal(typeof isEnabled, "function");

    await registry.enable("registration");
    assert.equal(
        isEnabled(),
        false,
        "disabled when public adapter not enabled",
    );

    await registry.disable("registration");
    assert.equal(isEnabled(), false, "disabled when gateway is disabled");
});

test("registration:public:register capability throws when gateway is disabled", async () => {
    const dbExec = createEmptyExecutor();
    const map = createCapabilities(dbExec);

    const registry = new GatewayRegistry();

    await bootstrap({
        capabilities: map,
        routeRegistry: new RouteRegistry(),
        uiRegistry: new UIRegistry(),
        gatewayRegistry: registry,
        adaptersRoot: path.resolve(process.cwd(), "src", "adapters"),
        flow: createCtx().flow,
    });

    await registry.disable("registration");
    const registerFn = map.require<(input: unknown) => Promise<unknown>>(
        "registration:public:register",
    );
    assert.equal(typeof registerFn, "function");

    await assert.rejects(
        () => registerFn({ username: "u", password: "p" }),
        /gateway_disabled/,
        "should throw gateway_disabled when gateway is disabled",
    );
});

test("registration adapter routes announce controls and accept empty config saves", async () => {
    const routeRegistry = new RouteRegistry();
    const dbExecutor: DbExecutor = {
        executeCommand: async ({
            option,
            table,
        }: {
            option?: string;
            table?: string;
        }) => {
            if (
                option === "SELECT" &&
                table === "registration_adapter_configs"
            ) {
                return {
                    rows: [{ adapter_id: "token", enabled: 0 }],
                    rowCount: 1,
                };
            }
            return { rows: [], rowCount: 0 };
        },
        ensureTable: async () => {},
        transaction: async <T>(
            callback: (executor: DbExecutor) => Promise<T>,
        ) => callback(dbExecutor),
    };

    const capabilityStore = createCapabilities(dbExecutor);
    capabilityStore.contribute("auth:routeContext", createRouteContext());
    await bootstrap({
        capabilities: capabilityStore,
        routeRegistry,
        uiRegistry: new UIRegistry(),
        gatewayRegistry: new GatewayRegistry(),
        adaptersRoot: path.resolve(process.cwd(), "src", "adapters"),
        flow: createCtx().flow,
    });

    const deniedResponse = createResponse();
    assert.equal(
        await dispatchRoute(
            routeRegistry,
            { method: "GET", bearerToken: "invalid-test-token" },
            deniedResponse,
            new URL("http://localhost/api/v1/gateways/registration/adapters"),
        ),
        true,
    );
    assert.equal(deniedResponse.statusCode, 403);

    const adminToken = "admin-test-token";
    const listResponse = createResponse();
    const listHandled = await dispatchRoute(
        routeRegistry,
        { method: "GET", bearerToken: adminToken },
        listResponse,
        new URL("http://localhost/api/v1/gateways/registration/adapters"),
    );

    assert.equal(listHandled, true);
    assert.equal(listResponse.statusCode, 200);
    const listPayload = JSON.parse(listResponse.payload) as {
        data: Array<{
            id: string;
            enabled: boolean;
            controls?: Record<string, string>;
        }>;
    };
    assert.equal(
        listPayload.data.find((adapter) => adapter.id === "token")?.enabled,
        true,
    );
    const publicAdapter = listPayload.data.find(
        (adapter) => adapter.id === "public",
    );
    assert.equal(
        publicAdapter?.controls?.config,
        "/api/v1/gateways/registration/adapters/public/config",
    );
    assert.equal(
        publicAdapter?.controls?.disable,
        "/api/v1/gateways/registration/adapters/public/disable",
    );

    const saveResponse = createResponse();
    const saveHandled = await dispatchRoute(
        routeRegistry,
        {
            method: "PUT",
            bearerToken: adminToken,
            body: JSON.stringify({ enabled: true }),
        },
        saveResponse,
        new URL(
            "http://localhost/api/v1/gateways/registration/adapters/public/config",
        ),
    );

    assert.equal(saveHandled, true);
    assert.equal(saveResponse.statusCode, 200);
    assert.match(saveResponse.payload, /"saved":true/);
});
