import type { DbExecutor } from "../../gateways/db/reuse/db-executor.js";
import type { RouteRegistry } from "../reuse/route-registry.js";
import type { UIRegistry } from "../reuse/ui-registry.js";

export type {
    GatewayBootstrapBase,
    GatewayManifest,
    GatewayEntry,
    GatewayRegistry,
    BootstrapLog,
} from "@cognis/core";
export { CapabilityStore } from "@cognis/core";

import type { GatewayBootstrapBase } from "@cognis/core";

/**
 * Full context passed to every gateway bootstrap function. Extends the core
 * GatewayBootstrapBase with API-specific fields that gateways need to wire
 * themselves into the HTTP server (route registration, UI sections, etc.).
 *
 * Note: dbExecutor is a legacy compatibility alias. The DB gateway contributes
 * the executor via capabilities.get('db:executor'), and new gateway code must
 * read it from the capability store instead of ctx.dbExecutor.
 */
export interface GatewayBootstrapContext extends GatewayBootstrapBase {
    /** @deprecated Use capabilities.get('db:executor') instead. */
    dbExecutor?: DbExecutor;
    adaptersRoot: string;
    routeRegistry: RouteRegistry;
    uiRegistry?: UIRegistry;
}
