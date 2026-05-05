import { createServer } from "node:http";
import {
    HealthService,
    ModuleService,
    type ModuleRuntimeGateway,
} from "@cognis/core";
import { createModuleRoutes } from "./routes/modules/index.js";
import { createSystemRoutes } from "./routes/system/index.js";
import { createDocsRoutes } from "./routes/docs/index.js";
import { createUiRoutes } from "./routes/ui/index.js";
import { createModuleExtensionRoutes } from "./routes/module-extensions/index.js";
import type { LocalAccountStore } from "./adapters/local-auth-gateway.js";
import {
    createPreferencesRoutes,
    type UserPreferenceStore,
} from "./routes/preferences/index.js";
import { createUserRoutes } from "./routes/users/index.js";
import type { RouteRegistry } from "./route-registry.js";
import { createGatewayRoutes } from "./routes/gateways/index.js";
import type { GatewayRegistry } from "./gateway-registry.js";
import type { BootstrapLog } from "./gateway-bootstrap.js";
import type { UIRegistry } from "./ui-registry.js";

export interface ApiDependencies {
    moduleRuntimeGateway: ModuleRuntimeGateway;
    accountStore?: LocalAccountStore;
    preferenceStore: UserPreferenceStore;
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
}

export function buildServer(deps: ApiDependencies) {
    const log = deps.log ?? (() => undefined);
    const moduleService = new ModuleService(deps.moduleRuntimeGateway);
    const healthService = new HealthService();
    const enabledModules = new Set<string>();

    const moduleExtensionRoutes = createModuleExtensionRoutes(
        deps.moduleRuntimeGateway,
        (moduleId) => enabledModules.has(moduleId),
    );

    const moduleRoutes = createModuleRoutes(moduleService, {
        onEnabled: async (moduleId) => {
            enabledModules.add(moduleId);
            await deps.persistModuleState?.(moduleId, true);
            await moduleExtensionRoutes.refresh();
        },
        onDisabled: async (moduleId) => {
            enabledModules.delete(moduleId);
            await deps.persistModuleState?.(moduleId, false);
            await moduleExtensionRoutes.refresh();
        },
        getStatus: (moduleId) =>
            enabledModules.has(moduleId) ? "enabled" : "disabled",
        getIntegrityReport: deps.moduleIntegrityChecker,
    });
    const systemRoutes = createSystemRoutes(
        healthService,
        deps.preferenceStore,
    );
    const docsRoutes = createDocsRoutes();
    const uiRoutes = createUiRoutes(deps.moduleRuntimeGateway, deps.uiRegistry);
    const preferencesRoutes = createPreferencesRoutes(deps.preferenceStore);
    const userRoutes = deps.accountStore
        ? createUserRoutes(
              deps.accountStore,
              deps.preferenceStore,
              deps.setProfileRole,
          )
        : null;
    const gatewayRoutes = deps.gatewayRegistry
        ? createGatewayRoutes(
              deps.gatewayRegistry,
              deps.uiRegistry,
              deps.persistGatewayState,
          )
        : null;

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
                if (manifest.class === "core" || persisted === true)
                    enabledModules.add(manifest.id);
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
        .catch(() => undefined);

    return createServer(async (req, res) => {
        const url = new URL(req.url ?? "/", "http://localhost");
        const startedAt = Date.now();
        log("debug", "Incoming API request.", {
            method: req.method ?? "GET",
            path: url.pathname,
        });

        try {
            const handledByModule = await moduleRoutes(req, res, url);
            if (handledByModule) {
                log(
                    (req.method ?? "GET") === "GET" ? "debug" : "info",
                    "Request handled by module routes.",
                    {
                        method: req.method ?? "GET",
                        path: url.pathname,
                        durationMs: Date.now() - startedAt,
                    },
                );
                return;
            }

            const handledBySystem = await systemRoutes(req, res, url);
            if (handledBySystem) {
                log(
                    (req.method ?? "GET") === "GET" ? "debug" : "info",
                    "Request handled by system routes.",
                    {
                        method: req.method ?? "GET",
                        path: url.pathname,
                        durationMs: Date.now() - startedAt,
                    },
                );
                return;
            }

            const handledByPreferences = await preferencesRoutes(req, res, url);
            if (handledByPreferences) {
                log("info", "Request handled by preferences routes.", {
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

            // Gateway-registered route handlers run after core routes but before
            // module extensions, docs, and UI.
            for (const handler of deps.routeRegistry?.getHandlers() ?? []) {
                const handledByRegistry = await handler(req, res, url);
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
                log("debug", "Request handled by docs routes.", {
                    method: req.method ?? "GET",
                    path: url.pathname,
                    durationMs: Date.now() - startedAt,
                });
                return;
            }

            const handledByUi = await uiRoutes(req, res, url);
            if (handledByUi) {
                log("debug", "Request handled by UI routes.", {
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
                        message:
                            error instanceof Error
                                ? error.message
                                : "Unknown error",
                    },
                }),
            );
            log("warn", "Request failed with handled error response.", {
                method: req.method ?? "GET",
                path: url.pathname,
                durationMs: Date.now() - startedAt,
                error: error instanceof Error ? error.message : "Unknown error",
            });
        }
    });
}
