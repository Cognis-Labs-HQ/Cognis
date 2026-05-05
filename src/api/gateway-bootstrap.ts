import type {
    DbExecutor,
    SupportedDbType,
} from "./adapters/db/account-store.js";
import type { RouteRegistry } from "./route-registry.js";
import type { GatewayRegistry } from "./gateway-registry.js";
import type { UIRegistry } from "./ui-registry.js";

/**
 * Minimal logging interface that gateways may use during their own bootstrap.
 * The level maps to the standard log levels; gateways should not assume any
 * specific logger implementation is available.
 */
export type BootstrapLog = (
    level: "debug" | "info" | "warn" | "error",
    message: string,
    meta?: Record<string, unknown>,
) => void;

/**
 * A simple key-value store that gateway bootstraps use to contribute
 * capabilities (e.g. a FileStorageGateway instance) back to the server
 * without core needing to import any concrete implementation class.
 */
export class CapabilityStore {
    private readonly store = new Map<string, unknown>();

    contribute(key: string, value: unknown): void {
        this.store.set(key, value);
    }

    get<T>(key: string): T | undefined {
        return this.store.get(key) as T | undefined;
    }
}

/**
 * Context passed to every gateway bootstrap function. Provides the core
 * services a gateway needs to wire itself into the application, without core
 * knowing anything about the specific gateway.
 */
export interface GatewayBootstrapContext {
    dbExecutor: DbExecutor;
    dbType: SupportedDbType;
    adaptersRoot: string;
    routeRegistry: RouteRegistry;
    gatewayRegistry: GatewayRegistry;
    capabilities: CapabilityStore;
    /** Optional UI registry for gateways to self-register admin sections and static asset directories. */
    uiRegistry?: UIRegistry;
    /** Optional structured logger provided by the logging gateway once it has bootstrapped. */
    log?: BootstrapLog;
}
