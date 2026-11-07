import type { IncomingMessage, ServerResponse } from "node:http";
import { isRoleAllowed, type Ctx } from "@cognis/core";
import type { UIRegistry } from "../../reuse/ui-registry.js";
import type { RouteContext } from "../../reuse/route-context.js";
import { versionDescriptor } from "./asset-versioning.js";

export async function serveProviders(
    req: IncomingMessage,
    res: ServerResponse,
    url: URL,
    routeContext: RouteContext,
    uiRegistry: UIRegistry | undefined,
    assetVersion: string,
): Promise<boolean> {
    if (
        url.pathname !== "/api/v1/ui/capability-providers" ||
        req.method !== "GET"
    ) {
        return false;
    }
    const claims = routeContext.requireAuth(req, res, "user");
    if (!claims) return true;
    let providers = (uiRegistry?.listCapabilityProviders() ?? []).filter(
        (provider) => isRoleAllowed(claims.role, provider.access),
    );
    const management = routeContext
        .getCapability<Ctx>("system:ctx")
        ?.getCapability<{
            describeProviders: (
                entries: typeof providers,
                catalog: string,
            ) => Promise<typeof providers>;
        }>("component:providerCatalog");
    if (management)
        providers = await management.describeProviders(
            providers,
            "capabilities",
        );
    res.writeHead(200, { "content-type": "application/json" });
    res.end(
        JSON.stringify({ data: versionDescriptor(providers, assetVersion) }),
    );
    return true;
}
