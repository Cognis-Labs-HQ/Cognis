import path from "node:path";
import {
    CapabilityStore,
    createCtx,
    GatewayRegistry,
    runBootstrapScope,
} from "@cognis/core";
import { RouteRegistry } from "../../api/reuse/route-registry.js";
import { UIRegistry } from "../../api/reuse/ui-registry.js";
import {
    createAuthContext,
    createJsonDispatcher,
} from "../../api/tests/reuse/route-test-helpers.js";
import { MemoryDatabase } from "./memory-database.js";

/** Compose actual gateway bootstraps against the public DB/Auth host contracts. */
export async function createGatewayHost(testContext, gateways) {
    const root = createCtx();
    const capabilities = new CapabilityStore();
    const routes = new RouteRegistry();
    const context = {
        capabilities,
        flow: root.flow,
        routeRegistry: routes,
        gatewayRegistry: new GatewayRegistry(),
        uiRegistry: new UIRegistry(),
        adaptersRoot: path.resolve("src/adapters"),
    };
    capabilities.contribute("system:ctx", root);
    capabilities.contribute("db:executor", new MemoryDatabase());
    capabilities.contribute(
        "auth:routeContext",
        createAuthContext(
            new Map([
                ["owner-token", { sub: "owner", role: "admin" }],
                ["recipient-token", { sub: "recipient", role: "user" }],
            ]),
        ),
    );
    const disposers = [];
    testContext.after(async () => {
        for (const dispose of disposers.reverse()) await dispose();
    });
    for (const [id, bootstrap] of gateways)
        await runBootstrapScope(
            root,
            `gateway:${id}`,
            () => bootstrap(context),
            (dispose) => disposers.push(dispose),
        );
    return {
        root,
        capabilities,
        routes,
        context,
        dispatch: createJsonDispatcher(routes),
    };
}
