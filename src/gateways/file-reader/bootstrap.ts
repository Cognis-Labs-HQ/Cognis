import path from "node:path";
import { type GatewayBootstrapContext } from "../shared.js";
import { CoreFileReaderGateway } from "./gateway.js";
import { buildGatewayAdapterAdminControls } from "../../api/reuse/adapter-admin-controls.js";
import { resolveRouteContext } from "../../api/reuse/route-context.js";

const ADAPTERS_BASE = "/api/v1/gateways/file-reader/adapters";

/**
 * Standard gateway bootstrap entry point. Discovers file-reader adapters under
 * `src/adapters/file-reader/`, registers their supported MIME types as the
 * `file-reader:supportedTypes` capability, claims the `/api/v1/file-reader`
 * API prefix so disabled-gateway responses are deterministic, and registers
 * the adapter admin listing route.
 */
export async function bootstrap(ctx: GatewayBootstrapContext): Promise<void> {
    const gateway = new CoreFileReaderGateway();
    const adaptersRoot = path.join(ctx.adaptersRoot, "file-reader");
    const routeContext = ctx.capabilities.get("auth:routeContext");
    const routeHelpers = resolveRouteContext(routeContext);

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

    ctx.routeRegistry.register(async (req, res, url) => {
        if (url.pathname !== ADAPTERS_BASE || req.method !== "GET")
            return false;
        if (!routeHelpers.requireAuth(req, res, "admin")) return true;
        res.writeHead(200, { "content-type": "application/json" });
        res.end(
            JSON.stringify({
                data: gateway.listAdapters().map((adapter) => ({
                    adapterId: adapter.adapterId,
                    adapterName: adapter.adapterName,
                    controls: buildGatewayAdapterAdminControls(
                        ADAPTERS_BASE,
                        adapter.adapterId,
                    ),
                })),
            }),
        );
        return true;
    }, "file-reader");

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
