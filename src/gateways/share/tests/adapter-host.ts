import {
    createCtx,
    CapabilityStore,
    runBootstrapScope,
    type BootstrapDisposer,
} from "@cognis/core";
import type { TestContext } from "node:test";
import type { GatewayBootstrapContext } from "../../shared.js";
import type { CoreShareGateway } from "../gateway/index.js";

export function createShareAdapterHost(
    t: TestContext,
    log?: GatewayBootstrapContext["log"],
) {
    const root = createCtx();
    const capabilities = new CapabilityStore();
    capabilities.contribute("system:ctx", root);
    const cleanup: BootstrapDisposer[] = [];
    const context = { capabilities, log } as GatewayBootstrapContext;
    t.after(async () => {
        for (const dispose of cleanup.reverse()) await dispose();
    });
    return {
        root,
        capabilities,
        cleanup,
        discover(gateway: CoreShareGateway, directory: string) {
            return runBootstrapScope(
                root,
                "gateway:share",
                () => gateway.discoverAdapters(directory, context),
                (dispose) => cleanup.push(dispose),
            );
        },
    };
}
