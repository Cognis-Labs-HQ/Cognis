import type { Ctx } from "@cognis/core";
import type { RouteContext } from "./route-context.js";
import type { UIRegistry } from "./ui-registry.js";

/** A module dependency may use only host-visible or explicitly public capabilities. */
export function isModuleCapabilityAvailable(
    capabilityId: string,
    routeContext: RouteContext,
    uiRegistry?: UIRegistry,
): boolean {
    if (routeContext.getCapability(capabilityId) !== undefined) return true;
    const systemCtx = routeContext.getCapability<Ctx>("system:ctx");
    if (
        systemCtx?.isPublicCapability(capabilityId) &&
        systemCtx.getCapability(capabilityId) !== undefined
    )
        return true;
    return uiRegistry?.hasActiveCapabilityProvider(capabilityId) ?? false;
}
