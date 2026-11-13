import { runBootstrapScope } from "@cognis/core";
import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import {
    GatewayRegistry,
    CapabilityStore,
    CTX_CAPABILITY,
    createCtx,
} from "@cognis/core";
import { RouteRegistry } from "../../../api/reuse/route-registry.js";
import { UIRegistry } from "../../../api/reuse/ui-registry.js";
import { issueAccessToken } from "../../auth/access-tokens.js";
import { bootstrap } from "../bootstrap.js";
import { bootstrap as bootstrapAuth } from "../../auth/bootstrap/index.js";
import { DbTfaStore } from "../reuse/tfa-store.js";
import { InMemoryTestExecutor } from "../../db/tests/in-memory-test-executor.js";

function makeResponse() {
    let status = 0;
    let payload = "";
    return {
        writeHead(code: number) {
            status = code;
        },
        end(nextPayload = "") {
            payload = nextPayload;
        },
        get status() {
            return status;
        },
        get payload() {
            return payload;
        },
    } as unknown as {
        writeHead: (code: number) => void;
        end: (payload?: string) => void;
        status: number;
        payload: string;
    };
}

async function dispatchRoute(
    routeRegistry: RouteRegistry,
    headers: Record<string, string>,
    pathname: string,
    method = "GET",
) {
    const res = makeResponse();
    let handled = false;
    const req = {
        method,
        headers,
    } as unknown as import("node:http").IncomingMessage;
    for (const entry of routeRegistry.getEntries()) {
        handled = await entry.handler(
            req,
            res as unknown as import("node:http").ServerResponse,
            new URL(pathname, "http://localhost"),
        );
        if (handled) {
            break;
        }
    }
    return { handled, res };
}

test("tfa catalog restores adapter state and publishes authenticated lifecycle controls", async () => {
    const db = new InMemoryTestExecutor();
    const store = new DbTfaStore(db);
    await store.ensureSchema();
    await store.saveAdapterConfig("totp", false, {});

    const gatewayRegistry = new GatewayRegistry();
    const routeRegistry = new RouteRegistry();
    const capabilities = new CapabilityStore();
    const uiRegistry = new UIRegistry();
    const systemCtx = createCtx();
    capabilities.contribute("system:ctx", systemCtx);
    capabilities.contribute("db:executor", db);

    capabilities.contribute("auth:requireAuth", () => null);
    const registeredSecuritySections: Array<{
        id: string;
        scriptUrl: string;
        stringsBaseUrl?: string | string[];
    }> = [];
    capabilities.contribute(
        "auth:registerSecuritySection",
        (section: {
            id: string;
            scriptUrl: string;
            stringsBaseUrl?: string | string[];
        }) => {
            registeredSecuritySections.push(section);
        },
    );

    await runBootstrapScope(systemCtx, "gateway:tfa", () =>
        bootstrap({
            adaptersRoot: path.resolve(process.cwd(), "src", "adapters"),
            routeRegistry,
            gatewayRegistry,
            capabilities,
            flow: systemCtx.flow,
            uiRegistry,
        }),
    );

    const adminToken = issueAccessToken("admin-user", "admin", null);
    const result = await dispatchRoute(
        routeRegistry,
        { authorization: `Bearer ${adminToken}` },
        "/api/v1/gateways/tfa/adapters",
    );
    assert.ok(result.handled);
    assert.equal(result.res.status, 200);
    const payload = JSON.parse(result.res.payload) as {
        data: Array<{
            id: string;
            enabled: boolean;
            controls: Record<string, string>;
        }>;
    };
    const totpAdapter = payload.data.find((entry) => entry.id === "totp");
    assert.ok(totpAdapter);
    assert.equal(totpAdapter?.enabled, false);
    for (const adapter of payload.data) {
        const base = `/api/v1/gateways/tfa/adapters/${encodeURIComponent(adapter.id)}`;
        assert.deepEqual(adapter.controls, {
            config: `${base}/config`,
            enable: `${base}/enable`,
            disable: `${base}/disable`,
        });
    }

    const userToken = issueAccessToken("regular-user", "user", null);
    for (const action of ["enable", "disable"]) {
        const endpoint = totpAdapter.controls[action];
        const denied = await dispatchRoute(
            routeRegistry,
            { authorization: `Bearer ${userToken}` },
            endpoint,
            "POST",
        );
        assert.equal(denied.res.status, 403);
        const changed = await dispatchRoute(
            routeRegistry,
            { authorization: `Bearer ${adminToken}` },
            endpoint,
            "POST",
        );
        assert.equal(changed.handled, true);
        assert.equal(changed.res.status, 200);
        assert.deepEqual(JSON.parse(changed.res.payload), {
            data: { updated: true },
        });
        const refreshed = await dispatchRoute(
            routeRegistry,
            { authorization: `Bearer ${adminToken}` },
            "/api/v1/gateways/tfa/adapters",
        );
        assert.equal(
            JSON.parse(refreshed.res.payload).data.find(
                (entry: { id: string }) => entry.id === "totp",
            ).enabled,
            action === "enable",
        );
        assert.equal(
            (await store.listAdapterConfigs()).find(
                (entry) => entry.adapterId === "totp",
            )?.enabled,
            action === "enable",
        );
    }

    assert.equal(
        uiRegistry.getStaticDir("tfa"),
        path.resolve(process.cwd(), "src", "gateways", "tfa", "ui"),
    );
    assert.deepEqual(
        registeredSecuritySections.find((section) => section.id === "tfa")
            ?.stringsBaseUrl,
        [
            "/static/gateways/tfa/languages",
            "/static/adapters/tfa/smtp/languages",
            "/static/adapters/tfa/totp/languages",
        ],
    );
    assert.equal(
        uiRegistry.listAdminSections().find((section) => section.id === "tfa"),
        undefined,
    );
});

test("tfa login UI integration unhooks when gateway is disabled", async () => {
    const db = new InMemoryTestExecutor();
    const gatewayRegistry = new GatewayRegistry();
    const routeRegistry = new RouteRegistry();
    const capabilities = new CapabilityStore();
    const uiRegistry = new UIRegistry();
    const systemCtx = createCtx();
    capabilities.contribute("system:ctx", systemCtx);
    capabilities.contribute("db:executor", db);
    capabilities.contribute(CTX_CAPABILITY, systemCtx);

    await runBootstrapScope(
        capabilities.require(CTX_CAPABILITY),
        "gateway:auth",
        () =>
            bootstrapAuth({
                adaptersRoot: path.resolve(process.cwd(), "src", "adapters"),
                routeRegistry,
                gatewayRegistry,
                capabilities,
                flow: systemCtx.flow,
                uiRegistry,
            }),
    );
    await runBootstrapScope(systemCtx, "gateway:tfa", () =>
        bootstrap({
            adaptersRoot: path.resolve(process.cwd(), "src", "adapters"),
            routeRegistry,
            gatewayRegistry,
            capabilities,
            flow: systemCtx.flow,
            uiRegistry,
        }),
    );

    const integrationsWhenEnabled = (
        await systemCtx.runFlow("construct-login-ui")
    ).stageResults["compose-form"]
        .flatMap((entry) =>
            ((entry as { integrations?: unknown[] }).integrations ?? []).map(
                (integration) => (integration as { id?: string }).id ?? null,
            ),
        )
        .filter((id): id is string => typeof id === "string");
    assert.ok(integrationsWhenEnabled.includes("tfa"));

    await gatewayRegistry.disable("tfa");
    const integrationsWhenDisabled = (
        await systemCtx.runFlow("construct-login-ui")
    ).stageResults["compose-form"]
        .flatMap((entry) =>
            ((entry as { integrations?: unknown[] }).integrations ?? []).map(
                (integration) => (integration as { id?: string }).id ?? null,
            ),
        )
        .filter((id): id is string => typeof id === "string");
    assert.equal(integrationsWhenDisabled.includes("tfa"), false);
});
