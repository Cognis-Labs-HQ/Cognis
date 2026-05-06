import type {
    DbExecutor,
    SupportedDbType,
} from "../adapters/db/shared/account-store.js";
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
 */
export interface GatewayBootstrapContext extends GatewayBootstrapBase {
    dbExecutor: DbExecutor;
    dbType: SupportedDbType;
    adaptersRoot: string;
    routeRegistry: RouteRegistry;
    uiRegistry?: UIRegistry;
}
