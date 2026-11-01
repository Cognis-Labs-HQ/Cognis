import { createHash } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import type {
    BootstrapLog,
    ModuleMarketplaceService,
    ModuleService,
} from "@cognis/core";
import type { RouteContext } from "../../reuse/route-context.js";
import { withMarketplaceAssetUrls } from "./catalog-presentation.js";

/** A single authenticated conditional read for the marketplace's displayed state. */
export function createModuleMarketplaceStateRoute({
    moduleService,
    marketplace,
    ctx,
    restartRequiredModules,
    getStatus,
    log,
}: {
    moduleService: Pick<ModuleService, "list">;
    marketplace: ModuleMarketplaceService;
    ctx: Pick<RouteContext, "requireAuth">;
    restartRequiredModules: Set<string>;
    getStatus?: (id: string) => "enabled" | "disabled" | "available";
    log?: BootstrapLog;
}) {
    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (
            req.method !== "GET" ||
            url.pathname !== "/api/v1/modules/marketplace-state"
        )
            return false;
        if (!ctx.requireAuth(req, res, "admin")) return true;
        const [sources, manifests, cached, recommendedUuids] =
            await Promise.all([
                marketplace.listSources(),
                moduleService.list(),
                marketplace.listCachedModules(),
                marketplace.listRecommendedModuleUuids(),
            ]);
        const recommended = new Set(recommendedUuids);
        const installed = manifests
            .filter((module) => module.class !== "core")
            .map((module) => ({
                ...module,
                restartRequired: restartRequiredModules.has(module.uuid),
                status: getStatus?.(module.id) ?? "available",
            }));
        const catalog = cached.map((module) => ({
            ...module,
            restartRequired: restartRequiredModules.has(module.uuid),
            recommended: recommended.has(module.uuid),
        }));
        const etag =
            '"' +
            createHash("sha256")
                .update(JSON.stringify({ sources, installed, catalog }))
                .digest("hex") +
            '"';
        const headers = { etag, "cache-control": "private, no-cache" };
        if (req.headers["if-none-match"] === etag) {
            res.writeHead(304, headers);
            res.end();
            return true;
        }
        const prepared = await Promise.all(
            catalog.map((module) =>
                withMarketplaceAssetUrls(module, marketplace, log),
            ),
        );
        res.writeHead(200, { ...headers, "content-type": "application/json" });
        res.end(
            JSON.stringify({ data: { sources, installed, cached: prepared } }),
        );
        return true;
    };
}
