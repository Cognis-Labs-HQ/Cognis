import type { DbExecutor } from "../gateways/db/reuse/db-executor.js";
import type { RouteRegistry } from "./route-registry.js";
import type { UIRegistry } from "./ui-registry.js";

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
 * Note: dbExecutor is deprecated. The DB gateway contributes the executor via
 * capabilities.get('db:executor'). New gateway code should read from the
 * capability store instead of ctx.dbExecutor. This field will be removed in a
 * future release once all gateways have migrated.
 */
export interface GatewayBootstrapContext extends GatewayBootstrapBase {
    /** @deprecated Use capabilities.get('db:executor') instead. */
    dbExecutor?: DbExecutor;
    adaptersRoot: string;
    routeRegistry: RouteRegistry;
    uiRegistry?: UIRegistry;
}
