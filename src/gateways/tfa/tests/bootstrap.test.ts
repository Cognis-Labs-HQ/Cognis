import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { GatewayRegistry, CapabilityStore } from "@cognis/core";
import { RouteRegistry } from "../../../api/route-registry.js";
import { UIRegistry } from "../../../api/ui-registry.js";
import { issueAccessToken } from "../../auth/access-tokens.js";
import { bootstrap } from "../bootstrap.js";
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
) {
    const res = makeResponse();
    let handled = false;
    const req = {
        method: "GET",
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

test("tfa bootstrap preserves persisted disabled adapter state after restart", async () => {
    const db = new InMemoryTestExecutor();
    const store = new DbTfaStore(db);
    await store.ensureSchema();
    await store.saveAdapterConfig("totp", false, {});

    const gatewayRegistry = new GatewayRegistry();
    const routeRegistry = new RouteRegistry();
    const capabilities = new CapabilityStore();
    const uiRegistry = new UIRegistry();
    await bootstrap({
        dbExecutor: db,
        adaptersRoot: path.resolve(process.cwd(), "src", "adapters"),
        routeRegistry,
        gatewayRegistry,
        capabilities,
        uiRegistry,
    });

    const adminToken = issueAccessToken("admin-user", "admin", null);
    const result = await dispatchRoute(
        routeRegistry,
        { authorization: `Bearer ${adminToken}` },
        "/api/v1/gateways/tfa/adapters",
    );
    assert.ok(result.handled);
    assert.equal(result.res.status, 200);
    const payload = JSON.parse(result.res.payload) as {
        data: Array<{ id: string; enabled: boolean }>;
    };
    const totpAdapter = payload.data.find((entry) => entry.id === "totp");
    assert.ok(totpAdapter);
    assert.equal(totpAdapter?.enabled, false);
    assert.equal(
        uiRegistry.getStaticDir("tfa"),
        path.resolve(process.cwd(), "src", "gateways", "tfa", "ui"),
    );
    assert.deepEqual(
        uiRegistry
            .listSettingsSections()
            .find((section) => section.id === "tfa")?.stringsBaseUrl,
        [
            "/static/gateways/tfa/languages",
            "/static/adapters/tfa/totp/languages",
        ],
    );
    assert.equal(
        uiRegistry.listAdminSections().find((section) => section.id === "tfa")
            ?.scriptUrl,
        "/static/gateways/tfa/admin-section.js",
    );
});
