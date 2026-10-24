import test from "node:test";
import assert from "node:assert/strict";
import {
    CTX_CAPABILITY,
    GatewayRegistry,
    CapabilityStore,
    type Ctx,
} from "@cognis/core";
import { RouteRegistry } from "../../../../api/reuse/route-registry.js";
import { bootstrap } from "../../bootstrap.js";
import {
    makeInMemoryDb,
    createAuthTestContext,
} from "../auth-gateway-test-helpers.js";

test("public keyring data owners release only their own registration", async () => {
    const capabilities = new CapabilityStore();
    const dbExecutor = makeInMemoryDb();
    const base = createAuthTestContext(capabilities, dbExecutor);
    await bootstrap({
        adaptersRoot: "/nonexistent",
        routeRegistry: new RouteRegistry(),
        gatewayRegistry: new GatewayRegistry(),
        capabilities,
        ...base,
    });
    const systemCtx = capabilities.require<Ctx>(CTX_CAPABILITY);
    assert.equal(
        systemCtx.isPublicCapability("auth:registerKeyringDataOwner"),
        true,
    );
    const register = systemCtx.getCapability<
        (id: string, purge: (accountId: string) => Promise<void>) => () => void
    >("auth:registerKeyringDataOwner")!;
    let purges = 0;
    const release = register("module:example", async () => {
        purges += 1;
    });
    assert.throws(
        () => register("module:example", async () => {}),
        /keyring_data_owner_conflict/,
    );
    const purge = capabilities.require<(accountId: string) => Promise<void>>(
        "auth:purgeKeyringDependentData",
    );
    await purge("alice");
    assert.equal(purges, 1);
    release();
    await purge("alice");
    assert.equal(purges, 1);
    register("module:example", async () => {
        purges += 1;
    });
    release();
    await purge("alice");
    assert.equal(purges, 2);
});
