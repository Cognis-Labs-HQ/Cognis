import path from "node:path";
import { type GatewayBootstrapContext } from "../shared.js";
import { CoreFileReaderGateway } from "./gateway.js";

/**
 * Standard gateway bootstrap entry point. Discovers file-reader adapters under
 * `src/adapters/file-reader/`, registers their supported MIME types as the
 * `file-reader:supportedTypes` capability, and claims the `/api/v1/file-reader`
 * API prefix so disabled-gateway responses are deterministic.
 */
export async function bootstrap(ctx: GatewayBootstrapContext): Promise<void> {
    const gateway = new CoreFileReaderGateway();
    const adaptersRoot = path.join(ctx.adaptersRoot, "file-reader");

    await gateway.discoverAdapters(adaptersRoot);
    ctx.log?.("info", "File-reader adapters discovered.", {
        component: "file-reader-gateway",
        adaptersRoot,
        adapterCount: gateway.listAdapters().length,
    });

    ctx.capabilities.contribute("file-reader:supportedTypes", () =>
        gateway.getSupportedTypes(),
    );

    ctx.routeRegistry.registerPrefix("/api/v1/file-reader", "file-reader");

    await gateway.bootstrapAdapters(adaptersRoot, {
        capabilities: ctx.capabilities,
        registerRoute: (handler, gatewayId) =>
            ctx.routeRegistry.register(handler, gatewayId ?? "file-reader"),
        registerAdapterStaticDir: (gatewayId, adapterId, dir) =>
            ctx.uiRegistry?.registerAdapterStaticDir(gatewayId, adapterId, dir),
        log: ctx.log,
    });

    ctx.log?.("info", "File-reader gateway bootstrap complete.", {
        component: "file-reader-gateway",
        supportedTypes: gateway.getSupportedTypes().length,
    });
}
