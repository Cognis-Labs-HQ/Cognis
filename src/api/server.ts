import { createSearchRoutes } from "./routes/search/index.js";
import { createServer } from "node:http";
import {
    HealthService,
    ModuleService,
    type GatewayRegistry,
    type BootstrapLog,
    type ModuleManifest,
    type ModuleRuntimeGateway,
} from "@cognis/core";
import { createModuleRoutes } from "./routes/modules/index.js";
import { createSystemRoutes } from "./routes/system/index.js";
import { createDocsRoutes } from "./routes/docs/index.js";
import { createUiRoutes } from "./routes/ui/index.js";
import { createModuleExtensionRoutes } from "../modules/routes/module-extensions.js";
import type { LocalAccountStore } from "./reuse/account-store.js";
import type { UserPreferenceStore } from "./reuse/preference-store.js";
import type { RouteContext } from "./reuse/route-context.js";
import { createUserRoutes } from "./routes/users/index.js";
import type { RouteRegistry } from "./route-registry.js";
import { createGatewayRoutes } from "./routes/gateways/index.js";
import type { UIRegistry } from "./ui-registry.js";

export interface ApiDependencies {
    moduleRuntimeGateway: ModuleRuntimeGateway;
    accountStore?: LocalAccountStore;
    preferenceStore?: UserPreferenceStore;
    routeRegistry?: RouteRegistry;
    gatewayRegistry?: GatewayRegistry;
    uiRegistry?: UIRegistry;
    log?: BootstrapLog;
    moduleIntegrityChecker?: () => Promise<
        Array<{
            moduleId: string;
            file: string;
            expected: string;
            actual: string | null;
            status: "ok" | "mismatch" | "missing";
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
    setProfileRole?: (handle: string, role: string) => Promise<void>;
    searchProfiles?: (
        query: string,
        limit: number,
        options?: { includeHidden?: boolean },
    ) => Promise<
        Array<{ accountId?: string; handle?: string; displayName?: string }>
    >;
    getProfileVisibility?: (
        accountId: string,
    ) => Promise<string | null | undefined>;
    setProfileVisibility?: (
        accountId: string,
        visibility: "friends",
    ) => Promise<void>;
    onModuleStateChanged?: (
        moduleId: string,
        enabled: boolean,
    ) => Promise<void> | void;
    getModuleCapability?: <T>(capabilityId: string) => T | undefined;
    routeContext?: RouteContext;
}

/**
 * Resolves a module's startup enabled state from highest to lowest priority:
 * core-module requirement, persisted runtime override, then manifest default.
 */
export function resolveInitialModuleEnabledState(
    manifest: Pick<ModuleManifest, "id" | "class" | "enabledByDefault">,
    persistedState: boolean | undefined,
): boolean {
    if (manifest.class === "core") return true;
    if (persistedState === true) return true;
    if (persistedState === false) return false;
    return manifest.enabledByDefault === true;
}

export function buildServer(deps: ApiDependencies) {
    const log = deps.log ?? (() => undefined);
    const routeContext = deps.routeContext;
    if (!routeContext) {
        throw new Error("route_context_missing");
    }
    const moduleService = new ModuleService(deps.moduleRuntimeGateway);
    const healthService = new HealthService();
    const enabledModules = new Set<string>();

    const moduleExtensionRoutes = createModuleExtensionRoutes(
        deps.moduleRuntimeGateway,
        (moduleId) => enabledModules.has(moduleId),
        log,
        {
            uiRegistry: deps.uiRegistry,
            getCapability: deps.getModuleCapability,
            requireRoleAccess: routeContext.requireRoleAccess,
        },
    );

    const moduleRoutes = createModuleRoutes(
        moduleService,
        {
            onEnabled: async (moduleId) => {
                enabledModules.add(moduleId);
                await deps.onModuleStateChanged?.(moduleId, true);
                await deps.persistModuleState?.(moduleId, true);
                await moduleExtensionRoutes.refresh();
            },
            onDisabled: async (moduleId) => {
                enabledModules.delete(moduleId);
                await deps.onModuleStateChanged?.(moduleId, false);
                await deps.persistModuleState?.(moduleId, false);
                await moduleExtensionRoutes.refresh();
            },
            getStatus: (moduleId) =>
                enabledModules.has(moduleId) ? "enabled" : "disabled",
            getIntegrityReport: deps.moduleIntegrityChecker,
            log,
        },
        routeContext,
    );
    const systemRoutes = createSystemRoutes(
        healthService,
        deps.preferenceStore,
        log,
        routeContext,
    );
    const docsRoutes = createDocsRoutes();
    const uiRoutes = createUiRoutes(
        deps.moduleRuntimeGateway,
        deps.uiRegistry,
        deps.accountStore,
        deps.gatewayRegistry,
        (moduleId) => enabledModules.has(moduleId),
        log,
        routeContext,
    );
    const userRoutes = deps.accountStore
        ? createUserRoutes(
              deps.accountStore,
              deps.preferenceStore,
              deps.setProfileRole,
              log,
              deps.getProfileVisibility,
              deps.setProfileVisibility,
              routeContext,
          )
        : null;
    const gatewayRoutes = deps.gatewayRegistry
        ? createGatewayRoutes(
              deps.gatewayRegistry,
              deps.uiRegistry,
              deps.persistGatewayState,
              log,
              routeContext,
          )
        : null;
    const searchRoutes = createSearchRoutes(deps.searchProfiles, routeContext);

    Promise.all([
        deps.moduleRuntimeGateway.listManifests(),
        deps.loadModuleStates?.() ?? Promise.resolve([]),
        deps.loadGatewayStates?.() ?? Promise.resolve([]),
    ])
        .then(([manifests, savedStates, savedGatewayStates]) => {
            const saved = new Map(
                savedStates.map((row) => [row.moduleId, row.enabled]),
            );
            for (const manifest of manifests) {
                const persisted = saved.get(manifest.id);
                const isEnabled = resolveInitialModuleEnabledState(
                    manifest,
                    persisted,
                );
                if (isEnabled) enabledModules.add(manifest.id);
                deps.onModuleStateChanged?.(manifest.id, isEnabled);
            }
            const savedGateways = new Map(
                savedGatewayStates.map((row) => [row.gatewayId, row.enabled]),
            );
            if (deps.gatewayRegistry) {
                for (const entry of deps.gatewayRegistry.list()) {
                    if (entry.required) continue;
                    const persisted = savedGateways.get(entry.id);
                    if (persisted === false) {
                        deps.gatewayRegistry.disable(entry.id);
                    }
                }
            }
            return moduleExtensionRoutes.refresh();
        })
        .catch((error) => {
            log("error", "Failed to restore persisted runtime states.", {
                component: "api-server",
                error: error instanceof Error ? error.message : String(error),
            });
        });

    return createServer(async (req, res) => {
        const url = new URL(req.url ?? "/", "http://localhost");
        const startedAt = Date.now();
        log("info", "Incoming API request.", {
            method: req.method ?? "GET",
            path: url.pathname,
        });

        try {
            const handledByModule = await moduleRoutes(req, res, url);
            if (handledByModule) {
                log("info", "Request handled by module routes.", {
                    method: req.method ?? "GET",
                    path: url.pathname,
                    durationMs: Date.now() - startedAt,
                });
                return;
            }

            const handledBySystem = await systemRoutes(req, res, url);
            if (handledBySystem) {
                log("info", "Request handled by system routes.", {
                    method: req.method ?? "GET",
                    path: url.pathname,
                    durationMs: Date.now() - startedAt,
                });
                return;
            }

            if (userRoutes) {
                const handledByUsers = await userRoutes(req, res, url);
                if (handledByUsers) {
                    log("info", "Request handled by user routes.", {
                        method: req.method ?? "GET",
                        path: url.pathname,
                        durationMs: Date.now() - startedAt,
                    });
                    return;
                }
            }

            if (gatewayRoutes) {
                const handledByGateways = await gatewayRoutes(req, res, url);
                if (handledByGateways) {
                    log("info", "Request handled by gateway routes.", {
                        method: req.method ?? "GET",
                        path: url.pathname,
                        durationMs: Date.now() - startedAt,
                    });
                    return;
                }
            }

            const handledBySearch = await searchRoutes(req, res, url);
            if (handledBySearch) {
                log("info", "Request handled by search routes.", {
                    method: req.method ?? "GET",
                    path: url.pathname,
                    durationMs: Date.now() - startedAt,
                });
                return;
            }

            // Gateway-registered route handlers run after core routes but before
            // module extensions, docs, and UI. Handlers tied to a disabled
            // gateway are skipped so that disabling a gateway also silences its
            // routes without needing explicit unregistration.
            for (const entry of deps.routeRegistry?.getEntries() ?? []) {
                if (
                    entry.gatewayId &&
                    deps.gatewayRegistry?.get(entry.gatewayId)?.status ===
                        "disabled"
                ) {
                    continue;
                }
                const handledByRegistry = await entry.handler(req, res, url);
                if (handledByRegistry) {
                    log("info", "Request handled by registered route.", {
                        method: req.method ?? "GET",
                        path: url.pathname,
                        durationMs: Date.now() - startedAt,
                    });
                    return;
                }
            }

            const handledByExtensions = await moduleExtensionRoutes.handle(
                req,
                res,
                url,
            );
            if (handledByExtensions) {
                log("info", "Request handled by module extension routes.", {
                    method: req.method ?? "GET",
                    path: url.pathname,
                    durationMs: Date.now() - startedAt,
                });
                return;
            }

            const handledByDocs = await docsRoutes(req, res, url);
            if (handledByDocs) {
                log("info", "Request handled by docs routes.", {
                    method: req.method ?? "GET",
                    path: url.pathname,
                    durationMs: Date.now() - startedAt,
                });
                return;
            }

            const handledByUi = await uiRoutes(req, res, url);
            if (handledByUi) {
                log("info", "Request handled by UI routes.", {
                    method: req.method ?? "GET",
                    path: url.pathname,
                    durationMs: Date.now() - startedAt,
                });
                return;
            }

            res.writeHead(404, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    error: { code: "not_found", message: "Route not found" },
                }),
            );
            log("warn", "Request resulted in 404.", {
                method: req.method ?? "GET",
                path: url.pathname,
                durationMs: Date.now() - startedAt,
            });
        } catch (error) {
            res.writeHead(400, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    error: {
                        code: "bad_request",
                        message: "Request failed",
                    },
                }),
            );
            log("error", "Request failed with handled error response.", {
                method: req.method ?? "GET",
                path: url.pathname,
                durationMs: Date.now() - startedAt,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    });
}
