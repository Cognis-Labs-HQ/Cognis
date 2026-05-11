import type { DbExecutor } from "../gateways/db/reuse/db-executor.js";
import type { DbProviderId } from "../gateways/db/reuse/provider-id.js";
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
 * Deprecation notice:
 *   dbExecutor and dbType are deprecated. The DB gateway contributes the
 *   executor via capabilities.get('db:executor') and the dialect string via
 *   capabilities.get('db:type'). New gateway code should read from the
 *   capability store instead of ctx.dbExecutor / ctx.dbType. These fields
 *   will be removed in a future release once all gateways have migrated.
 */
export interface GatewayBootstrapContext extends GatewayBootstrapBase {
    /** @deprecated Use capabilities.get('db:executor') instead. */
    dbExecutor?: DbExecutor;
    /** @deprecated Use capabilities.get('db:type') instead. */
    dbType?: DbProviderId;
    adaptersRoot: string;
    routeRegistry: RouteRegistry;
    uiRegistry?: UIRegistry;
}
