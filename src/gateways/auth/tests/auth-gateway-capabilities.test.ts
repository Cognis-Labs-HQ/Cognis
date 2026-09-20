import test from "node:test";
import assert from "node:assert/strict";
import {
    CTX_CAPABILITY,
    GatewayRegistry,
    CapabilityStore,
    createCtx,
} from "@cognis/core";
import { RouteRegistry } from "../../../api/reuse/route-registry.js";
import { bootstrap } from "../bootstrap.js";
import {
    contributeTestKeyring,
    makeInMemoryDb,
    type InMemoryDb,
} from "./auth-gateway-test-helpers.js";
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
