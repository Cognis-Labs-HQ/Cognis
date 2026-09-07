import type { IncomingMessage, ServerResponse } from "node:http";
import type { UIRegistry } from "../../reuse/ui-registry.js";
import type { RouteContext } from "../../reuse/route-context.js";
import { versionDescriptor } from "./asset-versioning.js";

export function serveProviders(
    req: IncomingMessage,
    res: ServerResponse,
    url: URL,
    routeContext: RouteContext,
    uiRegistry: UIRegistry | undefined,
    assetVersion: string,
): boolean {
    if (
        url.pathname !== "/api/v1/ui/capability-providers" ||
        req.method !== "GET"
    ) {
        return false;
    }
    if (!routeContext.requireAuth(req, res, "user")) return true;
    const providers = uiRegistry?.listCapabilityProviders() ?? [];
    res.writeHead(200, { "content-type": "application/json" });
    res.end(
        JSON.stringify({ data: versionDescriptor(providers, assetVersion) }),
    );
    return true;
}
