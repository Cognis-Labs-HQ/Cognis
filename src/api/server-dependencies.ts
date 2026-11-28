/**
 * Declares the services and callbacks accepted by the API server.
 * Public export: ApiDependencies describes the injected server boundary.
 * @example const dependencies: ApiDependencies = { moduleRuntimeGateway };
 */
import type {
    BootstrapLog,
    GatewayRegistry,
    HealthService,
    LocalAccountStore,
    ModuleMarketplaceService,
    ModuleRuntimeGateway,
} from "@cognis/core";
import type { UserPreferenceStore } from "./reuse/preference-store.js";
import type { RouteContext } from "./reuse/route-context.js";
import type { RouteRegistry } from "./reuse/route-registry.js";
import type { UIRegistry } from "./reuse/ui-registry.js";

export interface ApiDependencies {
    moduleRuntimeGateway: ModuleRuntimeGateway;
    accountStore?: LocalAccountStore;
    preferenceStore?: UserPreferenceStore;
    routeRegistry?: RouteRegistry;
    gatewayRegistry?: GatewayRegistry;
    uiRegistry?: UIRegistry;
    healthService?: HealthService;
    log?: BootstrapLog;
    validateModuleEnable?: (moduleId: string) => Promise<void> | void;
    runModuleTests?: (moduleId: string) => Promise<void>;
    moduleIntegrityChecker?: () => Promise<
        Array<{
            moduleId: string;
            file: string;
            expected: string | null;
            actual: string | null;
            status: "ok" | "mismatch" | "missing" | "missing_shasum";
        }>
    >;
    loadModuleStates?: () => Promise<
        Array<{ moduleId: string; enabled: boolean }>
    >;
    persistModuleState?: (moduleId: string, enabled: boolean) => Promise<void>;
    loadGatewayStates?: () => Promise<
        Array<{ gatewayId: string; enabled: boolean }>
    >;
    persistGatewayState?: (
        gatewayId: string,
        enabled: boolean,
    ) => Promise<void>;
    createProfile?: (
        accountId: string,
        handle: string,
        role?: string,
    ) => Promise<void>;
    setProfileRole?: (accountId: string, role: string) => Promise<void>;
    searchProfiles?: (
        query: string,
        limit: number,
        options?: { includeHidden?: boolean; requesterAccountId?: string },
    ) => Promise<
        Array<{
            accountId?: string;
            handle?: string;
            displayName?: string;
            avatarKey?: string | null;
        }>
    >;
    getProfileVisibility?: (
        accountId: string,
    ) => Promise<string | null | undefined>;
    setProfileVisibility?: (
        accountId: string,
        visibility: "friends",
    ) => Promise<void>;
    getProfileLifecycleState?: (
        accountId: string,
    ) => Promise<string | null | undefined>;
    setProfileLifecycleState?: (
        accountId: string,
        lifecycleState: "active" | "deactivated" | "archived",
    ) => Promise<void>;
    onModuleStateChanged?: (
        moduleId: string,
        enabled: boolean,
    ) => Promise<void> | void;
    routeContext?: RouteContext;
    observability?: {
        record(
            name: string,
            value: number,
            labels?: Record<string, string>,
        ): void;
    };
    discoverModulesOnStartup?: boolean;
    moduleMarketplaceService?: ModuleMarketplaceService;
}
